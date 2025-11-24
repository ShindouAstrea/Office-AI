import React, { useState, useEffect, useRef } from 'react';
import { Send, X, Hash, User as UserIcon, MessageCircle } from 'lucide-react';
import { DBUser, DBMessage, subscribeToUsers, subscribeToMessages, sendMessage, getDirectChannelId } from '../services/chatService';

interface ChatPanelProps {
  currentUser: any; // Firebase User
  isOpen: boolean;
  onClose: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ currentUser, isOpen, onClose }) => {
  const [activeChannelId, setActiveChannelId] = useState('general');
  const [activeChannelName, setActiveChannelName] = useState('General');
  
  const [users, setUsers] = useState<DBUser[]>([]);
  const [messages, setMessages] = useState<DBMessage[]>([]);
  const [inputText, setInputText] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to Users List
  useEffect(() => {
    const unsubscribe = subscribeToUsers((fetchedUsers) => {
      // Filter out self
      setUsers(fetchedUsers.filter(u => u.uid !== currentUser.uid));
    });
    return () => unsubscribe();
  }, [currentUser.uid]);

  // Subscribe to Messages for active channel
  useEffect(() => {
    const unsubscribe = subscribeToMessages(activeChannelId, (msgs) => {
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, [activeChannelId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;
    
    try {
      await sendMessage(inputText, currentUser, activeChannelId);
      setInputText('');
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const selectUser = (user: DBUser) => {
    const dmId = getDirectChannelId(currentUser.uid, user.uid);
    setActiveChannelId(dmId);
    setActiveChannelName(user.displayName);
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-0 right-0 h-full w-full md:w-96 bg-slate-900 border-l border-slate-700 shadow-2xl z-40 flex flex-col animate-in slide-in-from-right duration-300">
      
      {/* Header */}
      <div className="h-16 border-b border-slate-700 flex items-center justify-between px-4 bg-slate-800">
        <div className="flex items-center gap-2">
            <MessageCircle className="text-indigo-400" size={20} />
            <h2 className="font-bold text-white text-sm md:text-base truncate max-w-[200px]">
                {activeChannelId === 'general' ? 'Chat General' : activeChannelName}
            </h2>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 flex min-h-0">
        
        {/* Sidebar (Channel/User List) - Only visible on desktop or if toggled, simplistic approach: Icon bar on left */}
        <div className="w-16 bg-slate-950 border-r border-slate-800 flex flex-col items-center py-4 gap-4 overflow-y-auto custom-scrollbar flex-shrink-0">
            {/* General Channel */}
            <button 
                onClick={() => { setActiveChannelId('general'); setActiveChannelName('General'); }}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition ${activeChannelId === 'general' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                title="Chat General"
            >
                <Hash size={20} />
            </button>

            <div className="w-8 h-[1px] bg-slate-800 my-1"></div>

            {/* Users List */}
            {users.map(user => (
                <button
                    key={user.uid}
                    onClick={() => selectUser(user)}
                    className={`w-10 h-10 rounded-full relative transition ${activeChannelId.includes(user.uid) ? 'ring-2 ring-indigo-500' : 'hover:scale-110'}`}
                    title={user.displayName}
                >
                    {user.photoURL ? (
                        <img src={user.photoURL} alt={user.displayName} className="w-full h-full rounded-full object-cover" />
                    ) : (
                        <div className="w-full h-full rounded-full bg-slate-700 flex items-center justify-center text-white text-xs font-bold">
                            {user.displayName.charAt(0)}
                        </div>
                    )}
                    {/* Fake online indicator */}
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-950 rounded-full"></div>
                </button>
            ))}
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-slate-900 min-w-0">
            
            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.length === 0 && (
                    <div className="text-center text-slate-500 mt-10 text-sm">
                        No hay mensajes aún. ¡Di hola! 👋
                    </div>
                )}
                {messages.map((msg) => {
                    const isMe = msg.senderId === currentUser.uid;
                    return (
                        <div key={msg.id || Math.random()} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 overflow-hidden">
                                {msg.senderPhoto ? (
                                    <img src={msg.senderPhoto} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs text-white">
                                        {msg.senderName.charAt(0)}
                                    </div>
                                )}
                            </div>
                            <div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                                <span className="text-[10px] text-slate-400 mb-1 px-1">{msg.senderName}</span>
                                <div className={`px-4 py-2 rounded-2xl text-sm ${
                                    isMe 
                                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                                    : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
                                }`}>
                                    {msg.text}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-4 bg-slate-800 border-t border-slate-700 flex gap-2">
                <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={`Mensaje a ${activeChannelName}...`}
                    className="flex-1 bg-slate-900 border border-slate-600 text-white text-sm rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button 
                    type="submit" 
                    disabled={!inputText.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white p-2 rounded-lg transition"
                >
                    <Send size={20} />
                </button>
            </form>
        </div>
      </div>
    </div>
  );
};