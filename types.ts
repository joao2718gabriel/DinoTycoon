
export type DinosaurType = 
  | 'TREX' 
  | 'TRICERATOPS' 
  | 'PTERODACTYL' 
  | 'STEGOSAURUS' 
  | 'VELOCIRAPTOR'
  | 'SPINOSAURUS'
  | 'ANKYLOSAURUS'
  | 'BRACHIOSAURUS';

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

export interface FriendRequest {
  fromId: string;
  fromUsername: string;
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  avatarType: DinosaurType;
  money: number;
  // Agora mapeia o tipo para uma lista de números de série (ou [0] para infinitos)
  ownedDinos: Record<DinosaurType, number[]>;
  friends: string[];
  friendRequests: FriendRequest[];
}

export interface GameState {
  money: number;
  ownedDinos: Record<DinosaurType, number[]>;
  totalIncome: number;
}
