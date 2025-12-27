package com.legalassistant

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat

class NotificationHelper(private val ctx: Context) {
    companion object { const val CHANNEL_ID = "hotword_channel"; const val NOTIF_ID = 101 }

    init { ensureChannel() }

    private fun ensureChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val mgr = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val channel = NotificationChannel(CHANNEL_ID, "Hotword", NotificationManager.IMPORTANCE_LOW)
            mgr.createNotificationChannel(channel)
        }
    }

    fun build(content: String): Notification = NotificationCompat.Builder(ctx, CHANNEL_ID)
        .setContentTitle("Trợ lý pháp lý")
        .setContentText(content)
        .setSmallIcon(android.R.drawable.ic_btn_speak_now)
        .setOngoing(true)
        .build()
}
