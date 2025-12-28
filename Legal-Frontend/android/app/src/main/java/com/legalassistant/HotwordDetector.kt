package com.legalassistant

import android.content.Context
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.Manifest
import android.content.pm.PackageManager
import androidx.core.app.ActivityCompat
import kotlinx.coroutines.isActive
import kotlinx.coroutines.yield
import org.vosk.Model
import org.vosk.Recognizer
import org.vosk.android.StorageService
import java.io.IOException

import android.util.Log

class HotwordDetector(private val context: Context) {
    private val TAG = "HotwordDetector"
    private val sampleRate = 16000
    private val bufferSize = 4096
    
    private var recorder: AudioRecord? = null
    private var recognizer: Recognizer? = null
    private var model: Model? = null
    @Volatile private var isRunning = false

    fun stop() {
        isRunning = false
        try {
            recorder?.stop()
            recorder?.release()
            recorder = null
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    suspend fun listen(onWake: (Boolean) -> Unit) {
        Log.d(TAG, "Starting listen...")
        if (model == null) {
            try {
                // Load model from assets/vosk-model-small-vn-0.4
                Log.d(TAG, "Loading model...")
                val modelPath = StorageService.sync(context, "vosk-model-small-vn-0.4", "model-vn")
                Log.d(TAG, "Sync complete. Path: $modelPath")
                
                // Verify model files exist
                val modelConf = java.io.File(modelPath, "conf/model.conf")
                if (!modelConf.exists()) {
                     Log.e(TAG, "Model conf not found at: ${modelConf.absolutePath}")
                } else {
                     Log.d(TAG, "Model conf found, initializing Model...")
                }

                model = Model(modelPath)
                Log.d(TAG, "Model loaded successfully")
                
                // Initialize recognizer with grammar for specific wake words
                // Relaxed grammar for testing, or check if words exist
                recognizer = Recognizer(model, sampleRate.toFloat(), "[\"chào trợ lý\", \"hê lô nô va\", \"hey nova\", \"nova ơi\", \"nô va\", \"trợ lý ơi\", \"ê nô va\"]")
                Log.d(TAG, "Recognizer initialized")
            } catch (e: IOException) {
                Log.e(TAG, "Failed to load model", e)
                e.printStackTrace()
                return
            }
        }

        try {
            if (recorder != null) {
                try { recorder?.release() } catch(e: Exception) {}
            }
            recorder = AudioRecord(
                MediaRecorder.AudioSource.VOICE_RECOGNITION,
                sampleRate,
                AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT,
                bufferSize
            )
            
            if (recorder?.state != AudioRecord.STATE_INITIALIZED) {
                Log.e(TAG, "AudioRecord not initialized")
                return
            }
            
            val buffer = ByteArray(bufferSize)
            recorder?.startRecording()
            Log.d(TAG, "Recording started")
            isRunning = true

            while (kotlin.coroutines.coroutineContext.isActive && isRunning) {
                val nread = recorder?.read(buffer, 0, buffer.size) ?: 0
                if (nread > 0) {
                    if (recognizer?.acceptWaveForm(buffer, nread) == true) {
                        val result = recognizer?.result ?: ""
                        Log.d(TAG, "Result: $result")
                        // Check if result contains any of our wake words
                        if (result.contains("hey nova") || result.contains("hê lô nô va") || result.contains("chào trợ lý") || result.contains("nova ơi") || result.contains("nô va") || result.contains("trợ lý ơi") || result.contains("ê nô va")) {
                             Log.d(TAG, "Wake word detected!")
                             onWake(true)
                             recognizer?.reset()
                        }
                    } else {
                        // Uncomment for debugging partial results
                        // Log.d(TAG, "Partial: " + recognizer?.partialResult)
                    }
                }
                yield()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error in listen loop", e)
            e.printStackTrace()
        } finally {
            stop()
        }
    }
}
