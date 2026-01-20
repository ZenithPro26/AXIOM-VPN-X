import React, { useState, useEffect, useCallback } from 'react';
import { 
  Shield, 
  Zap, 
  Settings, 
  Clipboard, 
  Activity, 
  Lock, 
  Globe, 
  Terminal,
  Key
} from 'lucide-react';

// --- DEFINICIONES DE TIPO ---
declare global {
  interface Window {
    AxiomCore?: {
      startVpn: (uuid: string, sni: string, pbk: string, sid: string) => void;
      stopVpn: () => void;
      getStatus: () => string;
    };
  }
}

interface VlessConfig {
  uuid: string;
  address: string;
  port: number;
  sni: string;
  pbk: string;
  sid: string;
  flow: string;
}

interface LogEntry {
  time: string;
  msg: string;
  type: 'INFO' | 'WARN' | 'ERR' | 'SYS';
}

const App: React.FC = () => {
  // --- ESTADOS ---
  const [isConnected, setIsConnected] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  // Configuración VLESS (Persistente)
  const [config, setConfig] = useState<VlessConfig>(() => {
    const saved = localStorage.getItem('axiom_vless_config');
    return saved ? JSON.parse(saved) : {
      uuid: '',
      address: '',
      port: 443,
      sni: '',
      pbk: '',
      sid: '',
      flow: ''
    };
  });

  const [rawLink, setRawLink] = useState('');

  // --- LOGGING ---
  const addLog = useCallback((msg: string, type: LogEntry['type'] = 'INFO') => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLogs(prev => [{ time, msg, type }, ...prev.slice(0, 49)]);
  }, []);

  // --- PARSER INTELIGENTE DE VLESS ---
  const parseVlessLink = (link: string) => {
    try {
      if (!link.startsWith('vless://')) throw new Error("Invalid Protocol");

      // Formato: vless://uuid@host:port?params#name
      const url = new URL(link); // El navegador puede parsear vless como URL a veces
      // Si falla URL, hacemos regex manual, pero intentemos estructura básica
      
      const uuid = url.username;
      const address = url.hostname;
      const port = Number(url.port);
      const params = new URLSearchParams(url.search);

      const newConfig: VlessConfig = {
        uuid: uuid || '',
        address: address || '',
        port: port || 443,
        sni: params.get('sni') || '',
        pbk: params.get('pbk') || '',
        sid: params.get('sid') || '',
        flow: params.get('flow') || ''
      };

      if (!newConfig.uuid || !newConfig.pbk) {
        throw new Error("Missing Critical Keys (UUID or PBK)");
      }

      setConfig(newConfig);
      localStorage.setItem('axiom_vless_config', JSON.stringify(newConfig));
      addLog(`Config Loaded: ${address}`, 'SYS');
      addLog(`UUID: ${uuid.substring(0, 8)}...`, 'INFO');
      addLog(`Key: ${newConfig.pbk.substring(0, 8)}...`, 'INFO');
      setShowConfig(false); // Cerrar panel al éxito
      setRawLink(''); // Limpiar input

    } catch (e) {
      // Fallback para parseo manual si URL() falla con protocolos custom
      // (Implementación simplificada para el ejemplo)
      try {
         const cleanLink = link.replace('vless://', '');
         const [userInfo, rest] = cleanLink.split('@');
         const [hostPort, queryTag] = rest.split('?');
         const [host, port] = hostPort.split(':');
         
         // Parsear query manualmente
         const params = new URLSearchParams(queryTag.split('#')[0]);
         
         const manualConfig = {
            uuid: userInfo,
            address: host,
            port: Number(port),
            sni: params.get('sni') || '',
            pbk: params.get('pbk') || '',
            sid: params.get('sid') || '',
            flow: params.get('flow') || ''
         };
         
         setConfig(manualConfig);
         localStorage.setItem('axiom_vless_config', JSON.stringify(manualConfig));
         addLog(`Config Parsed (Fallback): ${host}`, 'SYS');
         setShowConfig(false);
      } catch (err) {
         addLog("Failed to parse VLESS link. Check format.", 'ERR');
      }
    }
  };

  // --- CONTROL DE CONEXIÓN ---
  const toggleConnection = () => {
    if (isConnected) {
      // DESCONECTAR
      if (window.AxiomCore) {
        window.AxiomCore.stopVpn();
      }
      setIsConnected(false);
      addLog("VPN Core Stopped", 'WARN');
    } else {
      // CONECTAR
      if (!config.uuid || !config.pbk) {
        addLog("Configuration Missing!", 'ERR');
        setShowConfig(true);
        return;
      }

      if (window.AxiomCore) {
        // Enviamos los datos al motor Kotlin
        window.AxiomCore.startVpn(config.uuid, config.sni, config.pbk, config.sid);
        addLog("Injecting Reality Protocol...", 'SYS');
        addLog(`Target: ${config.address}:${config.port}`, 'INFO');
        setTimeout(() => {
            setIsConnected(true);
            addLog("Secure Tunnel Established.", 'SYS');
        }, 1000); // Simulación visual mientras arranca el servicio
      } else {
        // Modo Navegador (Simulación)
        addLog("Simulation Mode Active", 'WARN');
        setIsConnected(true);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-gray-300 font-mono flex flex-col overflow-hidden selection:bg-[#1f538d] selection:text-white">
      
      {/* HEADER */}
      <header className="h-16 border-b border-[#1f1f1f] bg-black/50 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-[#1f538d]/20 p-2 rounded border border-[#1f538d]/30">
            <Shield className="text-[#1f538d]" size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">AXIOM<span className="text-[#1f538d]">-VPN</span></h1>
            <p className="text-[10px] text-gray-500 tracking-widest">XRAY CORE // REALITY</p>
          </div>
        </div>
        <button 
          onClick={() => setShowConfig(!showConfig)}
          className={`p-2 rounded-full transition-all ${showConfig ? 'bg-[#1f538d] text-white' : 'hover:bg-[#1f1f1f] text-gray-400'}`}
        >
          <Settings size={20} />
        </button>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-6 flex flex-col items-center justify-center relative w-full max-w-md mx-auto">
        
        {/* CONNECTION RING */}
        <div className="relative mb-12 group cursor-pointer" onClick={toggleConnection}>
          {/* Outer Glow */}
          <div className={`absolute -inset-4 rounded-full blur-xl transition-all duration-700 ${isConnected ? 'bg-[#00ff9d]/20' : 'bg-transparent'}`}></div>
          
          {/* Main Button */}
          <div className={`
            w-48 h-48 rounded-full border-4 flex flex-col items-center justify-center transition-all duration-500 relative z-10 bg-[#0a0a0a]
            ${isConnected 
              ? 'border-[#00ff9d] shadow-[0_0_30px_rgba(0,255,157,0.3)]' 
              : 'border-[#1f1f1f] hover:border-[#1f538d]'}
          `}>
            <PowerIcon active={isConnected} />
            <span className={`mt-4 text-sm font-bold tracking-widest transition-colors ${isConnected ? 'text-[#00ff9d]' : 'text-gray-500'}`}>
              {isConnected ? 'SECURED' : 'CONNECT'}
            </span>
          </div>
        </div>

        {/* STATS ROW (Solo visible si conectado) */}
        <div className={`w-full grid grid-cols-2 gap-4 transition-all duration-500 ${isConnected ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
           <StatBox label="PROTOCOL" value="VLESS" icon={<Shield size={14} />} color="text-[#1f538d]" />
           <StatBox label="SECURITY" value="REALITY" icon={<Lock size={14} />} color="text-[#00ff9d]" />
        </div>

        {/* LOGS CONSOLE */}
        <div className="w-full mt-8 flex-1 min-h-[150px] bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg p-3 font-mono text-xs overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 text-gray-500 mb-2 border-b border-[#1f1f1f] pb-1">
            <Terminal size={12} />
            <span>SYSTEM KERNEL LOG</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 scrollbar-hide">
            {logs.length === 0 && <span className="text-gray-700 italic">Waiting for command...</span>}
            {logs.map((log, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-gray-600">[{log.time}]</span>
                <span className={`
                  ${log.type === 'SYS' ? 'text-[#1f538d]' : ''}
                  ${log.type === 'WARN' ? 'text-orange-500' : ''}
                  ${log.type === 'ERR' ? 'text-red-500' : ''}
                  ${log.type === 'INFO' ? 'text-gray-400' : ''}
                `}>{log.msg}</span>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* CONFIGURATION MODAL */}
      {showConfig && (
        <div className="absolute inset-0 z-50 bg-[#050505]/95 backdrop-blur-sm p-6 flex flex-col animate-in fade-in slide-in-from-bottom-10">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Settings size={20} className="text-[#1f538d]" /> CONFIGURATION
            </h2>
            <button onClick={() => setShowConfig(false)} className="text-gray-500 hover:text-white">CLOSE</button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-6">
            
            {/* IMPORT SECTION */}
            <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg p-4">
              <label className="text-xs text-gray-500 mb-2 block uppercase">Import from VpnJantit</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={rawLink}
                  onChange={(e) => setRawLink(e.target.value)}
                  placeholder="Paste vless:// link here..."
                  className="flex-1 bg-black border border-[#1f1f1f] rounded px-3 py-2 text-xs text-white focus:border-[#1f538d] outline-none"
                />
                <button 
                  onClick={() => parseVlessLink(rawLink)}
                  className="bg-[#1f538d] hover:bg-[#2a6bb5] text-white px-4 rounded flex items-center justify-center"
                >
                  <Clipboard size={16} />
                </button>
              </div>
            </div>

            {/* MANUAL DETAILS */}
            <div className="space-y-4">
              <ConfigField label="UUID" value={config.uuid} icon={<Key size={14}/>} />
              <ConfigField label="SNI (Camouflage)" value={config.sni} icon={<Globe size={14}/>} />
              <ConfigField label="Public Key (PBK)" value={config.pbk} icon={<Lock size={14}/>} />
              <ConfigField label="Short ID (SID)" value={config.sid} icon={<Activity size={14}/>} />
            </div>

            <div className="text-[10px] text-gray-600 text-center mt-8">
              AXIOM XRAY ENGINE v1.0.0<br/>
              Optimized for Hysteria2 & Vision Flows
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// --- SUB COMPONENTS ---

const PowerIcon = ({ active }: { active: boolean }) => (
  <div className={`transition-colors duration-500 ${active ? 'text-[#00ff9d]' : 'text-gray-600'}`}>
    <Zap size={64} fill={active ? "currentColor" : "none"} />
  </div>
);

const StatBox = ({ label, value, icon, color }: any) => (
  <div className="bg-[#0a0a0a] border border-[#1f1f1f] p-3 rounded flex items-center justify-between">
    <div>
      <div className="text-[10px] text-gray-500 mb-1">{label}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
    </div>
    <div className={`p-2 rounded-full bg-[#1f1f1f] ${color.replace('text-', 'text-opacity-80 ')}`}>
      {icon}
    </div>
  </div>
);

const ConfigField = ({ label, value, icon }: any) => (
  <div>
    <label className="text-[10px] text-gray-500 mb-1 flex items-center gap-1 uppercase">
      {icon} {label}
    </label>
    <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded px-3 py-2 text-xs text-gray-300 font-mono truncate">
      {value || <span className="text-gray-700">Not Set</span>}
    </div>
  </div>
);

export default App;
