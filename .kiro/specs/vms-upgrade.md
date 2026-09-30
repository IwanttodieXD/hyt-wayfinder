# 3D Interactive Visitor Management System (VMS)

**Project:** HYT Wayfinder → VMS Upgrade  
**Status:** Draft  
**Created:** 2026-09-22  
**Author:** System Architect

---

## Executive Summary

Transform the existing HYT-3D Building Tour Simulation into a complete **3D Interactive Visitor Management System** that combines QR-based check-in/check-out with dynamic wayfinding visualization.

### Core Value Proposition
- Replace static building tours with **context-aware visitor guidance**
- Automate visitor tracking with **QR code integration**
- Provide **real-time 3D navigation** from kiosk to destination
- Enable **host notifications** and **administrative oversight**

---

## Requirements

### 1. User Stories

#### US-1: Visitor Check-In
**As a** visitor arriving at HYT Global Institute  
**I want to** scan my QR code at the entrance kiosk  
**So that** I can log my arrival and receive visual directions to my destination

**Acceptance Criteria:**
- QR code scanner activates webcam or connects to dedicated scanner hardware
- Valid QR codes must contain: `visitor_id`, `destination_room_id`, `host_id`
- System logs `time_in` timestamp with ±1 second accuracy
- Host receives notification within 5 seconds (email/Slack/webhook)
- 3D canvas immediately displays animated route to destination
- Invalid QR codes show error message within 2 seconds

#### US-2: Dynamic 3D Wayfinding
**As a** visitor who just checked in  
**I want to** see a 3D animated path to my destination  
**So that** I can navigate the building without getting lost

**Acceptance Criteria:**
- System determines current kiosk location (configurable per terminal)
- Path calculation accounts for floor changes, stairs, and obstacles
- Visual indicators: floor lines, arrows, highlight destination door
- Camera animation smoothly follows the route (5-10 second duration)
- Mobile-responsive: works on kiosk tablets and personal devices
- Includes floor-by-floor breakdown in UI overlay

#### US-3: Visitor Check-Out
**As a** visitor leaving the building  
**I want to** scan my QR code at the exit terminal  
**So that** my visit duration is recorded and I'm marked as departed

**Acceptance Criteria:**
- Scanning QR code at exit terminal fetches active visit session
- System logs `time_out` timestamp
- Visit status changes from "active" to "completed"
- Terminal returns to standby mode within 3 seconds
- No navigation animation plays on check-out

#### US-4: Admin Dashboard
**As a** security/admin staff member  
**I want to** view all active visitors and visit history  
**So that** I can monitor building occupancy and audit visitor logs

**Acceptance Criteria:**
- Real-time list of currently checked-in visitors
- Search/filter by date range, host, visitor name
- Export visit logs to CSV
- View average visit duration statistics
- See which visitors haven't checked out (overdue alerts)

---

### 2. Functional Requirements

#### FR-1: QR Code Scanning
- **FR-1.1** System must support webcam-based QR scanning (desktop/tablet)
- **FR-1.2** System must support USB barcode scanner input (keyboard wedge mode)
- **FR-1.3** QR codes must encode JSON with minimum fields: `{visitor_id, room_id, host_id}`
- **FR-1.4** Scanner must auto-focus and handle poor lighting conditions
- **FR-1.5** Support multiple simultaneous kiosk terminals

#### FR-2: Visitor Data Management
- **FR-2.1** Store visitor pre-registration: name, company, email, photo
- **FR-2.2** Track visit sessions: visitor_id, room_id, time_in, time_out, kiosk_id
- **FR-2.3** Support recurring visitors (multiple visit records per visitor)
- **FR-2.4** Maintain audit trail (who, when, where, how long)

#### FR-3: Room & Path Management
- **FR-3.1** Database of all rooms with: id, name, floor, coordinates [x, y, z]
- **FR-3.2** Database of kiosk terminals with: id, location_name, coordinates
- **FR-3.3** Pathfinding algorithm generates waypoints from kiosk to room
- **FR-3.4** Path must account for floor transitions (stairs/elevators)
- **FR-3.5** Support dynamic obstacle avoidance (future: real-time updates)

#### FR-4: 3D Visualization
- **FR-4.1** Refactor Camera.tsx to accept programmatic route waypoints
- **FR-4.2** Render visual path: floor line, directional arrows, destination highlight
- **FR-4.3** Animate camera following the path (smooth transitions)
- **FR-4.4** Overlay HUD with: floor indicator, turn-by-turn text, ETA
- **FR-4.5** Allow manual camera control after animation (WASD/touch)

#### FR-5: Host Notifications
- **FR-5.1** Send email notification on check-in (configurable template)
- **FR-5.2** Send Slack/Teams message (webhook integration)
- **FR-5.3** Send SMS notification (Twilio integration - optional Phase 2)
- **FR-5.4** Include visitor name, time, expected destination in notification

#### FR-6: API & Backend Services
- **FR-6.1** `POST /api/check-in` - Process QR scan, create visit session
- **FR-6.2** `POST /api/check-out` - Complete visit session
- **FR-6.3** `GET /api/path/:kioskId/:roomId` - Fetch pathfinding waypoints
- **FR-6.4** `GET /api/visitors/active` - List currently checked-in visitors
- **FR-6.5** `GET /api/visits?date=YYYY-MM-DD` - Visit history with filters
- **FR-6.6** `GET /api/rooms` - List all rooms with metadata

---

### 3. Non-Functional Requirements

#### NFR-1: Performance
- QR scan → navigation animation: < 2 seconds latency
- 3D rendering: maintain 30+ FPS on tablet devices
- API response time: < 500ms for check-in/check-out
- Support 50+ concurrent kiosk terminals

#### NFR-2: Security
- QR codes must be single-use with expiration (24-hour validity)
- API endpoints require authentication (JWT tokens)
- Visitor data encrypted at rest (GDPR compliance)
- Audit logs immutable and tamper-evident

#### NFR-3: Reliability
- System uptime: 99.5% during business hours
- Offline mode: kiosk caches room data, syncs on reconnect
- Graceful degradation: if 3D fails, show 2D map fallback

#### NFR-4: Usability
- Kiosk UI must be touch-friendly (min 44px tap targets)
- Support multiple languages (EN, ES, FR - Phase 2)
- Accessibility: WCAG 2.1 AA compliance for admin dashboard

---

## Design

### 1. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                           │
├─────────────────────────────────────────────────────────────┤
│  Kiosk Terminal UI          │    Admin Dashboard            │
│  - QR Scanner Component     │    - Visitor List             │
│  - 3D Wayfinding Canvas     │    - Visit History            │
│  - Check-In/Out Flow        │    - Reports & Analytics      │
└──────────────┬──────────────┴───────────────┬───────────────┘
               │                              │
               │ HTTP/WebSocket               │ HTTP
               ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   API Layer (Next.js)                       │
├─────────────────────────────────────────────────────────────┤
│  /api/check-in       - POST: Process QR, create session    │
│  /api/check-out      - POST: Complete session              │
│  /api/path           - GET: Fetch pathfinding waypoints    │
│  /api/visitors       - GET: Active visitors                │
│  /api/visits         - GET: Visit history (filters)        │
│  /api/rooms          - GET: Room directory                 │
│  /api/notifications  - POST: Send host alerts              │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│               Business Logic Layer                          │
├─────────────────────────────────────────────────────────────┤
│  - QR Parser & Validator                                    │
│  - Visit Session Manager                                    │
│  - Pathfinding Engine (A* algorithm)                        │
│  - Notification Dispatcher (email/Slack/webhook)            │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│                  Data Layer                                 │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL / Prisma ORM                                    │
│  - visitors table                                           │
│  - visits table (session records)                           │
│  - rooms table                                              │
│  - kiosks table                                             │
│  - hosts table                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### 2. Database Schema

#### Table: `visitors`
```sql
CREATE TABLE visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  company VARCHAR(255),
  phone VARCHAR(50),
  photo_url TEXT,
  qr_code TEXT UNIQUE NOT NULL,
  qr_expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_visitors_qr_code ON visitors(qr_code);
CREATE INDEX idx_visitors_email ON visitors(email);
```

#### Table: `visits`
```sql
CREATE TABLE visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id UUID REFERENCES visitors(id) ON DELETE CASCADE,
  host_id UUID REFERENCES hosts(id),
  room_id UUID REFERENCES rooms(id),
  kiosk_id UUID REFERENCES kiosks(id),
  time_in TIMESTAMP NOT NULL DEFAULT NOW(),
  time_out TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active', -- active | completed | no_show
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_visits_visitor_id ON visits(visitor_id);
CREATE INDEX idx_visits_status ON visits(status);
CREATE INDEX idx_visits_time_in ON visits(time_in DESC);
```

#### Table: `rooms`
```sql
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  floor INT NOT NULL,
  room_number VARCHAR(50),
  coordinates_x FLOAT NOT NULL,
  coordinates_y FLOAT NOT NULL,
  coordinates_z FLOAT NOT NULL,
  capacity INT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_rooms_floor ON rooms(floor);
CREATE INDEX idx_rooms_name ON rooms(name);
```

#### Table: `kiosks`
```sql
CREATE TABLE kiosks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL, -- "Main Entrance", "Lobby 2", etc.
  location_description TEXT,
  coordinates_x FLOAT NOT NULL,
  coordinates_y FLOAT NOT NULL,
  coordinates_z FLOAT NOT NULL,
  floor INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Table: `hosts`
```sql
CREATE TABLE hosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  department VARCHAR(255),
  phone VARCHAR(50),
  notification_preferences JSONB, -- {email: true, slack: true, webhook: "url"}
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Table: `pathfinding_edges` (for route optimization)
```sql
CREATE TABLE pathfinding_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_node_id UUID,
  to_node_id UUID,
  distance FLOAT,
  floor_change INT DEFAULT 0, -- 0 = same floor, 1/-1 = up/down stairs
  notes TEXT
);
```

---

### 3. API Contracts

#### POST /api/check-in
**Request:**
```json
{
  "qr_code": "VIS-2026-ABC123",
  "kiosk_id": "uuid-of-kiosk"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "visit_id": "uuid",
  "visitor": {
    "id": "uuid",
    "name": "John Doe",
    "company": "Acme Corp"
  },
  "destination": {
    "room_id": "uuid",
    "room_name": "Conference Room A",
    "floor": 3
  },
  "path": {
    "waypoints": [
      {"x": 0, "y": 1.6, "z": 10, "floor": 1, "action": "start"},
      {"x": -5, "y": 1.6, "z": 5, "floor": 1, "action": "walk"},
      {"x": -10, "y": 5.6, "z": 5, "floor": 2, "action": "stairs_up"},
      {"x": -10, "y": 9.6, "z": 5, "floor": 3, "action": "stairs_up"},
      {"x": -12, "y": 9.6, "z": -8, "floor": 3, "action": "destination"}
    ],
    "estimated_time_seconds": 45
  },
  "host_notified": true
}
```

**Error (400 Bad Request):**
```json
{
  "success": false,
  "error": "QR_INVALID",
  "message": "QR code expired or not found"
}
```

#### POST /api/check-out
**Request:**
```json
{
  "qr_code": "VIS-2026-ABC123",
  "kiosk_id": "uuid-of-kiosk"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "visit_id": "uuid",
  "duration_minutes": 45,
  "message": "Thank you for visiting!"
}
```

#### GET /api/path/:kioskId/:roomId
**Response (200 OK):**
```json
{
  "waypoints": [...],
  "estimated_time_seconds": 45,
  "floor_changes": 2
}
```

#### GET /api/visitors/active
**Response (200 OK):**
```json
{
  "count": 12,
  "visitors": [
    {
      "visit_id": "uuid",
      "visitor_name": "John Doe",
      "company": "Acme Corp",
      "destination": "Conference Room A",
      "time_in": "2026-09-22T09:30:00Z",
      "duration_minutes": 45,
      "host_name": "Jane Smith"
    }
  ]
}
```

---

### 4. 3D Rendering Architecture Changes

#### Current State:
- Static camera starting position
- Manual WASD/touch navigation
- No programmatic camera control
- Building geometry is hardcoded

#### Target State:
- **Dynamic Camera Controller** accepts waypoint arrays
- **Path Renderer** draws visual lines and arrows on canvas
- **Animation System** smoothly interpolates camera through waypoints
- **Room Highlighting** emphasizes destination with outline/glow

#### New Components:

##### `components/WayfindingPath.tsx`
```typescript
interface WayfindingPathProps {
  waypoints: Waypoint[];
  isActive: boolean;
}

// Renders 3D line geometry following waypoints
// Shows directional arrows at turns
// Highlights destination room
```

##### `components/AnimatedCamera.tsx`
```typescript
interface AnimatedCameraProps {
  waypoints: Waypoint[];
  duration: number; // seconds
  onComplete: () => void;
}

// Animates camera position/rotation through waypoints
// Uses smooth easing (cubic bezier)
// Allows manual override (press any key to take control)
```

##### `hooks/usePathAnimation.ts`
```typescript
// Manages animation state
// Interpolates between waypoints
// Calculates camera look-at targets
// Returns: {progress, currentPosition, currentLookAt, isPlaying}
```

---

### 5. QR Code Integration

#### Approach 1: Webcam Scanner (Default)
- **Library:** `html5-qrcode` or `@zxing/browser`
- **Pros:** No hardware required, works on tablets/phones
- **Cons:** Requires camera permissions, slower scan speed

#### Approach 2: USB Barcode Scanner (Enterprise)
- **Library:** None needed (keyboard wedge mode)
- **Pros:** Fast, reliable, professional
- **Cons:** Requires hardware purchase, USB connection

#### Implementation:
```typescript
// components/QRScanner.tsx
interface QRScannerProps {
  onScan: (code: string) => void;
  mode: 'webcam' | 'keyboard';
}

// For webcam mode: use html5-qrcode
// For keyboard mode: listen to keypress events, build string until Enter
```

---

### 6. Notification System

#### Email Notifications (Nodemailer + SendGrid/AWS SES)
```typescript
// lib/notifications/email.ts
async function sendHostNotification(host: Host, visitor: Visitor, visit: Visit) {
  const html = `
    <h2>Visitor Arrival Notification</h2>
    <p><strong>${visitor.name}</strong> from ${visitor.company} has checked in.</p>
    <p>Destination: ${visit.room.name} (Floor ${visit.room.floor})</p>
    <p>Time: ${new Date(visit.time_in).toLocaleString()}</p>
  `;
  
  await sendEmail({
    to: host.email,
    subject: `Visitor Arrival: ${visitor.name}`,
    html
  });
}
```

#### Slack/Teams Webhooks
```typescript
// lib/notifications/slack.ts
async function sendSlackNotification(webhookUrl: string, visitor: Visitor) {
  await fetch(webhookUrl, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      text: `🚪 *Visitor Arrival*\n${visitor.name} (${visitor.company}) has checked in.`
    })
  });
}
```

---

## Task Breakdown

### Phase 1: Foundation & Database (Week 1)

#### Task 1.1: Database Setup
- [ ] **T1.1.1** Install Prisma ORM (`npm install prisma @prisma/client`)
- [ ] **T1.1.2** Initialize Prisma (`npx prisma init`)
- [ ] **T1.1.3** Create schema in `prisma/schema.prisma` (visitors, visits, rooms, kiosks, hosts)
- [ ] **T1.1.4** Run migration (`npx prisma migrate dev --name init`)
- [ ] **T1.1.5** Generate Prisma Client
- [ ] **T1.1.6** Seed database with sample rooms and kiosks

#### Task 1.2: API Routes Foundation
- [ ] **T1.2.1** Create `/api/health` endpoint (test DB connection)
- [ ] **T1.2.2** Create `/api/rooms` GET endpoint (fetch all rooms)
- [ ] **T1.2.3** Create `/api/kiosks` GET endpoint (fetch all kiosks)
- [ ] **T1.2.4** Add error handling middleware
- [ ] **T1.2.5** Add request logging

---

### Phase 2: QR Code Integration (Week 1-2)

#### Task 2.1: QR Scanner Component
- [ ] **T2.1.1** Install QR library (`npm install html5-qrcode`)
- [ ] **T2.1.2** Create `components/QRScanner.tsx` (webcam mode)
- [ ] **T2.1.3** Add camera permission handling
- [ ] **T2.1.4** Add scanning UI (overlay, focus box, instructions)
- [ ] **T2.1.5** Test with sample QR codes

#### Task 2.2: Check-In Flow
- [ ] **T2.2.1** Create `/api/check-in` POST endpoint
- [ ] **T2.2.2** Implement QR code validation logic
- [ ] **T2.2.3** Create visit session in database
- [ ] **T2.2.4** Fetch room coordinates for pathfinding
- [ ] **T2.2.5** Return path waypoints in response
- [ ] **T2.2.6** Add error handling (expired QR, duplicate check-in)

#### Task 2.3: Check-Out Flow
- [ ] **T2.3.1** Create `/api/check-out` POST endpoint
- [ ] **T2.3.2** Fetch active visit by QR code
- [ ] **T2.3.3** Update `time_out` and status
- [ ] **T2.3.4** Calculate visit duration
- [ ] **T2.3.5** Return confirmation message

---

### Phase 3: Pathfinding Engine (Week 2)

#### Task 3.1: Coordinate System Mapping
- [ ] **T3.1.1** Document 3D coordinate system (origin, scale, floor heights)
- [ ] **T3.1.2** Map all rooms to 3D coordinates
- [ ] **T3.1.3** Map all kiosks to 3D coordinates
- [ ] **T3.1.4** Define staircase waypoints
- [ ] **T3.1.5** Create room/kiosk seed data

#### Task 3.2: Pathfinding Algorithm
- [ ] **T3.2.1** Install pathfinding library or implement A*
- [ ] **T3.2.2** Create `lib/pathfinding.ts` module
- [ ] **T3.2.3** Implement `calculatePath(start, end, floor)` function
- [ ] **T3.2.4** Handle multi-floor navigation (stairs/elevators)
- [ ] **T3.2.5** Add waypoint smoothing (remove redundant points)
- [ ] **T3.2.6** Test edge cases (same floor, cross-building, unreachable)

#### Task 3.3: Path API Endpoint
- [ ] **T3.3.1** Create `/api/path/:kioskId/:roomId` GET endpoint
- [ ] **T3.3.2** Fetch kiosk and room coordinates
- [ ] **T3.3.3** Call pathfinding algorithm
- [ ] **T3.3.4** Format waypoints for 3D rendering
- [ ] **T3.3.5** Calculate estimated walk time
- [ ] **T3.3.6** Add caching (Redis optional)

---

### Phase 4: 3D Wayfinding Visualization (Week 2-3)

#### Task 4.1: Path Rendering
- [ ] **T4.1.1** Create `components/WayfindingPath.tsx`
- [ ] **T4.1.2** Render line geometry connecting waypoints
- [ ] **T4.1.3** Add directional arrow meshes at turns
- [ ] **T4.1.4** Highlight destination room (outline effect)
- [ ] **T4.1.5** Add floor-level indicators
- [ ] **T4.1.6** Make path glow/pulse for visibility

#### Task 4.2: Camera Animation
- [ ] **T4.2.1** Create `hooks/usePathAnimation.ts`
- [ ] **T4.2.2** Implement waypoint interpolation (cubic bezier easing)
- [ ] **T4.2.3** Calculate camera look-at targets (always look forward)
- [ ] **T4.2.4** Add speed variations (slow at turns, fast on straights)
- [ ] **T4.2.5** Create `components/AnimatedCamera.tsx`
- [ ] **T4.2.6** Integrate with existing Camera.tsx (toggle modes)

#### Task 4.3: Scene Integration
- [ ] **T4.3.1** Refactor `Scene.tsx` to accept path prop
- [ ] **T4.3.2** Add path animation state management
- [ ] **T4.3.3** Show/hide path visualization
- [ ] **T4.3.4** Allow manual camera control after animation
- [ ] **T4.3.5** Add "Replay Route" button
- [ ] **T4.3.6** Test on mobile devices (performance)

---

### Phase 5: Kiosk Terminal UI (Week 3)

#### Task 5.1: Kiosk Landing Page
- [ ] **T5.1.1** Create `/kiosk` route
- [ ] **T5.1.2** Design standby screen (scan QR prompt)
- [ ] **T5.1.3** Add kiosk ID configuration (env var or query param)
- [ ] **T5.1.4** Show building logo and welcome message
- [ ] **T5.1.5** Add accessibility features (large text, high contrast)

#### Task 5.2: Check-In Screen
- [ ] **T5.2.1** Create `/kiosk/checkin` route
- [ ] **T5.2.2** Integrate QRScanner component
- [ ] **T5.2.3** Show loading state during API call
- [ ] **T5.2.4** Display visitor name and destination on success
- [ ] **T5.2.5** Auto-transition to 3D wayfinding
- [ ] **T5.2.6** Add error screen for invalid QR codes

#### Task 5.3: Wayfinding Screen
- [ ] **T5.3.1** Create `/kiosk/wayfinding` route
- [ ] **T5.3.2** Load 3D scene with path animation
- [ ] **T5.3.3** Show HUD overlay (floor, turn-by-turn text, ETA)
- [ ] **T5.3.4** Add "Take Control" button (switch to manual nav)
- [ ] **T5.3.5** Auto-return to standby after 60 seconds
- [ ] **T5.3.6** Add timeout warning (10 second countdown)

#### Task 5.4: Check-Out Screen
- [ ] **T5.4.1** Create `/kiosk/checkout` route
- [ ] **T5.4.2** Integrate QRScanner component
- [ ] **T5.4.3** Call `/api/check-out` endpoint
- [ ] **T5.4.4** Show thank-you message with visit duration
- [ ] **T5.4.5** Auto-return to standby after 5 seconds

---

### Phase 6: Notification System (Week 3-4)

#### Task 6.1: Email Notifications
- [ ] **T6.1.1** Install email library (`npm install nodemailer`)
- [ ] **T6.1.2** Configure SMTP/SendGrid credentials (env vars)
- [ ] **T6.1.3** Create `lib/notifications/email.ts` module
- [ ] **T6.1.4** Design email template (HTML + plain text)
- [ ] **T6.1.5** Implement `sendHostNotification()` function
- [ ] **T6.1.6** Test email delivery

#### Task 6.2: Slack/Webhook Integration
- [ ] **T6.2.1** Create `lib/notifications/webhook.ts` module
- [ ] **T6.2.2** Implement generic webhook POST function
- [ ] **T6.2.3** Add Slack message formatting
- [ ] **T6.2.4** Add Microsoft Teams formatting
- [ ] **T6.2.5** Store webhook URLs in host preferences (DB)
- [ ] **T6.2.6** Test with sample webhooks

#### Task 6.3: Notification Dispatcher
- [ ] **T6.3.1** Create `lib/notifications/dispatcher.ts`
- [ ] **T6.3.2** Implement `notifyHost(hostId, visitId)` function
- [ ] **T6.3.3** Read host notification preferences
- [ ] **T6.3.4** Dispatch to all enabled channels (parallel)
- [ ] **T6.3.5** Log notification delivery status
- [ ] **T6.3.6** Handle failures gracefully (retry logic)

---

### Phase 7: Admin Dashboard (Week 4-5)

#### Task 7.1: Dashboard Layout
- [ ] **T7.1.1** Create `/admin` route with authentication
- [ ] **T7.1.2** Design sidebar navigation (Visitors, Rooms, Reports)
- [ ] **T7.1.3** Add header with date/time, active visitor count
- [ ] **T7.1.4** Create dashboard home with KPI cards
- [ ] **T7.1.5** Make responsive for desktop (1280px+)

#### Task 7.2: Active Visitors View
- [ ] **T7.2.1** Create `/api/visitors/active` endpoint
- [ ] **T7.2.2** Create `/admin/visitors/active` page
- [ ] **T7.2.3** Display table with: name, company, destination, time_in, duration
- [ ] **T7.2.4** Add real-time updates (WebSocket or polling)
- [ ] **T7.2.5** Add search/filter functionality
- [ ] **T7.2.6** Add "Force Check-Out" action

#### Task 7.3: Visit History View
- [ ] **T7.3.1** Create `/api/visits` endpoint (with filters)
- [ ] **T7.3.2** Create `/admin/visits` page
- [ ] **T7.3.3** Add date range picker
- [ ] **T7.3.4** Add filters: status, host, visitor, room
- [ ] **T7.3.5** Display paginated table (50 per page)
- [ ] **T7.3.6** Add CSV export button

#### Task 7.4: Room Management
- [ ] **T7.4.1** Create `/admin/rooms` page
- [ ] **T7.4.2** List all rooms with edit/delete actions
- [ ] **T7.4.3** Add "Create Room" form
- [ ] **T7.4.4** Add "Edit Room" form (update coordinates)
- [ ] **T7.4.5** Create `/api/rooms` POST/PUT/DELETE endpoints
- [ ] **T7.4.6** Add room status toggle (active/inactive)

#### Task 7.5: Analytics & Reports
- [ ] **T7.5.1** Create `/admin/reports` page
- [ ] **T7.5.2** Show visit count by day (chart)
- [ ] **T7.5.3** Show average visit duration
- [ ] **T7.5.4** Show most visited rooms
- [ ] **T7.5.5** Show peak hours heatmap
- [ ] **T7.5.6** Add date range selector

---

### Phase 8: Testing & Polish (Week 5)

#### Task 8.1: Unit Tests
- [ ] **T8.1.1** Test QR validation logic
- [ ] **T8.1.2** Test pathfinding algorithm
- [ ] **T8.1.3** Test API endpoints (check-in, check-out)
- [ ] **T8.1.4** Test notification dispatcher
- [ ] **T8.1.5** Achieve 80%+ code coverage

#### Task 8.2: Integration Tests
- [ ] **T8.2.1** Test end-to-end check-in flow
- [ ] **T8.2.2** Test end-to-end check-out flow
- [ ] **T8.2.3** Test admin dashboard CRUD operations
- [ ] **T8.2.4** Test concurrent kiosk sessions
- [ ] **T8.2.5** Test 3D path animation on various devices

#### Task 8.3: Performance Optimization
- [ ] **T8.3.1** Optimize 3D scene (reduce polygon count)
- [ ] **T8.3.2** Add API response caching
- [ ] **T8.3.3** Lazy load admin dashboard modules
- [ ] **T8.3.4** Compress database queries
- [ ] **T8.3.5** Profile and fix FPS drops

#### Task 8.4: Security Hardening
- [ ] **T8.4.1** Add JWT authentication to API routes
- [ ] **T8.4.2** Implement rate limiting (check-in endpoint)
- [ ] **T8.4.3** Sanitize QR code input (SQL injection prevention)
- [ ] **T8.4.4** Add CSRF protection
- [ ] **T8.4.5** Audit dependencies for vulnerabilities

#### Task 8.5: Documentation
- [ ] **T8.5.1** Write deployment guide (ENV vars, DB setup)
- [ ] **T8.5.2** Document API endpoints (OpenAPI/Swagger)
- [ ] **T8.5.3** Create admin user manual (PDF)
- [ ] **T8.5.4** Write kiosk setup guide (hardware + software)
- [ ] **T8.5.5** Create video tutorial (QR generation, check-in demo)

---

### Phase 9: Deployment (Week 6)

#### Task 9.1: Production Environment
- [ ] **T9.1.1** Set up PostgreSQL database (AWS RDS / Supabase)
- [ ] **T9.1.2** Deploy Next.js app (Vercel / AWS / DigitalOcean)
- [ ] **T9.1.3** Configure environment variables
- [ ] **T9.1.4** Set up SSL certificates
- [ ] **T9.1.5** Configure backup strategy (daily DB snapshots)

#### Task 9.2: Kiosk Hardware Setup
- [ ] **T9.2.1** Procure tablets/kiosks (recommended specs)
- [ ] **T9.2.2** Install kiosk mode browser (Porteus Kiosk / Chrome)
- [ ] **T9.2.3** Configure auto-login to `/kiosk` URL
- [ ] **T9.2.4** Mount tablets at entrance/exit locations
- [ ] **T9.2.5** Test QR scanning in real lighting conditions

#### Task 9.3: Training & Rollout
- [ ] **T9.3.1** Train admin staff on dashboard usage
- [ ] **T9.3.2** Train security/reception on kiosk troubleshooting
- [ ] **T9.3.3** Generate QR codes for initial visitor batch
- [ ] **T9.3.4** Run pilot test with 10 visitors
- [ ] **T9.3.5** Gather feedback and iterate
- [ ] **T9.3.6** Full rollout

---

## Risk Analysis

### Risk 1: QR Code Scanning Reliability
**Impact:** High | **Likelihood:** Medium  
**Mitigation:**
- Provide high-quality printed QR codes (error correction level H)
- Install dedicated lighting at kiosk terminals
- Fallback: manual ID entry by security staff

### Risk 2: 3D Performance on Tablets
**Impact:** High | **Likelihood:** Medium  
**Mitigation:**
- Use LOD (Level of Detail) for distant geometry
- Reduce texture resolution for mobile
- Provide 2D map fallback if FPS < 20

### Risk 3: Network Connectivity at Kiosks
**Impact:** Medium | **Likelihood:** Low  
**Mitigation:**
- Implement offline mode (cache room data)
- Queue check-ins and sync when reconnected
- Show clear "Offline" status to user

### Risk 4: Pathfinding Algorithm Accuracy
**Impact:** High | **Likelihood:** Low  
**Mitigation:**
- Validate paths with facility manager
- Allow admin to manually edit waypoints
- Add user feedback mechanism ("Report Issue")

---

## Success Metrics

### Operational KPIs
- **Check-in time:** < 10 seconds (scan to animation start)
- **System uptime:** > 99% during business hours
- **User satisfaction:** > 4.5/5 (post-visit survey)

### Business KPIs
- **Visitor tracking:** 100% of visitors logged (vs. 60% manual)
- **Host response time:** < 2 minutes (vs. 10+ minutes manual calls)
- **Security incidents:** Zero unauthorized access to restricted areas

### Technical KPIs
- **API response time:** < 500ms (p95)
- **3D FPS:** > 30 FPS on target devices
- **Error rate:** < 0.1% failed check-ins

---

## Appendices

### A. Technology Stack Summary
- **Frontend:** Next.js 14, React 18, Three.js, React Three Fiber
- **Backend:** Next.js API Routes, Prisma ORM
- **Database:** PostgreSQL 15+
- **QR Scanning:** html5-qrcode or @zxing/browser
- **Notifications:** Nodemailer, Slack/Teams webhooks
- **Deployment:** Vercel / AWS / DigitalOcean
- **State Management:** Zustand (already installed)

### B. QR Code Format Specification
```json
{
  "version": "1.0",
  "visitor_id": "uuid",
  "room_id": "uuid",
  "host_id": "uuid",
  "expires_at": "2026-09-23T23:59:59Z",
  "signature": "HMAC-SHA256-hash"
}
```

Base64-encoded JSON string, prefixed with `VMS:` for validation.

### C. 3D Coordinate System
- **Origin:** Center of ground floor (0, 0, 0)
- **X-axis:** East (+) / West (-)
- **Y-axis:** Up (+) / Down (-)
- **Z-axis:** North (+) / South (-)
- **Scale:** 1 unit = 1 meter
- **Floor height:** 4 units (4 meters)

### D. Sample Room Seed Data
```typescript
const sampleRooms = [
  {
    name: "Conference Room A",
    floor: 3,
    room_number: "301",
    coordinates_x: -12,
    coordinates_y: 9.6,
    coordinates_z: -8
  },
  {
    name: "Barista Training Cafe",
    floor: 1,
    room_number: "101",
    coordinates_x: -12,
    coordinates_y: 0.5,
    coordinates_z: -8
  },
  // ... more rooms
];
```

---

## Next Steps

1. **Approval:** Review this spec with stakeholders
2. **Priority:** Confirm Phase 1-3 as MVP (Weeks 1-2)
3. **Resources:** Assign developers to task phases
4. **Kick-off:** Schedule architecture review meeting
5. **Tracking:** Create project board with all tasks

---

**End of Specification**
