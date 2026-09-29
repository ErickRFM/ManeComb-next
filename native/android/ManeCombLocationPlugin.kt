package com.manecomb.location

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.webkit.CookieManager
import androidx.core.content.ContextCompat
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.annotation.CapacitorPlugin
import java.net.URI

@CapacitorPlugin(name = "ManeCombLocation")
class ManeCombLocationPlugin : Plugin() {
    @com.getcapacitor.PluginMethod
    fun start(call: PluginCall) {
        val serverUrl = call.getString("serverUrl") ?: return call.reject("serverUrl is required")
        val vehicleId = call.getString("vehicleId") ?: return call.reject("vehicleId is required")
        val journeyId = call.getString("journeyId")

        val uri = try { URI(serverUrl) } catch (_: Exception) { return call.reject("Invalid serverUrl") }
        if (uri.scheme != "https" && uri.host != "10.0.2.2" && uri.host != "localhost") {
            return call.reject("Native telemetry requires HTTPS outside local development")
        }

        val fine = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION)
        if (fine != PackageManager.PERMISSION_GRANTED) return call.reject("Location permission is required")

        val cookie = CookieManager.getInstance().getCookie(serverUrl) ?: return call.reject("Authenticated ManeComb cookie not found")
        val intent = Intent(context, ManeCombLocationService::class.java).apply {
            putExtra("serverUrl", serverUrl)
            putExtra("vehicleId", vehicleId)
            putExtra("journeyId", journeyId)
            putExtra("cookie", cookie)
        }
        ContextCompat.startForegroundService(context, intent)
        call.resolve(JSObject().put("started", true))
    }

    @com.getcapacitor.PluginMethod
    fun stop(call: PluginCall) {
        context.stopService(Intent(context, ManeCombLocationService::class.java))
        call.resolve(JSObject().put("stopped", true))
    }

    @com.getcapacitor.PluginMethod
    fun status(call: PluginCall) {
        call.resolve(JSObject().put("running", ManeCombLocationService.running))
    }
}
