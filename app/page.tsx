'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function HomePage() {
  const router = useRouter();
  const [entering, setEntering] = useState(false);

  const handleEnter = () => {
    setEntering(true);
    setTimeout(() => router.push('/tour'), 600);
  };

  return (
    <div
      className={`w-full h-screen relative overflow-hidden transition-opacity duration-500 ${entering ? 'opacity-0' : 'opacity-100'}`}
    >
      {/* Background */}
      <div className="absolute inset-0 bg-[#080d1a]" />

      {/* Animated grid */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(rgba(56,189,248,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.3) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
        }}
      />

      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500 rounded-full opacity-10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-600 rounded-full opacity-10 blur-[100px] pointer-events-none" />

      {/* Top bar */}
      <header className="absolute top-0 left-0 right-0 flex items-center justify-between px-8 py-5 z-10">
        <div className="flex items-center gap-3">
          <div className="w-20 h-20 flex items-start justify-start overflow-hidden">
              <img 
                src="/hyt_logo.png"
                alt="HYT Global Logo"
                className="w-full h-full object-contain"
              />
          </div>
          <span className="text-white font-semibold tracking-wide text-sm">HYT WAYFINDER</span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-xs text-slate-400 font-medium tracking-wider uppercase">
          <span>5 Floors</span>
          <span className="w-px h-4 bg-slate-700" />
          <span>3D Exploration</span>
          <span className="w-px h-4 bg-slate-700" />
          <span>HYT Global Institute</span>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 w-full h-full flex flex-col items-center justify-center px-6 text-center">

        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-xs font-medium tracking-widest uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          Virtual Tour Experience
        </div>

        {/* Title */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white leading-none tracking-tight mb-4">
          HYT{' '}
          <span
            className="text-transparent"
            style={{
              WebkitTextStroke: '1.5px rgba(56,189,248,0.7)',
            }}
          >
            Global
          </span>
          <br />
          Institute
        </h1>

        {/* Subtitle */}
        <p className="mt-4 text-slate-400 text-lg md:text-xl max-w-md leading-relaxed">
          Explore the HYT Business Center in immersive 3D. Navigate every floor, discover every space.
        </p>

        {/* CTA */}
        <button
          onClick={handleEnter}
          disabled={entering}
          className="mt-10 group relative inline-flex items-center gap-3 px-10 py-4 rounded-xl font-semibold text-base text-white overflow-hidden transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-60"
          style={{
            background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
            boxShadow: '0 0 40px rgba(6,182,212,0.35)',
          }}
        >
          <span>Enter Tour</span>
          <svg
            className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          {/* Shimmer */}
          <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background: 'linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.15) 50%, transparent 80%)',
            }}
          />
        </button>

        {/* Controls hint */}
        <div className="mt-8 flex items-center gap-4 text-slate-500 text-xs">
          <div className="flex items-center gap-1.5">
            <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-xs">W</kbd>
            <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-xs">A</kbd>
            <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-xs">S</kbd>
            <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-xs">D</kbd>
            <span className="ml-1">to move</span>
          </div>
          <span className="w-px h-4 bg-slate-700" />
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
            </svg>
            <span>touch on mobile</span>
          </div>
        </div>
      </main>

      {/* Bottom stats bar */}
      <footer className="absolute bottom-0 left-0 right-0 z-10 border-t border-white/5 bg-white/[0.02] backdrop-blur-sm">
        <div className="flex items-center justify-center gap-8 md:gap-16 px-8 py-4">
          {[
            { value: '5', label: 'Floors' },
            { value: '3D', label: 'Navigation' },
            { value: '360°', label: 'Exploration' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-cyan-400 font-bold text-lg leading-none">{stat.value}</div>
              <div className="text-slate-500 text-xs mt-1 uppercase tracking-wider">{stat.label}</div>
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
}
