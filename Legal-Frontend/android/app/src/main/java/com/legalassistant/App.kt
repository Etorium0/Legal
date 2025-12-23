package com.legalassistant

import android.app.Application

class App : Application() {
    override fun onCreate() {
        super.onCreate()
        HotwordService.launch(this)
    }
}
