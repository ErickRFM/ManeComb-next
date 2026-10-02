package com.manecomb.location

data class NativeQueueAgeEvidence(val queueAgeMs: Long?, val queueAgeSource: String)

object ManeCombLocationTemporal {
    fun forUpload(capturedElapsedMs: Long?, capturedBootCount: Int?, sentElapsedMs: Long, bootCount: Int?): NativeQueueAgeEvidence {
        val sameBoot = capturedBootCount != null && bootCount != null && capturedBootCount == bootCount
        if (!sameBoot || capturedElapsedMs == null || capturedElapsedMs < 0L || sentElapsedMs < capturedElapsedMs) {
            return NativeQueueAgeEvidence(null, "unknown")
        }
        return NativeQueueAgeEvidence(sentElapsedMs - capturedElapsedMs, "android_elapsed_realtime")
    }
}
