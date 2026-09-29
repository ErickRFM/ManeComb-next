package com.manecomb.location

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Bundle
import android.os.IBinder
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

class ManeCombLocationService : Service(), LocationListener {
    companion object { @Volatile var running: Boolean = false }

    private lateinit var locationManager: LocationManager
    private val network = Executors.newSingleThreadExecutor()
    private var serverUrl: String = ""
    private var vehicleId: String = ""
    private var journeyId: String? = null
    private var cookie: String = ""

    override fun onCreate() {
        super.onCreate()
        locationManager = getSystemService(LOCATION_SERVICE) as LocationManager
        createChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        serverUrl = intent?.getStringExtra("serverUrl") ?: return START_NOT_STICKY
        vehicleId = intent.getStringExtra("vehicleId") ?: return START_NOT_STICKY
        journeyId = intent.getStringExtra("journeyId")
        cookie = intent.getStringExtra("cookie") ?: return START_NOT_STICKY

        startForeground(4101, notification())
        running = true
        try {
            locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 3000L, 3f, this)
            if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                locationManager.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 5000L, 5f, this)
            }
        } catch (_: SecurityException) {
            stopSelf()
        }
        return START_STICKY
    }

    override fun onLocationChanged(location: Location) {
        val payload = JSONObject().apply {
            put("vehicleId", vehicleId)
            if (!journeyId.isNullOrBlank()) put("journeyId", journeyId)
            put("latitude", location.latitude)
            put("longitude", location.longitude)
            put("speedMps", location.speed.toDouble())
            put("heading", location.bearing.toDouble())
            put("accuracy", location.accuracy.toDouble())
            put("recordedAt", java.time.Instant.ofEpochMilli(location.time).toString())
        }
        network.execute { postTelemetry(payload.toString()) }
    }

    private fun postTelemetry(body: String) {
        var connection: HttpURLConnection? = null
        try {
            connection = URL(serverUrl.trimEnd('/') + "/api/locations/telemetry").openConnection() as HttpURLConnection
            connection.requestMethod = "POST"
            connection.connectTimeout = 10000
            connection.readTimeout = 10000
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("Cookie", cookie)
            connection.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
            connection.inputStream.use { it.readBytes() }
        } catch (_: Exception) {
            connection?.errorStream?.close()
        } finally {
            connection?.disconnect()
        }
    }

    private fun createChannel() {
        val manager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        manager.createNotificationChannel(NotificationChannel("manecomb_location", "ManeComb GPS", NotificationManager.IMPORTANCE_LOW))
    }

    private fun notification(): Notification =
        Notification.Builder(this, "manecomb_location")
            .setContentTitle("ManeComb en ruta")
            .setContentText("La ubicación de la unidad se está compartiendo con la central.")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setOngoing(true)
            .build()

    override fun onDestroy() {
        running = false
        try { locationManager.removeUpdates(this) } catch (_: Exception) {}
        network.shutdown()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
    override fun onProviderEnabled(provider: String) {}
    override fun onProviderDisabled(provider: String) {}
    @Deprecated("Deprecated in Android")
    override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
}
