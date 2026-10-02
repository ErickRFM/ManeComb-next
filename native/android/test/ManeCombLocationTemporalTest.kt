package com.manecomb.location

import org.junit.Assert.*
import org.junit.Test

class ManeCombLocationTemporalTest {
    @Test fun backlogUsesOriginalMonotonicCapture() {
        val evidence = ManeCombLocationTemporal.forUpload(1000L, 9, 901000L, 9)
        assertEquals(900000L, evidence.queueAgeMs)
        assertEquals("android_elapsed_realtime", evidence.queueAgeSource)
    }
    @Test fun persistedCaptureStillMeasuresAgeAfterProcessRecreation() {
        assertEquals(1200000L, ManeCombLocationTemporal.forUpload(1000L, 9, 1201000L, 9).queueAgeMs)
    }
    @Test fun rebootNeverUsesElapsedTimeFromPreviousBoot() {
        val evidence = ManeCombLocationTemporal.forUpload(100000L, 9, 1000L, 10)
        assertNull(evidence.queueAgeMs)
        assertEquals("unknown", evidence.queueAgeSource)
    }
    @Test fun unavailableBootEvidenceIsNotTrusted() {
        assertEquals("unknown", ManeCombLocationTemporal.forUpload(1000L, null, 2000L, null).queueAgeSource)
    }
    @Test fun legacyPersistedQueueDoesNotInventCaptureEvidence() {
        assertNull(ManeCombLocationTemporal.forUpload(null, null, 2000L, 9).queueAgeMs)
    }
    @Test fun reversedMonotonicEvidenceIsNotTrusted() {
        assertNull(ManeCombLocationTemporal.forUpload(3000L, 9, 2000L, 9).queueAgeMs)
    }
    @Test fun retryIncreasesAgeInsteadOfRenewingCapture() {
        assertEquals(1000L, ManeCombLocationTemporal.forUpload(1000L, 9, 2000L, 9).queueAgeMs)
        assertEquals(5000L, ManeCombLocationTemporal.forUpload(1000L, 9, 6000L, 9).queueAgeMs)
    }
}
