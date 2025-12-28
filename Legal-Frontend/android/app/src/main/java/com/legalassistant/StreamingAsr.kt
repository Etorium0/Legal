package com.legalassistant

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.Manifest
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat

class StreamingAsr(private val context: Context) {
    private var speechRecognizer: SpeechRecognizer? = null
    private var isListening = false

    fun start(onPartial: (String) -> Unit, onFinal: (String) -> Unit) {
        Handler(Looper.getMainLooper()).post {
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                onFinal("Permission denied")
                return@post
            }

            if (isListening) return@post

            speechRecognizer = SpeechRecognizer.createSpeechRecognizer(context)
            speechRecognizer?.setRecognitionListener(object : RecognitionListener {
                override fun onReadyForSpeech(params: Bundle?) {}
                override fun onBeginningOfSpeech() {}
                override fun onRmsChanged(rmsdB: Float) {}
                override fun onBufferReceived(buffer: ByteArray?) {}
                override fun onEndOfSpeech() {}

                override fun onError(error: Int) {
                    // 7 = SpeechRecognizer.ERROR_NO_MATCH
                    // 6 = SpeechRecognizer.ERROR_SPEECH_TIMEOUT
                    val msg = when(error) {
                        7 -> "No match"
                        6 -> "Timeout"
                        else -> "Error $error"
                    }
                    // Treat error as end of session
                    if (error == 7 || error == 6) {
                        // For no match/timeout, just stop silently or send empty
                        onFinal("")
                    } else {
                        // For other errors, maybe notify?
                        onFinal("")
                    }
                    stopInternal()
                }

                override fun onResults(results: Bundle?) {
                    val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    val text = if (!matches.isNullOrEmpty()) matches[0] else ""
                    onFinal(text)
                    stopInternal()
                }

                override fun onPartialResults(partialResults: Bundle?) {
                    val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    if (!matches.isNullOrEmpty()) {
                        onPartial(matches[0])
                    }
                }

                override fun onEvent(eventType: Int, params: Bundle?) {}
            })

            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, "vi-VN")
                putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
            }

            try {
                speechRecognizer?.startListening(intent)
                isListening = true
            } catch (e: Exception) {
                e.printStackTrace()
                isListening = false
                onFinal("")
            }
        }
    }

    fun stop() {
        Handler(Looper.getMainLooper()).post {
            stopInternal()
        }
    }

    private fun stopInternal() {
        if (isListening) {
            speechRecognizer?.stopListening()
            speechRecognizer?.destroy()
            speechRecognizer = null
            isListening = false
        }
    }
}
