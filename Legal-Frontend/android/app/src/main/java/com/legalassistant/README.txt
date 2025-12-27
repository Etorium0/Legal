Skeleton Android native (Kotlin) with foreground hotword service + WebView bridge.

Wiring steps:
- Set BuildConfig fields (WEB_APP_URL, WEB_SOCKET_URL) in app/build.gradle if needed.
- Replace HotwordEngine with Porcupine/Vosk/Whisper JNI.
- Implement StreamingAsr with on-device or remote streaming client.
- Implement command handling in MainActivity/WebContainer (from JS via NativeBridge.postMessage) and in AssistantSocket.onMessage.
- Update notification icons and app theme as desired.
