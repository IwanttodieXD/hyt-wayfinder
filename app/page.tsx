'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, user, checkAuth, isLoading } = useAuthStore();

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Redirect to appropriate page based on auth status
  useEffect(() => {
    if (isLoading) return; // Wait for auth check to complete

    if (isAuthenticated && user) {
      // If already logged in, redirect based on role
      if (user.role === 'admin') {
        router.push('/admin');
      } else {
        // Trainer or visitor goes to clock-in (QR scanner)
        router.push('/clock-in');
      }
    } else {
      // Not logged in, redirect to login page
      router.push('/login');
    }
  }, [isAuthenticated, user, router, isLoading]);

  // Show loading while checking auth and redirecting
  return (
    <div className='w-full h-screen bg-navy-950 flex items-center justify-center'>
      <div className='text-center'>
        <div className='w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4'></div>
        <p className='text-navy-300'>Loading...</p>
      </div>
    </div>
  );
}
