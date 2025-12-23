package com.legalassistant

class StreamingAsr {
    fun start(onPartial: (String) -> Unit, onFinal: (String) -> Unit) {
        // TODO: nối ASR on-device (Vosk/Whisper JNI) hoặc server streaming
    }
    fun stop() {
        // TODO
    }
}
