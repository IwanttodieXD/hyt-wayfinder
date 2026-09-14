# HYT WAYFINDER - Setup Guide

## Prerequisites Setup (Windows)

### 1. Install Node.js

1. Download Node.js LTS from https://nodejs.org
2. Run the installer
3. **Important:** Check "Add to PATH" during installation
4. Restart your terminal after installation

### 2. Fix PowerShell Execution Policy

Open PowerShell as Administrator and run:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Type `Y` and press Enter to confirm.

### 3. Verify Installation

Open a **new** PowerShell window and check:

```powershell
node -v    # Should show v18.x.x or higher
npm -v     # Should show 9.x.x or higher
```

## Project Installation

Once Node.js is properly installed:

```powershell
cd "c:\Users\diosb\Documents\hyt codes\hyt-wayfinder"
npm install
```

This will install all dependencies (may take 2-3 minutes):
- Next.js
- React
- Three.js
- React Three Fiber
- Drei
- Tailwind CSS
- TypeScript

## Running the Application

### Development Mode

```powershell
npm run dev
```

Then open http://localhost:3000 in your browser.

### Production Build

```powershell
npm run build
npm start
```

## Troubleshooting

### "npm: command not found"
- Node.js is not installed or not in PATH
- Restart your terminal after installing Node.js
- Verify with `node -v`

### "scripts disabled on this system"
- Run the PowerShell execution policy fix (step 2 above)
- Must be run as Administrator

### Port 3000 already in use
```powershell
npm run dev -- -p 3001
```

### Slow 3D performance
- Close other browser tabs
- Try Chrome or Edge (better WebGL performance)
- Lower your screen resolution
- Check GPU drivers are updated

## Project Ready Checklist

- [ ] Node.js installed (v18+)
- [ ] npm working in terminal
- [ ] Dependencies installed (`npm install` completed)
- [ ] Dev server running (`npm run dev`)
- [ ] Browser opened to http://localhost:3000
- [ ] Landing page visible
- [ ] "Enter Tour" button working
- [ ] 3D scene loads
- [ ] WASD/mouse controls working
- [ ] Floor indicator updating

## Next Steps After Setup

1. Test all controls (WASD, mouse, mobile touch)
2. Verify collision detection (can't walk through walls)
3. Check floor transitions
4. Test on mobile device (open http://YOUR_IP:3000)
5. Replace placeholder building with actual HYT 3D assets

## Performance Tips

- Use Chrome/Edge for best WebGL performance
- Ensure hardware acceleration is enabled in browser
- Close unnecessary browser tabs
- For mobile testing, use same WiFi network
