package com.legalassistant

import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import okio.ByteString

class AssistantSocket {
    private var ws: WebSocket? = null
    private val client = OkHttpClient()

    fun connect(url: String = BuildConfig.WEB_SOCKET_URL) {
        val req = Request.Builder().url(url).build()
        ws = client.newWebSocket(req, object : WebSocketListener() {
            override fun onMessage(webSocket: WebSocket, text: String) {
                // TODO: route command_tts / command_action to native handlers
            }
            override fun onMessage(webSocket: WebSocket, bytes: ByteString) {}
        })
    }

    fun send(event: Any) {
        val json = EventSerializer.encodeToString(event as Event)
        ws?.send(json)
    }
}

// Simple event types
sealed interface Event
class WakeEvent : Event
class PartialTranscript(val text: String) : Event
class FinalTranscript(val text: String) : Event

// TODO: replace with kotlinx.serialization setup; placeholder serializer
object EventSerializer {
    fun encodeToString(event: Event): String {
        return when (event) {
            is WakeEvent -> "{\"type\":\"wake\"}"
            is PartialTranscript -> "{\"type\":\"partial_transcript\",\"text\":\"${event.text}\"}"
            is FinalTranscript -> "{\"type\":\"final_transcript\",\"text\":\"${event.text}\"}"
            else -> "{}"
        }
    }
}
