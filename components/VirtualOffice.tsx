
import React, { useRef, useEffect, useState } from 'react';
import { User, Position, Bot, Rect, Status, AvatarConfig, AvatarLayer, EditingMode } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, PLAYER_RADIUS, OFFICE_LAYOUT, INITIAL_USER_POS, BOTS, PROXIMITY_THRESHOLD, AUDIO_MAX_DISTANCE } from '../constants';
import { BotChat } from './BotChat';
import { Mic, MicOff, Monitor, MonitorOff, UserCircle } from 'lucide-react';

interface VirtualOfficeProps {
  userName: string;
  userStatus: Status;
  userAvatarConfig: AvatarConfig;
  isMuted: boolean;
  toggleMute: () => void;
  isScreenSharing: boolean;
  toggleScreenShare: () => void;
  editingMode: EditingMode;
}

type Direction = 'up' | 'down' | 'left' | 'right';

export const VirtualOffice: React.FC<VirtualOfficeProps> = ({ 
    userName, userStatus, userAvatarConfig, isMuted, toggleMute, isScreenSharing, toggleScreenShare, editingMode
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Dynamic Map State
  const [layout, setLayout] = useState<Rect[]>(OFFICE_LAYOUT);
  const layoutRef = useRef<Rect[]>(OFFICE_LAYOUT); // Ref for physics loop access
  const [mouseGridPos, setMouseGridPos] = useState<Position | null>(null);

  // Sync ref when state changes
  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  // Game State (Refs for Physics Loop)
  const userPosRef = useRef<Position>(INITIAL_USER_POS);
  const velocityRef = useRef({ x: 0, y: 0 });
  const frameCountRef = useRef<number>(0);
  const requestRef = useRef<number>(0);

  // React State for UI updates (Coordinates, etc - Throttled)
  const [uiUserPos, setUiUserPos] = useState<Position>(INITIAL_USER_POS);
  const [keysPressed, setKeysPressed] = useState<Set<string>>(new Set());
  const [direction, setDirection] = useState<Direction>('down');
  
  // Interaction State
  const [nearbyBot, setNearbyBot] = useState<Bot | null>(null);
  const [activeChatBot, setActiveChatBot] = useState<Bot | null>(null);
  const [botVolumes, setBotVolumes] = useState<Record<string, number>>({});
  
  // Handle Keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeysPressed(prev => {
          const next = new Set(prev).add(e.code);
          // Direction logic
          if (e.code === 'ArrowLeft' || e.code === 'KeyA') setDirection('left');
          if (e.code === 'ArrowRight' || e.code === 'KeyD') setDirection('right');
          if (e.code === 'ArrowUp' || e.code === 'KeyW') setDirection('up');
          if (e.code === 'ArrowDown' || e.code === 'KeyS') setDirection('down');
          return next;
      });
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      setKeysPressed(prev => {
        const next = new Set(prev);
        next.delete(e.code);
        return next;
      });
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Main Game Loop
  const animate = () => {
    frameCountRef.current += 1;
    updatePhysics();
    renderCanvas();
    calculateProximity();
    updateCamera();
    
    // Throttle UI updates to every 10 frames to avoid React overhead
    if (frameCountRef.current % 10 === 0) {
        setUiUserPos({ ...userPosRef.current });
    }

    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keysPressed, userName, userStatus, userAvatarConfig, isMuted, direction, editingMode, mouseGridPos]); 

  const updatePhysics = () => {
    const SPEED = 6; 
    
    let vx = 0;
    let vy = 0;

    if (keysPressed.has('ArrowUp') || keysPressed.has('KeyW')) vy -= 1;
    if (keysPressed.has('ArrowDown') || keysPressed.has('KeyS')) vy += 1;
    if (keysPressed.has('ArrowLeft') || keysPressed.has('KeyA')) vx -= 1;
    if (keysPressed.has('ArrowRight') || keysPressed.has('KeyD')) vx += 1;

    if (vx !== 0 || vy !== 0) {
      const length = Math.sqrt(vx * vx + vy * vy);
      vx = (vx / length) * SPEED;
      vy = (vy / length) * SPEED;
    }

    let nextX = userPosRef.current.x + vx;
    let nextY = userPosRef.current.y + vy;
    
    // Boundary Checks with Wall Thickness (50px) + Radius (20px) = 70px Safe Zone
    const WALL_THICKNESS = 50;
    const MIN_X = WALL_THICKNESS + PLAYER_RADIUS;
    const MAX_X = CANVAS_WIDTH - WALL_THICKNESS - PLAYER_RADIUS;
    const MIN_Y = WALL_THICKNESS + PLAYER_RADIUS;
    const MAX_Y = CANVAS_HEIGHT - WALL_THICKNESS - PLAYER_RADIUS;

    if (nextX < MIN_X) { nextX = MIN_X; }
    if (nextX > MAX_X) { nextX = MAX_X; }
    if (nextY < MIN_Y) { nextY = MIN_Y; }
    if (nextY > MAX_Y) { nextY = MAX_Y; }

    // Object Collision using Dynamic Layout Ref
    layoutRef.current.forEach(rect => {
      // Skip meeting_zone for physics collision
      if (rect.type === 'meeting_zone' || rect.type === 'meeting_room') return;

      // Check X Movement Collision
      if (nextX + PLAYER_RADIUS > rect.x && nextX - PLAYER_RADIUS < rect.x + rect.w &&
          userPosRef.current.y + PLAYER_RADIUS > rect.y && userPosRef.current.y - PLAYER_RADIUS < rect.y + rect.h) {
             nextX = userPosRef.current.x; 
      }
      
      // Check Y Movement Collision
      if (nextX + PLAYER_RADIUS > rect.x && nextX - PLAYER_RADIUS < rect.x + rect.w &&
          nextY + PLAYER_RADIUS > rect.y && nextY - PLAYER_RADIUS < rect.y + rect.h) {
            nextY = userPosRef.current.y; 
      }
    });

    userPosRef.current = { x: nextX, y: nextY };
    
    // Refined Collision Logic to update velocityRef correctly for animations
    let finalVx = vx;
    let finalVy = vy;
    
    // Check if we hit limits
    if (nextX <= MIN_X || nextX >= MAX_X) finalVx = 0;
    if (nextY <= MIN_Y || nextY >= MAX_Y) finalVy = 0;
    
    // Check objects again to zero velocity if stuck
    layoutRef.current.forEach(rect => {
        if (rect.type === 'meeting_zone' || rect.type === 'meeting_room') return;

        if (nextX + PLAYER_RADIUS > rect.x && nextX - PLAYER_RADIUS < rect.x + rect.w &&
          userPosRef.current.y + PLAYER_RADIUS > rect.y && userPosRef.current.y - PLAYER_RADIUS < rect.y + rect.h) {
             if (Math.abs(vx) > 0) finalVx = 0;
        }
        if (nextX + PLAYER_RADIUS > rect.x && nextX - PLAYER_RADIUS < rect.x + rect.w &&
            nextY + PLAYER_RADIUS > rect.y && nextY - PLAYER_RADIUS < rect.y + rect.h) {
             if (Math.abs(vy) > 0) finalVy = 0;
        }
    });

    velocityRef.current = { x: finalVx, y: finalVy };
  };

  const updateCamera = () => {
    if (containerRef.current) {
        const cx = userPosRef.current.x;
        const cy = userPosRef.current.y;
        const viewportW = containerRef.current.clientWidth;
        const viewportH = containerRef.current.clientHeight;
        
        containerRef.current.scrollTo({
            left: cx - viewportW / 2,
            top: cy - viewportH / 2,
            behavior: 'auto'
        });
    }
  };

  const calculateProximity = () => {
    let closestBot: Bot | null = null;
    let minDist = Infinity;
    const newVolumes: Record<string, number> = {};

    BOTS.forEach(bot => {
      const dx = userPosRef.current.x - bot.position.x;
      const dy = userPosRef.current.y - bot.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let volume = 0;
      if (dist < AUDIO_MAX_DISTANCE) {
        volume = 1 - (dist / AUDIO_MAX_DISTANCE);
      }
      newVolumes[bot.id] = volume;

      if (dist < PROXIMITY_THRESHOLD) {
        if (dist < minDist) {
          minDist = dist;
          closestBot = bot;
        }
      }
    });

    setNearbyBot(closestBot);
    setBotVolumes(newVolumes);
  };

  // Map Editing Interaction
  const handleMouseMove = (e: React.MouseEvent) => {
    if (editingMode === 'none' || !canvasRef.current || !containerRef.current) {
        setMouseGridPos(null);
        return;
    }
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Snap to 50x50 grid
    const gridX = Math.floor(x / 50) * 50;
    const gridY = Math.floor(y / 50) * 50;
    
    setMouseGridPos({ x: gridX, y: gridY });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (editingMode === 'none' || !mouseGridPos) return;
    
    const newRect: Rect = { x: mouseGridPos.x, y: mouseGridPos.y, w: 50, h: 50, type: 'wall' };
    
    if (editingMode === 'wall') {
        newRect.type = 'wall';
    } else if (editingMode === 'meeting_zone') {
        newRect.type = 'meeting_zone';
    }

    setLayout(prev => {
        // Remove existing block at this position if any
        const filtered = prev.filter(r => !(r.x === mouseGridPos.x && r.y === mouseGridPos.y));
        
        if (editingMode === 'eraser') {
            return filtered;
        } else {
            return [...filtered, newRect];
        }
    });
  };

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Floor
    ctx.strokeStyle = '#1e293b'; 
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= CANVAS_WIDTH; x += 50) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += 50) {
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
    }
    ctx.stroke();

    // Map Editing Grid Overlay
    if (editingMode !== 'none') {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x <= CANVAS_WIDTH; x += 50) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, CANVAS_HEIGHT);
        }
        for (let y = 0; y <= CANVAS_HEIGHT; y += 50) {
            ctx.moveTo(0, y);
            ctx.lineTo(CANVAS_WIDTH, y);
        }
        ctx.stroke();
        
        // Ghost Block
        if (mouseGridPos) {
            if (editingMode === 'eraser') {
                ctx.fillStyle = 'rgba(239, 68, 68, 0.5)';
                ctx.fillRect(mouseGridPos.x, mouseGridPos.y, 50, 50);
                ctx.strokeStyle = '#ef4444';
                ctx.strokeRect(mouseGridPos.x, mouseGridPos.y, 50, 50);
            } else {
                ctx.fillStyle = editingMode === 'wall' ? 'rgba(51, 65, 85, 0.5)' : 'rgba(34, 197, 94, 0.3)';
                ctx.fillRect(mouseGridPos.x, mouseGridPos.y, 50, 50);
                ctx.strokeStyle = editingMode === 'wall' ? '#fff' : '#22c55e';
                ctx.lineWidth = 2;
                ctx.strokeRect(mouseGridPos.x, mouseGridPos.y, 50, 50);
            }
        }
    }

    // Dynamic Objects (Layout)
    layoutRef.current.forEach(rect => {
      if (rect.type === 'wall') {
        ctx.fillStyle = '#334155';
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        ctx.fillStyle = '#1e293b'; // Depth
        ctx.fillRect(rect.x, rect.y + rect.h - 5, rect.w, 5);
        // Highlight grid borders if editing walls
        if (editingMode === 'wall') {
            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
        }
      } else if (rect.type === 'meeting_zone' || rect.type === 'meeting_room') {
        // Spatial Audio Zone Visualization
        ctx.fillStyle = 'rgba(34, 197, 94, 0.15)'; // Translucent green
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        
        // Dashed border for zones
        ctx.save();
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
        
        // Icon in center if it's large enough
        if (rect.w >= 50 && rect.h >= 50) {
             ctx.fillStyle = '#22c55e';
             ctx.font = '10px sans-serif';
             ctx.textAlign = 'center';
             ctx.fillText("AUDIO", rect.x + rect.w/2, rect.y + rect.h/2 + 4);
        }
        ctx.restore();

      } else if (rect.type === 'desk') {
        ctx.fillStyle = '#475569';
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        ctx.fillStyle = '#334155';
        ctx.fillRect(rect.x + 5, rect.y + 5, rect.w - 10, rect.h - 10);
      } else if (rect.type === 'plant') {
        ctx.fillStyle = '#166534';
        ctx.beginPath();
        ctx.arc(rect.x + rect.w/2, rect.y + rect.h/2, rect.w/2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(rect.x + rect.w/2, rect.y + rect.h/2, rect.w/3, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Render Bots
    BOTS.forEach(bot => {
       const isMoving = Math.random() > 0.98; // Rare movements
       drawPixelAvatar(ctx, bot.position.x, bot.position.y, bot.name, bot.status, false, bot.isMuted, bot.isScreenSharing, botVolumes[bot.id] || 0, bot.avatarConfig, isMoving, 'down');
    });

    // Render Player
    const playerVolume = !isMuted ? 1.0 : 0; 
    const isMoving = Math.abs(velocityRef.current.x) > 0.1 || Math.abs(velocityRef.current.y) > 0.1;
    
    drawPixelAvatar(ctx, userPosRef.current.x, userPosRef.current.y, userName, userStatus, true, isMuted, isScreenSharing, playerVolume, userAvatarConfig, isMoving, direction);
  };

  const drawPixelAvatar = (
      ctx: CanvasRenderingContext2D, 
      x: number, 
      y: number, 
      name: string, 
      status: Status, 
      isPlayer: boolean,
      isMuted: boolean,
      isSharing: boolean,
      volume: number,
      config: AvatarConfig,
      isMoving: boolean,
      facing: Direction
  ) => {
    
    // 1. Proximity Ring
    if (volume > 0.1 && (!isPlayer || (!isMuted && Math.sin(frameCountRef.current / 5) > 0))) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(74, 222, 128, ${isPlayer ? 0.3 : volume * 0.4})`;
        ctx.lineWidth = 2;
        ctx.arc(x, y, PLAYER_RADIUS + 8 + (Math.sin(Date.now() / 200) * 2), 0, Math.PI * 2);
        ctx.stroke();
    }

    const P = 4; // Pixel Scale
    
    // Animation Calculations
    const time = frameCountRef.current;
    const walkPhase = (time % 20) / 20; 
    
    const legAngle = isMoving ? Math.sin(walkPhase * Math.PI * 2) * 20 : 0;
    const armAngle = isMoving ? -Math.sin(walkPhase * Math.PI * 2) * 20 : 0;
    const bobY = isMoving ? Math.abs(Math.sin(walkPhase * Math.PI * 2)) * 2 : 0; 

    // Helper to draw grid layers
    const drawGrid = (layer: AvatarLayer, ox: number, oy: number, flipX: boolean = false) => {
        if (!layer.pixels) {
            if(layer.color && layer.color !== 'transparent') {
                ctx.fillStyle = layer.color;
                ctx.fillRect(x + ox * P, y + oy * P, 8 * P, 8 * P);
            }
            return;
        }
        layer.pixels.forEach((row, rY) => {
            row.forEach((col, rX) => {
                if(col) {
                    ctx.fillStyle = col;
                    const dX = flipX ? (7 - rX) : rX;
                    ctx.fillRect(x + (ox + dX) * P, y + (oy + rY) * P, P, P);
                }
            });
        });
    };

    if (facing === 'up' || facing === 'down') {
        const isFront = facing === 'down';
        // --- FRONT & BACK RENDER LOGIC ---
        ctx.save();
        ctx.translate(x - 2 * P, y + 4 * P + bobY);
        if (isMoving) ctx.translate(0, Math.sin(walkPhase * Math.PI * 2) * 2); 
        ctx.fillStyle = config.legs.color;
        ctx.fillRect(-1.5 * P, 0, 3 * P, 7 * P);
        ctx.fillStyle = config.feet.color;
        ctx.fillRect(-1.5 * P, 7 * P, 3 * P, 2 * P);
        ctx.restore();

        ctx.save();
        ctx.translate(x + 2 * P, y + 4 * P + bobY);
        if (isMoving) ctx.translate(0, -Math.sin(walkPhase * Math.PI * 2) * 2);
        ctx.fillStyle = config.legs.color;
        ctx.fillRect(-1.5 * P, 0, 3 * P, 7 * P);
        ctx.fillStyle = config.feet.color;
        ctx.fillRect(-1.5 * P, 7 * P, 3 * P, 2 * P);
        ctx.restore();

        drawGrid(config.torso, -4, -4 + (bobY/P));

        ctx.save();
        ctx.translate(x - 5 * P, y - 4 * P + bobY);
        if (isMoving) ctx.rotate((armAngle * 0.5 * Math.PI) / 180); 
        ctx.fillStyle = config.torso.color !== 'transparent' ? config.torso.color : config.skinColor;
        ctx.fillRect(0, 0, 2 * P, 7 * P);
        ctx.fillStyle = config.skinColor;
        ctx.fillRect(0, 7 * P, 2 * P, 2 * P);
        ctx.restore();

        ctx.save();
        ctx.translate(x + 3 * P, y - 4 * P + bobY);
        if (isMoving) ctx.rotate((-armAngle * 0.5 * Math.PI) / 180);
        ctx.fillStyle = config.torso.color !== 'transparent' ? config.torso.color : config.skinColor;
        ctx.fillRect(0, 0, 2 * P, 7 * P);
        ctx.fillStyle = config.skinColor;
        ctx.fillRect(0, 7 * P, 2 * P, 2 * P);
        ctx.restore();

        const headY = -12 + (bobY/P);
        ctx.fillStyle = config.skinColor;
        ctx.fillRect(x - 4 * P, y + headY * P, 8 * P, 8 * P);
        
        if (isFront) {
            ctx.fillStyle = '#fff';
            ctx.fillRect(x - 2 * P, y + (headY + 3) * P, 1 * P, 2 * P);
            ctx.fillRect(x + 1 * P, y + (headY + 3) * P, 1 * P, 2 * P);
            ctx.fillStyle = config.eyeColor;
            ctx.fillRect(x - 1 * P, y + (headY + 3) * P, 1 * P, 2 * P); 
            ctx.fillRect(x + 2 * P, y + (headY + 3) * P, 1 * P, 2 * P);
        }

        drawGrid(config.head, -4, headY - 1);
        drawGrid(config.accessory, -5, -5 + (bobY/P));

    } else {
        // --- SIDE RENDER LOGIC ---
        const flip = facing === 'left';

        ctx.save();
        ctx.translate(x, y - 4 * P + bobY);
        ctx.rotate((armAngle * Math.PI) / 180);
        ctx.fillStyle = config.torso.color !== 'transparent' ? config.torso.color : config.skinColor;
        ctx.filter = 'brightness(0.7)';
        ctx.fillRect(-2 * P, 0, 3 * P, 8 * P);
        ctx.fillStyle = config.skinColor;
        ctx.fillRect(-2 * P, 8 * P, 3 * P, 2 * P);
        ctx.restore();

        ctx.save();
        ctx.translate(x, y + 4 * P + bobY);
        ctx.rotate((-legAngle * Math.PI) / 180);
        ctx.fillStyle = config.legs.color;
        ctx.filter = 'brightness(0.8)';
        ctx.fillRect(-2 * P, 0, 3 * P, 7 * P);
        ctx.fillStyle = config.feet.color;
        ctx.fillRect(-2 * P, 7 * P, 4 * P, 2 * P);
        ctx.restore();

        ctx.save();
        ctx.translate(x, y + 4 * P + bobY);
        ctx.rotate((legAngle * Math.PI) / 180);
        ctx.fillStyle = config.legs.color;
        ctx.fillRect(-2 * P, 0, 3 * P, 7 * P);
        ctx.fillStyle = config.feet.color;
        ctx.fillRect(-2 * P, 7 * P, 4 * P, 2 * P);
        ctx.restore();

        drawGrid(config.torso, -4, -4 + (bobY/P), flip);

        const headY = -12 + (bobY/P);
        ctx.fillStyle = config.skinColor;
        ctx.fillRect(x - 4 * P, y + headY * P, 8 * P, 8 * P);
        
        const eyeOffset = flip ? -2 : 2;
        ctx.fillStyle = '#fff';
        ctx.fillRect(x + (eyeOffset - 1) * P, y + (headY + 3) * P, 1 * P, 2 * P);
        ctx.fillStyle = config.eyeColor;
        ctx.fillRect(x + eyeOffset * P, y + (headY + 3) * P, 1 * P, 2 * P);

        drawGrid(config.head, -4, headY - 1, flip);

        ctx.save();
        ctx.translate(x, y - 4 * P + bobY);
        ctx.rotate((-armAngle * Math.PI) / 180);
        ctx.fillStyle = config.torso.color !== 'transparent' ? config.torso.color : config.skinColor;
        ctx.fillRect(-1 * P, 0, 3 * P, 8 * P);
        ctx.fillStyle = config.skinColor;
        ctx.fillRect(-1 * P, 8 * P, 3 * P, 2 * P);
        ctx.restore();

        drawGrid(config.accessory, -5, -5 + (bobY/P), flip);
    }

    // --- SCREEN SHARE INDICATOR ---
    if (isSharing) {
        const iconY = y - 55;
        // Monitor stand
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x - 4, iconY + 16, 8, 4);
        ctx.fillRect(x - 8, iconY + 20, 16, 2);
        // Monitor bezel
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(x - 13, iconY - 1, 26, 18);
        // Screen
        ctx.fillStyle = '#93c5fd';
        ctx.fillRect(x - 11, iconY + 1, 22, 14);
        // Glare/Detail
        ctx.fillStyle = '#dbeafe';
        ctx.fillRect(x - 9, iconY + 3, 4, 3);
    }

    // --- HUD TAGS ---
    let statusColor = '#22c55e';
    if (status === Status.BUSY) statusColor = '#ef4444';
    if (status === Status.MEETING) statusColor = '#eab308';
    if (status === Status.AFK) statusColor = '#94a3b8';

    ctx.beginPath();
    ctx.arc(x + 20, y - 40, 5, 0, Math.PI * 2);
    ctx.fillStyle = statusColor;
    ctx.fill();

    ctx.fillStyle = isPlayer ? '#818cf8' : '#cbd5e1'; 
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(name, x, y + 40);
  };

  useEffect(() => {
      const handleInteract = (e: KeyboardEvent) => {
          if (e.key.toLowerCase() === 'e') {
              if (nearbyBot) {
                  setActiveChatBot(nearbyBot);
              }
          }
      };
      window.addEventListener('keydown', handleInteract);
      return () => window.removeEventListener('keydown', handleInteract);
  }, [nearbyBot]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-900">
      <div ref={containerRef} className="w-full h-full overflow-auto relative custom-scrollbar">
        <canvas 
            ref={canvasRef} 
            width={CANVAS_WIDTH} 
            height={CANVAS_HEIGHT} 
            className={`bg-slate-950 shadow-xl ${editingMode !== 'none' ? 'cursor-crosshair' : 'cursor-default'}`}
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseDown}
        />
      </div>

      <div className="absolute top-4 right-4 flex flex-col gap-2 pointer-events-none">
        <div className="bg-slate-800/90 backdrop-blur text-white p-3 rounded-xl shadow-lg border border-slate-700 pointer-events-auto">
            <h3 className="font-bold text-sm text-slate-300 mb-1">Mapa</h3>
            <div className="text-xs text-slate-400">
                <p>X: {Math.round(uiUserPos.x)} Y: {Math.round(uiUserPos.y)}</p>
            </div>
        </div>
      </div>

      {activeChatBot && (
          <BotChat 
            bot={activeChatBot} 
            onClose={() => setActiveChatBot(null)} 
            volume={botVolumes[activeChatBot.id] || 0}
          />
      )}
    </div>
  );
};
