
import { Bot, Rect, Status, AvatarConfig, AvatarLayer, PixelGrid } from './types';

// Detectar entorno para habilitar/deshabilitar bots
const getEnv = (key: string) => {
    if (import.meta && (import.meta as any).env) {
        return (import.meta as any).env[key];
    }
    return false;
};
// Habilitar bots solo si estamos en DEV o si se habilita explícitamente
const ENABLE_BOTS = getEnv("DEV") || getEnv("VITE_ENABLE_AI") === 'true';

export const CANVAS_WIDTH = 2000;
export const CANVAS_HEIGHT = 1500;
export const PLAYER_RADIUS = 20;
export const PROXIMITY_THRESHOLD = 150;
export const AUDIO_MAX_DISTANCE = 300;

export const INITIAL_USER_POS = { x: 400, y: 300 };

// Terraria-ish Palettes
export const SKIN_COLORS = [
  '#FFCba0', // Default light
  '#dcb288', // Tan
  '#c08a66', // Darker
  '#8d5524', // Dark
  '#523418', // Very Dark
  '#b4eeb4', // Zombie/Alien
  '#a3a3a3'  // Stone/Grey
];

export const EYE_COLORS = [
  '#3b82f6', // Blue
  '#22c55e', // Green
  '#78350f', // Brown
  '#000000', // Black
  '#ef4444', // Red
  '#a855f7', // Purple
];

export const HAIR_COLORS = [
  '#262626', // Black
  '#593617', // Dark Brown
  '#8f532a', // Light Brown
  '#d4ac5d', // Blonde
  '#991e1e', // Redhead
  '#5865F2', // Blueish
  '#4ade80', // Greenish
  '#f472b6', // Pink
  '#e2e8f0', // White/Old
];

export const CLOTHING_COLORS = [
  '#991e1e', // Red Shirt (Guide)
  '#1e293b', // Dark Blue
  '#3b82f6', // Blue
  '#166534', // Green
  '#eab308', // Gold/Yellow
  '#7e22ce', // Purple
  '#be185d', // Pink
  '#475569', // Grey
  '#0f172a', // Black
  '#ffffff', // White
];

// 8x8 Hair Templates (0 = empty, 1 = hair color)
export const HAIR_PRESETS: number[][][] = [
  // 1. Default / Bowl
  [
    [0,1,1,1,1,1,1,0],
    [1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1],
    [1,1,0,0,0,0,1,1],
    [1,0,0,0,0,0,0,1],
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0]
  ],
  // 2. Spiky
  [
    [0,0,1,0,0,1,0,0],
    [0,1,1,1,1,1,1,0],
    [1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1],
    [0,1,0,0,0,0,1,0],
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0]
  ],
  // 3. Long
  [
    [0,1,1,1,1,1,1,0],
    [1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1],
    [1,1,0,0,0,0,1,1],
    [1,1,0,0,0,0,1,1],
    [1,1,0,0,0,0,1,1],
    [1,1,0,0,0,0,1,1],
    [0,1,0,0,0,0,1,0]
  ],
  // 4. Mohawk
  [
    [0,0,0,1,1,0,0,0],
    [0,0,0,1,1,0,0,0],
    [0,0,1,1,1,1,0,0],
    [0,0,1,1,1,1,0,0],
    [0,0,1,0,0,1,0,0],
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0]
  ]
];

export const generateHairGrid = (color: string, styleIndex: number): PixelGrid => {
  const template = HAIR_PRESETS[styleIndex % HAIR_PRESETS.length];
  return template.map(row => row.map(cell => cell ? color : ''));
};

const createLayer = (color: string, pixels?: PixelGrid): AvatarLayer => ({ 
  color, 
  type: pixels ? 'custom' : 'preset',
  pixels
});

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  skinColor: SKIN_COLORS[0],
  eyeColor: EYE_COLORS[0],
  gender: 'masculine',
  head: createLayer(HAIR_COLORS[1], generateHairGrid(HAIR_COLORS[1], 0)),
  torso: createLayer(CLOTHING_COLORS[0]), // Guide Red
  legs: createLayer('#1e293b'), // Jeans
  feet: createLayer('#0f172a'), // Black shoes
  accessory: createLayer('transparent')
};

export const OFFICE_LAYOUT: Rect[] = [
  // Walls
  { x: 0, y: 0, w: 2000, h: 50, type: 'wall' },
  { x: 0, y: 0, w: 50, h: 1500, type: 'wall' },
  { x: 1950, y: 0, w: 50, h: 1500, type: 'wall' },
  { x: 0, y: 1450, w: 2000, h: 50, type: 'wall' },
  // Meeting Room
  { x: 1400, y: 50, w: 20, h: 500, type: 'wall' },
  { x: 1400, y: 550, w: 600, h: 20, type: 'wall' },
  // Desks
  { x: 200, y: 200, w: 120, h: 80, type: 'desk' },
  { x: 200, y: 400, w: 120, h: 80, type: 'desk' },
  { x: 200, y: 600, w: 120, h: 80, type: 'desk' },
  { x: 500, y: 200, w: 120, h: 80, type: 'desk' },
  { x: 500, y: 400, w: 120, h: 80, type: 'desk' },
  { x: 500, y: 600, w: 120, h: 80, type: 'desk' },
  // Plants
  { x: 100, y: 100, w: 40, h: 40, type: 'plant' },
  { x: 1800, y: 100, w: 40, h: 40, type: 'plant' },
];

export const BOTS: Bot[] = ENABLE_BOTS ? [
  {
    id: 'bot-1',
    name: 'Ana (HR)',
    role: 'Recursos Humanos',
    description: 'Specialist in company culture.',
    position: { x: 260, y: 240 },
    color: '#ec4899',
    status: Status.AVAILABLE,
    isMuted: false,
    isScreenSharing: false,
    avatarConfig: {
        skinColor: SKIN_COLORS[1],
        eyeColor: EYE_COLORS[2],
        gender: 'feminine',
        head: createLayer(HAIR_COLORS[3], generateHairGrid(HAIR_COLORS[3], 2)),
        torso: createLayer('#ec4899'),
        legs: createLayer('#1e293b'),
        feet: createLayer('#000000'),
        accessory: createLayer('transparent')
    }
  },
  {
    id: 'bot-2',
    name: 'Carlos (Dev)',
    role: 'Tech Lead',
    description: 'Expert in React.',
    position: { x: 560, y: 440 },
    color: '#3b82f6',
    status: Status.BUSY,
    isMuted: true,
    isScreenSharing: false,
    avatarConfig: {
        skinColor: SKIN_COLORS[3],
        eyeColor: EYE_COLORS[3],
        gender: 'masculine',
        head: createLayer(HAIR_COLORS[0], generateHairGrid(HAIR_COLORS[0], 1)),
        torso: createLayer('#3b82f6'),
        legs: createLayer('#475569'),
        feet: createLayer('#000000'),
        accessory: createLayer('transparent')
    }
  },
  {
    id: 'bot-3',
    name: 'Sofia (Product)',
    role: 'Product Manager',
    description: 'Focused on roadmap.',
    position: { x: 1600, y: 300 },
    color: '#10b981',
    status: Status.MEETING,
    isMuted: false,
    isScreenSharing: true,
    avatarConfig: {
        skinColor: SKIN_COLORS[2],
        eyeColor: EYE_COLORS[0],
        gender: 'feminine',
        head: createLayer(HAIR_COLORS[4], generateHairGrid(HAIR_COLORS[4], 2)),
        torso: createLayer('#10b981'),
        legs: createLayer('#1e293b'),
        feet: createLayer('#ffffff'),
        accessory: createLayer('transparent')
    }
  }
] : [];