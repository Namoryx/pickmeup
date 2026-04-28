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
  const { score, coins, isGrabbing, setGrabbing, useCoin, resetGame, setMovement, movement } = useGameStore();
  const [prizes, setPrizes] = useState<any[]>([]);
  const joystickRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

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

  const handleJoystickMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!joystickRef.current || !isDragging) return;
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxDistance = rect.width / 2;
    
    const normalizedX = Math.max(-1, Math.min(1, deltaX / maxDistance));
    const normalizedY = Math.max(-1, Math.min(1, deltaY / maxDistance));
    
    setMovement({ x: normalizedX, z: normalizedY });
  };

  const stopJoystick = () => {
    setIsDragging(false);
    setMovement({ x: 0, z: 0 });
  };

  return (
    <div className="relative w-full h-screen bg-slate-950 font-sans select-none overflow-hidden touch-none">
      {/* 3D Scene */}
      <Canvas shadows>
        <color attach="background" args={['#0a0a0a']} />
        <PerspectiveCamera makeDefault position={[12, 12, 12]} fov={40} />
        <OrbitControls 
          enablePan={false} 
          maxPolarAngle={Math.PI / 1.8} 
          minDistance={8} 
          maxDistance={20}
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
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4">
        {/* Header Stats */}
        <div className="flex justify-between items-start pointer-events-auto">
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="glass-panel p-3 flex items-center gap-3"
          >
            <Trophy className="w-5 h-5 text-yellow-400" />
            <p className="text-xl font-black text-white">{score}</p>
          </motion.div>

          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="glass-panel p-3 flex items-center gap-3"
          >
            <Coins className="w-5 h-5 text-blue-400" />
            <p className="text-xl font-black text-white">{coins}</p>
          </motion.div>
        </div>

        {/* Mobile Controls */}
        <div className="flex justify-between items-end pb-8 pointer-events-auto">
          {/* Joystick */}
          <div 
            ref={joystickRef}
            className="w-32 h-32 rounded-full bg-white/10 backdrop-blur-md border border-white/20 relative flex items-center justify-center"
            onTouchStart={() => setIsDragging(true)}
            onTouchMove={handleJoystickMove}
            onTouchEnd={stopJoystick}
            onMouseDown={() => setIsDragging(true)}
            onMouseMove={handleJoystickMove}
            onMouseUp={stopJoystick}
            onMouseLeave={stopJoystick}
          >
            <motion.div 
              animate={{ 
                x: movement.x * 40, 
                y: movement.z * 40 
              }}
              transition={{ type: 'spring', damping: 15, stiffness: 200 }}
              className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 shadow-xl border border-white/30"
            />
          </div>

          {/* Grab Button */}
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={resetGame}
              className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20 active:scale-90 transition-transform"
            >
              <RefreshCw className="w-6 h-6 text-white" />
            </button>
            
            <button
              onClick={handleGrab}
              disabled={isGrabbing || coins <= 0}
              className={`
                w-24 h-24 rounded-full font-black text-lg uppercase flex items-center justify-center transition-all shadow-2xl
                ${isGrabbing || coins <= 0 
                  ? 'bg-slate-800 text-slate-500' 
                  : 'bg-gradient-to-b from-red-500 to-red-700 text-white border-4 border-red-400/50 active:scale-90 active:brightness-125'}
              `}
            >
              PUSH
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
