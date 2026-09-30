# ☕ TESDA-Certified Barista Training Game

## Overview
An interactive mini-game that simulates barista training based on TESDA (Technical Education and Skills Development Authority) certification standards. Players learn and practice the art of coffee making through hands-on gameplay.

## Features

### 🎮 Game Modes
- **Four Coffee Types**:
  - **Espresso** - The foundation (3 steps, 25s target)
  - **Americano** - Espresso with hot water (4 steps, 30s target)
  - **Cappuccino** - Equal parts espresso, milk, and foam (5 steps, 45s target)
  - **Latte** - Espresso with steamed milk and latte art (6 steps, 50s target)

### 📋 TESDA Standards
The game implements real TESDA barista certification standards:
- **Perfect (✓)**: 100 points - Meets TESDA professional standards
- **Good (○)**: 70 points - Acceptable but needs refinement
- **Poor (✗)**: 30 points - Requires more practice

### 🎯 Scoring System
- **Base Score**: Average of all step scores
- **Time Bonus**: +20 points if completed within target time
- **Accuracy Penalty**: Deducted based on mistakes and delays
- **Certification**: Score ≥85% earns TESDA Certified status

### 📊 Performance Metrics
- **Real-time Timer**: Tracks completion time vs. target
- **Accuracy Meter**: Decreases with poor technique or overtime
- **Step Progress**: Visual feedback on completed steps
- **Final Report**: Detailed breakdown of performance

## Coffee Making Steps

### Common Steps
1. **Grind** - Grind fresh coffee beans to fine consistency
2. **Tamp** - Compress grounds with 30 lbs pressure
3. **Extract** - Pull espresso shot for 25-30 seconds
4. **Add Water** - For Americano dilution
5. **Steam Milk** - Heat milk to 65°C with microfoam
6. **Pour** - Smooth milk pouring technique
7. **Latte Art** - Create designs with milk pour

## How to Play

### Starting
1. Navigate to `/barista-game` route
2. Select a coffee type from the menu
3. Review the recipe details and target time

### During Gameplay
1. Read the current step instruction
2. Choose your technique quality:
   - **Perfect** - Earns full points, maintains accuracy
   - **Good** - Partial points, slight accuracy penalty
   - **Poor** - Minimal points, significant accuracy penalty
3. Complete all steps to finish

### Scoring
- Each step is evaluated based on technique
- Time management affects final score
- Consistent accuracy leads to certification

## Technical Implementation

### Route
- Path: `/app/barista-game/page.tsx`
- Client-side rendered (Next.js)
- Responsive design for mobile and desktop

### State Management
```typescript
- gameState: 'menu' | 'playing' | 'result'
- selectedCoffee: Coffee recipe type
- currentStepIndex: Progress through recipe
- score: Cumulative performance score
- timer: Real-time elapsed seconds
- accuracy: Performance consistency meter
- tesdaCertified: Achievement status
```

### Responsive Design
- Mobile-optimized touch controls
- Gradient backgrounds (amber/orange theme)
- Glassmorphism UI elements
- Smooth animations and transitions

## Integration

### Navigation
- Accessible from home page header (desktop)
- Prominent button on main landing page
- Direct route: `/barista-game`
- Back navigation to home

### Styling
- Tailwind CSS utilities
- Custom color schemes (amber/brown coffee theme)
- Backdrop blur effects
- Smooth hover and active states

## Learning Outcomes

Players will learn:
1. ✅ Proper coffee grinding techniques
2. ✅ Correct tamping pressure (30 lbs)
3. ✅ Optimal extraction timing (25-30s)
4. ✅ Milk steaming temperature (65°C)
5. ✅ Microfoam creation technique
6. ✅ Latte art pouring methods
7. ✅ Time management in barista work

## Future Enhancements

Potential additions:
- 🎵 Sound effects for each step
- 🎨 Visual animations of coffee making
- 📈 Progress tracking and statistics
- 🏅 Achievement badges system
- 👥 Multiplayer competition mode
- 📱 PWA support for offline play
- 🌐 Multi-language support
- 📖 Detailed TESDA module references

## TESDA Certification

This game is based on the TESDA Barista NC II (National Certificate Level 2) competency standards, which include:
- Coffee preparation and presentation
- Espresso-based beverage preparation
- Customer service in café operations
- Workplace safety and hygiene

**Note**: This is an educational simulation. Actual TESDA certification requires formal training and assessment.

## Credits

- **Design**: Based on TESDA barista training modules
- **Framework**: Next.js 14 with React 18
- **Styling**: Tailwind CSS
- **Institution**: HYT Global Institute

---

**Play Now**: Start the development server and visit `/barista-game`

```bash
npm run dev
```

Then navigate to `http://localhost:3000/barista-game`
