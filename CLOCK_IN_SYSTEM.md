# HYT Student QR Clock-In & Interactive 3D Wayfinding System

## Overview

The HYT Student QR Clock-In System provides a dual-interface platform for student attendance tracking with real-time 3D wayfinding capabilities. The system features two distinct views:

1. **Student Mobile App View** - Mobile-optimized interface for students to scan QR codes and receive 3D navigation
2. **Lobby Kiosk Station View** - Large-format kiosk interface for check-in and guest management

## Features

### 🎯 Core Functionality

#### Student Mobile App
- **Animated QR Scanner** with laser scan effects and camera viewfinder simulation
- **Real-time Status Badges** showing clock-in status (NOT CLOCKED IN → CLOCKED IN)
- **Student Profile Display** with ID number and assigned destination
- **Timestamp Logging** recording exact time-in for attendance tracking
- **Smooth Transitions** between scanner and 3D route views

#### Lobby Kiosk Station
- **Large High-Contrast QR Code** for easy student scanning
- **Real-Time Metrics Dashboard**:
  - Active Students Currently Clocked In
  - Daily Total Visits Counter
  - Current Time Display
- **Guest Walk-In Check-In** with simulated ID scanning and thermal badge printing
- **Professional Dark-Mode UI** with glass-panel effects

#### 3D Wayfinding Route Engine
- **Interactive Three.js Canvas** with orbital controls
- **Animated Glowing Pathway** leading to destination
- **6-Stage Waypoint System**:
  1. Main Lobby (Floor 1)
  2. Hallway A
  3. Elevator to 3F
  4. 3rd Floor Landing
  5. Corridor B
  6. Room 304 - TESDA Electronics Lab
- **Play/Pause/Reset Controls** for route animation
- **Progress Tracking** with visual waypoint indicators
- **Dynamic Camera Movement** following the route
- **Interactive HUD Overlay** with stage information

## Technical Architecture

### State Management (Zustand)

```typescript
// Store: store/clockInStore.ts
- viewMode: 'mobile' | 'kiosk'
- student: StudentProfile (name, ID, destination, building, room)
- clockInTime: Date | null
- status: 'not-clocked-in' | 'clocked-in' | 'viewing-route'
- activeStudents: number
- dailyVisits: number
- isRouteAnimating: boolean
- currentWaypoint: number (0-5)
```

### Component Structure

```
/app/clock-in/page.tsx (Main Entry Point)
├── ViewModeSwitcher.tsx (Mobile/Kiosk Toggle)
├── StudentMobileView.tsx
│   ├── QRScanner.tsx (Camera simulation + scan logic)
│   └── RouteVisualization.tsx (Three.js 3D route)
└── KioskStationView.tsx (QR display + metrics)
```

### 3D Route System

**Technology Stack:**
- `@react-three/fiber` - React renderer for Three.js
- `@react-three/drei` - Helper components (OrbitControls, Line, Text, Html)
- `three` - Core 3D rendering engine

**Route Animation:**
- Waypoint progression every 2 seconds during animation
- Smooth color transitions (inactive → active → completed)
- Glowing markers with emissive materials
- Dynamic path rendering with `Line` component

## Installation & Setup

### 1. Install Dependencies

```bash
npm install react-qr-code
```

**Note:** Other dependencies (`zustand`, `@react-three/fiber`, `@react-three/drei`) are already installed.

### 2. Run Development Server

```bash
npm run dev
```

### 3. Access the System

- **Home Page**: http://localhost:3000
- **Clock-In System**: http://localhost:3000/clock-in

## User Flows

### Student Clock-In Flow

1. **Initial State**
   - Student opens Mobile App view
   - Scanner viewfinder active with laser animation
   - Status badge shows "NOT CLOCKED IN"
   - Destination displayed: "TESDA Electronics Lab — Building B, Room 304"

2. **QR Scan Simulation**
   - Student clicks "Simulate Scan Kiosk QR" button
   - Scanner shows success animation (green checkmark)
   - Clock-in timestamp recorded
   - Status badge updates to "CLOCKED IN"

3. **3D Route View**
   - Automatic transition to 3D wayfinding canvas
   - Animated pathway displayed through 6 waypoints
   - HUD shows current stage and progress
   - Interactive controls available (Play/Pause/Reset)

4. **Route Navigation**
   - Click "Play Route" to animate camera path
   - Waypoints highlight progressively (gray → cyan → green)
   - Watch step-by-step navigation to destination
   - Click "Clock Out" to return to scanner

### Kiosk Station Flow

1. **Display State**
   - Large QR code visible for student scanning
   - Real-time metrics updating automatically
   - Guest check-in panel available

2. **Guest Walk-In**
   - Click "Simulate Guest ID Scan"
   - ID data extracted and displayed (name, ID, purpose)
   - Thermal badge printing simulation
   - Guest added to daily visits counter

## Styling Guide

### Dark-Mode Theme

```css
/* Primary Colors */
Background: bg-slate-950 (#020617)
Panels: bg-slate-900 (#0f172a)
Borders: border-slate-800 (#1e293b)

/* Accent Colors */
Primary: cyan-400/500 (#22d3ee / #06b6d4)
Success: green-400/500 (#22c55e / #10b981)
Danger: red-400/500 (#f87171 / #ef4444)
Warning: purple-400/500 (#c084fc / #a855f7)
```

### Glass Panel Effect

```css
.glass-panel {
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
```

### Font Awesome 6 Icons

Icons are loaded from CDN in the main page component:

```tsx
<Script
  src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/js/all.min.js"
  strategy="afterInteractive"
/>
```

**Key Icons Used:**
- `fa-mobile-screen-button` - Mobile view
- `fa-desktop` - Kiosk view
- `fa-qrcode` - QR scanning
- `fa-route` - Navigation/wayfinding
- `fa-camera` - Scanner camera
- `fa-location-dot` - Destination marker
- `fa-clock` - Time tracking
- `fa-users` - Active students
- `fa-chart-line` - Statistics

## Customization

### Modify Student Profile

Edit `store/clockInStore.ts`:

```typescript
student: {
  id: '2026-8842',
  name: 'Alex Rivera',
  destination: 'TESDA Electronics Lab',
  building: 'Building B',
  room: 'Room 304',
}
```

### Adjust Waypoints

Edit `components/RouteVisualization.tsx`:

```typescript
const waypoints = [
  { position: [0, 0, 0], label: 'Main Lobby', stage: 1 },
  { position: [5, 0, 3], label: 'Hallway A', stage: 1 },
  // Add more waypoints...
];
```

### Change Animation Speed

In `RouteVisualization.tsx`, adjust the timer:

```typescript
const timer = setTimeout(() => {
  setCurrentWaypoint(currentWaypoint + 1);
}, 2000); // Change from 2000ms (2 seconds)
```

## Integration with Visitor Management System

This clock-in system is designed to integrate with the planned VMS database:

**Database Tables (Prisma Schema):**
- `visitors` - Student profiles with QR codes
- `visits` - Clock-in/out session logs
- `rooms` - Destination coordinates for wayfinding
- `kiosks` - Entry point locations

**Future Enhancements:**
- Connect QR scanner to actual camera API (html5-qrcode)
- Store clock-in records to database via API
- Fetch real-time student count from database
- Dynamic waypoint calculation using A* pathfinding
- Host notifications on student arrival

## Troubleshooting

### QR Code Not Displaying
- Ensure `react-qr-code` is installed: `npm install react-qr-code`
- Check console for import errors

### 3D Route Not Rendering
- Verify Three.js dependencies are installed
- Check browser WebGL support: visit https://get.webgl.org/
- Clear browser cache and restart dev server

### Font Awesome Icons Not Showing
- Confirm Font Awesome script is loading (check Network tab)
- Ensure `<Script>` component is in client-side rendered page
- Try using `<link>` tag alternative if script fails

### State Not Persisting
- Zustand store resets on page refresh (by design for MVP)
- For persistence, add Zustand middleware: `persist()`

## Performance Optimization

### 3D Canvas
- Orbital controls limited to reasonable distances (5-40 units)
- Fog effect reduces far-distance rendering load
- Simple geometries (spheres, boxes) for markers
- Minimal lighting (2 point lights + ambient)

### Mobile Optimization
- Responsive design with `max-w-md` mobile frame
- Touch-friendly button sizes (py-3, py-4)
- Reduced animations on mobile (consider `prefers-reduced-motion`)

## Credits

**Built with:**
- Next.js 14 (App Router)
- React 18
- Three.js + React Three Fiber
- Zustand (State Management)
- Tailwind CSS
- Font Awesome 6

**Design Pattern:**
Dark-mode glass morphism with cyan accent colors

---

**Documentation Version:** 1.0  
**Last Updated:** 2026-09-22  
**System Status:** ✅ Fully Operational
