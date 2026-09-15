import { useEffect, useRef, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Movement {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
}

export function useFirstPersonControls() {
  const { camera, gl } = useThree();
  const [isLocked, setIsLocked] = useState(false);
  
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const movement = useRef<Movement>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
  });

  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  const PI_2 = Math.PI / 2;
  const minPolarAngle = 0;
  const maxPolarAngle = Math.PI;

  // Collision detection bounds
  const buildingBounds = {
    minX: -19.5,
    maxX: 19.5,
    minZ: -14.5,
    maxZ: 14.5,
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          movement.current.forward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          movement.current.backward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          movement.current.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          movement.current.right = true;
          break;
        case 'Space':
          movement.current.jump = true;
          break;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          movement.current.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          movement.current.backward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          movement.current.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          movement.current.right = false;
          break;
        case 'Space':
          movement.current.jump = false;
          break;
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isLocked) return;

      const movementX = event.movementX || 0;
      const movementY = event.movementY || 0;

      euler.current.setFromQuaternion(camera.quaternion);
      euler.current.y -= movementX * 0.002;
      euler.current.x -= movementY * 0.002;
      euler.current.x = Math.max(
        PI_2 - maxPolarAngle,
        Math.min(PI_2 - minPolarAngle, euler.current.x)
      );
      camera.quaternion.setFromEuler(euler.current);
    };

    const handlePointerLockChange = () => {
      setIsLocked(document.pointerLockElement === gl.domElement);
    };

    const handleClick = () => {
      if (!isLocked) {
        gl.domElement.requestPointerLock();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    gl.domElement.addEventListener('click', handleClick);
    gl.domElement.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      gl.domElement.removeEventListener('click', handleClick);
      gl.domElement.removeEventListener('mousemove', handleMouseMove);
    };
  }, [camera, gl, isLocked]);

  useFrame((state, delta) => {
    if (!isLocked) return;

    const speed = 2.0;

    velocity.current.x -= velocity.current.x * 10.0 * delta;
    velocity.current.z -= velocity.current.z * 10.0 * delta;

    direction.current.z = Number(movement.current.forward) - Number(movement.current.backward);
    direction.current.x = Number(movement.current.left) - Number(movement.current.right);
    direction.current.normalize();

    if (movement.current.forward || movement.current.backward) {
      velocity.current.z -= direction.current.z * speed * delta;
    }
    if (movement.current.left || movement.current.right) {
      velocity.current.x -= direction.current.x * speed * delta;
    }

    const moveVector = new THREE.Vector3();
    camera.getWorldDirection(moveVector);
    moveVector.y = 0;
    moveVector.normalize();

    const strafeVector = new THREE.Vector3();
    strafeVector.crossVectors(camera.up, moveVector).normalize();

    const newPosition = camera.position.clone();
    newPosition.addScaledVector(moveVector, -velocity.current.z);
    newPosition.addScaledVector(strafeVector, -velocity.current.x);

    // Collision detection
    if (
      newPosition.x >= buildingBounds.minX &&
      newPosition.x <= buildingBounds.maxX &&
      newPosition.z >= buildingBounds.minZ &&
      newPosition.z <= buildingBounds.maxZ
    ) {
      camera.position.copy(newPosition);
    }
  });

  // Calculate current floor based on Y position
  const getCurrentFloor = () => {
    const y = camera.position.y;
    return Math.max(1, Math.min(5, Math.floor(y / 4) + 1));
  };

  return {
    isLocked,
    currentFloor: getCurrentFloor(),
  };
}
