import { useMemo } from 'react';
import * as THREE from 'three';
import { BUILDING_LAYOUT } from '@/lib/wayfinding';

// Optimized materials (reuse instead of creating new ones)
const floorMaterial = new THREE.MeshStandardMaterial({ color: '#cbd5e1' });
const wallMaterial = new THREE.MeshStandardMaterial({ color: '#e0e0e0' });
const doorMaterial = new THREE.MeshStandardMaterial({ color: '#8B4513' });
const windowMaterial = new THREE.MeshStandardMaterial({
  color: '#87CEEB',
  transparent: true,
  opacity: 0.6,
});
const roofMaterial = new THREE.MeshStandardMaterial({ color: '#94a3b8' });
const stairMaterial = new THREE.MeshStandardMaterial({ color: '#808080' });
const stairRailMaterial = new THREE.MeshStandardMaterial({ color: '#64748b' });

/** How many storeys are drawn below the roof slab. */
const STOREYS = 5;

export default function Building() {
  const L = BUILDING_LAYOUT;

  // Every dimension derives from BUILDING_LAYOUT so this cannot drift from the
  // waypoints in wayfinding.ts. A route that walks through a wall because the
  // two files disagree is exactly the failure this prevents.
  const halfWidth = L.width / 2;
  const halfDepth = L.depth / 2;
  const wallY = L.wallHeight / 2;
  const hall = L.hallwayHalfDepth;
  const bandDepth = halfDepth - hall;

  const floors = useMemo(
    () =>
      Array.from({ length: STOREYS }, (_, i) => ({
        position: [0, i * L.floorHeight + 0.2, 0] as [number, number, number],
        floorNumber: i + 1,
      })),
    [L.floorHeight]
  );

  return (
    <group>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <primitive object={floorMaterial} attach='material' />
      </mesh>

      {floors.map((floor, idx) => (
        <group key={idx} position={floor.position}>
          {/* Floor slab */}
          <mesh receiveShadow>
            <boxGeometry args={[L.width, L.slabThickness, L.depth]} />
            <meshStandardMaterial
              color={`hsl(${190 + idx * 5}, 60%, ${72 - idx * 5}%)`}
            />
          </mesh>

          {/* Outer shell */}
          <mesh position={[0, wallY, -halfDepth]} castShadow>
            <boxGeometry args={[L.width, L.wallHeight, 0.3]} />
            <primitive object={wallMaterial} attach='material' />
          </mesh>
          <mesh position={[0, wallY, halfDepth]} castShadow>
            <boxGeometry args={[L.width, L.wallHeight, 0.3]} />
            <primitive object={wallMaterial} attach='material' />
          </mesh>
          <mesh position={[-halfWidth, wallY, 0]} castShadow>
            <boxGeometry args={[0.3, L.wallHeight, L.depth]} />
            <primitive object={wallMaterial} attach='material' />
          </mesh>
          <mesh position={[halfWidth, wallY, 0]} castShadow>
            <boxGeometry args={[0.3, L.wallHeight, L.depth]} />
            <primitive object={wallMaterial} attach='material' />
          </mesh>

          {/* Hallway walls. The hallway runs left-to-right through the middle,
              which is what puts four rooms at the front and one at the back. */}
          <mesh position={[0, wallY, -hall]} castShadow>
            <boxGeometry args={[L.width, L.wallHeight, 0.3]} />
            <primitive object={wallMaterial} attach='material' />
          </mesh>
          <mesh position={[0, wallY, hall]} castShadow>
            <boxGeometry args={[L.width, L.wallHeight, 0.3]} />
            <primitive object={wallMaterial} attach='material' />
          </mesh>

          {/* Dividers BETWEEN adjacent front slots only, so the outer walls
              already do the job at each end. */}
          {L.frontSlotsX.slice(0, -1).map((x, i) => (
            <mesh
              key={`front-divider-${idx}-${i}`}
              position={[(x + L.frontSlotsX[i + 1]) / 2, wallY, -halfDepth + bandDepth / 2]}
              castShadow
            >
              <boxGeometry args={[0.25, L.wallHeight, bandDepth]} />
              <primitive object={wallMaterial} attach='material' />
            </mesh>
          ))}

          {/* Front room doors, opening off the hallway. */}
          {L.frontSlotsX.map((x, i) => (
            <mesh key={`front-door-${idx}-${i}`} position={[x, 1, -hall - 0.16]}>
              <boxGeometry args={[1.6, 2.5, 0.1]} />
              <primitive object={doorMaterial} attach='material' />
            </mesh>
          ))}

          {/* The single back room, centred, with its own door. */}
          <mesh position={[L.backSlotX, 1, hall + 0.16]}>
            <boxGeometry args={[1.6, 2.5, 0.1]} />
            <primitive object={doorMaterial} attach='material' />
          </mesh>

          {/* Windows on the front and back faces. */}
          {[-15, -10, -5, 0, 5, 10, 15].map((x, i) => (
            <group key={`window-${idx}-${i}`}>
              <mesh position={[x, 2.5, halfDepth + 0.16]}>
                <boxGeometry args={[2, 2, 0.1]} />
                <primitive object={windowMaterial} attach='material' />
              </mesh>
              <mesh position={[x, 2.5, -halfDepth - 0.16]}>
                <boxGeometry args={[2, 2, 0.1]} />
                <primitive object={windowMaterial} attach='material' />
              </mesh>
            </group>
          ))}

          {/* Staircase, centred in the hallway. Drawn as a flight of steps so it
              reads as stairs rather than a grey block. There is no elevator in
              this building, so none is drawn. */}
          <group position={[L.stairX, 0, L.stairZ]}>
            {Array.from({ length: 8 }, (_, s) => (
              <mesh key={`step-${idx}-${s}`} position={[0, (s + 1) * 0.5, -1.5 + s * 0.5]} castShadow>
                <boxGeometry args={[4, 0.25, 0.5]} />
                <primitive object={stairMaterial} attach='material' />
              </mesh>
            ))}
            <mesh position={[2.1, 2, 0]} castShadow>
              <boxGeometry args={[0.15, 0.15, 4]} />
              <primitive object={stairRailMaterial} attach='material' />
            </mesh>
          </group>
        </group>
      ))}

      {/* Roof slab */}
      <mesh position={[0, 20.5, 0]} castShadow>
        <boxGeometry args={[L.width + 2, 0.5, L.depth + 2]} />
        <primitive object={roofMaterial} attach='material' />
      </mesh>
    </group>
  );
}
