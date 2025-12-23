package com.legalassistant

import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

class HotwordService : LifecycleService() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val hotword by lazy { HotwordDetector() }
    private val asr by lazy { StreamingAsr() }
    private val socket by lazy { AssistantSocket() }
    private val notifier by lazy { NotificationHelper(this) }

    override fun onCreate() {
        super.onCreate()
        socket.connect()
        startForeground(NotificationHelper.NOTIF_ID, notifier.build("Đang nghe 'Hey Nova'"))
        scope.launch { hotwordLoop() }
    }

    private suspend fun hotwordLoop() {
        hotword.listen { detected ->
            if (detected) {
                val json = "{\"type\":\"wake\",\"ts\":" + System.currentTimeMillis() + "}"
                broadcast(json)
                socket.send(WakeEvent())
                startCapture()
            }
        }
    }

    private fun startCapture() {
        asr.start(
            onPartial = {
                val json = "{\"type\":\"asr_partial\",\"text\":\"${it}\"}"
                broadcast(json)
                socket.send(PartialTranscript(it))
            },
            onFinal = { text ->
                val json = "{\"type\":\"asr_final\",\"text\":\"${text}\"}"
                broadcast(json)
                socket.send(FinalTranscript(text))
                asr.stop()
            }
        )
    }

    override fun onDestroy() {
        scope.cancel()
        hotword.stop()
        asr.stop()
        super.onDestroy()
    }

    private fun broadcast(json: String) {
        val intent = Intent("com.legalassistant.ASSISTANT_EVENT")
        intent.putExtra("payload", json)
        sendBroadcast(intent)
    }

    companion object {
        fun launch(ctx: Context) {
            val intent = Intent(ctx, HotwordService::class.java)
            ContextCompat.startForegroundService(ctx, intent)
        }
    }
}
