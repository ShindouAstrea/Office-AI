
import React, { useState, useRef, useEffect } from 'react';
import { VirtualOffice } from './components/VirtualOffice';
import { AvatarEditor } from './components/AvatarEditor';
import { Status, AvatarConfig, EditingMode } from './types';
import { DEFAULT_AVATAR_CONFIG } from './constants';
import { Mic, MicOff, Monitor, MonitorOff, User, Settings, LogOut, MessageSquare, Hammer, Shirt, BrickWall, Volume2, Eraser, X } from 'lucide-react';

const App: React.FC = () => {
  const [name, setName] = useState("Visitante");
  const [status, setStatus] = useState<Status>(Status.AVAILABLE);
  const [isMuted, setIsMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Avatar State
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(DEFAULT_AVATAR_CONFIG);
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);

  // Admin / Map Editing State
  const isAdmin = true; // Simulation
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [editingMode, setEditingMode] = useState<EditingMode>('none');

  useEffect(() => {
    if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
    }
  }, [stream, isScreenSharing]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) setIsJoined(true);
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setIsScreenSharing(false);
    } else {
        try {
            // Verify API support
            if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
                alert("Tu navegador no soporta la función de compartir pantalla.");
                return;
            }

            const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            
            setStream(displayStream);
            setIsScreenSharing(true);
            
            displayStream.getVideoTracks()[0].onended = () => {
                setIsScreenSharing(false);
                setStream(null);
            };
        } catch (err: any) {
            console.error("Error sharing screen:", err);
            setIsScreenSharing(false);
            setStream(null);

            // Handle specific permission errors
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                alert("Permiso denegado. Para compartir pantalla, debes aceptar la solicitud del navegador. Inténtalo de nuevo.");
            } else if (err.name === 'NotFoundError') {
                alert("No se encontró ninguna pantalla o ventana para compartir.");
            } else {
                alert("Ocurrió un error al intentar compartir pantalla: " + (err.message || "Error desconocido"));
            }
        }
    }
  };

  if (!isJoined) {
    return (
      <div className="min-h-[100dvh] bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-md">
          <div className="text-center mb-8">
             <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30">
                <User size={32} className="text-white" />
             </div>
             <h1 className="text-2xl font-bold text-white mb-2">Bienvenido a la Oficina Virtual</h1>
             <p className="text-slate-400">Ingresa tu nombre para unirte al espacio de trabajo colaborativo.</p>
          </div>
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Nombre</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                placeholder="Ej: Juan Perez"
                autoFocus
              />
            </div>
            <button 
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition shadow-lg hover:shadow-indigo-500/25"
            >
                Entrar a la Oficina
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-slate-950 overflow-hidden">
      
      {/* Avatar Editor Modal */}
      {isEditingAvatar && (
        <AvatarEditor 
            currentConfig={avatarConfig}
            onSave={(newConfig) => {
                setAvatarConfig(newConfig);
                setIsEditingAvatar(false);
            }}
            onClose={() => setIsEditingAvatar(false)}
        />
      )}

      {/* Main Game Area */}
      <div className="flex-1 relative min-h-0 group">
        <VirtualOffice 
            userName={name}
            userStatus={status}
            userAvatarConfig={avatarConfig}
            isMuted={isMuted}
            toggleMute={() => setIsMuted(!isMuted)}
            isScreenSharing={isScreenSharing}
            toggleScreenShare={toggleScreenShare}
            editingMode={editingMode}
        />
        
        {/* Admin Map Editor Panel */}
        {showAdminPanel && (
            <div className="absolute bottom-4 left-4 bg-slate-800 p-3 rounded-xl border border-slate-700 shadow-2xl flex flex-col gap-2 z-30 animate-in slide-in-from-bottom-5">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Editor de Mapa</span>
                    <button onClick={() => { setShowAdminPanel(false); setEditingMode('none'); }} className="text-slate-500 hover:text-white"><X size={14}/></button>
                </div>
                <div className="flex gap-2">
                    <EditorButton 
                        active={editingMode === 'wall'} 
                        onClick={() => setEditingMode(editingMode === 'wall' ? 'none' : 'wall')}
                        icon={<BrickWall size={18} />}
                        label="Muro"
                        color="bg-slate-600"
                    />
                    <EditorButton 
                        active={editingMode === 'meeting_zone'} 
                        onClick={() => setEditingMode(editingMode === 'meeting_zone' ? 'none' : 'meeting_zone')}
                        icon={<Volume2 size={18} />}
                        label="Zona Audio"
                        color="bg-green-600"
                    />
                     <EditorButton 
                        active={editingMode === 'eraser'} 
                        onClick={() => setEditingMode(editingMode === 'eraser' ? 'none' : 'eraser')}
                        icon={<Eraser size={18} />}
                        label="Borrar"
                        color="bg-red-600"
                    />
                </div>
                <div className="text-[10px] text-slate-500 mt-1 max-w-[200px] leading-tight">
                    {editingMode === 'none' ? 'Selecciona una herramienta.' : 'Haz clic en el mapa para aplicar cambios.'}
                </div>
            </div>
        )}

        {/* Local Screen Share Preview (Pip) */}
        {isScreenSharing && stream && (
            <div className="absolute bottom-4 right-4 md:bottom-24 md:right-4 w-32 md:w-64 bg-black rounded-lg overflow-hidden border-2 border-green-500 shadow-2xl z-20">
                <video 
                    ref={videoRef}
                    autoPlay 
                    muted 
                    playsInline 
                    className="w-full h-auto"
                />
                <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] px-2 py-1 rounded animate-pulse">
                    Compartiendo
                </div>
            </div>
        )}
      </div>

      {/* Bottom Control Bar */}
      <div className="h-16 md:h-20 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-2 md:px-6 z-10 shrink-0 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
        
        {/* Left: Admin & User Info */}
        <div className="flex items-center gap-2 md:gap-4 flex-1 md:flex-initial min-w-0">
            {isAdmin && (
                <button 
                    onClick={() => {
                        setShowAdminPanel(!showAdminPanel);
                        if(showAdminPanel) setEditingMode('none');
                    }}
                    className={`p-2 md:p-3 rounded-xl border transition hidden sm:flex ${showAdminPanel ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-indigo-400'}`}
                    title="Modo Edición (Administrador)"
                >
                    <Hammer size={20} />
                </button>
            )}

            <div className="h-8 w-[1px] bg-slate-700 mx-2 hidden md:block"></div>

            <div className="flex flex-col min-w-0">
                <h3 className="text-white font-medium text-xs md:text-sm truncate max-w-[100px] md:max-w-xs">{name}</h3>
                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                        status === Status.AVAILABLE ? 'bg-green-500' : 
                        status === Status.BUSY ? 'bg-red-500' : 
                        status === Status.MEETING ? 'bg-yellow-500' : 'bg-slate-400'
                    }`}></span>
                    <select 
                        value={status} 
                        onChange={(e) => setStatus(e.target.value as Status)}
                        className="bg-transparent text-slate-400 text-[10px] md:text-xs focus:outline-none cursor-pointer hover:text-white max-w-[80px] md:max-w-none"
                    >
                        {Object.values(Status).map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>

        {/* Center: Main Controls */}
        <div className="flex items-center justify-center gap-2 md:gap-4 flex-1">
            
            {/* Microphone */}
            <ToolbarButton 
                isActive={!isMuted}
                activeColor="bg-green-600 hover:bg-green-700 text-white shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                inactiveColor="bg-slate-700 hover:bg-slate-600 text-red-400 border border-red-500/30"
                onClick={() => setIsMuted(!isMuted)}
                icon={!isMuted ? <Mic size={20} className="md:w-[22px] md:h-[22px]" /> : <MicOff size={20} className="md:w-[22px] md:h-[22px]" />}
                label={isMuted ? "Silenciado" : "Activo"}
            />

            {/* Chat */}
            <ToolbarButton 
                isActive={isChatOpen}
                activeColor="bg-indigo-600 text-white"
                inactiveColor="bg-slate-700 hover:bg-slate-600 text-slate-300"
                onClick={() => setIsChatOpen(!isChatOpen)}
                icon={<MessageSquare size={20} className="md:w-[22px] md:h-[22px]" />}
                label="Chat"
            />

            {/* Screen Share */}
            <ToolbarButton 
                isActive={isScreenSharing}
                activeColor="bg-blue-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)] animate-pulse"
                inactiveColor="bg-slate-700 hover:bg-slate-600 text-slate-300"
                onClick={toggleScreenShare}
                icon={isScreenSharing ? <Monitor size={20} className="md:w-[22px] md:h-[22px]" /> : <MonitorOff size={20} className="md:w-[22px] md:h-[22px]" />}
                label="Pantalla"
            />

        </div>

        {/* Right: Personalization & Exit */}
        <div className="flex items-center justify-end gap-2 md:gap-3 flex-1 md:flex-initial">
            <button 
                onClick={() => setIsEditingAvatar(true)}
                className="flex items-center gap-2 px-2 md:px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
                title="Personalizar Personaje"
            >
                <Shirt size={18} />
                <span className="text-xs hidden md:inline">Personaje</span>
            </button>
            
            <button className="p-2 text-slate-400 hover:text-white transition rounded-full hover:bg-slate-800 hidden sm:block">
                <Settings size={20} />
            </button>
            <button 
                onClick={() => setIsJoined(false)}
                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 transition rounded-full"
                title="Salir"
            >
                <LogOut size={20} />
            </button>
        </div>
      </div>
    </div>
  );
};

interface ToolbarButtonProps {
    isActive: boolean;
    activeColor: string;
    inactiveColor: string;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ isActive, activeColor, inactiveColor, onClick, icon, label }) => (
    <div className="flex flex-col items-center gap-1 group">
        <button 
            onClick={onClick}
            className={`w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center transition-all duration-200 ${isActive ? activeColor : inactiveColor}`}
        >
            {icon}
        </button>
        <span className="text-[9px] md:text-[10px] text-slate-500 font-medium group-hover:text-slate-300 transition-colors hidden sm:block">{label}</span>
    </div>
);

const EditorButton: React.FC<{active: boolean, onClick: () => void, icon: React.ReactNode, label: string, color: string}> = ({
    active, onClick, icon, label, color
}) => (
    <button 
        onClick={onClick}
        className={`flex flex-col items-center gap-1 p-2 rounded-lg transition ${active ? `${color} text-white ring-2 ring-white` : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
    >
        {icon}
        <span className="text-[8px] font-bold uppercase">{label}</span>
    </button>
);

export default App;
