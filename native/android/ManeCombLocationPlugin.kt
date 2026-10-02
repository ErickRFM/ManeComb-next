package com.manecomb.location

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import java.net.URI

@CapacitorPlugin(
    name = "ManeCombLocation",
    permissions = [
        Permission(
            alias = "location",
            strings = [
                Manifest.permission.ACCESS_COARSE_LOCATION,
                Manifest.permission.ACCESS_FINE_LOCATION
            ]
        )
    ]
)
class ManeCombLocationPlugin : Plugin() {
    private var receiverRegistered = false

    private val stateReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action != ManeCombLocationService.ACTION_STATE) return
            notifyListeners("trackingState", statusPayload())
        }
    }

    override fun load() {
        super.load()
        if (!receiverRegistered) {
            ContextCompat.registerReceiver(
                context,
                stateReceiver,
                IntentFilter(ManeCombLocationService.ACTION_STATE),
                ContextCompat.RECEIVER_NOT_EXPORTED
            )
            receiverRegistered = true
        }
    }

    override fun handleOnDestroy() {
        if (receiverRegistered) {
            try { context.unregisterReceiver(stateReceiver) } catch (_: Exception) {}
            receiverRegistered = false
        }
        super.handleOnDestroy()
    }

    @com.getcapacitor.PluginMethod
    fun start(call: PluginCall) {
        if (getPermissionState("location") != PermissionState.GRANTED) {
            requestPermissionForAlias("location", call, "locationPermissionCallback")
            return
        }
        startAuthorized(call)
    }

    @PermissionCallback
    fun locationPermissionCallback(call: PluginCall) {
        if (getPermissionState("location") != PermissionState.GRANTED) {
            call.reject("Precise location permission is required for ManeComb tracking")
            return
        }
        startAuthorized(call)
    }

    private fun startAuthorized(call: PluginCall) {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            call.reject("Precise location permission is required for ManeComb tracking")
            return
        }

        val serverUrl = call.getString("serverUrl") ?: return call.reject("serverUrl is required")
        val vehicleId = call.getString("vehicleId") ?: return call.reject("vehicleId is required")
        val journeyId = call.getString("journeyId") ?: return call.reject("journeyId is required")
        val deviceToken = call.getString("deviceToken") ?: return call.reject("deviceToken is required")

        val uri = try { URI(serverUrl) } catch (_: Exception) { return call.reject("Invalid serverUrl") }
        if (uri.scheme != "https" && uri.host != "10.0.2.2" && uri.host != "localhost" && uri.host != "127.0.0.1") {
            return call.reject("Native telemetry requires HTTPS outside local development")
        }

        context.getSharedPreferences(ManeCombLocationService.PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putBoolean("restartAllowed", true)
            .putString("lastStopReason", "")
            .apply()

        val intent = Intent(context, ManeCombLocationService::class.java).apply {
            putExtra("serverUrl", serverUrl)
            putExtra("vehicleId", vehicleId)
            putExtra("journeyId", journeyId)
            putExtra("deviceToken", deviceToken)
        }
        ContextCompat.startForegroundService(context, intent)
        call.resolve(JSObject().put("started", true))
    }

    @com.getcapacitor.PluginMethod
    fun stop(call: PluginCall) {
        context.getSharedPreferences(ManeCombLocationService.PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putBoolean("restartAllowed", false)
            .putString("lastStopReason", "MANUAL")
            .apply()
        context.stopService(Intent(context, ManeCombLocationService::class.java))
        call.resolve(JSObject().put("stopped", true))
    }

    @com.getcapacitor.PluginMethod
    fun status(call: PluginCall) {
        call.resolve(statusPayload())
    }

    private fun statusPayload(): JSObject {
        val prefs = context.getSharedPreferences(ManeCombLocationService.PREFS_NAME, Context.MODE_PRIVATE)
        val precise = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        return JSObject()
            .put("running", ManeCombLocationService.running)
            .put("serviceState", ManeCombLocationService.serviceState)
            .put("pendingPackets", ManeCombLocationService.pendingCount)
            .put("networkState", ManeCombLocationService.networkState)
            .put("lastCaptureAt", ManeCombLocationService.lastCaptureAt.takeIf { it > 0L })
            .put("lastUploadAt", ManeCombLocationService.lastUploadAt.takeIf { it > 0L })
            .put("retryDelayMs", ManeCombLocationService.currentRetryDelayMs)
            .put("trackingVersion", ManeCombLocationService.TRACKING_VERSION)
            .put("permissionState", if (precise) "GRANTED" else "DENIED")
            .put("lastStopReason", prefs.getString("lastStopReason", "")?.takeIf { it.isNotBlank() })
    }

    @com.getcapacitor.PluginMethod
    fun appInfo(call: PluginCall) {
        try {
            val packageInfo = context.packageManager.getPackageInfo(context.packageName, 0)
            val versionCode =
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
                    packageInfo.longVersionCode
                } else {
                    @Suppress("DEPRECATION")
                    packageInfo.versionCode.toLong()
                }
            call.resolve(
                JSObject()
                    .put("versionName", packageInfo.versionName ?: "0.0.0")
                    .put("versionCode", versionCode)
            )
        } catch (error: Exception) {
            call.reject("Could not read app version", error)
        }
    }
}
