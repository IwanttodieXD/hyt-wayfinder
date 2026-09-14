# HYT WAYFINDER - Testing Guide

## Manual Testing Checklist

### Desktop Testing

#### Landing Page
- [ ] Page loads with gradient background
- [ ] "HYT WAYFINDER" title displays
- [ ] "Enter Tour" button is visible and styled
- [ ] Button hover effect works
- [ ] Clicking "Enter Tour" navigates to /tour

#### 3D Tour Page - Initial Load
- [ ] Loading screen appears first
- [ ] "Loading 3D Environment..." message shows
- [ ] Scene loads within 5 seconds
- [ ] "Click to Start" overlay appears
- [ ] Floor indicator shows "Floor 1" in top-right
- [ ] Controls panel visible in bottom-left

#### Camera Controls (Desktop)
- [ ] Clicking canvas locks pointer
- [ ] "Click to Start" overlay disappears
- [ ] Mouse movement rotates camera view
- [ ] W key moves forward
- [ ] S key moves backward
- [ ] A key moves left (strafe)
- [ ] D key moves right (strafe)
- [ ] Arrow keys work as alternative to WASD
- [ ] Space bar triggers jump (if implemented)
- [ ] ESC key unlocks pointer

#### Collision Detection
- [ ] Cannot walk through outer walls
- [ ] Cannot walk through interior walls
- [ ] Cannot walk through room dividers
- [ ] Movement stops at building boundaries
- [ ] Can walk through doorways
- [ ] Can navigate hallways freely

#### Floor Navigation
- [ ] Floor indicator updates when changing floors
- [ ] Can access Floor 1
- [ ] Can access Floor 2
- [ ] Can access Floor 3
- [ ] Can access Floor 4
- [ ] Can access Floor 5
- [ ] Staircase areas are accessible
- [ ] Floor number displays correctly (1-5)

#### Visual Quality
- [ ] Building geometry renders correctly
- [ ] Walls are visible and solid
- [ ] Windows appear transparent/translucent
- [ ] Doors are distinguishable
- [ ] Floors have different colors per level
- [ ] Shadows render properly
- [ ] Sky/environment visible
- [ ] Lighting looks realistic

#### Performance (Desktop)
- [ ] Click "Show Stats" button
- [ ] FPS displays
- [ ] FPS is 30+ (Good) or 60+ (Excellent)
- [ ] No stuttering during movement
- [ ] Camera rotation is smooth
- [ ] No lag when turning quickly

### Mobile Testing

#### Access on Mobile
- [ ] Open browser on mobile device
- [ ] Navigate to http://YOUR_PC_IP:3000
- [ ] Landing page displays correctly
- [ ] "Enter Tour" button is tappable
- [ ] Page is responsive (no horizontal scroll)

#### Mobile Controls
- [ ] 3D scene loads on mobile
- [ ] Touch left side of screen to move
- [ ] Dragging left side moves character
- [ ] Touch right side of screen to look
- [ ] Dragging right side rotates camera
- [ ] Two-finger gestures don't break controls
- [ ] Controls panel hidden on mobile

#### Mobile Performance
- [ ] Scene loads within 10 seconds
- [ ] Movement is responsive
- [ ] Camera rotation works smoothly
- [ ] No crashes or freezing
- [ ] FPS is acceptable (20+)

### Browser Compatibility

Test in multiple browsers:
- [ ] Chrome/Edge (recommended)
- [ ] Firefox
- [ ] Safari (desktop)
- [ ] Safari (iOS)
- [ ] Chrome (Android)

### Responsive Design

Test at different screen sizes:
- [ ] 1920x1080 (Desktop)
- [ ] 1366x768 (Laptop)
- [ ] 768x1024 (Tablet portrait)
- [ ] 1024x768 (Tablet landscape)
- [ ] 375x667 (Mobile portrait)
- [ ] 667x375 (Mobile landscape)

## Performance Benchmarks

### Minimum Requirements
- **Desktop:** 30+ FPS
- **Mobile:** 20+ FPS
- **Load Time:** < 10 seconds

### Target Performance
- **Desktop:** 60 FPS
- **Mobile:** 30 FPS
- **Load Time:** < 5 seconds

## Known Limitations (Prototype)

- Placeholder building geometry (not actual HYT building)
- Basic collision detection (box-based only)
- No room labels or interaction yet
- No guided tour feature yet
- Simple mobile controls (not virtual joystick UI)
- No audio/sound effects
- No multi-floor staircase animation

## Issues to Report

If you encounter issues, note:
1. What were you doing?
2. What happened?
3. What should have happened?
4. Browser and version
5. Device type
6. Screenshot or video if possible

## Next Steps After Testing

1. ✅ Verify all features work
2. Replace placeholder building with actual HYT 3D model
3. Add room labels and information points
4. Implement guided tour mode
5. Add virtual joystick UI for mobile
6. Optimize further based on real asset size
7. Add room interaction system
8. Deploy to production server
