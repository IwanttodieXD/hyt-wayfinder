'use client';

import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useBaristaGameStore } from './BaristaGameHUD';

interface BaristaGame3DProps {
  position: [number, number, number];
}

// 3D Grinder with visual fill
function GrinderWithFill({ position, fillLevel, isActive }: { 
  position: [number, number, number]; 
  fillLevel: number;
  isActive: boolean;
}) {
  const hopperRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (hopperRef.current && isActive) {
      hopperRef.current.rotation.y += 0.1;
    }
  });

  return (
    <group position={position}>
      {/* Base */}
      <mesh castShadow>
        <boxGeometry args={[0.3, 0.35, 0.3]} />
        <meshStandardMaterial 
          color={isActive ? '#10b981' : '#475569'}
          metalness={0.6}
          emissive={isActive ? '#10b981' : '#000000'}
          emissiveIntensity={isActive ? 0.3 : 0}
        />
      </mesh>

      {/* Bean hopper */}
      <mesh ref={hopperRef} position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.1, 0.15, 0.25, 16]} />
        <meshStandardMaterial color="#94a3b8" transparent opacity={0.6} />
      </mesh>

      {/* Coffee grounds (visual fill) */}
      {fillLevel > 0 && (
        <mesh position={[0, -0.17 + (fillLevel * 0.001), 0]}>
          <cylinderGeometry args={[0.1, 0.1, fillLevel * 0.002, 16]} />
          <meshStandardMaterial color="#5c4033" />
        </mesh>
      )}
    </group>
  );
}

// Water/Milk container with liquid level
function LiquidContainer({ position, fillLevel, maxLevel, color, isActive }: {
  position: [number, number, number];
  fillLevel: number;
  maxLevel: number;
  color: string;
  isActive: boolean;
}) {
  const liquidHeight = (fillLevel / maxLevel) * 0.15;

  return (
    <group position={position}>
      {/* Container */}
      <mesh>
        <cylinderGeometry args={[0.08, 0.08, 0.2, 16]} />
        <meshStandardMaterial 
          color="#ffffff" 
          transparent 
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Liquid */}
      {fillLevel > 0 && (
        <mesh position={[0, -0.1 + liquidHeight / 2, 0]}>
          <cylinderGeometry args={[0.075, 0.075, liquidHeight, 16]} />
          <meshStandardMaterial 
            color={color}
            emissive={color}
            emissiveIntensity={isActive ? 0.3 : 0.1}
          />
        </mesh>
      )}

      {/* Pour spout animation */}
      {isActive && (
        <mesh position={[0, 0.15, 0]}>
          <sphereGeometry args={[0.02]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
        </mesh>
      )}
    </group>
  );
}

export default function BaristaGame3D({ position }: BaristaGame3DProps) {
  const gameState = useBaristaGameStore();
  const [isHovered, setIsHovered] = useState(false);
  const buttonRef = useRef<THREE.Mesh>(null);
  const arrowRef = useRef<THREE.Group>(null);

  // Animate floating arrow
  useFrame((state) => {
    if (arrowRef.current && gameState.step === 'idle') {
      arrowRef.current.position.y = 1.5 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  // Auto-add ingredients while button is held
  useEffect(() => {
    if (!gameState.isAdding) return;

    const interval = setInterval(() => {
      switch (gameState.step) {
        case 'grinding':
          if (gameState.coffeeGrams < gameState.targetCoffeeGrams * 1.2) {
            gameState.setCoffeeGrams(gameState.coffeeGrams + 0.5);
          }
          break;
        case 'brewing':
          if (gameState.waterML < gameState.targetWaterML * 1.2) {
            gameState.setWaterML(gameState.waterML + 1);
          }
          break;
        case 'steaming':
          if (gameState.milkML < gameState.targetMilkML * 1.2) {
            gameState.setMilkML(gameState.milkML + 3);
          }
          break;
      }
    }, 50);

    return () => clearInterval(interval);
  }, [gameState]);

  const startGame = () => {
    gameState.setStep('grinding');
    gameState.setFeedback('');
    setIsHovered(false);
  };

  return (
    <group position={position}>
      {/* Back wall */}
      <mesh position={[0, 1.5, -0.5]} receiveShadow>
        <boxGeometry args={[4, 3, 0.15]} />
        <meshStandardMaterial color="#d4a574" roughness={0.9} />
      </mesh>

      {/* Floor mat */}
      <mesh position={[0, 0.01, 0.3]} receiveShadow>
        <boxGeometry args={[3.5, 0.02, 2]} />
        <meshStandardMaterial color="#8b4513" roughness={0.95} />
      </mesh>

      {/* Counter */}
      <group position={[0, 0.45, -0.2]}>
        <mesh castShadow>
          <boxGeometry args={[3, 0.08, 1]} />
          <meshStandardMaterial color="#8b7355" roughness={0.6} />
        </mesh>
        <mesh position={[0, -0.45, 0]} castShadow>
          <boxGeometry args={[3, 0.8, 0.9]} />
          <meshStandardMaterial color="#5c4033" roughness={0.8} />
        </mesh>
      </group>

      {/* Grinder with coffee fill */}
      <GrinderWithFill
        position={[-1.2, 0.9, -0.2]}
        fillLevel={gameState.coffeeGrams}
        isActive={gameState.step === 'grinding' && gameState.isAdding}
      />

      {/* Water container */}
      <LiquidContainer
        position={[0, 0.65, -0.2]}
        fillLevel={gameState.waterML}
        maxLevel={gameState.targetWaterML}
        color="#87CEEB"
        isActive={gameState.step === 'brewing' && gameState.isAdding}
      />

      {/* Milk container */}
      <LiquidContainer
        position={[1.2, 0.65, -0.2]}
        fillLevel={gameState.milkML}
        maxLevel={gameState.targetMilkML}
        color="#f5f5dc"
        isActive={gameState.step === 'steaming' && gameState.isAdding}
      />

      {/* Start button (when idle) */}
      {gameState.step === 'idle' && (
        <>
          {/* Floating arrow indicator above button */}
          <group ref={arrowRef} position={[-1.2, 1.5, -0.2]}>
            <mesh rotation={[0, 0, Math.PI]}>
              <coneGeometry args={[0.08, 0.15, 3]} />
              <meshStandardMaterial 
                color="#fbbf24" 
                emissive="#fbbf24" 
                emissiveIntensity={0.8}
              />
            </mesh>
          </group>

          {/* Main button */}
          <mesh 
            ref={buttonRef}
            name="baristaStartButton"
            position={[-1.2, 1.2, -0.2]}
            onClick={startGame}
            onPointerOver={(e) => {
              e.stopPropagation();
              setIsHovered(true);
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={(e) => {
              e.stopPropagation();
              setIsHovered(false);
              document.body.style.cursor = 'default';
            }}
            userData={{ interactable: true }}
          >
            <boxGeometry args={[0.4, 0.2, 0.2]} />
            <meshStandardMaterial 
              color="#10b981"
              emissive="#000000"
              emissiveIntensity={0}
            />
          </mesh>

          {/* Glowing outline and green emissive when hovered */}
          {isHovered && (
            <>
              <mesh position={[-1.2, 1.2, -0.2]} onClick={startGame}>
                <boxGeometry args={[0.45, 0.25, 0.25]} />
                <meshBasicMaterial 
                  color="#22c55e" 
                  transparent 
                  opacity={0.3}
                  side={THREE.BackSide}
                />
              </mesh>
              
              {/* Green glow effect when hovered */}
              <mesh position={[-1.2, 1.2, -0.2]} onClick={startGame}>
                <boxGeometry args={[0.4, 0.2, 0.2]} />
                <meshStandardMaterial 
                  color="#10b981"
                  emissive="#22c55e"
                  emissiveIntensity={0.8}
                  transparent
                  opacity={0}
                />
              </mesh>
              
              {/* Pulsing light */}
              <pointLight 
                position={[-1.2, 1.2, -0.2]} 
                color="#22c55e" 
                intensity={3} 
                distance={2}
              />
            </>
          )}
        </>
      )}

      {/* Lighting */}
      <pointLight position={[0, 2, 0]} intensity={1.5} color="#fbbf24" distance={5} />
      <spotLight
        position={[0, 2.5, 0]}
        angle={0.5}
        penumbra={0.5}
        intensity={1.5}
        color="#ffffff"
        castShadow
      />
    </group>
  );
}
