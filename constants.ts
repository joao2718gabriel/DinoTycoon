
import { Dinosaur, DinosaurType } from './types';

export const DINOSAURS: Record<DinosaurType, Dinosaur> = {
  VELOCIRAPTOR: {
    id: 'VELOCIRAPTOR',
    name: 'Velociraptor',
    price: 50,
    incomePerSecond: 0.1,
    description: 'Pequeno, mas letal para o mercado financeiro. Velocistas da rentabilidade.',
    color: '#2ecc71',
    rarity: 'COMUM'
  },
  TRICERATOPS: {
    id: 'TRICERATOPS',
    name: 'Triceratops',
    price: 200,
    incomePerSecond: 0.5,
    description: 'Três chifres para perfurar qualquer inflação e proteger seu capital.',
    color: '#3498db',
    rarity: 'COMUM'
  },
  STEGOSAURUS: {
    id: 'STEGOSAURUS',
    name: 'Estegossauro',
    price: 1000,
    incomePerSecond: 1,
    description: 'Defesa sólida e lucros pontiagudos. Uma muralha de dividendos.',
    color: '#f1c40f',
    rarity: 'RARO'
  },
  PTERODACTYL: {
    id: 'PTERODACTYL',
    name: 'Pterodáctilo',
    price: 50000,
    incomePerSecond: 2,
    description: 'Visão aérea privilegiada sobre os investimentos globais.',
    color: '#9b59b6',
    rarity: 'RARO'
  },
  TREX: {
    id: 'TREX',
    name: 'T-Rex',
    price: 1000000,
    incomePerSecond: 5,
    description: 'O rei. Onde ele pisa, o lucro floresce e os competidores tremem.',
    color: '#e74c3c',
    rarity: 'EPICO'
  },
  SPINOSAURUS: {
    id: 'SPINOSAURUS',
    name: 'Espinossauro',
    price: 10000000,
    incomePerSecond: 10,
    description: 'Nadando em dinheiro. Um predador alfa do mercado financeiro!',
    color: '#e67e22',
    rarity: 'LENDARIO',
    isLimited: true,
    initialStock: 3
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
    SPINOSAURUS: []
  },
  territoryDinos: []
};
