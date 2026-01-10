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
        Log.d(TAG, "Stopping hotword detector")
        isRunning = false
        try {
            recorder?.stop()
            recorder?.release()
            recorder = null
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
    
    fun reset() {
        Log.d(TAG, "Resetting recognizer for next detection")
        recognizer?.reset()
    }

    suspend fun listen(onWake: (Boolean) -> Unit) {
        Log.d(TAG, "Starting listen...")
        if (model == null) {
            try {
                // Load model from assets/assets/vosk-model-vn-0.4
                Log.d(TAG, "Loading model...")
                val modelPath = StorageService.sync(context, "assets/vosk-model-vn-0.4", "model-vn")
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
                
                // Initialize recognizer without grammar - we'll check text manually
                // Model doesn't support runtime grammar, so we listen to all speech
                recognizer = Recognizer(model, sampleRate.toFloat())
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
            
            // Wake words - include variations that Vosk might recognize
            val wakeWords = listOf(
                "nova", "nô va", "nô-va", "no va", "nôva",
                "hey nova", "hê nova", "hây nova", "hei nova",
                "chào trợ lý", "chào trợ", "trợ lý", "trợ lý ơi",
                "xin chào", "ê trợ lý", "ê nova"
            )

            while (kotlin.coroutines.coroutineContext.isActive && isRunning) {
                val nread = recorder?.read(buffer, 0, buffer.size) ?: 0
                if (nread > 0) {
                    if (recognizer?.acceptWaveForm(buffer, nread) == true) {
                        val result = recognizer?.result ?: ""
                        Log.d(TAG, "Result: $result")
                        
                        // Extract text from JSON result  
                        val textMatch = Regex("\"text\"\\s*:\\s*\"([^\"]+)\"").find(result)
                        val text = textMatch?.groupValues?.get(1)?.lowercase() ?: ""
                        Log.d(TAG, "Recognized: $text")
                        
                        // Check if text contains any wake word
                        val detected = wakeWords.any { wake -> text.contains(wake) }
                        if (detected) {
                             Log.d(TAG, "*** WAKE WORD DETECTED! ***")
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
