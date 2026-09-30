'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';
import Script from 'next/script';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      // Get user info to determine redirect
      const user = useAuthStore.getState().user;
      
      // Role-based redirect
      if (user?.role === 'admin') {
        router.push('/admin');
      } else {
        // Trainer or visitor goes to clock-in page (QR scanner)
        router.push('/clock-in');
      }
    } else {
      setError(result.error || 'Login failed');
      setLoading(false);
    }
  };

  return (
    <>
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/js/all.min.js"
        strategy="afterInteractive"
      />

      <div className="min-h-screen bg-gradient-to-br from-blue-950 via-slate-900 to-blue-900 flex items-center justify-center p-4">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600 rounded-full opacity-20 blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-orange-600 rounded-full opacity-10 blur-[100px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-800 rounded-full opacity-15 blur-[150px]" />
        </div>

        {/* Login Card */}
        <div className="relative w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-block w-24 h-24 mb-4">
              <img src="/hyt_logo.png" alt="HYT Logo" className="w-full h-full object-contain drop-shadow-2xl" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              HYT Wayfinder
            </h1>
            <p className="text-blue-300">Sign in to your account</p>
          </div>

          {/* Login Form */}
          <div className="glass-panel border border-blue-400/30 rounded-2xl p-8 shadow-2xl shadow-blue-900/50 bg-slate-900/60">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-2">
                  <i className="fa-solid fa-circle-exclamation mt-0.5"></i>
                  <span>{error}</span>
                </div>
              )}

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-blue-200 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <i className="fa-solid fa-envelope text-blue-400"></i>
                  </div>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="
                      w-full pl-12 pr-4 py-3 rounded-lg
                      bg-slate-900/80 border-2 border-blue-500/30
                      text-white placeholder-slate-500
                      focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500
                      transition-all
                    "
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-blue-200 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <i className="fa-solid fa-lock text-blue-400"></i>
                  </div>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="
                      w-full pl-12 pr-4 py-3 rounded-lg
                      bg-slate-900/80 border-2 border-blue-500/30
                      text-white placeholder-slate-500
                      focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500
                      transition-all
                    "
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="
                  w-full py-3 rounded-lg font-semibold text-white
                  bg-blue-600 hover:bg-blue-700
                  shadow-lg shadow-blue-500/30
                  hover:shadow-xl hover:shadow-blue-500/40
                  transition-all duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2
                  border border-blue-500/50
                "
              >
                {loading ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-right-to-bracket"></i>
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </form>

            {/* Demo Credentials */}
            <div className="mt-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <p className="text-blue-300 text-sm font-semibold mb-2">
                <i className="fa-solid fa-info-circle mr-2"></i>
                Demo Credentials
              </p>
              <div className="space-y-1 text-xs text-blue-200">
                <p><strong className="text-orange-400">Admin:</strong> admin@hyt.com / admin123</p>
                <p><strong className="text-orange-400">Trainer:</strong> trainer@hyt.com / trainer123</p>
                <p><strong className="text-orange-400">Visitor:</strong> visitor@hyt.com / visitor123</p>
              </div>
            </div>

            {/* Register Link */}
            <div className="mt-6 text-center text-sm text-slate-400">
              Don&apos;t have an account?{' '}
              <Link
                href="/register"
                className="text-orange-400 hover:text-orange-300 font-semibold transition-colors"
              >
                Create one
              </Link>
            </div>
          </div>

          {/* Back to Home */}
          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-blue-300 hover:text-blue-200 text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <i className="fa-solid fa-arrow-left"></i>
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
