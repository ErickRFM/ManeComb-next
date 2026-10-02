package com.manecomb.location

object ManeCombLocationCadence {
    const val GPS_REQUEST_INTERVAL_MS = 3_000L
    const val NETWORK_REQUEST_INTERVAL_MS = 5_000L
    const val MIN_PACKET_INTERVAL_MS = 2_500L
    const val MAX_ACCEPTED_ACCURACY_METERS = 120f

    fun shouldEnqueue(
        nowElapsedRealtimeMs: Long,
        lastEnqueuedElapsedRealtimeMs: Long,
        accuracyMeters: Float?
    ): Boolean {
        if (
            accuracyMeters != null &&
            accuracyMeters.isFinite() &&
            accuracyMeters > MAX_ACCEPTED_ACCURACY_METERS
        ) return false

        if (lastEnqueuedElapsedRealtimeMs <= 0L) return true
        return nowElapsedRealtimeMs - lastEnqueuedElapsedRealtimeMs >= MIN_PACKET_INTERVAL_MS
    }
}
