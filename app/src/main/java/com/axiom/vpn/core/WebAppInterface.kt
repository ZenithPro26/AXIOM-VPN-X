package com.axiom.vpn.core

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.VpnService
import android.webkit.JavascriptInterface
import java.io.File

class WebAppInterface(private val context: Context) {

    @JavascriptInterface
    fun startVpn(uuid: String, sni: String, pbk: String, sid: String) {
        // 1. Generar Configuración
        val configJson = XrayConfigUtil.generateConfig(uuid, sni, pbk, sid)
        
        // 2. Guardar en archivo local para que Xray lo lea
        val configFile = File(context.filesDir, "config.json")
        configFile.writeText(configJson)

        // 3. Iniciar Servicio (Pidiendo permiso si es necesario)
        val intent = VpnService.prepare(context)
        if (intent != null) {
            if (context is Activity) {
                context.startActivityForResult(intent, 0)
            }
        } else {
            launchService()
        }
    }

    @JavascriptInterface
    fun stopVpn() {
        val intent = Intent(context, AxiomVpnService::class.java)
        intent.action = "STOP"
        context.startService(intent)
    }

    private fun launchService() {
        val intent = Intent(context, AxiomVpnService::class.java)
        intent.action = "START"
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            context.startForegroundService(intent)
        } else {
            context.startService(intent)
        }
    }
    
    // Telemetría básica (Simulada por ahora hasta conectar con Xray stats)
    @JavascriptInterface
    fun getStatus(): String {
        return if (AxiomVpnService.isRunning) "CONNECTED" else "DISCONNECTED"
    }
}
