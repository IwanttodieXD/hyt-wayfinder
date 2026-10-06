'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';
import { useClockInStore } from '@/store/clockInStore';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useWebGLSupport } from '@/lib/useWebGLSupport';
import { getRoute, DESTINATION_ROUTES, type RouteWaypoint } from '@/lib/wayfinding';

type Waypoints = RouteWaypoint[];

function AnimatedCamera({
  enabled,
  waypoints,
}: {
  enabled: boolean;
  waypoints: Waypoints;
}) {
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

function WalkingAvatar({ waypoints }: { waypoints: Waypoints }) {
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

function AnimatedPath({ waypoints }: { waypoints: Waypoints }) {
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
  }, [isRouteAnimating, currentWaypoint, waypoints]);

  if (animatedPoints.length < 2) return null;

  return <Line points={animatedPoints} color='#0891b2' lineWidth={3} dashed={false} />;
}

function RouteMarkers({ waypoints }: { waypoints: Waypoints }) {
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
                    color='#facc15'
                    emissive='#facc15'
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
          color='#facc15'
          emissive='#facc15'
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
    activeRouteId,
    setActiveRoute,
  } = useClockInStore();
  const [cameraMode, setCameraMode] = useState<'free' | 'follow'>('follow');

  // The active destination selects which waypoint set the whole 3D scene uses.
  const route = getRoute(activeRouteId);
  const waypoints = route.waypoints;

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
  }, [
    isRouteAnimating,
    currentWaypoint,
    waypoints.length,
    setCurrentWaypoint,
    setRouteAnimating,
  ]);

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

  const webgl = useWebGLSupport();

  // Never mount <Canvas> until WebGL support is confirmed. The probe runs in an
  // effect (after first render), so `null` (still checking) must also avoid
  // mounting: react-three-fiber throws from an internal layout effect that no
  // error boundary can intercept.
  if (webgl !== true) {
    return (
      <div className='w-full h-full flex flex-col items-center justify-center gap-3 p-6 text-center bg-navy-950'>
        <i
          className={`fa-solid fa-cube text-4xl text-navy-600 ${webgl === null ? 'animate-pulse' : ''}`}
        ></i>
        {webgl === null ? (
          <p className='text-navy-300 text-sm'>Loading 3D view...</p>
        ) : (
          <>
            <p className='text-white font-semibold'>3D view unavailable</p>
            <p className='text-navy-300 text-sm max-w-xs'>
              This device cannot create a WebGL context, so the 3D route cannot be drawn
              here.
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className='theme-fixed-light w-full h-full flex flex-col relative bg-navy-950'>
      {/* The canvas fills whatever space is left between the frame header and the
          controls below, rather than forcing a width-driven square. On a phone
          the square was taller than the space available, so the bottom of the 3D
          view was clipped and the whole screen felt cramped. Filling the box
          means the route always fits, on any screen. */}
      <div className='flex-1 min-h-0 relative overflow-hidden'>
        <Canvas
          camera={{ position: [-10, 15, 20], fov: 60 }}
          className='h-full w-full bg-[#eef2f7]'
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
            color='#facc15'
            distance={15}
          />
          <pointLight position={[0, 2, 0]} intensity={0.4} color='#0891b2' distance={10} />

          {/* Scene elements */}
          <FloorGrid />
          <BuildingStructure />
          <AnimatedPath waypoints={waypoints} />
          <RouteMarkers waypoints={waypoints} />
          <WalkingAvatar waypoints={waypoints} />
          <AnimatedCamera enabled={cameraMode === 'follow'} waypoints={waypoints} />

          {/* OrbitControls and the follow camera both drive the same camera. Left
              enabled during follow, the two fought every frame and the view
              jittered - which is what made the route look chaotic. Only the free
              camera orbits; the follow camera owns the view on its own. */}
          <OrbitControls
            enabled={cameraMode === 'free'}
            enableZoom={cameraMode === 'free'}
            enablePan={cameraMode === 'free'}
            minDistance={5}
            maxDistance={50}
            maxPolarAngle={Math.PI / 2.1}
          />
        </Canvas>

        {/* HUD. One compact bar across the top, instead of two panels that both
            claimed the top-right corner and overlapped on a narrow phone. */}
        <div className='absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none'>
          <div className='glass-panel border-navy-700 px-3 py-2 rounded-lg pointer-events-auto flex items-center gap-2 min-w-0'>
            <i className='fa-solid fa-route text-yellow-400 text-sm flex-shrink-0'></i>
            <div className='min-w-0'>
              <p className='text-white font-semibold text-xs leading-tight truncate'>
                {route.label}
              </p>
              <p className='text-navy-400 text-[10px] leading-tight truncate'>
                {route.room} · Step {currentWaypoint + 1}/{waypoints.length}
              </p>
            </div>
          </div>

          <button
            onClick={toggleCameraMode}
            className='pointer-events-auto flex-shrink-0 w-9 h-9 rounded-lg bg-navy-700/90 hover:bg-navy-600 text-navy-100 flex items-center justify-center transition-colors'
            title={
              cameraMode === 'follow'
                ? 'Switch to free camera'
                : 'Switch to follow camera'
            }
          >
            <i
              className={`fa-solid ${cameraMode === 'follow' ? 'fa-video' : 'fa-hand'} text-sm`}
            ></i>
          </button>

          {/* Escape hatch from the 3D view.
              The Return button in the controls below does the same thing, but
              those sit under the canvas and were being clipped on short phones,
              which left people stuck in the route. Icon-only here so the compact
              HUD bar does not overflow on a narrow screen; `title` and
              `aria-label` carry the wording for anyone who cannot see the icon. */}
          <button
            onClick={resetRoute}
            className='pointer-events-auto flex-shrink-0 w-9 h-9 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-yellow-950 flex items-center justify-center transition-colors'
            title='Back to scanner'
            aria-label='Back to scanner'
          >
            <i className='fa-solid fa-arrow-left text-sm'></i>
          </button>
        </div>

        {/* Work-in-progress notice. The floor plan is still being matched to the
            real building, so the route is indicative rather than authoritative -
            someone should not be sent down these corridors as gospel. Deliberately
            visible rather than hidden behind a tap. */}
        <div className='absolute top-16 left-3 right-3 pointer-events-none'>
          <p className='inline-flex items-start gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-amber-200 text-[10px] leading-snug max-w-full'>
            <i className='fa-solid fa-triangle-exclamation mt-0.5 flex-shrink-0'></i>
            <span>
              <span className='font-semibold'>Preview:</span> this 3D route is
              still a work in progress and may not match the real building. Follow
              the signs and staff directions.
            </span>
          </p>
        </div>
      </div>

      {/* Controls sit BELOW the canvas and are stacked, so on a phone nothing is
          clipped and the destination picker gets a full-width row. */}
      <div className='flex-shrink-0 px-3 pt-3 pb-3 flex flex-col gap-2'>
        <button
          onClick={handlePlayPause}
          className='
            w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold
            bg-yellow-500 text-yellow-950 hover:bg-yellow-600 transition-colors
          '
        >
          <i className={`fa-solid ${isRouteAnimating ? 'fa-pause' : 'fa-play'}`}></i>
          {isRouteAnimating
            ? 'Pause'
            : currentWaypoint >= waypoints.length - 1
              ? 'Replay'
              : 'Play'}{' '}
          Route
        </button>

        <div className='glass-panel border-navy-700 p-2.5 rounded-lg flex items-center gap-2'>
          {/* Destination picker. Lets you jump between rooms without rescanning;
              the station QR normally sets this automatically. */}
          <select
            value={route.id}
            onChange={(e) => setActiveRoute(e.target.value)}
            aria-label='Choose destination'
            className='
              flex-1 min-w-0 px-3 py-2.5 rounded-lg font-semibold text-sm cursor-pointer
              bg-navy-700 text-navy-100 hover:bg-navy-600 transition-colors
            '
          >
            {DESTINATION_ROUTES.map((r) => (
              <option key={r.id} value={r.id} className='bg-navy-900'>
                {r.label} ({r.room})
              </option>
            ))}
          </select>

          <button
            onClick={resetRoute}
            className='
              px-4 py-2.5 rounded-lg font-semibold text-sm flex-shrink-0
              bg-navy-700 text-navy-200 hover:bg-navy-600 transition-colors
            '
          >
            Return
          </button>
        </div>
      </div>
    </div>
  );
}
