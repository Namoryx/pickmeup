import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useBox, useSphere, useCompoundBody } from '@react-three/cannon';
import * as THREE from 'three';
import { useGameStore } from './store';

// Physics-based Prize
export const Prize = ({ position, color, type, id }: { position: [number, number, number], color: string, type: 'sphere' | 'box', id: number }) => {
  const [ref] = type === 'sphere' 
    ? useSphere(() => ({ mass: 0.8, position, args: [0.4], linearDamping: 0.5, angularDamping: 0.5 }), useRef<THREE.Mesh>(null))
    : useBox(() => ({ mass: 0.8, position, args: [0.7, 0.7, 0.7], linearDamping: 0.5, angularDamping: 0.5 }), useRef<THREE.Mesh>(null));

  return (
    <mesh ref={ref as any} castShadow>
      {type === 'sphere' ? <sphereGeometry args={[0.4, 16, 16]} /> : <boxGeometry args={[0.7, 0.7, 0.7]} />}
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.3} />
    </mesh>
  );
};

// The Claw Component
export const Claw = () => {
  const { isGrabbing, setGrabbing } = useGameStore();
  const [pos, setPos] = useState<[number, number, number]>([0, 5, 0]);
  const [isOpen, setIsOpen] = useState(true);
  
  const clawRef = useRef<THREE.Group>(null);
  
  // Use a single box for physics to ensure stability
  const [ref, api] = useBox(() => ({
    type: 'Kinematic',
    position: [0, 5, 0],
    args: [0.8, 0.4, 0.8],
  }), clawRef);

  const speed = 0.15;
  const keys = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keys.current[e.key] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keys.current[e.key] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame(() => {
    if (isGrabbing) return;

    let [x, y, z] = pos;
    if (keys.current['ArrowLeft'] || keys.current['a']) x -= speed;
    if (keys.current['ArrowRight'] || keys.current['d']) x += speed;
    if (keys.current['ArrowUp'] || keys.current['w']) z -= speed;
    if (keys.current['ArrowDown'] || keys.current['s']) z += speed;

    x = Math.max(-3.5, Math.min(3.5, x));
    z = Math.max(-3.5, Math.min(3.5, z));

    setPos([x, y, z]);
    api.position.set(x, y, z);
  });

  useEffect(() => {
    if (isGrabbing) {
      let active = true;
      const drop = async () => {
        if (!active) return;
        
        // 1. Drop
        const dropDepth = 4.5;
        const dropSteps = 60;
        for (let i = 0; i <= dropSteps && active; i++) {
          const newY = 5 - (i / dropSteps) * dropDepth;
          setPos(p => [p[0], newY, p[2]]);
          api.position.set(pos[0], newY, pos[2]);
          await new Promise(r => setTimeout(r, 15));
        }
        
        if (!active) return;
        setIsOpen(false);
        await new Promise(r => setTimeout(r, 800));

        // 2. Lift
        for (let i = 0; i <= dropSteps && active; i++) {
          const newY = (5 - dropDepth) + (i / dropSteps) * dropDepth;
          setPos(p => [p[0], newY, p[2]]);
          api.position.set(pos[0], newY, pos[2]);
          await new Promise(r => setTimeout(r, 15));
        }

        if (!active) return;
        // 3. Move to drop zone
        const targetX = -3.8;
        const targetZ = -3.8;
        const moveSteps = 50;
        const startX = pos[0];
        const startZ = pos[2];

        for (let i = 0; i <= moveSteps && active; i++) {
          const t = i / moveSteps;
          const newX = startX + (targetX - startX) * t;
          const newZ = startZ + (targetZ - startZ) * t;
          setPos(p => [newX, 5, newZ]);
          api.position.set(newX, 5, newZ);
          await new Promise(r => setTimeout(r, 15));
        }

        if (!active) return;
        setIsOpen(true);
        await new Promise(r => setTimeout(r, 1000));
        
        if (!active) return;
        setPos([0, 5, 0]);
        api.position.set(0, 5, 0);
        setGrabbing(false);
      };
      drop();
      return () => { active = false; };
    }
  }, [isGrabbing]);

  return (
    <group>
      {/* Cable */}
      <mesh position={[pos[0], (9.5 + pos[1]) / 2, pos[2]]}>
        <cylinderGeometry args={[0.02, 0.02, 9.5 - pos[1]]} />
        <meshStandardMaterial color="#111" metalness={0.5} />
      </mesh>

      {/* Gantry */}
      <mesh position={[0, 9.5, pos[2]]}>
        <boxGeometry args={[10, 0.1, 0.1]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[pos[0], 9.5, 0]}>
        <boxGeometry args={[0.1, 0.1, 10]} />
        <meshStandardMaterial color="#222" />
      </mesh>

      {/* Claw Visuals */}
      <group ref={ref as any}>
        {/* Mechanical Base */}
        <mesh castShadow>
          <cylinderGeometry args={[0.4, 0.5, 0.5, 6]} />
          <meshStandardMaterial color="#444" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.3, 0]}>
          <sphereGeometry args={[0.2]} />
          <meshStandardMaterial color="#222" />
        </mesh>

        {/* 4 Curved Arms for realism */}
        {[0, 90, 180, 270].map((angle, i) => (
          <group key={i} rotation={[0, THREE.MathUtils.degToRad(angle), 0]}>
            <group position={[0.35, -0.1, 0]} rotation={[0, 0, isOpen ? 0.7 : -0.2]}>
              {/* Upper Arm */}
              <mesh castShadow position={[0, -0.4, 0]}>
                <boxGeometry args={[0.1, 0.8, 0.15]} />
                <meshStandardMaterial color="#888" metalness={0.9} roughness={0.1} />
              </mesh>
              {/* Lower Hook */}
              <mesh castShadow position={[0.15, -0.8, 0]} rotation={[0, 0, 0.8]}>
                <boxGeometry args={[0.1, 0.4, 0.15]} />
                <meshStandardMaterial color="#888" metalness={0.9} roughness={0.1} />
              </mesh>
            </group>
          </group>
        ))}
      </group>
    </group>
  );
};

export const Machine = () => {
  const [floorRef] = useBox(() => ({ type: 'Static', position: [0, -0.5, 0], args: [10, 1, 10] }), useRef<THREE.Mesh>(null));
  
  return (
    <group>
      {/* Floor */}
      <mesh ref={floorRef as any} receiveShadow>
        <boxGeometry args={[10, 1, 10]} />
        <meshStandardMaterial color="#1a202c" />
      </mesh>

      {/* Machine Frame - Dark Gray / Industrial Style */}
      <mesh position={[5, 4.5, 0]}>
        <boxGeometry args={[0.4, 11, 10]} />
        <meshStandardMaterial color="#2d3748" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[-5, 4.5, 0]}>
        <boxGeometry args={[0.4, 11, 10]} />
        <meshStandardMaterial color="#2d3748" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[0, 4.5, -5]}>
        <boxGeometry args={[10, 11, 0.4]} />
        <meshStandardMaterial color="#2d3748" metalness={0.5} roughness={0.5} />
      </mesh>
      
      {/* Top Section */}
      <mesh position={[0, 10, 0]}>
        <boxGeometry args={[10.4, 1, 10.4]} />
        <meshStandardMaterial color="#1a202c" metalness={0.7} />
      </mesh>

      {/* Glass */}
      <mesh position={[0, 4.5, 5]}>
        <boxGeometry args={[10, 11, 0.05]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.05} />
      </mesh>

      {/* Drop Zone */}
      <mesh position={[-3.8, 0.05, -3.8]}>
        <boxGeometry args={[2.4, 0.1, 2.4]} />
        <meshStandardMaterial color="#000" />
      </mesh>
      
      {/* Control Panel */}
      <group position={[0, 1.2, 5.4]}>
        <mesh rotation={[-0.6, 0, 0]}>
          <boxGeometry args={[5, 0.8, 1.5]} />
          <meshStandardMaterial color="#111" />
        </mesh>
        <mesh position={[-1.2, 0.6, 0.2]}>
          <cylinderGeometry args={[0.04, 0.04, 0.6]} />
          <meshStandardMaterial color="#000" />
        </mesh>
        <mesh position={[-1.2, 0.9, 0.2]}>
          <sphereGeometry args={[0.12]} />
          <meshStandardMaterial color="#e53e3e" />
        </mesh>
        <mesh position={[1.2, 0.5, 0.2]}>
          <cylinderGeometry args={[0.25, 0.25, 0.15]} />
          <meshStandardMaterial color="#e53e3e" />
        </mesh>
      </group>

      <pointLight position={[0, 9, 0]} intensity={2} color="#fff" />
    </group>
  );
};

