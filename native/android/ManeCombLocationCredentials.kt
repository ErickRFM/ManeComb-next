package com.manecomb.location

import android.content.SharedPreferences
import android.util.Log

object ManeCombLocationCredentials {
    private const val TAG = "ManeCombLocationCreds"
    private const val KEY_ALIAS = "manecomb-location-device-token-v2"
    private const val KEY_TOKEN_ENCRYPTED = "deviceTokenEncrypted"
    private const val LEGACY_TOKEN = "deviceToken"

    fun writeToken(prefs: SharedPreferences, token: String): Boolean {
        if (token.isBlank()) return false
        return try {
            val encrypted = ManeCombSecureStore.encrypt(KEY_ALIAS, token)
            prefs.edit()
                .putString(KEY_TOKEN_ENCRYPTED, encrypted)
                .remove(LEGACY_TOKEN)
                .commit()
        } catch (error: Exception) {
            Log.e(TAG, "Could not encrypt native telemetry credential.", error)
            clearToken(prefs)
            false
        }
    }

    fun readToken(prefs: SharedPreferences): String? {
        val encrypted = prefs.getString(KEY_TOKEN_ENCRYPTED, "").orEmpty()
        if (encrypted.isNotBlank()) {
            return try {
                ManeCombSecureStore.decrypt(KEY_ALIAS, encrypted)
            } catch (error: Exception) {
                Log.e(TAG, "Could not decrypt native telemetry credential.", error)
                clearToken(prefs)
                null
            }
        }

        val legacy = prefs.getString(LEGACY_TOKEN, "").orEmpty()
        if (legacy.isBlank()) return null
        return if (writeToken(prefs, legacy)) legacy else null
    }

    fun clearToken(prefs: SharedPreferences) {
        prefs.edit().remove(KEY_TOKEN_ENCRYPTED).remove(LEGACY_TOKEN).apply()
    }
}
