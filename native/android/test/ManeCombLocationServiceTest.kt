package com.manecomb.location

import android.net.ConnectivityManager
import java.net.ServerSocket
import java.net.InetAddress
import java.util.ArrayDeque
import java.util.concurrent.CountDownLatch
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.mockito.Mockito.*

/** Real service/HTTP control flow; only Android infrastructure and SQLite are mocked. */
class ManeCombLocationServiceTest {
    private lateinit var service: ManeCombLocationService
    private lateinit var store: ManeCombLocationStore
    private lateinit var server: ServerSocket
    private lateinit var serverThread: Thread
    private lateinit var executor: ScheduledExecutorService
    private val queue = ArrayDeque<QueuedLocation>()
    private val requests = AtomicInteger(0)
    private var destroyed = false
    private var responseCode = 200
    private var entered: CountDownLatch? = null
    private var release: CountDownLatch? = null

    private fun field(name: String) = ManeCombLocationService::class.java.getDeclaredField(name).apply { isAccessible = true }
    private fun flush() = ManeCombLocationService::class.java.getDeclaredMethod("flushQueue").apply { isAccessible = true }.invoke(service)
    private fun drainExecutor() { executor.submit {}.get(3, TimeUnit.SECONDS) }
    private fun payload(id: String) = """{"packetId":"$id","vehicleId":"qa","journeyId":"qa","latitude":20,"longitude":-99,"recordedAt":"2026-10-02T00:00:00Z"}"""

    @Before fun setup() {
        service = ManeCombLocationService()
        store = mock(ManeCombLocationStore::class.java)
        `when`(store.peek()).thenAnswer { queue.peekFirst() }
        `when`(store.countQueued()).thenAnswer { queue.size }
        doAnswer { invocation -> queue.removeIf { it.id == invocation.getArgument<Long>(0) }; null }.`when`(store).remove(anyLong())
        field("store").set(service, store)
        field("connectivityManager").set(service, mock(ConnectivityManager::class.java))
        field("deviceToken").set(service, "mcdev_test_only")
        executor = field("network").get(service) as ScheduledExecutorService
        server = ServerSocket(0, 50, InetAddress.getByName("127.0.0.1"))
        serverThread = Thread {
            while (!server.isClosed) {
                val socket = try { server.accept() } catch (_: Exception) { break }
                socket.use {
                    val reader = it.getInputStream().bufferedReader()
                    var length = 0
                    while (true) {
                        val line = reader.readLine() ?: break
                        if (line.isEmpty()) break
                        if (line.startsWith("Content-Length:", true)) length = line.substringAfter(":").trim().toInt()
                    }
                    repeat(length) { reader.read() }
                    requests.incrementAndGet()
                    entered?.countDown()
                    release?.await(3, TimeUnit.SECONDS)
                    it.getOutputStream().write("HTTP/1.1 $responseCode Test\r\nContent-Length: 0\r\nConnection: close\r\n\r\n".toByteArray())
                }
            }
        }.apply { isDaemon = true; start() }
        field("serverUrl").set(service, "http://127.0.0.1:${server.localPort}")
        ManeCombLocationService.running = true
        ManeCombLocationService.serviceState = "running"
    }

    @After fun cleanup() {
        release?.countDown()
        if (!destroyed) service.onDestroy()
        executor.shutdownNow()
        executor.awaitTermination(3, TimeUnit.SECONDS)
        server.close()
        serverThread.join(3000)
        ManeCombLocationService.running = false
    }

    @Test fun captureCannotBypassPendingBackoff() {
        responseCode = 503
        queue.add(QueuedLocation(1, "first", payload("first")))
        (field("retryScheduled").get(service) as AtomicBoolean).set(true)
        flush()
        drainExecutor()
        assertEquals("No POST is allowed before the retry timer expires", 0, requests.get())
        assertEquals(1, queue.size)
    }

    @Test fun corruptHeadDoesNotBlockFollowingValidPacket() {
        queue.add(QueuedLocation(1, "broken", "{"))
        queue.add(QueuedLocation(2, "valid", payload("valid")))
        flush()
        drainExecutor()
        assertEquals("The valid successor must reach HTTP", 1, requests.get())
        assertTrue(queue.isEmpty())
        verify(store).remove(1)
        verify(store).remove(2)
    }

    @Test fun stopDuringPostPreventsNextPostAndStateResurrection() {
        entered = CountDownLatch(1)
        release = CountDownLatch(1)
        queue.add(QueuedLocation(1, "first", payload("first")))
        queue.add(QueuedLocation(2, "second", payload("second")))
        flush()
        assertTrue("First POST entered", entered!!.await(3, TimeUnit.SECONDS))
        service.onDestroy()
        destroyed = true
        release!!.countDown()
        assertTrue(executor.awaitTermination(3, TimeUnit.SECONDS))
        assertEquals("Stop must prevent a second POST", 1, requests.get())
        assertFalse(ManeCombLocationService.running)
        assertEquals("stopped", ManeCombLocationService.serviceState)
        verify(store, never()).remove(anyLong())
        assertEquals(2, queue.size)
    }
}
