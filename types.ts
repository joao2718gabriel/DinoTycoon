
export type DinosaurType = 
  | 'TREX' 
  | 'TRICERATOPS' 
  | 'PTERODACTYL' 
  | 'STEGOSAURUS' 
  | 'VELOCIRAPTOR'
  | 'SPINOSAURUS';

export type Rarity = 'COMUM' | 'RARO' | 'EPICO' | 'LENDARIO';

export interface Dinosaur {
  id: DinosaurType;
  name: string;
  price: number;
  incomePerSecond: number;
  description: string;
  color: string;
  rarity: Rarity;
  isLimited?: boolean;
  initialStock?: number;
}

export interface DeployedDino {
  instanceId: string;
  type: DinosaurType;
  serial: number;
}

export interface FriendRequest {
  fromId: string;
  fromUsername: string;
}

export interface MarketListing {
  id: string;
  sellerId: string;
  sellerName: string;
  dinoType: DinosaurType;
  serial: number;
  price: number;
  createdAt: string;
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  lastActiveAt: string;
  avatarType: DinosaurType;
  money: number;
  ownedDinos: Record<DinosaurType, number[]>;
  territoryDinos: DeployedDino[]; // Máximo 5
  friends: string[];
  friendRequests: FriendRequest[];
}

export interface GameState {
  money: number;
  ownedDinos: Record<DinosaurType, number[]>;
  totalIncome: number;
}
