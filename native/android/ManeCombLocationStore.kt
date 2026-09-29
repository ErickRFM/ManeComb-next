package com.manecomb.location

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper

data class QueuedLocation(val id: Long, val packetId: String, val payload: String)

class ManeCombLocationStore(context: Context) :
    SQLiteOpenHelper(context, "manecomb-location.db", null, 1) {

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL(
            "CREATE TABLE queue (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT," +
                "packet_id TEXT NOT NULL UNIQUE," +
                "payload TEXT NOT NULL," +
                "captured_at INTEGER NOT NULL)"
        )
        db.execSQL("CREATE INDEX queue_captured_at ON queue(captured_at)")
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) = Unit

    @Synchronized
    fun enqueue(packetId: String, payload: String, capturedAt: Long) {
        writableDatabase.execSQL(
            "INSERT OR IGNORE INTO queue(packet_id,payload,captured_at) VALUES(?,?,?)",
            arrayOf(packetId, payload, capturedAt)
        )
        prune()
    }

    @Synchronized
    fun peek(): QueuedLocation? {
        readableDatabase.rawQuery(
            "SELECT id,packet_id,payload FROM queue ORDER BY id ASC LIMIT 1",
            emptyArray()
        ).use { cursor ->
            if (!cursor.moveToFirst()) return null
            return QueuedLocation(cursor.getLong(0), cursor.getString(1), cursor.getString(2))
        }
    }

    @Synchronized
    fun remove(id: Long) {
        writableDatabase.delete("queue", "id=?", arrayOf(id.toString()))
    }

    @Synchronized
    fun countQueued(): Int =
        readableDatabase.rawQuery("SELECT COUNT(*) FROM queue", emptyArray()).use { cursor ->
            if (cursor.moveToFirst()) cursor.getInt(0) else 0
        }

    @Synchronized
    fun clear() {
        writableDatabase.delete("queue", null, null)
    }

    @Synchronized
    private fun prune() {
        val oldest = System.currentTimeMillis() - MAX_AGE_MS
        writableDatabase.delete("queue", "captured_at<?", arrayOf(oldest.toString()))
        writableDatabase.execSQL(
            "DELETE FROM queue WHERE id NOT IN (SELECT id FROM queue ORDER BY id DESC LIMIT " + MAX_ROWS + ")"
        )
    }

    companion object {
        private const val MAX_ROWS = 20_000
        private const val MAX_AGE_MS = 24L * 60L * 60L * 1000L
    }
}
