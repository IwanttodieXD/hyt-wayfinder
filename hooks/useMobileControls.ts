import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function useMobileControls(enabled: boolean) {
  const { camera } = useThree();
  const joystickData = useRef({ angle: 0, force: 0 });
  const velocity = useRef(new THREE.Vector3());
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));

  useEffect(() => {
    if (!enabled) return;

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length > 0) {
        touchStartX.current = event.touches[0].clientX;
        touchStartY.current = event.touches[0].clientY;
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length === 0) return;

      const touch = event.touches[0];
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = touch.clientY - touchStartY.current;

      // Right side of screen: camera rotation
      if (touchStartX.current > window.innerWidth / 2) {
        euler.current.setFromQuaternion(camera.quaternion);
        euler.current.y -= deltaX * 0.003;
        euler.current.x -= deltaY * 0.003;
        euler.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.current.x));
        camera.quaternion.setFromEuler(euler.current);
      } else {
        // Left side of screen: movement (joystick simulation)
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        joystickData.current.force = Math.min(distance / 50, 1);
        joystickData.current.angle = Math.atan2(deltaY, deltaX);
      }

      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;
    };

    const handleTouchEnd = () => {
      joystickData.current.force = 0;
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [camera, enabled]);

  useFrame((state, delta) => {
    if (!enabled || joystickData.current.force === 0) return;

    const speed = 8.0;
    const angle = joystickData.current.angle;
    const force = joystickData.current.force;

    velocity.current.x = Math.cos(angle) * force * speed * delta;
    velocity.current.z = Math.sin(angle) * force * speed * delta;

    const moveVector = new THREE.Vector3();
    camera.getWorldDirection(moveVector);
    moveVector.y = 0;
    moveVector.normalize();

    const strafeVector = new THREE.Vector3();
    strafeVector.crossVectors(camera.up, moveVector).normalize();

    camera.position.addScaledVector(moveVector, -velocity.current.z);
    camera.position.addScaledVector(strafeVector, -velocity.current.x);
  });
}
