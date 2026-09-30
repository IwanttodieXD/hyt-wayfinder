'use client';

import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CrosshairRaycasterProps {
  onTargetChange: (isTargeting: boolean, objectName?: string) => void;
}

export default function CrosshairRaycaster({ onTargetChange }: CrosshairRaycasterProps) {
  const { camera, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const previousTarget = useRef<THREE.Object3D | null>(null);

  useFrame(() => {
    // Cast ray from center of screen (where crosshair is)
    raycaster.current.setFromCamera(new THREE.Vector2(0, 0), camera);
    
    // Get all intersections
    const intersects = raycaster.current.intersectObjects(scene.children, true);
    
    // Find first interactable object
    const interactable = intersects.find(intersect => {
      return intersect.object.userData.interactable === true;
    });

    if (interactable) {
      // Looking at interactable object
      const targetObject = interactable.object;
      
      // Clear previous target if different
      if (previousTarget.current && previousTarget.current !== targetObject) {
        restoreMaterial(previousTarget.current);
      }

      // Set emissive glow on target
      if (targetObject instanceof THREE.Mesh && targetObject.material) {
        const material = targetObject.material as THREE.MeshStandardMaterial;
        
        // Only save and modify if material supports emissive
        if (material.emissive) {
          if (!targetObject.userData.originalEmissive) {
            targetObject.userData.originalEmissive = material.emissive.clone();
            targetObject.userData.originalEmissiveIntensity = material.emissiveIntensity || 0;
            if (material.color) {
              targetObject.userData.originalColor = material.color.clone();
            }
          }
          material.emissive.set('#ffff00'); // Bright yellow
          material.emissiveIntensity = 1.5;
        }
      }

      previousTarget.current = targetObject;
      onTargetChange(true, targetObject.name);
    } else {
      // Not looking at anything interactable - restore previous target
      if (previousTarget.current) {
        restoreMaterial(previousTarget.current);
        previousTarget.current = null;
      }
      onTargetChange(false);
    }
  });

  const restoreMaterial = (object: THREE.Object3D) => {
    if (object instanceof THREE.Mesh && object.material) {
      const material = object.material as THREE.MeshStandardMaterial;
      
      // Only restore if we have saved values and material has emissive property
      if (object.userData.originalEmissive && material.emissive) {
        material.emissive.copy(object.userData.originalEmissive);
      }
      
      if (object.userData.originalEmissiveIntensity !== undefined) {
        material.emissiveIntensity = object.userData.originalEmissiveIntensity;
      }
      
      if (object.userData.originalColor && material.color) {
        material.color.copy(object.userData.originalColor);
      }
    }
  };

  return null; // This component doesn't render anything visible
}
