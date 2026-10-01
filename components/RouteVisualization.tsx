'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Line, PerspectiveCamera } from '@react-three/drei';
import { useClockInStore } from '@/store/clockInStore';
import { useRecordsStore } from '@/store/recordsStore';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

// Waypoint data for route
const waypoints = [
  {
    position: [0, 0, 0],
    label: 'Main Lobby',
    stage: 1,
    cameraOffset: [-3, 3, -3],
  },
  {
    position: [5, 0, 3],
    label: 'Hallway A',
    stage: 1,
    cameraOffset: [-2, 2, -2],
  },
  {
    position: [10, 0, 5],
    label: 'Elevator 3F',
    stage: 2,
    cameraOffset: [-1, 2, -2],
  },
  {
    position: [10, 10, 5],
    label: '3rd Floor Landing',
    stage: 2,
    cameraOffset: [-1, 2, -2],
  },
  {
    position: [15, 10, 8],
    label: 'Corridor B',
    stage: 3,
    cameraOffset: [-2, 2, -1],
  },
  {
    position: [20, 10, 10],
    label: 'Room 304',
    stage: 3,
    cameraOffset: [-3, 3, -2],
  },
] as const;

function AnimatedCamera({ enabled }: { enabled: boolean }) {
  const { isRouteAnimating, currentWaypoint } = useClockInStore();
  const { camera } = useThree();

  useFrame(() => {
    if (enabled && isRouteAnimating && currentWaypoint < waypoints.length) {
      const targetWaypoint = waypoints[currentWaypoint];
      const targetPos = new THREE.Vector3(...targetWaypoint.position);
      const cameraOffset = new THREE.Vector3(...targetWaypoint.cameraOffset);

      // Smooth camera movement
      const desiredPosition = targetPos.clone().add(cameraOffset);
      camera.position.lerp(desiredPosition, 0.05);

      // Look at the waypoint
      const lookAtTarget = targetPos.clone();
      const currentLookAt = new THREE.Vector3();
      camera.getWorldDirection(currentLookAt);
      currentLookAt.multiplyScalar(10).add(camera.position);
      currentLookAt.lerp(lookAtTarget, 0.05);
      camera.lookAt(currentLookAt);
    }
  });

  return null;
}

function WalkingAvatar() {
  const { currentWaypoint, isRouteAnimating } = useClockInStore();
  const groupRef = useRef<THREE.Group>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(0);
  }, [currentWaypoint]);

  useFrame((state) => {
    if (!groupRef.current || !isRouteAnimating) return;

    if (currentWaypoint < waypoints.length - 1) {
      // Animate between current and next waypoint
      setProgress((prev) => Math.min(prev + 0.01, 1));

      const current = new THREE.Vector3(...waypoints[currentWaypoint].position);
      const next = new THREE.Vector3(...waypoints[currentWaypoint + 1].position);
      const interpolated = new THREE.Vector3().lerpVectors(current, next, progress);

      groupRef.current.position.copy(interpolated);
      groupRef.current.position.y += 0.5; // Lift above ground

      // Face direction of movement
      const direction = new THREE.Vector3().subVectors(next, current);
      if (direction.length() > 0) {
        const angle = Math.atan2(direction.x, direction.z);
        groupRef.current.rotation.y = angle;
      }

      // Bob animation while walking
      groupRef.current.position.y += Math.sin(state.clock.elapsedTime * 8) * 0.05;
    } else if (currentWaypoint === waypoints.length - 1) {
      // At final destination
      const final = new THREE.Vector3(...waypoints[currentWaypoint].position);
      groupRef.current.position.copy(final);
      groupRef.current.position.y += 0.5;
    }
  });

  if (!isRouteAnimating && currentWaypoint === 0) return null;

  return (
    <group ref={groupRef}>
      {/* Body */}
      <mesh position={[0, 0, 0]}>
        <capsuleGeometry args={[0.2, 0.6, 8, 16]} />
        <meshStandardMaterial
          color='#2563eb'
          emissive='#2563eb'
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Head */}
      <mesh position={[0, 0.6, 0]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial
          color='#3b82f6'
          emissive='#3b82f6'
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Direction indicator */}
      <mesh position={[0, 0.6, 0.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.08, 0.15, 8]} />
        <meshBasicMaterial color='#0891b2' />
      </mesh>
    </group>
  );
}

function AnimatedPath() {
  const { isRouteAnimating, currentWaypoint } = useClockInStore();
  const [animatedPoints, setAnimatedPoints] = useState<THREE.Vector3[]>([]);

  useEffect(() => {
    if (isRouteAnimating && currentWaypoint < waypoints.length) {
      const points = waypoints
        .slice(0, currentWaypoint + 1)
        .map((wp) => new THREE.Vector3(wp.position[0], wp.position[1], wp.position[2]));
      setAnimatedPoints(points);
    } else if (!isRouteAnimating) {
      const allPoints = waypoints.map(
        (wp) => new THREE.Vector3(wp.position[0], wp.position[1], wp.position[2])
      );
      setAnimatedPoints(allPoints);
    }
  }, [isRouteAnimating, currentWaypoint]);

  if (animatedPoints.length < 2) return null;

  return <Line points={animatedPoints} color='#0891b2' lineWidth={3} dashed={false} />;
}

function RouteMarkers() {
  const { currentWaypoint, isRouteAnimating } = useClockInStore();

  return (
    <>
      {waypoints.map((waypoint, index) => {
        const isActive = index === currentWaypoint;
        const isPassed = index < currentWaypoint;

        return (
          <group key={index} position={waypoint.position as [number, number, number]}>
            {/* Marker Sphere */}
            <mesh>
              <sphereGeometry args={[0.4, 32, 32]} />
              <meshStandardMaterial
                color={isActive ? '#0891b2' : isPassed ? '#10b981' : '#475569'}
                emissive={isActive ? '#0891b2' : isPassed ? '#059669' : '#000000'}
                emissiveIntensity={isActive ? 1.2 : isPassed ? 0.5 : 0}
              />
            </mesh>

            {/* Pulsing Glow Ring for Active */}
            {isActive && (
              <>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[0.5, 0.8, 32]} />
                  <meshBasicMaterial
                    color='#0891b2'
                    transparent
                    opacity={0.4}
                    side={THREE.DoubleSide}
                  />
                </mesh>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[0.8, 1.2, 32]} />
                  <meshBasicMaterial
                    color='#0891b2'
                    transparent
                    opacity={0.2}
                    side={THREE.DoubleSide}
                  />
                </mesh>
              </>
            )}

            {/* Vertical Light Beam for Active */}
            {isActive && (
              <mesh position={[0, 5, 0]}>
                <cylinderGeometry args={[0.1, 0.3, 10, 16]} />
                <meshBasicMaterial color='#0891b2' transparent opacity={0.3} />
              </mesh>
            )}

            {/* Destination Icon */}
            {index === waypoints.length - 1 && (
              <group position={[0, 2, 0]}>
                <mesh rotation={[0, 0, Math.PI / 4]}>
                  <boxGeometry args={[0.8, 0.8, 0.8]} />
                  <meshStandardMaterial
                    color='#f59e0b'
                    emissive='#f59e0b'
                    emissiveIntensity={isActive ? 1 : 0.5}
                  />
                </mesh>
              </group>
            )}
          </group>
        );
      })}
    </>
  );
}

function FloorGrid() {
  return (
    <>
      <gridHelper args={[30, 30, '#cbd5e1', '#e2e8f0']} position={[10, 0, 5]} />
      <gridHelper args={[30, 30, '#cbd5e1', '#e2e8f0']} position={[10, 10, 5]} />
    </>
  );
}

function BuildingStructure() {
  return (
    <>
      {/* Floor platforms */}
      <mesh position={[10, -0.5, 5]} receiveShadow>
        <boxGeometry args={[30, 1, 20]} />
        <meshStandardMaterial color='#cbd5e1' roughness={0.8} />
      </mesh>
      <mesh position={[10, 9.5, 5]} receiveShadow>
        <boxGeometry args={[30, 1, 20]} />
        <meshStandardMaterial color='#cbd5e1' roughness={0.8} />
      </mesh>

      {/* Walls - Ground Floor */}
      <mesh position={[-2.5, 2.5, 5]}>
        <boxGeometry args={[0.5, 5, 20]} />
        <meshStandardMaterial color='#94a3b8' transparent opacity={0.6} />
      </mesh>
      <mesh position={[22.5, 2.5, 5]}>
        <boxGeometry args={[0.5, 5, 20]} />
        <meshStandardMaterial color='#94a3b8' transparent opacity={0.6} />
      </mesh>

      {/* Walls - 3rd Floor */}
      <mesh position={[-2.5, 12.5, 5]}>
        <boxGeometry args={[0.5, 5, 20]} />
        <meshStandardMaterial color='#94a3b8' transparent opacity={0.6} />
      </mesh>
      <mesh position={[22.5, 12.5, 5]}>
        <boxGeometry args={[0.5, 5, 20]} />
        <meshStandardMaterial color='#94a3b8' transparent opacity={0.6} />
      </mesh>

      {/* Elevator shaft - with glass effect */}
      <mesh position={[10, 5, 5]}>
        <boxGeometry args={[2.5, 11, 2.5]} />
        <meshStandardMaterial
          color='#2563eb'
          transparent
          opacity={0.3}
          roughness={0.1}
          metalness={0.8}
        />
      </mesh>

      {/* Elevator car (moving) */}
      <mesh position={[10, 2, 5]}>
        <boxGeometry args={[2, 2.5, 2]} />
        <meshStandardMaterial
          color='#2563eb'
          emissive='#2563eb'
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Destination room - Room 304 */}
      <mesh position={[20, 11.5, 10]}>
        <boxGeometry args={[5, 3, 4]} />
        <meshStandardMaterial color='#e2e8f0' transparent opacity={0.8} />
      </mesh>

      {/* Room 304 Door */}
      <mesh position={[17.5, 11, 8]}>
        <boxGeometry args={[0.2, 2, 1]} />
        <meshStandardMaterial
          color='#f59e0b'
          emissive='#f59e0b'
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Direction arrows on floor */}
      {[
        { pos: [2.5, 0.05, 1.5], rot: [0, Math.PI / 4, 0] },
        { pos: [7.5, 0.05, 4], rot: [0, Math.PI / 6, 0] },
        { pos: [12.5, 10.05, 6.5], rot: [0, Math.PI / 4, 0] },
        { pos: [17.5, 10.05, 9], rot: [0, Math.PI / 6, 0] },
      ].map((arrow, i) => (
        <group
          key={i}
          position={arrow.pos as [number, number, number]}
          rotation={arrow.rot as [number, number, number]}
        >
          <mesh>
            <boxGeometry args={[1, 0.05, 0.3]} />
            <meshBasicMaterial color='#0891b2' transparent opacity={0.5} />
          </mesh>
          <mesh position={[0.6, 0, 0]}>
            <coneGeometry args={[0.3, 0.5, 3]} />
            <meshBasicMaterial color='#0891b2' transparent opacity={0.5} />
          </mesh>
        </group>
      ))}
    </>
  );
}

export default function RouteVisualization() {
  const {
    isRouteAnimating,
    currentWaypoint,
    setRouteAnimating,
    setCurrentWaypoint,
    resetRoute,
    clockOut,
    activeRecordId,
  } = useClockInStore();
  const { clockOutRecord } = useRecordsStore();
  const [cameraMode, setCameraMode] = useState<'free' | 'follow'>('follow');

  useEffect(() => {
    if (isRouteAnimating && currentWaypoint < waypoints.length - 1) {
      const timer = setTimeout(() => {
        setCurrentWaypoint(currentWaypoint + 1);
      }, 3000); // Slower for better viewing

      return () => clearTimeout(timer);
    } else if (isRouteAnimating && currentWaypoint >= waypoints.length - 1) {
      // Wait a bit at the end before stopping
      const timer = setTimeout(() => {
        setRouteAnimating(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isRouteAnimating, currentWaypoint, setCurrentWaypoint, setRouteAnimating]);

  const handlePlayPause = () => {
    if (!isRouteAnimating && currentWaypoint >= waypoints.length - 1) {
      // Reset and play from start
      setCurrentWaypoint(0);
      setRouteAnimating(true);
    } else {
      setRouteAnimating(!isRouteAnimating);
    }
  };

  const toggleCameraMode = () => {
    setCameraMode((prev) => (prev === 'free' ? 'follow' : 'free'));
  };

  // Close the DB record (time_out) before clearing local state.
  const handleClockOut = async () => {
    if (activeRecordId) {
      await clockOutRecord(activeRecordId);
    }
    clockOut();
  };

  return (
    <div className='theme-fixed-light w-full h-full relative'>
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [-10, 15, 20], fov: 60 }}
        className='bg-[#eef2f7]'
        shadows
      >
        <color attach='background' args={['#eef2f7']} />
        <fog attach='fog' args={['#eef2f7', 15, 60]} />

        {/* Lighting */}
        <ambientLight intensity={0.8} />
        <directionalLight
          position={[10, 20, 10]}
          intensity={1}
          color='#ffffff'
          castShadow
        />
        <pointLight
          position={[10, 15, 10]}
          intensity={0.8}
          color='#0891b2'
          distance={20}
        />
        <pointLight
          position={[20, 12, 10]}
          intensity={0.6}
          color='#f59e0b'
          distance={15}
        />
        <pointLight position={[0, 2, 0]} intensity={0.4} color='#0891b2' distance={10} />

        {/* Scene elements */}
        <FloorGrid />
        <BuildingStructure />
        <AnimatedPath />
        <RouteMarkers />
        <WalkingAvatar />
        <AnimatedCamera enabled={cameraMode === 'follow'} />

        <OrbitControls
          enableZoom={true}
          enablePan={true}
          minDistance={5}
          maxDistance={50}
          maxPolarAngle={Math.PI / 2.1}
        />
      </Canvas>

      {/* HUD Controls Overlay */}
      <div className='absolute inset-0 pointer-events-none'>
        {/* Top HUD - row stays click-through so the canvas remains draggable;
            the panels themselves re-enable pointer events. */}
        <div className='absolute top-4 left-4 right-4 flex items-start justify-between pointer-events-none gap-3'>
          {/* Stage Indicator */}
          <div className='glass-panel border-navy-700 px-4 py-3 rounded-lg pointer-events-auto'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center'>
                <i className='fa-solid fa-route text-orange-400'></i>
              </div>
              <div>
                <p className='text-navy-300 text-xs mb-0.5'>Current Stage</p>
                <p className='text-white font-bold text-sm'>
                  {waypoints[Math.min(currentWaypoint, waypoints.length - 1)].label}
                </p>
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className='glass-panel border-navy-700 px-4 py-3 rounded-lg flex items-center gap-3 pointer-events-auto'>
            <div className='text-right'>
              <p className='text-navy-300 text-xs mb-0.5'>Progress</p>
              <p className='text-white font-bold text-sm'>
                {currentWaypoint + 1} / {waypoints.length}
              </p>
            </div>
            <div className='h-8 w-px bg-navy-700'></div>
            <button
              onClick={toggleCameraMode}
              className='px-3 py-1.5 rounded-lg bg-navy-700 hover:bg-navy-600 transition-colors text-xs font-semibold text-navy-200'
              title={
                cameraMode === 'follow'
                  ? 'Switch to Free Camera'
                  : 'Switch to Follow Camera'
              }
            >
              <i
                className={`fa-solid ${cameraMode === 'follow' ? 'fa-video' : 'fa-hand'}`}
              ></i>
            </button>
          </div>
        </div>

        {/* Waypoint Steps - REMOVED */}

        {/* Bottom Control Bar.
            The bar itself stays pointer-events-none so drags pass through to
            the canvas; only the buttons accept clicks. Without this the full
            width transparent panel swallows OrbitControls input. */}
        <div className='absolute bottom-4 left-4 right-4 flex justify-end pointer-events-none'>
          <div className='glass-panel border-navy-700 p-4 rounded-lg pointer-events-auto'>
            <div className='flex items-center gap-3'>
              <button
                onClick={handlePlayPause}
                className='
                flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold
                bg-orange-500 text-paper hover:bg-orange-600 transition-colors
                '
              >
                <i
                  className={`fa-solid ${isRouteAnimating ? 'fa-pause' : 'fa-play'}`}
                ></i>
                {isRouteAnimating
                  ? 'Pause'
                  : currentWaypoint >= waypoints.length - 1
                    ? 'Replay'
                    : 'Play'}{' '}
                Route
              </button>

              <button
                onClick={resetRoute}
                className='
                px-4 py-3 rounded-lg font-semibold
                bg-navy-700 text-navy-200 hover:bg-navy-600 transition-colors
                '
              >
                <i className='fa-solid fa-rotate-left'></i>
              </button>

              <button
                onClick={handleClockOut}
                className='
                px-4 py-3 rounded-lg font-semibold
                bg-red-500/20 text-red-400 border border-red-500/30
                hover:bg-red-500/30 transition-colors
                '
              >
                <i className='fa-solid fa-right-from-bracket mr-2'></i>
                Clock Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
