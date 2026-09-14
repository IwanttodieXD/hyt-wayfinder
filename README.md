# HYT WAYFINDER

A browser-based 3D touring simulator for the HYT Global Institute building.

## Features

- ✅ First-person 3D exploration
- ✅ WASD + mouse controls (desktop)
- ✅ Touch controls (mobile)
- ✅ Collision detection
- ✅ 5-floor building exploration
- ✅ Floor indicator UI
- ✅ Loading screen
- ✅ Responsive design

## Tech Stack

- Next.js 15
- React 18
- TypeScript
- Three.js
- React Three Fiber
- Drei
- Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Navigate to the project directory:
```bash
cd hyt-wayfinder
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Controls

### Desktop
- **W/A/S/D** or **Arrow Keys** - Move forward/left/backward/right
- **Mouse** - Look around (click to lock pointer)
- **Space** - Jump

### Mobile
- **Left side of screen** - Touch and drag to move
- **Right side of screen** - Touch and drag to look around

## Project Structure

```
hyt-wayfinder/
├── app/
│   ├── page.tsx          # Landing page
│   ├── tour/
│   │   └── page.tsx      # 3D tour page
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Global styles
├── components/
│   ├── Scene.tsx         # Main 3D scene
│   ├── Camera.tsx        # Camera controller
│   ├── Building.tsx      # 5-floor building geometry
│   ├── FloorIndicator.tsx # Floor UI component
│   ├── Controls.tsx      # Control instructions UI
│   └── LoadingScreen.tsx # Loading state
├── hooks/
│   ├── useFirstPersonControls.ts  # Desktop controls
│   └── useMobileControls.ts       # Mobile controls
└── public/               # Static assets (3D models go here)
```

## Adding Custom 3D Assets

1. Place your optimized 3D models (.glb, .gltf) in the `public/models/` directory
2. Update `components/Building.tsx` to load your custom model using `useGLTF` from Drei
3. Adjust collision bounds in `hooks/useFirstPersonControls.ts` to match your building

Example:
```typescript
import { useGLTF } from '@react-three/drei';

const { scene } = useGLTF('/models/hyt-building.glb');
```

## Performance Optimization

- Uses lowest-resolution assets for fast loading
- Shadow maps optimized to 2048x2048
- Pointer lock for smooth mouse control
- Frame-rate independent movement
- Efficient collision detection

## Build for Production

```bash
npm run build
npm start
```

## License

Private project for HYT Global Institute
