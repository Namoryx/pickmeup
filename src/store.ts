import { create } from 'zustand';

interface GameState {
  score: number;
  coins: number;
  isGameOver: boolean;
  isGrabbing: boolean;
  lastCaught: string | null;
  movement: { x: number; z: number };
  addScore: (points: number) => void;
  useCoin: () => boolean;
  addCoin: (amount: number) => void;
  setGrabbing: (grabbing: boolean) => void;
  setLastCaught: (name: string | null) => void;
  setMovement: (movement: { x: number; z: number }) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  score: 0,
  coins: 10,
  isGameOver: false,
  isGrabbing: false,
  lastCaught: null,
  movement: { x: 0, z: 0 },
  addScore: (points) => set((state) => ({ score: state.score + points })),
  useCoin: () => {
    const { coins } = get();
    if (coins > 0) {
      set({ coins: coins - 1 });
      return true;
    }
    return false;
  },
  addCoin: (amount) => set((state) => ({ coins: state.coins + amount })),
  setGrabbing: (grabbing) => set({ isGrabbing: grabbing }),
  setLastCaught: (name) => set({ lastCaught: name }),
  setMovement: (movement) => set({ movement }),
  resetGame: () => set({ score: 0, coins: 10, isGameOver: false, lastCaught: null, movement: { x: 0, z: 0 } }),
}));
