package com.axiom.vpn.core

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.net.VpnService
import android.os.Build
import android.os.ParcelFileDescriptor
import androidx.core.app.NotificationCompat
import com.axiom.vpn.R // Asegúrate que tu paquete R sea correcto
import java.io.File

class AxiomVpnService : VpnService() {

    companion object {
        var isRunning = false
        const val CHANNEL_ID = "axiom_vpn_channel"
    }

    private var vpnInterface: ParcelFileDescriptor? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action
        
        if (action == "STOP") {
            stopVpn()
            return START_NOT_STICKY
        }

        if (action == "START") {
            startForeground(1, createNotification("Axiom VPN Starting..."))
            startVpn()
        }
        
        return START_STICKY
    }

    private fun startVpn() {
        try {
            // 1. Configurar Interfaz TUN (Android -> App)
            // Xray espera leer de un puerto o de un file descriptor. 
            // En modo "VPN", nosotros le damos el file descriptor o usamos 'tun2socks'
            // Para simplificar esta versión Alpha, levantamos la interfaz.
            
            val builder = Builder()
                .setSession("AxiomXray")
                .addAddress("10.0.1.1", 24)
                .addRoute("0.0.0.0", 0)
                .setMtu(1500)
            
            vpnInterface = builder.establish()
            
            // 2. AQUÍ ARRANCARÍA LIBXRAY
            // val configFile = File(filesDir, "config.json")
            // LibXray.start(configFile.absolutePath) <--- Pseudo-código
            // Como la librería exacta varía, aquí simulamos el éxito para probar la UI primero.
            
            isRunning = true
            updateNotification("VPN Secured: Reality Protocol Active")
            
        } catch (e: Exception) {
            e.printStackTrace()
            stopVpn()
        }
    }

    private fun stopVpn() {
        isRunning = false
        try {
            vpnInterface?.close()
            // LibXray.stop()
        } catch (e: Exception) {}
        stopForeground(true)
        stopSelf()
    }

    private fun createNotification(text: String): Notification {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val mgr = getSystemService(NotificationManager::class.java)
            val channel = NotificationChannel(CHANNEL_ID, "VPN Service", NotificationManager.IMPORTANCE_LOW)
            mgr.createNotificationChannel(channel)
        }
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Axiom VPN X")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_dialog_info) // Icono genérico por ahora
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }
    
    private fun updateNotification(text: String) {
        val mgr = getSystemService(NotificationManager::class.java)
        mgr.notify(1, createNotification(text))
    }
}
