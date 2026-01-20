package com.axiom.vpn.core

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Intent
import android.net.VpnService
import android.os.Build
import android.os.ParcelFileDescriptor
import libv2ray.Libv2ray // 👈 IMPORTANTE: La librería que añadimos
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
            // Notificación obligatoria para Foreground Service
            val notification = createNotification("Axiom VPN: Initializing Quantum Tunnel...")
            startForeground(1, notification)
            startVpn()
        }
        
        return START_STICKY
    }

    private fun startVpn() {
        // Ejecutamos en un hilo aparte para no congelar la UI
        Thread {
            try {
                // 1. Configurar Interfaz TUN
                val builder = Builder()
                    .setSession("AxiomXray")
                    .addAddress("10.0.1.1", 24)
                    .addRoute("0.0.0.0", 0)
                    .setMtu(1500)
                
                vpnInterface = builder.establish()
                
                // 2. Leer configuración generada por la UI
                val configFile = File(filesDir, "config.json")
                if (!configFile.exists()) {
                    updateNotification("Error: Config not found")
                    return@Thread
                }
                
                val configContent = configFile.readText()

                // 3. 🔥 ARRANCAR MOTOR XRAY (REAL) 🔥
                // Libv2ray espera el JSON como string. 
                // Esto inicia el núcleo de Go en segundo plano.
                Libv2ray.startV2Ray(configContent)
                
                isRunning = true
                updateNotification("VPN Secured: VLESS Reality Active")
                
            } catch (e: Exception) {
                e.printStackTrace()
                stopVpn()
            }
        }.start()
    }

    private fun stopVpn() {
        isRunning = false
        try {
            vpnInterface?.close()
            Libv2ray.stopV2Ray() // Detener el motor
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
        
        // Usamos el builder nativo o compat según disponibilidad
        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
        } else {
            Notification.Builder(this)
        }

        return builder
            .setContentTitle("Axiom VPN X")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_lock_lock) // Icono de sistema
            .build()
    }
    
    private fun updateNotification(text: String) {
        val mgr = getSystemService(NotificationManager::class.java)
        mgr.notify(1, createNotification(text))
    }
    
    override fun onDestroy() {
        stopVpn()
        super.onDestroy()
    }
}
