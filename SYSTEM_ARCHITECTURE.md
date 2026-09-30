# HYT Student QR Clock-In System - Architecture Diagram

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         HYT WAYFINDER APPLICATION                        │
│                    http://localhost:3000                                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
        ┌───────────▼──────────┐      ┌────────────▼─────────┐
        │   Home Page (/)      │      │  3D Building Tour    │
        │   app/page.tsx       │      │  (/tour)             │
        └───────────┬──────────┘      └──────────────────────┘
                    │
                    │ "Student Clock-In" Button
                    │
        ┌───────────▼──────────────────────────────────────────────┐
        │   CLOCK-IN SYSTEM (/clock-in)                            │
        │   app/clock-in/page.tsx                                  │
        │   ┌────────────────────────────────────────────────┐    │
        │   │  Header: ViewModeSwitcher                       │    │
        │   │  [📱 Mobile] [🖥️ Kiosk]                         │    │
        │   └────────────────────────────────────────────────┘    │
        └───────────┬──────────────────────────────────────────────┘
                    │
          ┌─────────┴─────────┐
          │                   │
    ┌─────▼──────┐      ┌─────▼──────┐
    │  MOBILE    │      │   KIOSK    │
    │   VIEW     │      │   VIEW     │
    └─────┬──────┘      └─────┬──────┘
          │                   │
          │                   └──────────────┐
          │                                  │
┌─────────▼──────────────┐         ┌────────▼─────────────────┐
│ StudentMobileView.tsx  │         │ KioskStationView.tsx     │
├────────────────────────┤         ├──────────────────────────┤
│ ┌──────────────────┐  │         │ ┌──────────────────────┐ │
│ │ Student Profile  │  │         │ │ Large QR Code        │ │
│ │ - Alex Rivera    │  │         │ │ (256x256px)          │ │
│ │ - ID #2026-8842  │  │         │ │ react-qr-code        │ │
│ │ - Destination    │  │         │ └──────────────────────┘ │
│ │ - Status Badge   │  │         │ ┌──────────────────────┐ │
│ └──────────────────┘  │         │ │ Real-Time Metrics    │ │
│                       │         │ │ - Active Students:47 │ │
│ Status:               │         │ │ - Daily Visits: 203  │ │
│ NOT CLOCKED IN        │         │ │ - Current Time       │ │
│        │              │         │ └──────────────────────┘ │
│        ▼              │         │ ┌──────────────────────┐ │
│ ┌──────────────────┐  │         │ │ Guest Check-In       │ │
│ │  QRScanner.tsx   │  │         │ │ - ID Scanner         │ │
│ │  ┌────────────┐  │  │         │ │ - Data Extraction    │ │
│ │  │ Viewfinder │  │  │         │ │ - Badge Printing     │ │
│ │  │ + Laser    │  │  │         │ └──────────────────────┘ │
│ │  │ Animation  │  │  │         └──────────────────────────┘
│ │  └────────────┘  │  │
│ │  [Scan Button]   │  │
│ └────────┬─────────┘  │
│          │ clockIn()  │
│          ▼            │
│ Status:               │
│ CLOCKED IN            │
│   (Timestamp)         │
│          │            │
│          ▼            │
│ ┌──────────────────┐  │
│ │RouteVisualization│  │
│ │  .tsx            │  │
│ │ ┌──────────────┐ │  │
│ │ │ Three.js     │ │  │
│ │ │ Canvas       │ │  │
│ │ │              │ │  │
│ │ │ ● Waypoint 1 │ │  │
│ │ │ ● Waypoint 2 │ │  │
│ │ │ ● ...        │ │  │
│ │ │ ● Room 304   │ │  │
│ │ │              │ │  │
│ │ │ Glowing Path │ │  │
│ │ └──────────────┘ │  │
│ │ ┌──────────────┐ │  │
│ │ │ HUD Controls │ │  │
│ │ │ [▶️ Play]     │ │  │
│ │ │ [⏸️ Pause]    │ │  │
│ │ │ [🔄 Reset]    │ │  │
│ │ │ [🚪 Clock Out]│ │  │
│ │ └──────────────┘ │  │
│ └──────────────────┘  │
└───────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   GLOBAL STATE MANAGEMENT                    │
│                   store/clockInStore.ts                      │
│                        (Zustand)                             │
├─────────────────────────────────────────────────────────────┤
│ State:                                                       │
│  - viewMode: 'mobile' | 'kiosk'                             │
│  - student: { id, name, destination, building, room }       │
│  - clockInTime: Date | null                                 │
│  - status: 'not-clocked-in' | 'clocked-in' | 'viewing-route'│
│  - activeStudents: 47                                       │
│  - dailyVisits: 203                                         │
│  - isRouteAnimating: boolean                                │
│  - currentWaypoint: 0-5                                     │
├─────────────────────────────────────────────────────────────┤
│ Actions:                                                     │
│  - setViewMode()                                            │
│  - clockIn()         → Log timestamp, status = 'clocked-in' │
│  - clockOut()        → Reset state                          │
│  - startRouteView()  → status = 'viewing-route'             │
│  - setRouteAnimating()                                      │
│  - setCurrentWaypoint()                                     │
│  - resetRoute()                                             │
└─────────────────────────────────────────────────────────────┘
```

## Component Communication Flow

```
User Action Flow:

1. INITIAL STATE
   ┌─────────────────────┐
   │ User Opens /clock-in│
   └──────────┬──────────┘
              │
              ▼
   ┌─────────────────────┐
   │ ViewModeSwitcher    │
   │ Shows: [Mobile] [X] │
   └──────────┬──────────┘
              │
              ▼
   ┌─────────────────────┐
   │ StudentMobileView   │
   │ Renders QRScanner   │
   │ status: NOT CLOCKED │
   └─────────────────────┘

2. QR SCAN SIMULATION
   ┌─────────────────────┐
   │ User Clicks Button  │
   │ "Simulate Scan QR"  │
   └──────────┬──────────┘
              │
              ▼
   ┌─────────────────────┐
   │ clockInStore.clockIn│
   │ - Set timestamp     │
   │ - status='clocked'  │
   │ - Increment counters│
   └──────────┬──────────┘
              │
              ▼
   ┌─────────────────────┐
   │ QRScanner Success   │
   │ Shows green check ✓ │
   │ Auto-calls:         │
   │ startRouteView()    │
   └──────────┬──────────┘
              │
              ▼
   ┌─────────────────────┐
   │ StudentMobileView   │
   │ Re-renders with     │
   │ RouteVisualization  │
   └─────────────────────┘

3. 3D ROUTE ANIMATION
   ┌─────────────────────┐
   │ User Clicks "Play"  │
   └──────────┬──────────┘
              │
              ▼
   ┌─────────────────────┐
   │setRouteAnimating(T) │
   └──────────┬──────────┘
              │
              ▼
   ┌─────────────────────┐
   │ useEffect Timer     │
   │ Every 2 seconds:    │
   │ setCurrentWaypoint++│
   └──────────┬──────────┘
              │
              ▼
   ┌─────────────────────┐
   │ RouteVisualization  │
   │ Updates:            │
   │ - Marker colors     │
   │ - Path line         │
   │ - HUD progress      │
   └─────────────────────┘

4. CLOCK OUT
   ┌─────────────────────┐
   │ User Clicks Button  │
   │ "Clock Out"         │
   └──────────┬──────────┘
              │
              ▼
   ┌─────────────────────┐
   │clockInStore.clockOut│
   │ - Reset timestamp   │
   │ - status='not-clkd' │
   │ - waypoint = 0      │
   │ - animating = false │
   └──────────┬──────────┘
              │
              ▼
   ┌─────────────────────┐
   │ StudentMobileView   │
   │ Re-renders with     │
   │ QRScanner           │
   └─────────────────────┘
```

## State Transitions

```
┌──────────────────┐
│ not-clocked-in   │
│ (Initial State)  │
└────────┬─────────┘
         │
         │ clockIn()
         │
         ▼
┌──────────────────┐
│   clocked-in     │
│ (Has timestamp)  │
└────────┬─────────┘
         │
         │ startRouteView() [Automatic]
         │
         ▼
┌──────────────────┐
│  viewing-route   │
│ (3D Canvas)      │
└────────┬─────────┘
         │
         │ clockOut()
         │
         ▼
┌──────────────────┐
│ not-clocked-in   │
│ (Reset)          │
└──────────────────┘
```

## 3D Waypoint System

```
Main Lobby (0,0,0) ──────┐
         │               │ Stage 1
         ▼               │
Hallway A (5,0,3) ───────┘
         │
         ▼               ┐
Elevator 3F (10,0,5) ────┤ Stage 2
         │               │
         ▼ [Vertical]    │
3F Landing (10,10,5) ────┘
         │
         ▼               ┐
Corridor B (15,10,8) ────┤ Stage 3
         │               │
         ▼               │
Room 304 (20,10,10) ─────┘

Animation Flow:
- Waypoint 0 → Cyan (active)
- Wait 2 seconds
- Waypoint 0 → Green (complete)
- Waypoint 1 → Cyan (active)
- Repeat until Waypoint 5
- Path line extends progressively
```

## Technology Stack

```
Frontend:
├── Next.js 14 (App Router)
├── React 18
├── TypeScript
├── Tailwind CSS
└── Font Awesome 6 (CDN)

3D Rendering:
├── Three.js (Core 3D engine)
├── @react-three/fiber (React renderer)
└── @react-three/drei (Helper components)

State Management:
└── Zustand (Global store)

UI Components:
└── react-qr-code (QR generation)

Future Integration:
├── PostgreSQL (Database)
├── Prisma (ORM)
├── html5-qrcode (Real camera)
└── Nodemailer + Slack (Notifications)
```

## File Dependencies

```
app/clock-in/page.tsx
  ├─ import ViewModeSwitcher
  ├─ import StudentMobileView
  ├─ import KioskStationView
  └─ import useClockInStore

components/StudentMobileView.tsx
  ├─ import QRScanner
  ├─ import RouteVisualization
  └─ import useClockInStore

components/QRScanner.tsx
  └─ import useClockInStore
      └─ clockIn(), startRouteView()

components/KioskStationView.tsx
  ├─ import react-qr-code
  └─ import useClockInStore

components/RouteVisualization.tsx
  ├─ import @react-three/fiber (Canvas)
  ├─ import @react-three/drei (OrbitControls, Line, Html)
  ├─ import three (THREE)
  └─ import useClockInStore
      └─ isRouteAnimating, currentWaypoint, setters

store/clockInStore.ts
  └─ import zustand (create)
```

## API Integration Points (Future)

```
Current State → Future Database Integration

clockIn() Action:
  ┌────────────────────┐
  │ Zustand State      │
  │ clockIn()          │
  └──────┬─────────────┘
         │
         ▼ [Future]
  ┌────────────────────┐
  │ POST /api/check-in │
  │ Body: {            │
  │   visitorId,       │
  │   kioskId,         │
  │   hostId,          │
  │   roomId           │
  │ }                  │
  └──────┬─────────────┘
         │
         ▼
  ┌────────────────────┐
  │ Prisma Database    │
  │ INSERT INTO visits │
  │ - visitor_id       │
  │ - time_in          │
  │ - status='active'  │
  └──────┬─────────────┘
         │
         ▼
  ┌────────────────────┐
  │ Return waypoints[] │
  │ From A* algorithm  │
  └────────────────────┘

QR Scanner:
  ┌────────────────────┐
  │ Current: Simulated │
  └──────┬─────────────┘
         │
         ▼ [Future]
  ┌────────────────────┐
  │ html5-qrcode       │
  │ Real Camera Access │
  └──────┬─────────────┘
         │
         ▼
  ┌────────────────────┐
  │ Decode QR Code     │
  │ Extract visitor_id │
  └────────────────────┘

Metrics Dashboard:
  ┌────────────────────┐
  │ Current: Static    │
  │ activeStudents: 47 │
  └──────┬─────────────┘
         │
         ▼ [Future]
  ┌────────────────────┐
  │ GET /api/visitors/ │
  │     active         │
  └──────┬─────────────┘
         │
         ▼
  ┌────────────────────┐
  │ SELECT COUNT(*)    │
  │ FROM visits        │
  │ WHERE status       │
  │ = 'active'         │
  └────────────────────┘
```

---

## Performance Considerations

**3D Canvas Optimization:**
- Orbital controls distance limited: 5-40 units
- Fog reduces far-distance rendering load
- Simple geometries (spheres, boxes) used
- Minimal lighting (ambient + 2 point lights)
- Shadow maps: 2048x2048 resolution

**Mobile Optimization:**
- Responsive design with `max-w-md` frame
- Touch-friendly button sizes (py-3, py-4)
- Reduced animations possible with `prefers-reduced-motion`
- Canvas pixel ratio capped at 2x

**State Management:**
- Zustand store is lightweight
- No persistence (resets on refresh for MVP)
- Selective re-renders via hooks

---

**Version**: 1.0  
**Last Updated**: 2026-09-22  
**Architecture Status**: ✅ Complete
