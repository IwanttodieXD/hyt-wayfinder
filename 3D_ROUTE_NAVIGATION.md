# 3D Route Navigation System

## Overview

The HYT Wayfinder includes an interactive 3D route navigation system that provides a visual demonstration of the wayfinding path from the main lobby to any destination within the building.

## Features

### 🎥 Animated Camera System
- **Follow Mode**: Camera automatically follows the route waypoints with smooth transitions
- **Free Mode**: User can freely orbit, pan, and zoom to explore the 3D scene
- **Toggle Button**: Switch between camera modes during playback

### 🚶 Walking Avatar
- Animated 3D character that moves along the route
- Smooth interpolation between waypoints
- Realistic walking animation with bobbing motion
- Always faces the direction of travel

### 🗺️ Waypoint System
6 distinct waypoints guide the user through the building:
1. **Main Lobby** (Ground Floor)
2. **Hallway A** (Ground Floor)
3. **Elevator 3F** (Ground Floor → 3rd Floor)
4. **3rd Floor Landing** (3rd Floor)
5. **Corridor B** (3rd Floor)
6. **Room 304** (Final Destination)

### ✨ Visual Effects
- **Glowing Path**: Cyan-colored line connecting all waypoints
- **Active Waypoint Indicators**: 
  - Pulsing rings around the current waypoint
  - Vertical light beam
  - Highlighted label with animation
- **Passed Waypoints**: Green indicators for completed segments
- **Floor Arrows**: Directional arrows embedded in the floor
- **Destination Marker**: Rotating golden cube at Room 304

### 🏢 Building Structure
- Two-floor layout (Ground + 3rd Floor)
- Glass elevator shaft with visible car
- Semi-transparent walls for better visibility
- Room 304 with golden door marker
- Grid helpers for spatial reference

## User Controls

### Playback Controls
- **Play/Pause Button**: Start or pause the route animation
- **Reset Button**: Return to the beginning of the route
- **Replay**: Automatically available when route completes
- **Clock Out**: Exit the route view and end the session

### Camera Controls (Free Mode)
- **Orbit**: Left-click and drag
- **Zoom**: Mouse wheel or pinch
- **Pan**: Right-click and drag (or two-finger drag on trackpad)

### Progress Tracking
- Real-time waypoint counter (e.g., "3 / 6")
- Side panel showing all waypoints with completion status
- Current waypoint highlighted in cyan
- Completed waypoints marked with checkmark

## Technical Implementation

### Components
- **RouteVisualization.tsx**: Main component
- **AnimatedCamera**: Smooth camera following system
- **WalkingAvatar**: 3D character with movement interpolation
- **AnimatedPath**: Dynamic line rendering based on progress
- **RouteMarkers**: Waypoint spheres with labels and effects
- **BuildingStructure**: 3D building elements and floors
- **FloorGrid**: Grid helpers for spatial reference

### Animation Timing
- **Waypoint Duration**: 3 seconds per waypoint
- **Transition**: Smooth 5% lerp for camera movement
- **Character Speed**: Synced with waypoint progression
- **Final Pause**: 2-second delay at destination before stopping

### Libraries Used
- **Three.js**: 3D rendering engine
- **React Three Fiber**: React renderer for Three.js
- **@react-three/drei**: Helper components (OrbitControls, Line, Html)

## Usage Flow

1. **Clock In**: User scans QR code at kiosk
2. **Route Assigned**: System assigns destination (Room 304)
3. **Start Navigation**: Click "Play Route" button
4. **Watch Animation**: 
   - Camera follows the walking avatar
   - Waypoints light up as they're reached
   - Progress bar updates in real-time
5. **Explore (Optional)**: Switch to free camera mode to explore
6. **Arrival**: Animation completes at Room 304
7. **Clock Out**: User can end session

## Configuration

### Waypoint Data Structure
```typescript
{
  position: [x, y, z],           // 3D coordinates
  label: string,                 // Display name
  stage: number,                 // Stage grouping (1-3)
  cameraOffset: [x, y, z]       // Camera position relative to waypoint
}
```

### Customization Options
- **Timing**: Adjust `setTimeout` delays in `RouteVisualization.tsx`
- **Colors**: Modify material colors for waypoints, path, and effects
- **Camera**: Change FOV, distances, and lerp speed
- **Building**: Add more floors, rooms, or structural elements
- **Waypoints**: Extend the `waypoints` array with new locations

## Future Enhancements

- 🔄 Multiple routes for different destinations
- 📱 AR view using device camera
- 🗣️ Voice-guided navigation
- 🏃 Adjustable walking speed
- 🎯 Points of interest markers
- 📊 Analytics tracking (time spent at each waypoint)
- 🌙 Day/night mode themes
- 🔊 Spatial audio cues

## Performance

- **Target FPS**: 60fps
- **Optimization**: Geometry instancing for repeated elements
- **LOD**: Level of detail for distant objects (future)
- **Lighting**: Balanced for visual quality and performance

## Accessibility

- Keyboard controls for playback (spacebar = play/pause)
- High-contrast waypoint labels
- Clear progress indicators
- Alternative text descriptions for all UI elements
- Reduced motion option (future)

---

**Last Updated**: December 2024  
**Component Location**: `/components/RouteVisualization.tsx`  
**Store**: `/store/clockInStore.ts`
