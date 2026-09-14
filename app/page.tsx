'use client';

import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-700">
      <div className="text-center space-y-8 p-8">
        <div className="space-y-4">
          <h1 className="text-6xl md:text-8xl font-bold text-white tracking-tight">
            HYT WAYFINDER
          </h1>
          <p className="text-xl md:text-2xl text-blue-100">
            Virtual Tour of HYT Global Institute
          </p>
        </div>
        
        <div className="space-y-4">
          <button
            onClick={() => router.push('/tour')}
            className="px-12 py-4 text-xl font-semibold text-white bg-cyan-500 hover:bg-cyan-400 rounded-lg shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95"
          >
            Enter Tour
          </button>
          
          <p className="text-sm text-blue-200 mt-4">
            Use WASD keys + mouse to navigate | Touch controls on mobile
          </p>
        </div>
      </div>
      
      <div className="absolute bottom-8 text-center">
        <p className="text-blue-300 text-sm">
          5-Floor Building Exploration Experience
        </p>
      </div>
    </div>
  );
}
