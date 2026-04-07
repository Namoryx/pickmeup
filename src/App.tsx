import React, { Suspense, useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Physics, useBox } from '@react-three/cannon';
import { OrbitControls, PerspectiveCamera, Environment, Float, Text } from '@react-three/drei';
import { motion, AnimatePresence } from 'motion/react';
import * as THREE from 'three';
import { Trophy, Coins, RefreshCw, Target, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useGameStore } from './store';
import { Claw, Machine, Prize } from './GameComponents';

const COLORS = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#4ade80', '#2dd4bf', '#22d3ee', '#60a5fa', '#818cf8', '#c084fc', '#f472b6'];
const TYPES: ('sphere' | 'box')[] = ['sphere', 'box'];

// Sensor to detect prizes in the drop zone
const DropZoneSensor = () => {
  const { addScore } = useGameStore();
  const [ref] = useBox(() => ({
    isTrigger: true,
    position: [-3.8, -1, -3.8],
    args: [2, 2, 2],
    onCollide: (e) => {
      // When something hits the sensor below the hole
      addScore(100);
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 }
      });
    }
  }), useRef<THREE.Mesh>(null));

  return (
    <mesh ref={ref as any}>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial transparent opacity={0} />
    </mesh>
  );
};

// Detect prizes in drop zone (Logic moved to a child component of Canvas)
const GameLogic = () => {
  // We can add frame-based logic here if needed
  return null;
};

export default function App() {
  const { score, coins, isGrabbing, setGrabbing, useCoin, resetGame, addScore } = useGameStore();
  const [prizes, setPrizes] = useState<any[]>([]);

  useEffect(() => {
    generatePrizes();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        handleGrab();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [coins, isGrabbing]);

  const generatePrizes = () => {
    const newPrizes = [];
    for (let i = 0; i < 25; i++) {
      newPrizes.push({
        id: i,
        position: [
          (Math.random() - 0.5) * 8,
          Math.random() * 2 + 0.5,
          (Math.random() - 0.5) * 8
        ] as [number, number, number],
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        type: TYPES[Math.floor(Math.random() * TYPES.length)],
      });
    }
    setPrizes(newPrizes);
  };

  const handleGrab = () => {
    if (isGrabbing || coins <= 0) return;
    if (useCoin()) {
      setGrabbing(true);
    }
  };

  return (
    <div className="relative w-full h-screen bg-slate-950 font-sans select-none overflow-hidden">
      {/* 3D Scene */}
      <Canvas shadows>
        <color attach="background" args={['#0a0a0a']} />
        <PerspectiveCamera makeDefault position={[12, 12, 12]} fov={40} />
        <OrbitControls 
          enablePan={true} 
          maxPolarAngle={Math.PI / 1.8} 
          minDistance={8} 
          maxDistance={30}
          target={[0, 4, 0]}
          makeDefault
        />
        
        <Suspense fallback={null}>
          <Environment preset="city" />
          
          <ambientLight intensity={0.3} />
          <spotLight position={[10, 20, 10]} angle={0.5} penumbra={1} intensity={2} castShadow />
          <pointLight position={[-10, 5, -10]} intensity={0.8} />
          <pointLight position={[0, 2, 6]} intensity={0.5} color="#ff00ff" />

          <Physics gravity={[0, -9.81, 0]}>
            <GameLogic />
            <Machine />
            <Claw />
            <DropZoneSensor />
            {prizes.map((p) => (
              <Prize key={p.id} {...p} />
            ))}
          </Physics>

          <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.2}>
            <Text
              position={[0, 11, -4.8]}
              fontSize={0.8}
              color="#ff00ff"
              anchorX="center"
              anchorY="middle"
            >
              PREMIUM CLAW ARCADE
            </Text>
          </Float>
        </Suspense>
      </Canvas>

      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6">
        {/* Header Stats */}
        <div className="flex justify-between items-start pointer-events-auto">
          <motion.div 
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="glass-panel p-4 flex items-center gap-4"
          >
            <div className="bg-yellow-500/20 p-2 rounded-lg">
              <Trophy className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Score</p>
              <p className="text-2xl font-black text-white tabular-nums">{score}</p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="glass-panel p-4 flex items-center gap-4"
          >
            <div className="bg-blue-500/20 p-2 rounded-lg">
              <Coins className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Coins</p>
              <p className="text-2xl font-black text-white tabular-nums">{coins}</p>
            </div>
          </motion.div>
        </div>

        {/* Controls Hint */}
        <div className="flex flex-col items-center gap-4">
          <AnimatePresence>
            {coins === 0 && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="bg-red-500/20 border border-red-500/50 px-6 py-2 rounded-full text-red-400 font-bold backdrop-blur-sm"
              >
                OUT OF COINS!
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-4 pointer-events-auto">
            <button
              onClick={resetGame}
              className="glass-panel p-4 hover:bg-white/20 transition-colors group"
              title="Reset Game"
            >
              <RefreshCw className="w-8 h-8 text-white group-active:rotate-180 transition-transform duration-500" />
            </button>

            <button
              onClick={handleGrab}
              disabled={isGrabbing || coins <= 0}
              className={`
                px-12 py-4 rounded-2xl font-black text-xl tracking-widest uppercase flex items-center gap-3 transition-all
                ${isGrabbing || coins <= 0 
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/40 hover:scale-105 active:scale-95 neon-border'}
              `}
            >
              <Target className={`w-6 h-6 ${isGrabbing ? 'animate-ping' : ''}`} />
              {isGrabbing ? 'GRABBING...' : 'PUSH TO GRAB'}
            </button>
          </div>

          <div className="glass-panel px-6 py-3 flex gap-8 text-slate-400 text-sm font-medium">
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <kbd className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 text-xs">W</kbd>
                <kbd className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 text-xs">A</kbd>
                <kbd className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 text-xs">S</kbd>
                <kbd className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 text-xs">D</kbd>
              </div>
              <span>Move Claw</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-xs">SPACE</kbd>
              <span>Grab</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Controls (Visual Only for now) */}
      <div className="absolute bottom-32 left-6 pointer-events-auto lg:hidden">
        <div className="grid grid-cols-3 gap-2">
          <div />
          <button className="glass-panel p-3 active:bg-white/30"><ArrowUp className="w-6 h-6" /></button>
          <div />
          <button className="glass-panel p-3 active:bg-white/30"><ArrowLeft className="w-6 h-6" /></button>
          <button className="glass-panel p-3 active:bg-white/30"><ArrowDown className="w-6 h-6" /></button>
          <button className="glass-panel p-3 active:bg-white/30"><ArrowRight className="w-6 h-6" /></button>
        </div>
      </div>
    </div>
  );
}
