import { useMemo } from 'react';
import * as THREE from 'three';

// Optimized materials (reuse instead of creating new ones)
const floorMaterial = new THREE.MeshStandardMaterial({ color: '#2a4858' });
const wallMaterial = new THREE.MeshStandardMaterial({ color: '#e0e0e0' });
const doorMaterial = new THREE.MeshStandardMaterial({ color: '#8B4513' });
const windowMaterial = new THREE.MeshStandardMaterial({ 
  color: '#87CEEB', 
  transparent: true, 
  opacity: 0.6 
});
const roofMaterial = new THREE.MeshStandardMaterial({ color: '#4a5568' });

export default function Building() {
  // Create a simple 5-floor building structure
  const floors = useMemo(() => {
    const floorData = [];
    const floorHeight = 4;
    const buildingWidth = 40;
    const buildingDepth = 30;

    for (let i = 0; i < 5; i++) {
      floorData.push({
        position: [0, i * floorHeight + 0.2, 0] as [number, number, number],
        floorNumber: i + 1,
      });
    }
    return floorData;
  }, []);

  return (
    <group>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <primitive object={floorMaterial} attach="material" />
      </mesh>

      {/* Building floors */}
      {floors.map((floor, idx) => (
        <group key={idx} position={floor.position}>
          {/* Floor plane */}
          <mesh receiveShadow>
            <boxGeometry args={[40, 0.3, 30]} />
            <meshStandardMaterial color={`hsl(${190 + idx * 5}, 70%, ${50 - idx * 5}%)`} />
          </mesh>

          {/* Walls - creating rooms and hallways */}
          {/* Outer walls */}
          <mesh position={[0, 2, -15]} castShadow>
            <boxGeometry args={[40, 4, 0.3]} />
            <primitive object={wallMaterial} attach="material" />
          </mesh>
          <mesh position={[0, 2, 15]} castShadow>
            <boxGeometry args={[40, 4, 0.3]} />
            <primitive object={wallMaterial} attach="material" />
          </mesh>
          <mesh position={[-20, 2, 0]} castShadow>
            <boxGeometry args={[0.3, 4, 30]} />
            <primitive object={wallMaterial} attach="material" />
          </mesh>
          <mesh position={[20, 2, 0]} castShadow>
            <boxGeometry args={[0.3, 4, 30]} />
            <primitive object={wallMaterial} attach="material" />
          </mesh>

          {/* Central hallway walls */}
          <mesh position={[-5, 2, 0]} castShadow>
            <boxGeometry args={[0.3, 4, 30]} />
            <primitive object={wallMaterial} attach="material" />
          </mesh>
          <mesh position={[5, 2, 0]} castShadow>
            <boxGeometry args={[0.3, 4, 30]} />
            <primitive object={wallMaterial} attach="material" />
          </mesh>

          {/* Room dividers */}
          <mesh position={[-12.5, 2, 0]} castShadow>
            <boxGeometry args={[0.2, 4, 12]} />
            <primitive object={wallMaterial} attach="material" />
          </mesh>
          <mesh position={[12.5, 2, 0]} castShadow>
            <boxGeometry args={[0.2, 4, 12]} />
            <primitive object={wallMaterial} attach="material" />
          </mesh>

          {/* Doors (gaps in walls represented by boxes) */}
          <mesh position={[0, 1, -7.5]}>
            <boxGeometry args={[2, 2.5, 0.1]} />
            <primitive object={doorMaterial} attach="material" />
          </mesh>
          <mesh position={[0, 1, 7.5]}>
            <boxGeometry args={[2, 2.5, 0.1]} />
            <primitive object={doorMaterial} attach="material" />
          </mesh>

          {/* Windows */}
          {[-15, -10, -5, 0, 5, 10, 15].map((x, i) => (
            <group key={`window-${i}`}>
              <mesh position={[x, 2.5, 15.1]}>
                <boxGeometry args={[2, 2, 0.1]} />
                <primitive object={windowMaterial} attach="material" />
              </mesh>
              <mesh position={[x, 2.5, -15.1]}>
                <boxGeometry args={[2, 2, 0.1]} />
                <primitive object={windowMaterial} attach="material" />
              </mesh>
            </group>
          ))}

          {/* Floor number label */}
          <mesh position={[0, 3.5, 0]}>
            <boxGeometry args={[1, 0.5, 0.1]} />
            <meshStandardMaterial color="#FFD700" />
          </mesh>
        </group>
      ))}

      {/* Staircase connecting floors */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={`stairs-${i}`} position={[18, i * 4 + 2, 12]} castShadow>
          <boxGeometry args={[3, 4, 4]} />
          <meshStandardMaterial color="#808080" />
        </mesh>
      ))}

      {/* Roof */}
      <mesh position={[0, 20.5, 0]} castShadow>
        <boxGeometry args={[42, 0.5, 32]} />
        <primitive object={roofMaterial} attach="material" />
      </mesh>
    </group>
  );
}
