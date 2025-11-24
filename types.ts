
export enum Status {
  AVAILABLE = 'Disponible',
  BUSY = 'Ocupado',
  MEETING = 'En Reunión',
  AFK = 'Ausente'
}

export interface Position {
  x: number;
  y: number;
}

// 2D grid of colors. Empty string means transparent.
export type PixelGrid = string[][];

export interface AvatarLayer {
  color: string; // Base color
  pixels?: PixelGrid; // Custom pixel art override
  type?: 'preset' | 'custom';
}

export interface AvatarConfig {
  skinColor: string;
  eyeColor: string; // New field for Terraria style eyes
  head: AvatarLayer; // Hair
  torso: AvatarLayer; // Shirt/Armor
  legs: AvatarLayer; // Pants
  feet: AvatarLayer; // Shoes
  accessory: AvatarLayer;
  gender: 'masculine' | 'feminine';
}

export interface User {
  id: string;
  name: string;
  position: Position;
  color: string;
  status: Status;
  isMuted: boolean;
  isScreenSharing: boolean;
  avatarConfig: AvatarConfig;
}

export interface Bot extends User {
  role: string;
  description: string;
  avatarUrl?: string;
}

export interface ChatMessage {
  sender: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export type EditingMode = 'none' | 'wall' | 'meeting_zone' | 'eraser';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  type: 'desk' | 'wall' | 'plant' | 'meeting_room' | 'meeting_zone';
}