
import { Dinosaur, DinosaurType } from './types';

export const DINOSAURS: Record<DinosaurType, Dinosaur> = {
  VELOCIRAPTOR: {
    id: 'VELOCIRAPTOR',
    name: 'Velociraptor',
    price: 50,
    incomePerSecond: 3,
    description: 'Pequeno, mas letal para o mercado financeiro. Velocistas da rentabilidade.',
    color: '#2ecc71',
    rarity: 'COMUM'
  },
  TRICERATOPS: {
    id: 'TRICERATOPS',
    name: 'Triceratops',
    price: 150,
    incomePerSecond: 8,
    description: 'Três chifres para perfurar qualquer inflação e proteger seu capital.',
    color: '#3498db',
    rarity: 'COMUM'
  },
  STEGOSAURUS: {
    id: 'STEGOSAURUS',
    name: 'Estegossauro',
    price: 400,
    incomePerSecond: 18,
    description: 'Defesa sólida e lucros pontiagudos. Uma muralha de dividendos.',
    color: '#f1c40f',
    rarity: 'RARO'
  },
  PTERODACTYL: {
    id: 'PTERODACTYL',
    name: 'Pterodáctilo',
    price: 800,
    incomePerSecond: 35,
    description: 'Visão aérea privilegiada sobre os investimentos globais.',
    color: '#9b59b6',
    rarity: 'RARO'
  },
  TREX: {
    id: 'TREX',
    name: 'T-Rex',
    price: 2500,
    incomePerSecond: 100,
    description: 'O rei. Onde ele pisa, o lucro floresce e os competidores tremem.',
    color: '#e74c3c',
    rarity: 'EPICO'
  },
  SPINOSAURUS: {
    id: 'SPINOSAURUS',
    name: 'Espinossauro',
    price: 5000,
    incomePerSecond: 250,
    description: 'Nadando em dinheiro. Um predador alfa do mercado financeiro!',
    color: '#e67e22',
    rarity: 'EPICO',
    isLimited: true,
    initialStock: 3
  },
  ANKYLOSAURUS: {
    id: 'ANKYLOSAURUS',
    name: 'Anquilossauro',
    price: 12000,
    incomePerSecond: 600,
    description: 'Uma armadura impenetrável contra crises. Estabilidade bruta.',
    color: '#95a5a6',
    rarity: 'EPICO'
  },
  BRACHIOSAURUS: {
    id: 'BRACHIOSAURUS',
    name: 'Braquiossauro',
    price: 50000,
    incomePerSecond: 3000,
    description: 'Alcança as alturas mais altas do mercado. Visão de longo alcance.',
    color: '#1abc9c',
    rarity: 'LENDARIO'
  }
};

export const INITIAL_STATE = {
  money: 100,
  ownedDinos: {
    TREX: [],
    TRICERATOPS: [],
    PTERODACTYL: [],
    STEGOSAURUS: [],
    VELOCIRAPTOR: [],
    SPINOSAURUS: [],
    ANKYLOSAURUS: [],
    BRACHIOSAURUS: []
  }
};
