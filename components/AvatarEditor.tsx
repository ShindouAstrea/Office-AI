
import React, { useState, useRef, useEffect } from 'react';
import { X, Check, Upload, Eraser, Paintbrush, RefreshCw } from 'lucide-react';
import { AvatarConfig, AvatarLayer, PixelGrid } from '../types';
import { SKIN_COLORS, HAIR_COLORS, CLOTHING_COLORS, EYE_COLORS, generateHairGrid, HAIR_PRESETS } from '../constants';

interface AvatarEditorProps {
  currentConfig: AvatarConfig;
  onSave: (config: AvatarConfig) => void;
  onClose: () => void;
}

type Tab = 'head' | 'torso' | 'legs' | 'feet' | 'accessory';

const GRID_SIZES: Record<Tab, { w: number, h: number }> = {
  head: { w: 8, h: 8 },
  torso: { w: 8, h: 8 },
  legs: { w: 8, h: 8 },
  feet: { w: 8, h: 2 },
  accessory: { w: 10, h: 10 },
};

export const AvatarEditor: React.FC<AvatarEditorProps> = ({ currentConfig, onSave, onClose }) => {
  const [config, setConfig] = useState<AvatarConfig>(currentConfig);
  const [activeTab, setActiveTab] = useState<Tab>('head');
  const [isPixelMode, setIsPixelMode] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [currentHairStyle, setCurrentHairStyle] = useState(0);
  
  // Canvas refs
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize pixels if they don't exist when entering pixel mode
  const ensurePixels = (tab: Tab) => {
    const layer = config[tab] as AvatarLayer;
    if (!layer.pixels) {
      const { w, h } = GRID_SIZES[tab];
      const emptyGrid: PixelGrid = Array(h).fill(null).map(() => Array(w).fill(''));
      
      // If converting from preset, fill with base color roughly
      if (layer.color && layer.color !== 'transparent') {
         for(let y=0; y<h; y++) {
             for(let x=0; x<w; x++) {
                 // For head, only fill if we don't have a template generator
                 emptyGrid[y][x] = layer.color;
             }
         }
      }
      
      updateLayer(tab, { ...layer, pixels: emptyGrid, type: 'custom' });
    }
  };

  const updateLayer = (tab: Tab, data: Partial<AvatarLayer>) => {
    setConfig(prev => ({
      ...prev,
      [tab]: { ...prev[tab], ...data }
    }));
  };

  const updateGlobal = (key: keyof AvatarConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const setPresetColor = (tab: Tab, color: string) => {
      // Special logic for Hair (Head tab) to apply patterns
      if (tab === 'head' && color !== 'transparent') {
          const pixels = generateHairGrid(color, currentHairStyle);
          updateLayer(tab, { color, pixels, type: 'preset' });
      } else {
          updateLayer(tab, { color, type: 'preset', pixels: undefined });
      }
  };

  const rotateHairStyle = () => {
      const nextStyle = (currentHairStyle + 1) % HAIR_PRESETS.length;
      setCurrentHairStyle(nextStyle);
      const color = config.head.color;
      if (color && color !== 'transparent') {
          const pixels = generateHairGrid(color, nextStyle);
          updateLayer('head', { pixels });
      }
  };

  const handlePixelClick = (x: number, y: number) => {
    ensurePixels(activeTab);
    const layer = config[activeTab] as AvatarLayer;
    if (!layer.pixels) return;

    const newPixels = layer.pixels.map(row => [...row]);
    newPixels[y][x] = selectedColor === 'eraser' ? '' : selectedColor;
    
    updateLayer(activeTab, { pixels: newPixels, type: 'custom' });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const { w, h } = GRID_SIZES[activeTab];
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw image resized to grid
        ctx.drawImage(img, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;
        
        const newPixels: PixelGrid = [];
        for (let y = 0; y < h; y++) {
          const row: string[] = [];
          for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            
            if (a < 50) {
              row.push('');
            } else {
              // Convert rgb to hex
              const hex = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
              row.push(hex);
            }
          }
          newPixels.push(row);
        }
        
        updateLayer(activeTab, { pixels: newPixels, type: 'custom' });
        setIsPixelMode(true);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // --- PREVIEW RENDERER ---
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    
    // Scale up for preview
    const P = 10; 
    const CX = canvas.width / 2 - (4 * P);
    const CY = canvas.height / 2 - (16 * P);

    const drawRect = (x: number, y: number, w: number, h: number, c: string) => {
        if (!c || c === 'transparent') return;
        ctx.fillStyle = c;
        ctx.fillRect(CX + x * P, CY + y * P, w * P, h * P);
    };

    const renderLayer = (layer: AvatarLayer, ox: number, oy: number, w: number, h: number) => {
        if (layer.pixels) {
             layer.pixels.forEach((row, rY) => {
                 row.forEach((col, rX) => {
                     drawRect(ox + rX, oy + rY, 1, 1, col);
                 });
             });
        } else {
             drawRect(ox, oy, w, h, layer.color);
        }
    };

    // --- DRAW ORDER (Terraria Style) ---
    // 1. Shoes
    renderLayer(config.feet, 0, 22, 8, 2);

    // 2. Legs (Pants)
    renderLayer(config.legs, 0, 14, 8, 8);

    // 3. Torso (Shirt) & Arms
    // Draw body first
    renderLayer(config.torso, 0, 6, 8, 8);
    
    // Draw procedural arms for preview (static at sides)
    const shirtColor = config.torso.color !== 'transparent' ? config.torso.color : config.skinColor;
    drawRect(-2, 6, 2, 8, shirtColor); // Left Arm
    drawRect(8, 6, 2, 8, shirtColor);  // Right Arm
    drawRect(-2, 12, 2, 2, config.skinColor); // Left Hand
    drawRect(8, 12, 2, 2, config.skinColor);  // Right Hand

    // 4. Head (Skin Base)
    drawRect(0, -2, 8, 8, config.skinColor);

    // 5. Eyes
    drawRect(1, 2, 2, 2, '#ffffff'); // Sclera L
    drawRect(5, 2, 2, 2, '#ffffff'); // Sclera R
    drawRect(2, 2, 1, 2, config.eyeColor); // Iris L
    drawRect(5, 2, 1, 2, config.eyeColor); // Iris R

    // 6. Hair
    renderLayer(config.head, 0, -3, 8, 8);

    // 7. Accessory
    renderLayer(config.accessory, -1, 4, 10, 10);

  }, [config]);

  const tabs: {id: Tab, label: string}[] = [
    { id: 'head', label: 'Cabello' },
    { id: 'torso', label: 'Ropa' },
    { id: 'legs', label: 'Pantalón' },
    { id: 'feet', label: 'Zapatos' },
    { id: 'accessory', label: 'Accesorio' },
  ];

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 backdrop-blur-md p-2 md:p-6">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-5xl h-[95dvh] shadow-2xl flex flex-col md:flex-row overflow-hidden font-sans">
        
        {/* LEFT: Preview & Core Stats */}
        <div className="w-full md:w-1/3 bg-slate-950 p-6 flex flex-col items-center border-b md:border-b-0 md:border-r border-slate-800 shrink-0 overflow-y-auto">
             <h2 className="text-slate-200 font-bold text-xl mb-4 tracking-wide uppercase">Personaje</h2>
             
             <div className="relative mb-8 group">
                <div className="w-56 h-64 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-slate-900 rounded-xl flex items-center justify-center shadow-[inset_0_0_40px_rgba(0,0,0,0.5)] border-2 border-slate-700 group-hover:border-indigo-500/50 transition-colors">
                    <canvas ref={previewCanvasRef} width={240} height={300} className="image-pixelated" />
                </div>
                <div className="absolute -bottom-3 -right-3 bg-indigo-600 text-white text-xs px-2 py-1 rounded shadow transform rotate-3">
                    Vista Previa
                </div>
             </div>

             {/* Core Attributes */}
             <div className="w-full space-y-5">
                
                {/* Skin */}
                <div>
                    <div className="flex justify-between mb-2">
                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tono de Piel</label>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center bg-slate-900 p-2 rounded-lg border border-slate-800">
                        {SKIN_COLORS.map(c => (
                            <button
                                key={c}
                                onClick={() => updateGlobal('skinColor', c)}
                                className={`w-6 h-6 rounded-sm border ${config.skinColor === c ? 'border-white ring-2 ring-indigo-500/50' : 'border-transparent hover:scale-110'} transition-transform`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>
                </div>

                 {/* Eyes */}
                 <div>
                    <div className="flex justify-between mb-2">
                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Color de Ojos</label>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center bg-slate-900 p-2 rounded-lg border border-slate-800">
                        {EYE_COLORS.map(c => (
                            <button
                                key={c}
                                onClick={() => updateGlobal('eyeColor', c)}
                                className={`w-6 h-6 rounded-full border ${config.eyeColor === c ? 'border-white ring-2 ring-indigo-500/50' : 'border-transparent hover:scale-110'} transition-transform`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>
                </div>
                
                {/* Gender */}
                <div>
                     <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2 block">Estilo Base</label>
                    <div className="flex bg-slate-800 rounded p-1 border border-slate-700">
                        <button 
                            onClick={() => updateGlobal('gender', 'masculine')}
                            className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${config.gender === 'masculine' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Masculino
                        </button>
                        <button 
                            onClick={() => updateGlobal('gender', 'feminine')}
                            className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${config.gender === 'feminine' ? 'bg-pink-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Femenino
                        </button>
                    </div>
                </div>
             </div>
        </div>

        {/* RIGHT: Editor & Layers */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-900 relative">
            
            {/* Terraria Style Tabs */}
            <div className="flex overflow-x-auto scrollbar-hide border-b border-slate-800 bg-slate-950 px-4 pt-2">
                {tabs.map(t => (
                    <button
                        key={t.id}
                        onClick={() => { setActiveTab(t.id); setIsPixelMode(false); }}
                        className={`px-6 py-3 text-sm font-bold uppercase tracking-wide border-t-2 border-x-2 rounded-t-lg mx-1 transition-all ${
                            activeTab === t.id 
                            ? 'border-slate-700 bg-slate-900 text-indigo-400 translate-y-[1px]' 
                            : 'border-transparent bg-slate-950 text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-800/20 to-slate-900">
                
                <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                    <div>
                         <h3 className="text-white font-bold text-lg flex items-center gap-2">
                            {tabs.find(t => t.id === activeTab)?.label}
                            {activeTab === 'head' && (
                                <button 
                                    onClick={rotateHairStyle} 
                                    className="ml-2 p-1.5 bg-slate-800 hover:bg-slate-700 rounded-full text-indigo-400 transition"
                                    title="Cambiar estilo de peinado"
                                >
                                    <RefreshCw size={14} />
                                </button>
                            )}
                        </h3>
                        {activeTab === 'head' && <p className="text-xs text-slate-500 mt-1">Pulsa el icono de rotación para cambiar el estilo de peinado.</p>}
                    </div>

                    <div className="flex gap-2">
                         <button 
                            onClick={() => {
                                setIsPixelMode(!isPixelMode);
                                if(!isPixelMode) ensurePixels(activeTab);
                            }}
                            className={`px-4 py-2 rounded-lg text-xs font-bold border transition flex items-center gap-2 ${
                                isPixelMode 
                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                            }`}
                        >
                            <Paintbrush size={14} />
                            {isPixelMode ? 'Modo Pixel: ACTIVADO' : 'Personalizar Pixeles'}
                        </button>
                    </div>
                </div>

                {!isPixelMode ? (
                    /* SIMPLE MODE: PRESETS */
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                            <button
                                onClick={() => setPresetColor(activeTab, 'transparent')}
                                className="aspect-square rounded-lg border-2 border-slate-700 hover:border-red-500 bg-slate-800 flex items-center justify-center group relative overflow-hidden"
                                title="Quitar"
                            >
                                <X className="text-slate-500 group-hover:text-red-500" />
                                <span className="absolute bottom-1 text-[8px] text-slate-500 uppercase">Vacío</span>
                            </button>

                            {(activeTab === 'head' ? HAIR_COLORS : CLOTHING_COLORS).map(c => (
                                <button
                                    key={c}
                                    onClick={() => setPresetColor(activeTab, c)}
                                    className={`aspect-square rounded-lg border-2 relative shadow-sm transition-all hover:scale-105 ${
                                        config[activeTab].color === c 
                                        ? 'border-white ring-2 ring-indigo-500/30 scale-105 z-10' 
                                        : 'border-slate-700 hover:border-slate-500'
                                    }`}
                                    style={{ backgroundColor: c }}
                                >
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    /* PIXEL MODE */
                    <div className="flex flex-col xl:flex-row gap-8 animate-in fade-in zoom-in-95 duration-200">
                        
                        {/* Tools Palette */}
                        <div className="flex flex-col gap-4 min-w-[160px]">
                            <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                                <p className="text-[10px] text-slate-400 mb-2 uppercase font-bold tracking-wider">Herramientas</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <button 
                                        className="p-2 rounded bg-indigo-900/50 hover:bg-indigo-900 text-indigo-300 border border-indigo-500/30 flex flex-col items-center gap-1" 
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Upload size={16} />
                                        <span className="text-[9px]">Importar</span>
                                    </button>
                                    <input 
                                        ref={fileInputRef}
                                        type="file" 
                                        accept="image/png" 
                                        className="hidden"
                                        onChange={handleFileUpload}
                                    />
                                    <button 
                                        className={`p-2 rounded flex flex-col items-center gap-1 border transition ${selectedColor === 'eraser' ? 'bg-red-900/50 border-red-500 text-red-200' : 'bg-slate-700 border-slate-600 text-slate-300'}`}
                                        onClick={() => setSelectedColor('eraser')}
                                    >
                                        <Eraser size={16} />
                                        <span className="text-[9px]">Borrar</span>
                                    </button>
                                </div>
                            </div>

                            <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                                <p className="text-[10px] text-slate-400 mb-2 uppercase font-bold tracking-wider">Colores</p>
                                <div className="grid grid-cols-4 gap-1.5">
                                    {[...CLOTHING_COLORS, ...HAIR_COLORS].slice(0, 12).map(c => (
                                        <button 
                                            key={c}
                                            className={`w-6 h-6 rounded-sm ${selectedColor === c ? 'ring-2 ring-white scale-110 z-10' : 'hover:opacity-80'}`}
                                            style={{ backgroundColor: c }}
                                            onClick={() => setSelectedColor(c)}
                                        />
                                    ))}
                                </div>
                                <div className="mt-3 pt-3 border-t border-slate-700">
                                    <input 
                                        type="color" 
                                        value={selectedColor === 'eraser' ? '#ffffff' : selectedColor}
                                        onChange={(e) => setSelectedColor(e.target.value)}
                                        className="w-full h-8 rounded cursor-pointer bg-slate-900 border border-slate-600"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Pixel Grid */}
                        <div className="flex-1 flex flex-col items-center justify-center bg-slate-800/30 p-8 rounded-2xl border border-slate-800">
                            <div 
                                className="grid gap-[1px] bg-slate-700 border-4 border-slate-700 shadow-2xl"
                                style={{ 
                                    gridTemplateColumns: `repeat(${GRID_SIZES[activeTab].w}, 1fr)`,
                                    width: 'fit-content'
                                }}
                            >
                                {(config[activeTab].pixels || []).map((row, y) => (
                                    row.map((col, x) => (
                                        <div
                                            key={`${x}-${y}`}
                                            onMouseDown={() => handlePixelClick(x, y)}
                                            onMouseEnter={(e) => { if(e.buttons === 1) handlePixelClick(x, y); }}
                                            className="w-10 h-10 cursor-pointer hover:brightness-110 transition-all"
                                            style={{ 
                                                backgroundColor: col || 'rgba(30, 41, 59, 0.5)',
                                                backgroundImage: !col ? 'radial-gradient(circle, #334155 1px, transparent 1px)' : 'none',
                                                backgroundSize: '4px 4px'
                                            }}
                                        />
                                    ))
                                ))}
                            </div>
                            <p className="mt-4 text-xs text-slate-500 font-mono">
                                {GRID_SIZES[activeTab].w} x {GRID_SIZES[activeTab].h} px
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center">
                <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition font-medium">
                    Cancelar
                </button>
                <button 
                    onClick={() => onSave(config)} 
                    className="px-8 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-green-900/30 transform transition active:scale-95"
                >
                    <Check size={20} />
                    Guardar Cambios
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
