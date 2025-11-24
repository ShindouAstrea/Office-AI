
import React, { useState, useRef, useEffect } from 'react';
import { VirtualOffice } from './components/VirtualOffice';
import { AvatarEditor } from './components/AvatarEditor';
import { ChatPanel } from './components/ChatPanel';
import { Status, AvatarConfig, EditingMode } from './types';
import { DEFAULT_AVATAR_CONFIG } from './constants';
import { Mic, MicOff, Monitor, MonitorOff, Settings, LogOut, MessageSquare, Hammer, Shirt, BrickWall, Volume2, Eraser, X, Chrome } from 'lucide-react';
import { auth, googleProvider } from './firebaseConfig';
import firebase from 'firebase/compat/app';
import { saveUserProfile } from './services/chatService';

const App: React.FC = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<firebase.User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [name, setName] = useState("Visitante"); // Fallback or extracted from Google
  const [status, setStatus] = useState<Status>(Status.AVAILABLE);
  const [isMuted, setIsMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
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
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        setName(user.displayName || "Usuario");
        await saveUserProfile(user);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
    }
  }, [stream, isScreenSharing]);

  const handleLogin = async () => {
    try {
      await auth.signInWithPopup(googleProvider);
    } catch (error) {
      console.error("Login failed", error);
      alert("Error al iniciar sesión con Google. Revisa la consola o configuración de Firebase.");
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    setStream(null);
    setIsScreenSharing(false);
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
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                alert("Permiso denegado.");
            } else {
                alert("Error al compartir: " + err.message);
            }
        }
    }
  };

  if (authLoading) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Cargando...</div>;
  }

  if (!currentUser) {
    return (
      <div className="min-h-[100dvh] bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-md text-center">
             <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/30 transform -rotate-3">
                <Chrome size={40} className="text-white" />
             </div>
             <h1 className="text-3xl font-bold text-white mb-3">Oficina Virtual</h1>
             <p className="text-slate-400 mb-8">Colabora, chatea y muévete en tiempo real.</p>
             
             <button 
                onClick={handleLogin}
                className="w-full py-3.5 bg-white text-slate-900 font-bold rounded-xl transition hover:bg-slate-200 flex items-center justify-center gap-3 shadow-lg"
             >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="G" />
                Iniciar sesión con Google
             </button>
             <p className="text-xs text-slate-500 mt-6">
               Nota: Asegúrate de configurar firebaseConfig.ts con tus credenciales.
             </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-slate-950 overflow-hidden relative">
      
      {/* Global Chat Panel */}
      <ChatPanel 
        currentUser={currentUser}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />

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
                >
                    <Hammer size={20} />
                </button>
            )}

            <div className="h-8 w-[1px] bg-slate-700 mx-2 hidden md:block"></div>

            <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                    {currentUser.photoURL && <img src={currentUser.photoURL} alt="Me" className="w-5 h-5 rounded-full" />}
                    <h3 className="text-white font-medium text-xs md:text-sm truncate max-w-[100px] md:max-w-xs">{name}</h3>
                </div>
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
            <ToolbarButton 
                isActive={!isMuted}
                activeColor="bg-green-600 hover:bg-green-700 text-white shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                inactiveColor="bg-slate-700 hover:bg-slate-600 text-red-400 border border-red-500/30"
                onClick={() => setIsMuted(!isMuted)}
                icon={!isMuted ? <Mic size={20} className="md:w-[22px] md:h-[22px]" /> : <MicOff size={20} className="md:w-[22px] md:h-[22px]" />}
                label={isMuted ? "Silenciado" : "Activo"}
            />

            <ToolbarButton 
                isActive={isChatOpen}
                activeColor="bg-indigo-600 text-white"
                inactiveColor="bg-slate-700 hover:bg-slate-600 text-slate-300"
                onClick={() => setIsChatOpen(!isChatOpen)}
                icon={<MessageSquare size={20} className="md:w-[22px] md:h-[22px]" />}
                label="Chat"
            />

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
                onClick={handleLogout}
                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 transition rounded-full"
                title="Cerrar Sesión"
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
