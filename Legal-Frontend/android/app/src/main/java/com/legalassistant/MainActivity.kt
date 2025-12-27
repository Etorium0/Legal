package com.legalassistant

import android.annotation.SuppressLint
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebViewClient
import android.webkit.WebSettings
import android.webkit.WebView
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import java.util.Locale
import android.content.res.AssetManager

class MainActivity : ComponentActivity() {
    private val socket = AssistantSocket()
    private var webView: WebView? = null
    private var tts: TextToSpeech? = null
    private var receiver: BroadcastReceiver? = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        HotwordService.launch(this)
        socket.connect()
        tts = TextToSpeech(this) { status ->
            if (status == TextToSpeech.SUCCESS) {
                tts?.language = Locale("vi", "VN")
            }
        }
        registerAssistantReceiver()

        setContent {
            WebContainer(
                url = resolveUrl(),
                onCommand = { cmd ->
                    handleWebCommand(cmd)
                },
                onReady = { wv ->
                    webView = wv
                }
            )
        }
    }

    private fun hasAsset(name: String): Boolean {
        return try {
            val list = assets.list("")
            list?.contains(name) == true
        } catch (_: Exception) {
            false
        }
    }

    private fun resolveUrl(): String {
        return if (hasAsset("index.html")) {
            "file:///android_asset/index.html"
        } else {
            BuildConfig.WEB_APP_URL
        }
    }

    private fun registerAssistantReceiver() {
        val filter = IntentFilter("com.legalassistant.ASSISTANT_EVENT")
        receiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                val payload = intent?.getStringExtra("payload") ?: return
                val js = "window.dispatchEvent(new MessageEvent('message',{data:${payload}}));"
                runOnUiThread {
                    webView?.evaluateJavascript(js, null)
                }
            }
        }
        registerReceiver(receiver, filter)
    }

    private fun handleWebCommand(cmd: String) {
        try {
            // Expect JSON: {"type":"command","name":"tts","data":{"text":"..."}}
            val name = Regex("\"name\"\\s*:\\s*\"([^\"]+)\"").find(cmd)?.groupValues?.get(1)
            if (name == "tts") {
                val text = Regex("\"text\"\\s*:\\s*\"([^\"]+)\"").find(cmd)?.groupValues?.get(1) ?: ""
                if (text.isNotEmpty()) {
                    tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "assistant-tts")
                }
            }
        } catch (_: Exception) { }
    }

    override fun onDestroy() {
        unregisterReceiver(receiver)
        tts?.stop()
        tts?.shutdown()
        super.onDestroy()
    }
}

@Composable
fun WebContainer(url: String, onCommand: (String) -> Unit, onReady: (WebView) -> Unit) {
    AndroidView(
        modifier = Modifier.fillMaxSize(),
        factory = { ctx ->
            WebView(ctx).apply {
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                settings.cacheMode = WebSettings.LOAD_DEFAULT
                webChromeClient = WebChromeClient()
                webViewClient = object : WebViewClient() {
                    override fun onPageFinished(view: WebView?, url: String?) {
                        super.onPageFinished(view, url)
                        val js = "window.__BACKEND_URL__='${BuildConfig.BACKEND_URL}';window.dispatchEvent(new Event('backend:ready'));"
                        view?.evaluateJavascript(js, null)
                    }
                }
                addJavascriptInterface(object {
                    @JavascriptInterface
                    fun postMessage(msg: String) {
                        onCommand(msg)
                    }
                }, "NativeBridge")
                loadUrl(url)
                onReady(this)
            }
        }
    )
}
