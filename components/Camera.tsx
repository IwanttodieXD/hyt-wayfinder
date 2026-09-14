import { useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useFirstPersonControls } from '@/hooks/useFirstPersonControls';
import { useMobileControls } from '@/hooks/useMobileControls';

interface CameraProps {
  onFloorChange: (floor: number) => void;
  onLockChange: (locked: boolean) => void;
  isMobile: boolean;
}

export default function Camera({ onFloorChange, onLockChange, isMobile }: CameraProps) {
  const { isLocked, currentFloor } = useFirstPersonControls();
  useMobileControls(isMobile);

  useEffect(() => {
    onLockChange(isLocked);
  }, [isLocked, onLockChange]);

  useFrame(() => {
    onFloorChange(currentFloor);
  });

  return null;
}
