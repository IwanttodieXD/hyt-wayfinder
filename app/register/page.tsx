'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, UserRole, DESTINATIONS } from '@/store/authStore';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'visitor' as UserRole,
    destination: '',
  });
  const [profilePhoto, setProfilePhoto] = useState<string>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    setError('');

    // Load image into a canvas to compress + resize
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const maxSize = 256;
      let { width, height } = img;

      // Scale down to fit within maxSize x maxSize (square crop)
      const scale = Math.min(maxSize / width, maxSize / height);
      const drawW = Math.round(width * scale);
      const drawH = Math.round(height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = maxSize;
      canvas.height = maxSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Center the image on a square canvas (cover, not stretch)
      const offsetX = (maxSize - drawW) / 2;
      const offsetY = (maxSize - drawH) / 2;
      ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

      // Compress to JPEG — much smaller than PNG for photos
      const compressed = canvas.toDataURL('image/jpeg', 0.8);
      setProfilePhoto(compressed);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      setError('Failed to load image. Please try a different file.');
    };

    img.src = url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    const result = await register({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      role: formData.role,
      avatar: profilePhoto || undefined,
      destination: formData.destination || undefined,
    });

    if (result.success) {
      // Role-based redirect
      if (formData.role === 'admin') {
        router.push('/admin');
      } else {
        // Trainer, trainee or visitor goes to the mobile clock-in page
        router.push('/clock-in');
      }
    } else {
      setError(result.error || 'Registration failed');
      setLoading(false);
    }
  };

  return (
    <>
      <div className='min-h-screen bg-navy-900 flex items-center justify-center p-4'>
        {/* Register Card */}
        <div className='relative w-full max-w-md'>
          {/* Logo */}
          <div className='text-center mb-8'>
            <div className='inline-block w-24 h-24 mb-4'>
              <img
                src='/hyt_logo.png'
                alt='HYT Logo'
                className='w-full h-full object-contain'
              />
            </div>
            <h1 className='text-3xl font-bold text-white mb-2'>Create Account</h1>
            <p className='text-orange-300'>Join HYT Wayfinder</p>
          </div>

          {/* Register Form */}
          <div className='border border-orange-400/30 rounded-lg p-8 bg-navy-900/60'>
            <form onSubmit={handleSubmit} className='space-y-5'>
              {/* Error Message */}
              {error && (
                <div className='p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-2'>
                  <i className='fa-solid fa-circle-exclamation mt-0.5'></i>
                  <span>{error}</span>
                </div>
              )}

              {/* Profile Photo Upload */}
              <div className='flex flex-col items-center'>
                <label className='block text-sm font-medium text-orange-200 mb-3'>
                  Profile Photo
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className='relative w-32 h-32 rounded-lg border-2 border-orange-500/30 bg-navy-900/80 hover:border-orange-500 cursor-pointer transition-colors group overflow-hidden flex items-center justify-center'
                >
                  {profilePhoto ? (
                    <img
                      src={profilePhoto}
                      alt='Profile preview'
                      className='w-full h-full object-cover'
                    />
                  ) : (
                    <i className='fa-solid fa-camera text-3xl text-orange-400 group-hover:text-orange-400 transition-colors'></i>
                  )}
                  {/* Hover overlay */}
                  <div className='absolute inset-0 bg-navy-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity'>
                    <i className='fa-solid fa-camera text-2xl text-white'></i>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type='file'
                  accept='image/*'
                  onChange={handlePhotoChange}
                  className='hidden'
                />
                {profilePhoto && (
                  <button
                    type='button'
                    onClick={() => setProfilePhoto('')}
                    className='mt-2 text-xs text-red-400 hover:text-red-300 transition-colors'
                  >
                    Remove photo
                  </button>
                )}
                <p className='mt-1 text-xs text-navy-500'>Optional</p>
              </div>

              {/* Name Field */}
              <div>
                <label
                  htmlFor='name'
                  className='block text-sm font-medium text-orange-200 mb-2'
                >
                  Full Name
                </label>
                <div className='relative'>
                  <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                    <i className='fa-solid fa-user text-orange-400'></i>
                  </div>
                  <input
                    type='text'
                    id='name'
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className='
                      w-full pl-12 pr-4 py-3 rounded-lg
                      bg-navy-900/80 border-2 border-orange-500/30
                      text-white placeholder-navy-500
                      focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500
                      transition-colors
                      '
                    placeholder='John Doe'
                  />
                </div>
              </div>

              {/* Email Field */}
              <div>
                <label
                  htmlFor='email'
                  className='block text-sm font-medium text-orange-200 mb-2'
                >
                  Email Address
                </label>
                <div className='relative'>
                  <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                    <i className='fa-solid fa-envelope text-orange-400'></i>
                  </div>
                  <input
                    type='email'
                    id='email'
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className='
                      w-full pl-12 pr-4 py-3 rounded-lg
                      bg-navy-900/80 border-2 border-orange-500/30
                      text-white placeholder-navy-500
                      focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500
                      transition-colors
                      '
                    placeholder='you@example.com'
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className='block text-sm font-medium text-orange-200 mb-2'>
                  Account Type
                </label>
                <div className='grid grid-cols-3 gap-3'>
                  <button
                    type='button'
                    onClick={() => setFormData({ ...formData, role: 'trainer' })}
                    className={`
  p-4 rounded-lg border-2 transition-colors
                      ${
                        formData.role === 'trainer'
                          ? 'border-orange-500 bg-orange-500/20'
                          : 'border-orange-500/30 bg-navy-900/50 hover:border-orange-400/50'
                      }
                    `}
                  >
                    <span
                      className={`text-2xl mb-2 block ${
                        formData.role === 'trainer' ? 'text-orange-400' : 'text-navy-300'
                      }`}
                    >
                      <i className='fa-solid fa-chalkboard-user'></i>
                    </span>
                    <p
                      className={`font-semibold text-sm ${
                        formData.role === 'trainer' ? 'text-orange-300' : 'text-navy-200'
                      }`}
                    >
                      Trainer
                    </p>
                  </button>

                  <button
                    type='button'
                    onClick={() => setFormData({ ...formData, role: 'trainee' })}
                    className={`
  p-4 rounded-lg border-2 transition-colors
                      ${
                        formData.role === 'trainee'
                          ? 'border-orange-500 bg-orange-500/20'
                          : 'border-orange-500/30 bg-navy-900/50 hover:border-orange-400/50'
                      }
                    `}
                  >
                    <span
                      className={`text-2xl mb-2 block ${
                        formData.role === 'trainee' ? 'text-orange-400' : 'text-navy-300'
                      }`}
                    >
                      <i className='fa-solid fa-user-graduate'></i>
                    </span>
                    <p
                      className={`font-semibold text-sm ${
                        formData.role === 'trainee' ? 'text-orange-300' : 'text-navy-200'
                      }`}
                    >
                      Trainee
                    </p>
                  </button>

                  <button
                    type='button'
                    onClick={() => setFormData({ ...formData, role: 'visitor' })}
                    className={`
  p-4 rounded-lg border-2 transition-colors
                      ${
                        formData.role === 'visitor'
                          ? 'border-orange-500 bg-orange-500/20'
                          : 'border-orange-500/30 bg-navy-900/50 hover:border-orange-400/50'
                      }
                    `}
                  >
                    <span
                      className={`text-2xl mb-2 block ${
                        formData.role === 'visitor' ? 'text-orange-400' : 'text-navy-300'
                      }`}
                    >
                      <i className='fa-solid fa-id-card'></i>
                    </span>
                    <p
                      className={`font-semibold text-sm ${
                        formData.role === 'visitor' ? 'text-orange-300' : 'text-navy-200'
                      }`}
                    >
                      Visitor
                    </p>
                  </button>
                </div>
              </div>

              {/* Destination Field */}
              <div>
                <label
                  htmlFor='destination'
                  className='block text-sm font-medium text-orange-200 mb-2'
                >
                  Destination
                </label>
                <div className='relative'>
                  <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                    <i className='fa-solid fa-location-dot text-orange-400'></i>
                  </div>
                  <select
                    id='destination'
                    value={formData.destination}
                    onChange={(e) =>
                      setFormData({ ...formData, destination: e.target.value })
                    }
                    className='
                      w-full pl-12 pr-4 py-3 rounded-lg appearance-none
                      bg-navy-900/80 border-2 border-orange-500/30
                      text-white placeholder-navy-500
                      focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500
                      transition-colors
                      '
                  >
                    <option value=''>Select a destination</option>
                    {DESTINATIONS.map((destination) => (
                      <option
                        key={destination}
                        value={destination}
                        className='bg-navy-900'
                      >
                        {destination}
                      </option>
                    ))}
                  </select>
                  <i className='fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-navy-400 text-xs pointer-events-none'></i>
                </div>
                <p className='text-navy-400 text-xs mt-2'>
                  Where you are headed on your first visit.
                </p>
              </div>

              {/* Password Field */}
              <div>
                <label
                  htmlFor='password'
                  className='block text-sm font-medium text-orange-200 mb-2'
                >
                  Password
                </label>
                <div className='relative'>
                  <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                    <i className='fa-solid fa-lock text-orange-400'></i>
                  </div>
                  <input
                    type='password'
                    id='password'
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required
                    className='
                      w-full pl-12 pr-4 py-3 rounded-lg
                      bg-navy-900/80 border-2 border-orange-500/30
                      text-white placeholder-navy-500
                      focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500
                      transition-colors
                      '
                    placeholder='••••••••'
                  />
                </div>
              </div>

              {/* Confirm Password Field */}
              <div>
                <label
                  htmlFor='confirmPassword'
                  className='block text-sm font-medium text-orange-200 mb-2'
                >
                  Confirm Password
                </label>
                <div className='relative'>
                  <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                    <i className='fa-solid fa-lock text-orange-400'></i>
                  </div>
                  <input
                    type='password'
                    id='confirmPassword'
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confirmPassword: e.target.value,
                      })
                    }
                    required
                    className='
                      w-full pl-12 pr-4 py-3 rounded-lg
                      bg-navy-900/80 border-2 border-orange-500/30
                      text-white placeholder-navy-500
                      focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500
                      transition-colors
                      '
                    placeholder='••••••••'
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type='submit'
                disabled={loading}
                className='
                  w-full py-3 rounded-lg font-semibold text-paper
                  bg-orange-600 hover:bg-orange-700
                  transition-colors duration-150
                  disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2
                  border border-orange-500/50
                  '
              >
                {loading ? (
                  <>
                    <i className='fa-solid fa-spinner fa-spin'></i>
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <i className='fa-solid fa-user-plus'></i>
                    <span>Create Account</span>
                  </>
                )}
              </button>
            </form>

            {/* Login Link */}
            <div className='mt-6 text-center text-sm text-navy-300'>
              Already have an account?{' '}
              <Link
                href='/login'
                className='text-orange-400 hover:text-orange-300 font-semibold transition-colors'
              >
                Sign in
              </Link>
            </div>
          </div>

          {/* Back to Home */}
          <div className='mt-6 text-center'>
            <Link
              href='/'
              className='text-orange-300 hover:text-orange-200 text-sm flex items-center justify-center gap-2 transition-colors'
            >
              <i className='fa-solid fa-arrow-left'></i>
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
