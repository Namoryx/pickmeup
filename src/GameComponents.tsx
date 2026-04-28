import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useBox, useSphere, useCompoundBody } from '@react-three/cannon';
import * as THREE from 'three';
import { useGameStore } from './store';

// Visual part of the prize to keep code DRY
const PrizeVisual = React.forwardRef(({ color, type }: { color: string, type: 'sphere' | 'box' }, ref: any) => (
  <group ref={ref}>
    {/* Visual representation of a "Doll" */}
    <mesh castShadow>
      {type === 'sphere' ? <sphereGeometry args={[0.45, 16, 16]} /> : <boxGeometry args={[0.7, 0.7, 0.7]} />}
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.3} />
    </mesh>
    
    {/* Head/Ears for a "Bear" look */}
    <group position={[0, 0.4, 0]}>
      <mesh castShadow>
        <sphereGeometry args={[0.25, 12, 12]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Ears */}
      <mesh position={[0.18, 0.18, 0]} castShadow>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[-0.18, 0.18, 0]} castShadow>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Eyes */}
      <mesh position={[0.08, 0.05, 0.2]} castShadow>
        <sphereGeometry args={[0.02, 4, 4]} />
        <meshStandardMaterial color="#000" />
      </mesh>
      <mesh position={[-0.08, 0.05, 0.2]} castShadow>
        <sphereGeometry args={[0.02, 4, 4]} />
        <meshStandardMaterial color="#000" />
      </mesh>
    </group>
    
    {/* Simple Limbs */}
    <mesh position={[0.25, -0.2, 0]} castShadow>
      <sphereGeometry args={[0.12, 8, 8]} />
      <meshStandardMaterial color={color} />
    </mesh>
    <mesh position={[-0.25, -0.2, 0]} castShadow>
      <sphereGeometry args={[0.12, 8, 8]} />
      <meshStandardMaterial color={color} />
    </mesh>
  </group>
));

const PrizeSphere = ({ position, color }: { position: [number, number, number], color: string }) => {
  const [ref] = useSphere(() => ({ 
    mass: 1.2, 
    position, 
    args: [0.45], 
    linearDamping: 0.5, 
    angularDamping: 0.5,
    friction: 0.8,
    restitution: 0.1
  }), useRef<THREE.Group>(null));
  return <PrizeVisual ref={ref} color={color} type="sphere" />;
};

const PrizeBox = ({ position, color }: { position: [number, number, number], color: string }) => {
  const [ref] = useBox(() => ({ 
    mass: 1.2, 
    position, 
    args: [0.7, 0.7, 0.7], 
    linearDamping: 0.5, 
    angularDamping: 0.5,
    friction: 0.8,
    restitution: 0.1
  }), useRef<THREE.Group>(null));
  return <PrizeVisual ref={ref} color={color} type="box" />;
};

export const Prize = (props: { position: [number, number, number], color: string, type: 'sphere' | 'box', id: number }) => {
  if (props.type === 'sphere') return <PrizeSphere {...props} />;
  return <PrizeBox {...props} />;
};

// The Claw Component (Visual Update: Mechanical Detail & Hook Shape)
export const Claw = () => {
  const { isGrabbing, setGrabbing, movement } = useGameStore();
  const [pos, setPos] = useState<[number, number, number]>([0, 5, 0]);
  const [isOpen, setIsOpen] = useState(true);
  const [hasHit, setHasHit] = useState(false);
  
  const clawRef = useRef<THREE.Group>(null);
  
  // Main body physics
  const [ref, api] = useBox(() => ({
    type: 'Kinematic',
    position: [0, 5, 0],
    args: [0.8, 0.4, 0.8],
    onCollide: (e) => {
      // If we hit something while dropping, we should consider stopping
      if (e.contact.impactVelocity > 0.1) {
        setHasHit(true);
      }
    }
  }), clawRef);

  // Tip sensor physics (to detect floor/prizes)
  const [sensorRef, sensorRefApi] = useBox(() => ({
    type: 'Kinematic',
    isTrigger: true,
    args: [0.5, 0.2, 0.5],
    onCollide: () => {
      setHasHit(true);
    }
  }), useRef<THREE.Mesh>(null));

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
    
    // Keyboard Input
    if (keys.current['ArrowLeft'] || keys.current['a']) x -= speed;
    if (keys.current['ArrowRight'] || keys.current['d']) x += speed;
    if (keys.current['ArrowUp'] || keys.current['w']) z -= speed;
    if (keys.current['ArrowDown'] || keys.current['s']) z += speed;

    // Joystick Input
    x += movement.x * speed;
    z += movement.z * speed;

    x = Math.max(-3.5, Math.min(3.5, x));
    z = Math.max(-3.5, Math.min(3.5, z));

    setPos([x, y, z]);
    api.position.set(x, y, z);
  });

  useEffect(() => {
    if (isGrabbing) {
      let active = true;
      setHasHit(false);

      const drop = async () => {
        if (!active) return;
        
        // 1. Drop until hit or max depth
        const maxDepth = 4.8;
        const dropSteps = 100;
        let currentY = 5;
        
        for (let i = 0; i <= dropSteps && active; i++) {
          currentY = 5 - (i / dropSteps) * maxDepth;
          setPos(p => [p[0], currentY, p[2]]);
          api.position.set(pos[0], currentY, pos[2]);
          
          // Check if we hit something (using a ref for hasHit to avoid closure issues)
          // But since we are in a loop, we can just use the state if we are careful
          // Actually, state updates won't be reflected in this loop immediately.
          // Let's use a ref for hasHit.
          if (hasHitRef.current) break;
          
          await new Promise(r => setTimeout(r, 15));
        }
        
        if (!active) return;
        setIsOpen(false);
        await new Promise(r => setTimeout(r, 800));

        // 2. Lift back to 5
        const startY = currentY;
        const liftSteps = 60;
        for (let i = 0; i <= liftSteps && active; i++) {
          const newY = startY + (i / liftSteps) * (5 - startY);
          setPos(p => [p[0], newY, p[2]]);
          api.position.set(pos[0], newY, pos[2]);
          await new Promise(r => setTimeout(r, 15));
        }

        if (!active) return;
        // 3. Move to drop zone
        const targetX = -3.8;
        const targetZ = -3.8;
        const moveSteps = 50;
        const sX = pos[0];
        const sZ = pos[2];

        for (let i = 0; i <= moveSteps && active; i++) {
          const t = i / moveSteps;
          const newX = sX + (targetX - sX) * t;
          const newZ = sZ + (targetZ - sZ) * t;
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

  // Ref for collision detection to use inside async loop
  const hasHitRef = useRef(false);
  useEffect(() => {
    hasHitRef.current = hasHit;
  }, [hasHit]);

  // Update sensor position to follow claw
  useFrame(() => {
    sensorRefApi.position.set(pos[0], pos[1] - 1.5, pos[2]);
  });

  return (
    <group>
      {/* Sensor (Invisible) */}
      <mesh ref={sensorRef as any}>
        <boxGeometry args={[0.5, 0.2, 0.5]} />
        <meshStandardMaterial transparent opacity={0} />
      </mesh>

      {/* Coiled Cable Visual */}
      <group position={[pos[0], (9.5 + pos[1]) / 2, pos[2]]}>
        {Array.from({ length: 20 }).map((_, i) => (
          <mesh key={i} position={[Math.sin(i * 1.5) * 0.05, (i / 20 - 0.5) * (9.5 - pos[1]), Math.cos(i * 1.5) * 0.05]} rotation={[0, 0, 0.2]}>
            <torusGeometry args={[0.04, 0.01, 8, 16]} />
            <meshStandardMaterial color="#222" />
          </mesh>
        ))}
        {/* Main straight cable core */}
        <mesh>
          <cylinderGeometry args={[0.01, 0.01, 9.5 - pos[1]]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      </group>

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
          <cylinderGeometry args={[0.4, 0.5, 0.6, 8]} />
          <meshStandardMaterial color="#333" metalness={0.9} roughness={0.1} />
        </mesh>
        
        {/* Status Light */}
        <mesh position={[0, 0.35, 0]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial 
            color={isGrabbing ? "#ff0000" : "#00ff00"} 
            emissive={isGrabbing ? "#ff0000" : "#00ff00"} 
            emissiveIntensity={2} 
          />
        </mesh>
        
        {/* Internal Gears Visual */}
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 0.1, 12]} />
          <meshStandardMaterial color="#555" metalness={1} />
        </mesh>

        {/* 3 Thin Wire Arms (Matching Image) */}
        {[0, 120, 240].map((angle, i) => (
          <group key={i} rotation={[0, THREE.MathUtils.degToRad(angle), 0]}>
            <group position={[0.15, 0, 0]} rotation={[0, 0, isOpen ? 0.2 : -0.8]}>
              {/* Thin Wire Arm - Curved like the image */}
              <mesh castShadow position={[0.15, -0.6, 0]} rotation={[0, 0, 0.3]}>
                <boxGeometry args={[0.02, 1.2, 0.02]} />
                <meshStandardMaterial color="#ddd" metalness={1} roughness={0.1} />
              </mesh>
              {/* Hook Tip */}
              <mesh castShadow position={[0.3, -1.2, 0]} rotation={[0, 0, 1.2]}>
                <boxGeometry args={[0.02, 0.4, 0.02]} />
                <meshStandardMaterial color="#ddd" metalness={1} />
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

