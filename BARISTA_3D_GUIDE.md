# ☕ 3D TESDA Barista Training Cafe

## Overview
An immersive 3D barista training cafe integrated into the HYT Global Institute building tour. Experience hands-on coffee equipment interaction in a fully realized 3D environment using Three.js and React Three Fiber.

## Location
**Floor:** Ground Floor (First Floor)  
**Position:** Left side of the building (Western wing)  
**Look for:** Golden "TESDA BARISTA Training Cafe" illuminated sign

## Features

### 🎯 Interactive 3D Equipment

#### 1. **Espresso Machine**
- **Visual:** Dark metallic body with orange/red accents
- **Interactive:** Click to activate brewing animation
- **Lights up:** Red, green, and blue indicator buttons
- **Effect:** Glowing animation when active with pulsing orange light
- **Learning:** Espresso extraction technique

#### 2. **Coffee Grinder**
- **Visual:** Compact unit with transparent bean hopper
- **Interactive:** Click to activate grinding
- **Animation:** Hopper rotates when grinding
- **Contains:** Visible coffee beans inside
- **Effect:** Green glow when active
- **Learning:** Bean grinding and consistency

#### 3. **Milk Steaming Pitcher**
- **Visual:** Stainless steel pitcher with handle
- **Interactive:** Click to activate steaming
- **Animation:** Rising steam particles
- **Effect:** Red glow with animated white steam clouds
- **Learning:** Milk frothing technique (65°C standard)

#### 4. **Coffee Cup with Saucer**
- **Visual:** White ceramic cup with handle
- **Dynamic:** Fills with coffee liquid after machine interaction
- **Details:** Realistic liquid rendering with foam for lattes
- **Types:** Changes appearance based on coffee type

### 🎨 Environment Design

#### Cafe Setup
- **Counter:** 3m wooden counter with coffee-brown finish
- **Back Wall:** Warm cream-colored panel backdrop
- **Floor Mat:** Rich brown barista station mat
- **Signage:** Illuminated golden TESDA branding
- **Decorations:** Coffee bean storage jar, ambient details

#### Lighting
- **Ambient:** Warm golden point light from above
- **Spotlight:** Focused lighting on equipment
- **Equipment Glow:** Each station lights up when active
- **Accent:** Yellow/golden theme for cafe atmosphere

#### Materials & Textures
- **Metal:** High metalness (0.8-0.9) for machines
- **Wood:** Medium roughness (0.6-0.8) for counter
- **Glass/Acrylic:** Transparency for bean hopper
- **Ceramic:** Low roughness for cups
- **Emissive:** Active equipment glows with color

## Controls & Interaction

### Navigation
- **Move:** `W` `A` `S` `D` keys
- **Look:** Mouse movement (click to lock pointer)
- **Interact:** Click on equipment
- **Zoom:** Mouse wheel (if orbit controls enabled)

### Interaction Feedback
1. **Hover State:** Equipment changes color on mouse over
2. **Active State:** Equipment glows and animates
3. **Label Popup:** Shows equipment name on hover
4. **Action Text:** "BREWING...", "GRINDING...", "STEAMING..." when active
5. **Auto-Reset:** Equipment deactivates after 2 seconds

## Technical Implementation

### Components

#### BaristaCafe.tsx
Main cafe component with all equipment and environment
- **Props:**
  - `position`: [x, y, z] placement in building
  - `isActive`: Enable/disable interactions
  - `onInteract`: Callback function for equipment clicks

#### Sub-Components
1. **CoffeeMachine** - Espresso machine with group head
2. **CoffeeGrinder** - Bean grinder with rotating hopper
3. **MilkPitcher** - Steaming pitcher with steam particles
4. **CoffeeCup** - Dynamic cup that fills with coffee
5. **CafeCounter** - Wooden counter with base
6. **CafeSign** - Illuminated TESDA signage

### Integration
Located in `Building.tsx` at position `[-12, 0.5, -8]`

```typescript
<BaristaCafe 
  position={[-12, 0.5, -8]} 
  isActive={true}
  onInteract={(action) => console.log('Barista action:', action)}
/>
```

### Animation System
- **useFrame:** React Three Fiber hook for 60fps animations
- **Rotation:** Continuous rotation for active grinder
- **Oscillation:** Sine wave motion for steam particles
- **Pulsing:** Light intensity variation for effects

## TESDA Learning Standards

### Equipment Skills Taught
1. ✅ **Grinder Operation**
   - Bean selection and loading
   - Grind size consistency
   - Dose measurement

2. ✅ **Espresso Extraction**
   - Portafilter handling
   - Machine operation
   - Shot timing (25-30 seconds)

3. ✅ **Milk Steaming**
   - Temperature control (65°C)
   - Microfoam creation
   - Pitcher positioning

### Workflow Practice
The cafe layout follows professional barista workflow:
- Grinder (left) → Machine (center) → Steamer (right)
- Cup positioned for easy access
- Equipment spacing for efficiency

## Future Enhancements

### Potential Additions
- 🎮 **Game Mode:** Step-by-step guided training
- 📊 **Scoring System:** Performance evaluation
- 🏆 **Achievements:** TESDA certification milestones
- 🎵 **Sound Effects:** Machine sounds, grinding, steaming
- 📱 **Mobile VR:** Virtual reality support
- 👥 **Multiplayer:** Collaborative training sessions
- 📈 **Progress Tracking:** Save user practice sessions
- 📚 **Tutorial Overlays:** AR-style instruction popups
- ⏱️ **Timed Challenges:** Speed and accuracy tests
- 🎨 **Latte Art:** Interactive pour simulation

### Advanced Features
- Physics-based liquid pouring
- Real-time temperature simulation
- Customizable cafe environment
- Additional coffee recipes (Macchiato, Mocha, etc.)
- Barista NPC instructors
- Coffee bean variety selection

## Access Instructions

### For Users
1. Start the application: `npm run dev`
2. Navigate to homepage: `http://localhost:3000`
3. Click "Barista Game" button or link
4. Read the instructions page
5. Click "Enter 3D Building Tour"
6. Use WASD to navigate to the cafe (ground floor, left side)
7. Look for the golden cafe sign
8. Click equipment to interact

### For Developers
```bash
# Location
hyt-wayfinder/components/BaristaCafe.tsx

# Integration point
hyt-wayfinder/components/Building.tsx (line ~140)

# Landing page
hyt-wayfinder/app/barista-game/page.tsx
```

## Performance Optimization

### Rendering
- Instanced geometries for repeated elements
- Shared materials to reduce memory
- LOD (Level of Detail) ready architecture
- Efficient shadow mapping (2048x2048)

### Interaction
- Raycasting for click detection
- Hover state management
- Throttled animation updates
- Conditional rendering of effects

## Browser Compatibility
- ✅ Chrome/Edge (Recommended)
- ✅ Firefox
- ✅ Safari (Limited WebGL features)
- ⚠️ Mobile browsers (Reduced performance)

## System Requirements
- **GPU:** WebGL 2.0 capable
- **RAM:** 4GB minimum
- **CPU:** Modern multi-core processor
- **Connection:** Local or low-latency

## Troubleshooting

### Equipment Not Clickable
- Ensure pointer lock is not active
- Check browser console for errors
- Verify WebGL is enabled

### Performance Issues
- Reduce shadow quality in Scene.tsx
- Lower device pixel ratio (dpr)
- Close other browser tabs

### Visual Glitches
- Update graphics drivers
- Try a different browser
- Clear browser cache

## Credits
- **Framework:** React Three Fiber + Three.js
- **UI Library:** @react-three/drei
- **Standards:** TESDA Barista NC II
- **Institution:** HYT Global Institute

---

**Experience the future of vocational training in 3D!** ☕🎓
