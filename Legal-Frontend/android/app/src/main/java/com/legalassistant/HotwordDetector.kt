package com.legalassistant

import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import kotlinx.coroutines.isActive
import kotlinx.coroutines.yield

class HotwordDetector {
    private val sampleRate = 16000
    private val frameLength = 512
    private val minBuf = AudioRecord.getMinBufferSize(
        sampleRate,
        AudioFormat.CHANNEL_IN_MONO,
        AudioFormat.ENCODING_PCM_16BIT
    )

    private var recorder: AudioRecord? = null
    private var engine: HotwordEngine? = null
    @Volatile private var isRunning = false

    suspend fun listen(onWake: (Boolean) -> Unit) {
        if (minBuf == AudioRecord.ERROR || minBuf == AudioRecord.ERROR_BAD_VALUE) {
            return
        }
        engine = HotwordEngine()
        try {
            recorder = AudioRecord(
                MediaRecorder.AudioSource.VOICE_RECOGNITION,
                sampleRate,
                AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT,
                minBuf
            )
            if (recorder?.state != AudioRecord.STATE_INITIALIZED) {
                return
            }
            
            val buf = ShortArray(frameLength)
            recorder?.startRecording()
            isRunning = true

            while (kotlin.coroutines.coroutineContext.isActive && isRunning) {
                val n = recorder?.read(buf, 0, buf.size) ?: 0
                if (n > 0 && engine?.process(buf) == true) {
                    onWake(true)
                    // If onWake decides to stop, isRunning might be set to false by stop()
                    // But usually onWake will trigger a sequence that eventually calls stop()
                }
                yield()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        } finally {
            stop()
        }
    }

    fun stop() {
        isRunning = false
        try {
            recorder?.stop()
            recorder?.release()
        } catch (e: Exception) { }
        recorder = null
        engine?.release()
    }
}

class HotwordEngine {
    private var lastTriggeredMs: Long = 0
    private val cooldownMs = 2000
    private val rmsThreshold = 2000.0 // Increased threshold to avoid false positives

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
