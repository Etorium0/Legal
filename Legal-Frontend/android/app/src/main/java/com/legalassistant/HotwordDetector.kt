package com.legalassistant

import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import kotlinx.coroutines.isActive
import kotlinx.coroutines.yield

class HotwordDetector {
    private val sampleRate = 16000
    private val frameLength = 512 // đổi theo engine thực (Porcupine/Vosk)
    private val minBuf = AudioRecord.getMinBufferSize(
        sampleRate,
        AudioFormat.CHANNEL_IN_MONO,
        AudioFormat.ENCODING_PCM_16BIT
    )

    private var recorder: AudioRecord? = null
    private var engine: HotwordEngine? = null // TODO: gắn engine thật

    suspend fun listen(onWake: (Boolean) -> Unit) {
        engine = HotwordEngine()
        recorder = AudioRecord(
            MediaRecorder.AudioSource.VOICE_RECOGNITION,
            sampleRate,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT,
            minBuf
        )
        val buf = ShortArray(frameLength)
        recorder?.startRecording()
        while (kotlin.coroutines.coroutineContext.isActive) {
            val n = recorder?.read(buf, 0, buf.size) ?: 0
            if (n > 0 && engine?.process(buf) == true) {
                onWake(true)
            }
            yield()
        }
    }

    fun stop() {
        recorder?.stop()
        recorder?.release()
        engine?.release()
    }
}

class HotwordEngine {
    private var lastTriggeredMs: Long = 0
    private val cooldownMs = 2000
    private val rmsThreshold = 800.0 // ngưỡng năng lượng đơn giản

    fun process(frame: ShortArray): Boolean {
        val now = System.currentTimeMillis()
        if (now - lastTriggeredMs < cooldownMs) {
            return false
        }
        var sumSq = 0.0
        for (s in frame) {
            sumSq += (s * s).toDouble()
        }
        val rms = kotlin.math.sqrt(sumSq / frame.size)
        if (rms > rmsThreshold) {
            lastTriggeredMs = now
            return true
        }
        return false
    }
    fun release() {}
}
