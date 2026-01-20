package com.axiom.vpn.core

import org.json.JSONObject
import org.json.JSONArray

object XrayConfigUtil {

    /**
     * Genera un JSON de configuración para Xray VLESS Reality + Vision
     */
    fun generateConfig(uuid: String, sni: String, publicKey: String, shortId: String): String {
        
        // 1. Log (Salida) - Lo mandamos a consola o nada
        val log = JSONObject().put("loglevel", "warning")

        // 2. Inbound (Entrada) - Desde el Tunel Android
        // Xray escucha aquí los paquetes que captura el VpnService
        val inbound = JSONObject()
            .put("tag", "tun-in")
            .put("port", 10808)
            .put("protocol", "dokodemo-door")
            .put("settings", JSONObject().put("network", "tcp,udp").put("followRedirect", true))
            .put("sniffing", JSONObject().put("enabled", true).put("destOverride", JSONArray().put("http").put("tls")))

        // 3. Outbound (Salida) - Hacia VpnJantit (VLESS Reality)
        val vlessSettings = JSONObject()
            .put("vnext", JSONArray().put(JSONObject()
                .put("address", "usa3.vpnjantit.com") // Servidor fijo de tu cuenta
                .put("port", 4443)
                .put("users", JSONArray().put(JSONObject()
                    .put("id", uuid) // TU UUID
                    .put("flow", "xtls-rprx-vision") // El flujo anti-censura
                    .put("encryption", "none")
                ))
            ))

        val streamSettings = JSONObject()
            .put("network", "tcp")
            .put("security", "reality")
            .put("realitySettings", JSONObject()
                .put("show", false)
                .put("fingerprint", "chrome") // Imitamos ser un navegador Chrome
                .put("serverName", sni) // El dominio camuflaje (ej: learn.microsoft.com)
                .put("publicKey", publicKey) // La llave que te dio VpnJantit
                .put("shortId", shortId)
                .put("jdbcType", "")
            )

        val outbound = JSONObject()
            .put("tag", "proxy")
            .put("protocol", "vless")
            .put("settings", vlessSettings)
            .put("streamSettings", streamSettings)

        // 4. Outbound Directo (Para tráfico local si fuera necesario)
        val outboundDirect = JSONObject().put("tag", "direct").put("protocol", "freedom")

        // Estructura Final
        val config = JSONObject()
            .put("log", log)
            .put("inbounds", JSONArray().put(inbound))
            .put("outbounds", JSONArray().put(outbound).put(outboundDirect))

        return config.toString(4) // JSON bonito con indentación
    }
}
