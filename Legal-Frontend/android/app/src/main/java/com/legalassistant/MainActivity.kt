package com.legalassistant

import android.annotation.SuppressLint
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.webkit.ConsoleMessage
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
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import android.content.pm.PackageManager
import android.os.Build

class MainActivity : ComponentActivity() {
    private val socket = AssistantSocket()
    private var webView: WebView? = null
    private var tts: TextToSpeech? = null
    private var receiver: BroadcastReceiver? = null

    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val recordAudioGranted = permissions[android.Manifest.permission.RECORD_AUDIO] ?: false
        if (recordAudioGranted) {
            HotwordService.launch(this)
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        checkAndRequestPermissions()
        
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

    private fun checkAndRequestPermissions() {
        val permissions = mutableListOf(android.Manifest.permission.RECORD_AUDIO)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(android.Manifest.permission.POST_NOTIFICATIONS)
        }

        val allGranted = permissions.all {
            ContextCompat.checkSelfPermission(this, it) == PackageManager.PERMISSION_GRANTED
        }

        if (allGranted) {
            HotwordService.launch(this)
        } else {
            requestPermissionLauncher.launch(permissions.toTypedArray())
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
                android.util.Log.d("MainActivity", "Received broadcast: $payload")
                val js = "window.dispatchEvent(new MessageEvent('message',{data:${payload}}));"
                runOnUiThread {
                    webView?.evaluateJavascript(js, null)
                }
            }
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(receiver, filter)
        }
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
            } else if (name == "openUrl") {
                val url = Regex("\"url\"\\s*:\\s*\"([^\"]+)\"").find(cmd)?.groupValues?.get(1) ?: ""
                if (url.isNotEmpty()) {
                    val intent = Intent(Intent.ACTION_VIEW, android.net.Uri.parse(url))
                    startActivity(intent)
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
                settings.allowFileAccess = true
                settings.allowFileAccessFromFileURLs = true
                settings.allowUniversalAccessFromFileURLs = true
                settings.cacheMode = WebSettings.LOAD_DEFAULT
                webChromeClient = object : WebChromeClient() {
                    override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                        android.util.Log.d("WebViewConsole", "${consoleMessage?.message()} -- From line ${consoleMessage?.lineNumber()} of ${consoleMessage?.sourceId()}")
                        return true
                    }

                    override fun onPermissionRequest(request: android.webkit.PermissionRequest?) {
                        request?.grant(request.resources)
                    }
                }
                webViewClient = object : WebViewClient() {
                    override fun onPageFinished(view: WebView?, url: String?) {
                        super.onPageFinished(view, url)
                        android.util.Log.d("MainActivity", "Page finished loading: $url")
                        val js = "window.__BACKEND_URL__='${BuildConfig.BACKEND_URL}';window.dispatchEvent(new Event('backend:ready'));"
                        view?.evaluateJavascript(js, null)
                    }

                    override fun onReceivedError(view: WebView?, request: android.webkit.WebResourceRequest?, error: android.webkit.WebResourceError?) {
                        super.onReceivedError(view, request, error)
                        android.util.Log.e("MainActivity", "WebView Error: ${error?.description}")
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
