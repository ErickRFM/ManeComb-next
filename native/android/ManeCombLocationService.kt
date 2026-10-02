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
import android.os.SystemClock
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
        const val CONTRACT_VERSION = 2
        const val PREFS_NAME = "manecomb-native-location"
        const val ACTION_STATE = "com.manecomb.location.STATE"

        @Volatile var running: Boolean = false
        @Volatile var pendingCount: Int = 0
        @Volatile var serviceState: String = "stopped"
        @Volatile var networkAvailable: Boolean = false
        @Volatile var lastCaptureAtMs: Long = 0
        @Volatile var lastUploadAtMs: Long = 0
        @Volatile var currentRetryDelayMs: Long = 0
        @Volatile var lastError: String = ""

        private const val TAG = "ManeCombLocation"
        private const val CHANNEL_ID = "manecomb_location"
        private const val NOTIFICATION_ID = 4101
        private const val RETRY_BASE_MS = 5_000L
        private const val RETRY_MAX_MS = 60_000L

        fun emitState(context: Context) {
            val intent = Intent(ACTION_STATE).apply {
                setPackage(context.packageName)
                putExtra("contractVersion", CONTRACT_VERSION)
                putExtra("state", serviceState)
                putExtra("running", running)
                putExtra("pendingPackets", pendingCount)
                putExtra("networkAvailable", networkAvailable)
                putExtra("lastCaptureAtMs", lastCaptureAtMs)
                putExtra("lastUploadAtMs", lastUploadAtMs)
                putExtra("retryDelayMs", currentRetryDelayMs)
                putExtra("lastError", lastError)
            }
            context.sendBroadcast(intent)
        }
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
    private var lastEnqueuedElapsedRealtimeMs = 0L
    private var callbackRegistered = false

    private val callback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) {
            networkAvailable = true
            if (serviceState == "offline" || serviceState == "retry_wait") serviceState = "running"
            emitState(this@ManeCombLocationService)
            flushQueue()
        }

        override fun onLost(network: Network) {
            networkAvailable = connectivityManager.activeNetwork != null
            if (!networkAvailable) {
                serviceState = "offline"
                lastError = "network_unavailable"
            }
            emitState(this@ManeCombLocationService)
        }
    }

    override fun onCreate() {
        super.onCreate()
        serviceState = "created"
        locationManager = getSystemService(LOCATION_SERVICE) as LocationManager
        connectivityManager = getSystemService(CONNECTIVITY_SERVICE) as ConnectivityManager
        networkAvailable = connectivityManager.activeNetwork != null
        store = ManeCombLocationStore(this)
        pendingCount = store.countQueued()
        createChannel()
        emitState(this)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val incomingToken = intent?.getStringExtra("deviceToken").orEmpty()

        if (incomingToken.isNotBlank() && !ManeCombLocationCredentials.writeToken(prefs, incomingToken)) {
            serviceState = "secure_store_error"
            lastError = "credential_write_failed"
            emitState(this)
            stopSelf()
            return START_NOT_STICKY
        }

        serverUrl = intent?.getStringExtra("serverUrl") ?: prefs.getString("serverUrl", "").orEmpty()
        vehicleId = intent?.getStringExtra("vehicleId") ?: prefs.getString("vehicleId", "").orEmpty()
        journeyId = intent?.getStringExtra("journeyId") ?: prefs.getString("journeyId", "").orEmpty()
        deviceToken = if (incomingToken.isNotBlank()) incomingToken else ManeCombLocationCredentials.readToken(prefs).orEmpty()

        if (serverUrl.isBlank() || vehicleId.isBlank() || journeyId.isBlank() || deviceToken.isBlank()) {
            serviceState = "invalid_config"
            lastError = "native_tracking_config_missing"
            emitState(this)
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
            .putString("owner", currentOwner)
            .remove("deviceToken")
            .apply()

        startForeground(NOTIFICATION_ID, notification("GPS activo · " + store.countQueued() + " pendientes"))
        running = true
        serviceState = "running"
        lastError = ""
        pendingCount = store.countQueued()
        emitState(this)

        if (!callbackRegistered) {
            try {
                connectivityManager.registerDefaultNetworkCallback(callback)
                callbackRegistered = true
            } catch (error: Exception) {
                Log.w(TAG, "Could not register network callback", error)
            }
        }

        try {
            try { locationManager.removeUpdates(this) } catch (_: Exception) {}
            locationManager.requestLocationUpdates(
                LocationManager.GPS_PROVIDER,
                ManeCombLocationCadence.GPS_REQUEST_INTERVAL_MS,
                3f,
                this
            )
            if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                locationManager.requestLocationUpdates(
                    LocationManager.NETWORK_PROVIDER,
                    ManeCombLocationCadence.NETWORK_REQUEST_INTERVAL_MS,
                    5f,
                    this
                )
            }
        } catch (error: SecurityException) {
            Log.w(TAG, "Location permission missing", error)
            serviceState = "permission_error"
            lastError = "location_permission_missing"
            emitState(this)
            stopSelf()
            return START_NOT_STICKY
        }

        flushQueue()
        return START_STICKY
    }

    override fun onLocationChanged(location: Location) {
        val accuracy = if (location.hasAccuracy()) location.accuracy else null
        val elapsed = if (location.elapsedRealtimeNanos > 0L) {
            location.elapsedRealtimeNanos / 1_000_000L
        } else {
            SystemClock.elapsedRealtime()
        }
        if (!ManeCombLocationCadence.shouldEnqueue(elapsed, lastEnqueuedElapsedRealtimeMs, accuracy)) return
        lastEnqueuedElapsedRealtimeMs = elapsed

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
            if (accuracy != null) put("accuracy", accuracy.toDouble())
            put("recordedAt", Instant.ofEpochMilli(capturedAt).toString())
        }

        store.enqueue(packetId, payload.toString(), capturedAt)
        lastCaptureAtMs = capturedAt
        pendingCount = store.countQueued()
        serviceState = if (networkAvailable) "running" else "offline"
        refreshNotification()
        emitState(this)
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
                            currentRetryDelayMs = 0
                            retryScheduled.set(false)
                            lastUploadAtMs = System.currentTimeMillis()
                            lastError = ""
                            serviceState = "running"
                            refreshNotification()
                            emitState(this@ManeCombLocationService)
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
            lastError = "telemetry_unreachable"
            networkAvailable = connectivityManager.activeNetwork != null
            UploadResult.RETRY
        } finally {
            connection?.disconnect()
        }
    }

    private fun scheduleRetry() {
        if (!retryScheduled.compareAndSet(false, true)) return
        val delay = retryDelayMs
        currentRetryDelayMs = delay
        serviceState = if (networkAvailable) "retry_wait" else "offline"
        emitState(this)
        retryDelayMs = (retryDelayMs * 2).coerceAtMost(RETRY_MAX_MS)
        network.schedule({
            retryScheduled.set(false)
            currentRetryDelayMs = 0
            flushQueue()
        }, delay, TimeUnit.MILLISECONDS)
    }

    private fun stopForAuthFailure() {
        Log.w(TAG, "Native GPS device session is no longer authorized; queue retained.")
        ManeCombLocationCredentials.clearToken(getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE))
        running = false
        serviceState = "auth_failed"
        lastError = "device_session_unauthorized"
        refreshNotification("Sesión GPS vencida · abre ManeComb")
        try { locationManager.removeUpdates(this) } catch (_: Exception) {}
        emitState(this)
        stopSelf()
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
        pendingCount = try { store.countQueued() } catch (_: Exception) { pendingCount }
        if (serviceState != "auth_failed" && serviceState != "secure_store_error" && serviceState != "permission_error") {
            serviceState = "stopped"
        }
        currentRetryDelayMs = 0
        try { locationManager.removeUpdates(this) } catch (_: Exception) {}
        if (callbackRegistered) {
            try { connectivityManager.unregisterNetworkCallback(callback) } catch (_: Exception) {}
            callbackRegistered = false
        }
        emitState(this)
        network.shutdown()
        store.close()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onProviderEnabled(provider: String) {
        if (running) {
            lastError = ""
            serviceState = if (networkAvailable) "running" else "offline"
            emitState(this)
        }
    }

    override fun onProviderDisabled(provider: String) {
        lastError = "provider_disabled:" + provider
        emitState(this)
    }

    @Deprecated("Deprecated in Android")
    override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}

    private enum class UploadResult { SUCCESS, RETRY, AUTH_FAILURE }
}
