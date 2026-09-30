package com.manecomb.location

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.net.ConnectivityManager
import android.net.Network
import android.os.Bundle
import android.os.IBinder
import android.util.Log
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.time.Instant
import java.util.UUID
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

class ManeCombLocationService : Service(), LocationListener {
    companion object {
        @Volatile var running: Boolean = false
        @Volatile var pendingCount: Int = 0
        private const val TAG = "ManeCombLocation"
        private const val CHANNEL_ID = "manecomb_location"
        private const val NOTIFICATION_ID = 4101
        private const val RETRY_BASE_MS = 5_000L
        private const val RETRY_MAX_MS = 60_000L
    }

    private lateinit var locationManager: LocationManager
    private lateinit var connectivityManager: ConnectivityManager
    private lateinit var store: ManeCombLocationStore
    private val network: ScheduledExecutorService = Executors.newSingleThreadScheduledExecutor()
    private val flushing = AtomicBoolean(false)
    private val retryScheduled = AtomicBoolean(false)

    private var serverUrl = ""
    private var vehicleId = ""
    private var journeyId = ""
    private var deviceToken = ""
    private var retryDelayMs = RETRY_BASE_MS

    private val callback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) {
            flushQueue()
        }
    }

    override fun onCreate() {
        super.onCreate()
        locationManager = getSystemService(LOCATION_SERVICE) as LocationManager
        connectivityManager = getSystemService(CONNECTIVITY_SERVICE) as ConnectivityManager
        store = ManeCombLocationStore(this)
        createChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val prefs = getSharedPreferences("manecomb-native-location", Context.MODE_PRIVATE)
        serverUrl = intent?.getStringExtra("serverUrl") ?: prefs.getString("serverUrl", "").orEmpty()
        vehicleId = intent?.getStringExtra("vehicleId") ?: prefs.getString("vehicleId", "").orEmpty()
        journeyId = intent?.getStringExtra("journeyId") ?: prefs.getString("journeyId", "").orEmpty()
        deviceToken = intent?.getStringExtra("deviceToken") ?: prefs.getString("deviceToken", "").orEmpty()

        if (serverUrl.isBlank() || vehicleId.isBlank() || journeyId.isBlank() || deviceToken.isBlank()) {
            stopSelf()
            return START_NOT_STICKY
        }

        val previousOwner = prefs.getString("owner", "").orEmpty()
        val currentOwner = vehicleId + ":" + journeyId
        if (previousOwner.isNotBlank() && previousOwner != currentOwner && store.countQueued() > 0) {
            Log.w(TAG, "Clearing stale GPS queue from another operational assignment.")
            store.clear()
        }

        prefs.edit()
            .putString("serverUrl", serverUrl)
            .putString("vehicleId", vehicleId)
            .putString("journeyId", journeyId)
            .putString("deviceToken", deviceToken)
            .putString("owner", currentOwner)
            .apply()

        startForeground(NOTIFICATION_ID, notification("GPS activo · " + store.countQueued() + " pendientes"))
        running = true
        pendingCount = store.countQueued()

        try {
            connectivityManager.registerDefaultNetworkCallback(callback)
        } catch (_: Exception) {}

        try {
            locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 3000L, 3f, this)
            if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                locationManager.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 5000L, 5f, this)
            }
        } catch (error: SecurityException) {
            Log.w(TAG, "Location permission missing", error)
            stopSelf()
            return START_NOT_STICKY
        }

        flushQueue()
        return START_STICKY
    }

    override fun onLocationChanged(location: Location) {
        val packetId = UUID.randomUUID().toString()
        val capturedAt = if (location.time > 0) location.time else System.currentTimeMillis()
        val payload = JSONObject().apply {
            put("packetId", packetId)
            put("vehicleId", vehicleId)
            put("journeyId", journeyId)
            put("latitude", location.latitude)
            put("longitude", location.longitude)
            put("speedMps", if (location.hasSpeed()) location.speed.toDouble() else 0.0)
            if (location.hasBearing()) put("heading", location.bearing.toDouble())
            if (location.hasAccuracy()) put("accuracy", location.accuracy.toDouble())
            put("recordedAt", Instant.ofEpochMilli(capturedAt).toString())
        }
        store.enqueue(packetId, payload.toString(), capturedAt)
        pendingCount = store.countQueued()
        refreshNotification()
        flushQueue()
    }

    private fun flushQueue() {
        if (!flushing.compareAndSet(false, true)) return
        network.execute {
            try {
                while (true) {
                    val item = store.peek() ?: break
                    when (postTelemetry(item.payload)) {
                        UploadResult.SUCCESS -> {
                            store.remove(item.id)
                            pendingCount = store.countQueued()
                            retryDelayMs = RETRY_BASE_MS
                            retryScheduled.set(false)
                            refreshNotification()
                        }
                        UploadResult.AUTH_FAILURE -> {
                            stopForAuthFailure()
                            break
                        }
                        UploadResult.RETRY -> {
                            scheduleRetry()
                            break
                        }
                    }
                }
            } finally {
                flushing.set(false)
            }
        }
    }

    private fun postTelemetry(body: String): UploadResult {
        var connection: HttpURLConnection? = null
        return try {
            connection = URL(serverUrl.trimEnd('/') + "/api/locations/telemetry").openConnection() as HttpURLConnection
            connection.requestMethod = "POST"
            connection.connectTimeout = 10_000
            connection.readTimeout = 10_000
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("Authorization", "Bearer " + deviceToken)
            connection.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
            val code = connection.responseCode
            try { (if (code in 200..299) connection.inputStream else connection.errorStream)?.close() } catch (_: Exception) {}
            when {
                code in 200..299 -> UploadResult.SUCCESS
                code == 401 || code == 403 -> UploadResult.AUTH_FAILURE
                else -> UploadResult.RETRY
            }
        } catch (error: Exception) {
            Log.w(TAG, "GPS upload failed; packet retained.", error)
            UploadResult.RETRY
        } finally {
            connection?.disconnect()
        }
    }

    private fun scheduleRetry() {
        if (!retryScheduled.compareAndSet(false, true)) return
        val delay = retryDelayMs
        retryDelayMs = (retryDelayMs * 2).coerceAtMost(RETRY_MAX_MS)
        network.schedule({
            retryScheduled.set(false)
            flushQueue()
        }, delay, TimeUnit.MILLISECONDS)
    }

    private fun stopForAuthFailure() {
        Log.w(TAG, "Native GPS device session is no longer authorized; queue retained.")
        running = false
        refreshNotification("Sesión GPS vencida · abre ManeComb")
        try { locationManager.removeUpdates(this) } catch (_: Exception) {}
    }

    private fun refreshNotification(text: String = "GPS activo · " + store.countQueued() + " pendientes") {
        try {
            val manager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
            manager.notify(NOTIFICATION_ID, notification(text))
        } catch (_: Exception) {}
    }

    private fun createChannel() {
        val manager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        manager.createNotificationChannel(NotificationChannel(CHANNEL_ID, "ManeComb GPS", NotificationManager.IMPORTANCE_LOW))
    }

    private fun notification(text: String): Notification =
        Notification.Builder(this, CHANNEL_ID)
            .setContentTitle("ManeComb en ruta")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setOngoing(true)
            .build()

    override fun onDestroy() {
        running = false
        pendingCount = store.countQueued()
        try { locationManager.removeUpdates(this) } catch (_: Exception) {}
        try { connectivityManager.unregisterNetworkCallback(callback) } catch (_: Exception) {}
        network.shutdown()
        store.close()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
    override fun onProviderEnabled(provider: String) {}
    override fun onProviderDisabled(provider: String) {}
    @Deprecated("Deprecated in Android")
    override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}

    private enum class UploadResult { SUCCESS, RETRY, AUTH_FAILURE }
}
