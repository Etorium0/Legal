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
import kotlinx.coroutines.Job
import android.content.pm.ServiceInfo
import android.os.Build
import android.util.Log
import android.Manifest
import android.content.pm.PackageManager

class HotwordService : LifecycleService() {
    private val TAG = "HotwordService"
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val hotword by lazy { HotwordDetector(this) }
    private val asr by lazy { StreamingAsr(this) }
    private val socket by lazy { AssistantSocket() }
    private val notifier by lazy { NotificationHelper(this) }
    private var hotwordJob: Job? = null

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "onCreate: Service starting")
        socket.connect()

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            Log.e(TAG, "RECORD_AUDIO permission missing")
            stopSelf()
            return
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                startForeground(
                    NotificationHelper.NOTIF_ID, 
                    notifier.build("Đang nghe 'Hey Nova'"),
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
                )
            } else {
                startForeground(NotificationHelper.NOTIF_ID, notifier.build("Đang nghe 'Hey Nova'"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start foreground service", e)
            stopSelf()
            return
        }
        startHotwordLoop()
    }

    private fun startHotwordLoop() {
        Log.d(TAG, "Starting hotword loop")
        hotwordJob?.cancel()
        hotwordJob = scope.launch { 
             hotword.listen { detected ->
                 if (detected) {
                     Log.d(TAG, "Hotword detected in Service")
                     hotword.stop() // Pause hotword to free mic
                     val json = "{\"type\":\"wake\",\"ts\":" + System.currentTimeMillis() + "}"
                     broadcast(json)
                     socket.send(WakeEvent())
                     
                     // Add delay to ensure mic is released before starting capture
                     scope.launch {
                        kotlinx.coroutines.delay(300)
                        startCapture()
                     }
                 }
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
                startHotwordLoop() // Restart hotword
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
        intent.setPackage(packageName)
        intent.putExtra("payload", json)
        sendBroadcast(intent)
        Log.d(TAG, "Broadcast sent: $json")
    }

    companion object {
        fun launch(ctx: Context) {
            val intent = Intent(ctx, HotwordService::class.java)
            ContextCompat.startForegroundService(ctx, intent)
        }
    }
}
