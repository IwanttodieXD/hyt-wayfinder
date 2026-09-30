'use client';

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface BaristaCafeProps {
  position: [number, number, number];
  onInteract?: (action: string) => void;
  isActive?: boolean;
}

// Simple coffee machine
function CoffeeMachine({ position, onClick, isActive }: { position: [number, number, number]; onClick: () => void; isActive: boolean }) {
  const [hovered, setHovered] = useState(false);
  const glowRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    if (glowRef.current && isActive) {
      glowRef.current.intensity = 2 + Math.sin(state.clock.elapsedTime * 3) * 0.5;
    }
  });

  return (
    <group position={position}>
      {/* Machine body */}
      <mesh
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        castShadow
      >
        <boxGeometry args={[0.6, 0.8, 0.4]} />
        <meshStandardMaterial 
          color={isActive ? '#ff6b35' : hovered ? '#4a5568' : '#2d3748'} 
          metalness={0.8}
          roughness={0.2}
          emissive={isActive ? '#ff6b35' : '#000000'}
          emissiveIntensity={isActive ? 0.3 : 0}
        />
      </mesh>

      {/* Group head */}
      <mesh position={[0, 0.15, 0.25]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.15]} />
        <meshStandardMaterial color="#1a202c" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Buttons */}
      <mesh position={[-0.15, 0.25, 0.21]}>
        <sphereGeometry args={[0.03]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={isActive ? 0.5 : 0} />
      </mesh>
      <mesh position={[0, 0.25, 0.21]}>
        <sphereGeometry args={[0.03]} />
        <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[0.15, 0.25, 0.21]}>
        <sphereGeometry args={[0.03]} />
        <meshStandardMaterial color="#3b82f6" />
      </mesh>

      {/* Glow effect when active */}
      {isActive && (
        <pointLight ref={glowRef} position={[0, 0.5, 0]} color="#ff6b35" intensity={2} distance={3} />
      )}
    </group>
  );
}

// Coffee grinder
function CoffeeGrinder({ position, onClick, isActive }: { position: [number, number, number]; onClick: () => void; isActive: boolean }) {
  const [hovered, setHovered] = useState(false);
  const hopperRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (hopperRef.current && isActive) {
      hopperRef.current.rotation.y += 0.05;
    }
  });

  return (
    <group position={position}>
      {/* Base */}
      <mesh
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        castShadow
      >
        <boxGeometry args={[0.3, 0.35, 0.3]} />
        <meshStandardMaterial 
          color={isActive ? '#10b981' : hovered ? '#64748b' : '#475569'}
          metalness={0.6}
          emissive={isActive ? '#10b981' : '#000000'}
          emissiveIntensity={isActive ? 0.2 : 0}
        />
      </mesh>

      {/* Bean hopper */}
      <mesh ref={hopperRef} position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.1, 0.15, 0.25]} />
        <meshStandardMaterial color="#94a3b8" transparent opacity={0.7} />
      </mesh>

      {/* Coffee beans inside */}
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh 
          key={i}
          position={[
            (Math.random() - 0.5) * 0.08,
            0.25 + Math.random() * 0.1,
            (Math.random() - 0.5) * 0.08
          ]}
        >
          <sphereGeometry args={[0.015]} />
          <meshStandardMaterial color="#5c4033" />
        </mesh>
      ))}
    </group>
  );
}

// Milk steamer pitcher
function MilkPitcher({ position, onClick, isActive }: { position: [number, number, number]; onClick: () => void; isActive: boolean }) {
  const [hovered, setHovered] = useState(false);
  const steamRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (steamRef.current && isActive) {
      steamRef.current.children.forEach((child, i) => {
        child.position.y = 0.3 + Math.sin(state.clock.elapsedTime * 3 + i) * 0.05;
      });
    }
  });

  return (
    <group position={position}>
      {/* Pitcher */}
      <mesh
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        castShadow
      >
        <cylinderGeometry args={[0.08, 0.06, 0.18]} />
        <meshStandardMaterial 
          color={isActive ? '#ef4444' : hovered ? '#cbd5e1' : '#94a3b8'}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>

      {/* Handle */}
      <mesh position={[0.08, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.03, 0.008, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.9} />
      </mesh>

      {/* Steam particles */}
      {isActive && (
        <group ref={steamRef}>
          {Array.from({ length: 4 }).map((_, i) => (
            <mesh key={i} position={[0, 0.3 + i * 0.05, 0]}>
              <sphereGeometry args={[0.02]} />
              <meshStandardMaterial 
                color="#ffffff" 
                transparent 
                opacity={0.6 - i * 0.1}
                emissive="#ffffff"
                emissiveIntensity={0.3}
              />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

// Coffee cup with liquid
function CoffeeCup({ position, filled }: { position: [number, number, number]; filled: boolean }) {
  return (
    <group position={position}>
      {/* Cup */}
      <mesh>
        <cylinderGeometry args={[0.06, 0.05, 0.12]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} />
      </mesh>

      {/* Saucer */}
      <mesh position={[0, -0.065, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.01]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} />
      </mesh>

      {/* Coffee liquid */}
      {filled && (
        <mesh position={[0, 0.01, 0]}>
          <cylinderGeometry args={[0.055, 0.045, 0.1]} />
          <meshStandardMaterial 
            color="#3d2817" 
            roughness={0.6}
            emissive="#3d2817"
            emissiveIntensity={0.1}
          />
        </mesh>
      )}

      {/* Handle */}
      <mesh position={[0.07, 0.03, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.025, 0.008, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

// Counter with equipment
function CafeCounter({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Counter top */}
      <mesh castShadow>
        <boxGeometry args={[3, 0.08, 1]} />
        <meshStandardMaterial color="#8b7355" roughness={0.6} metalness={0.1} />
      </mesh>

      {/* Counter base */}
      <mesh position={[0, -0.45, 0]} castShadow>
        <boxGeometry args={[3, 0.8, 0.9]} />
        <meshStandardMaterial color="#5c4033" roughness={0.8} />
      </mesh>

      {/* Decorative edge */}
      <mesh position={[0, -0.04, 0]}>
        <boxGeometry args={[3.05, 0.03, 1.05]} />
        <meshStandardMaterial color="#3d2817" roughness={0.7} />
      </mesh>
    </group>
  );
}

export default function BaristaCafe({ position, onInteract, isActive = false }: BaristaCafeProps) {
  const [activeStation, setActiveStation] = useState<string | null>(null);
  const [cupFilled, setCupFilled] = useState(false);

  const handleStationClick = (station: string) => {
    setActiveStation(station);
    if (station === 'machine') {
      setCupFilled(true);
    }
    onInteract?.(station);

    // Auto-deactivate after 2 seconds
    setTimeout(() => {
      setActiveStation(null);
    }, 2000);
  };

  return (
    <group position={position}>
      {/* Back wall panel */}
      <mesh position={[0, 1.5, -0.5]} receiveShadow>
        <boxGeometry args={[4, 3, 0.15]} />
        <meshStandardMaterial color="#d4a574" roughness={0.9} />
      </mesh>

      {/* Floor mat */}
      <mesh position={[0, 0.01, 0.3]} receiveShadow>
        <boxGeometry args={[3.5, 0.02, 2]} />
        <meshStandardMaterial color="#8b4513" roughness={0.95} />
      </mesh>

      {/* Main counter */}
      <CafeCounter position={[0, 0.45, -0.2]} />

      {/* Coffee equipment on counter */}
      <CoffeeMachine 
        position={[-0.7, 0.9, -0.2]}
        onClick={() => handleStationClick('machine')}
        isActive={activeStation === 'machine'}
      />

      <CoffeeGrinder
        position={[-1.2, 0.9, -0.2]}
        onClick={() => handleStationClick('grinder')}
        isActive={activeStation === 'grinder'}
      />

      <MilkPitcher
        position={[0.7, 0.9, -0.2]}
        onClick={() => handleStationClick('steamer')}
        isActive={activeStation === 'steamer'}
      />

      {/* Coffee cup on counter */}
      <CoffeeCup 
        position={[-0.2, 0.55, 0]}
        filled={cupFilled}
      />

      {/* Additional decoration - coffee bean jar */}
      <mesh position={[1.2, 0.65, -0.2]}>
        <cylinderGeometry args={[0.08, 0.08, 0.2]} />
        <meshStandardMaterial color="#f5f5dc" transparent opacity={0.8} />
      </mesh>

      {/* Ambient lighting */}
      <pointLight position={[0, 2, 0]} intensity={1.5} color="#fbbf24" distance={5} />
      <spotLight
        position={[-1.2, 2.5, 0]}
        angle={0.4}
        penumbra={0.5}
        intensity={1}
        color="#ffffff"
        castShadow
      />
    </group>
  );
}
