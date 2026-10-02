'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';
import UserProfile from '@/components/UserProfile';
import QRCode from 'react-qr-code';

// Disable static generation for this page
export const dynamic = 'force-dynamic';

interface Room {
  id: string;
  name: string;
  floor: number;
  building: string;
  description?: string;
}

export default function RoomQRManagement() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [newRoom, setNewRoom] = useState({
    name: '',
    floor: 1,
    building: '',
    description: ''
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  // Predefined room list - you can modify this or make it dynamic
  const defaultRooms: Room[] = [
    { id: 'room-101', name: 'Room 101', floor: 1, building: 'Main Building', description: 'Computer Lab' },
    { id: 'room-102', name: 'Room 102', floor: 1, building: 'Main Building', description: 'Classroom' },
    { id: 'room-201', name: 'Room 201', floor: 2, building: 'Main Building', description: 'Conference Room' },
    { id: 'room-202', name: 'Room 202', floor: 2, building: 'Main Building', description: 'Study Hall' },
    { id: 'room-301', name: 'Room 301', floor: 3, building: 'Main Building', description: 'Library' },
    { id: 'lab-a1', name: 'Lab A1', floor: 1, building: 'Science Building', description: 'Chemistry Lab' },
    { id: 'lab-b1', name: 'Lab B1', floor: 1, building: 'Science Building', description: 'Physics Lab' },
    { id: 'auditorium', name: 'Auditorium', floor: 1, building: 'Main Building', description: 'Main Auditorium' },
    { id: 'cafeteria', name: 'Cafeteria', floor: 1, building: 'Student Center', description: 'Dining Area' },
    { id: 'gym', name: 'Gymnasium', floor: 1, building: 'Sports Complex', description: 'Main Gym' }
  ];

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      router.push('/login');
    } else {
      // Load rooms from localStorage or use defaults
      const savedRooms = localStorage.getItem('hyt-rooms');
      if (savedRooms) {
        setRooms(JSON.parse(savedRooms));
      } else {
        setRooms(defaultRooms);
        localStorage.setItem('hyt-rooms', JSON.stringify(defaultRooms));
      }
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || user?.role !== 'admin') {
    return null;
  }

  const generateQRData = (room: Room) => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return `${baseUrl}/visitor?room=${encodeURIComponent(room.id)}&name=${encodeURIComponent(room.name)}&floor=${room.floor}&building=${encodeURIComponent(room.building)}`;
  };

  const handleAddRoom = () => {
    if (!newRoom.name.trim() || !newRoom.building.trim()) return;

    const room: Room = {
      id: `room-${Date.now()}`,
      name: newRoom.name.trim(),
      floor: newRoom.floor,
      building: newRoom.building.trim(),
      description: newRoom.description.trim() || undefined
    };

    const updatedRooms = [...rooms, room];
    setRooms(updatedRooms);
    localStorage.setItem('hyt-rooms', JSON.stringify(updatedRooms));
    
    setNewRoom({ name: '', floor: 1, building: '', description: '' });
    setShowAddModal(false);
  };

  const handleDeleteRoom = (roomId: string) => {
    if (confirm('Are you sure you want to delete this room?')) {
      const updatedRooms = rooms.filter(room => room.id !== roomId);
      setRooms(updatedRooms);
      localStorage.setItem('hyt-rooms', JSON.stringify(updatedRooms));
      if (selectedRoom?.id === roomId) {
        setSelectedRoom(null);
      }
    }
  };

  const downloadQR = (room: Room) => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = 512;
    canvas.height = 512;

    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${room.name.replace(/\s+/g, '-')}-qr-code.png`;
            a.click();
            URL.revokeObjectURL(url);
          }
        });
      }
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const groupedRooms = rooms.reduce((acc, room) => {
    if (!acc[room.building]) {
      acc[room.building] = [];
    }
    acc[room.building].push(room);
    return acc;
  }, {} as Record<string, Room[]>);

  return (
    <div className='min-h-screen bg-navy-950'>
      {/* Header */}
      <header className='border-b border-navy-800 bg-navy-900/50 sticky top-0 z-50'>
        <div className='max-w-7xl mx-auto px-4 py-3 flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <Link href='/admin' className='flex items-center gap-3'>
              <div className='w-12 h-12 flex items-center justify-center overflow-hidden'>
                <img
                  src='/hyt_logo.png'
                  alt='HYT Logo'
                  className='w-full h-full object-contain'
                />
              </div>
              <div>
                <h1 className='text-white font-bold text-lg leading-none'>
                  HYT Wayfinder
                </h1>
                <p className='text-navy-300 text-xs mt-0.5'>Room QR Codes</p>
              </div>
            </Link>
          </div>

          <UserProfile />
        </div>
      </header>

      {/* Main Content */}
      <main className='max-w-7xl mx-auto px-4 py-5'>
        {/* Page Header */}
        <div className='flex items-center justify-between mb-8'>
          <div>
            <h2 className='text-3xl font-bold text-white mb-2'>Room QR Codes</h2>
            <p className='text-navy-300'>
              Generate and manage QR codes for different rooms
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className='bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors'
          >
            <i className='fa-solid fa-plus'></i>
            Add Room
          </button>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          {/* Rooms List */}
          <div className='glass-panel border-navy-800 rounded-lg p-6'>
            <h3 className='text-xl font-bold text-white mb-4'>Rooms</h3>
            <div className='space-y-4 max-h-96 overflow-y-auto'>
              {Object.entries(groupedRooms).map(([building, buildingRooms]) => (
                <div key={building}>
                  <h4 className='text-orange-400 font-semibold mb-2 text-sm uppercase tracking-wide'>
                    {building}
                  </h4>
                  <div className='space-y-2 mb-4'>
                    {buildingRooms.map((room) => (
                      <div
                        key={room.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedRoom?.id === room.id
                            ? 'bg-orange-500/20 border-orange-500/50'
                            : 'bg-navy-900/50 border-navy-800 hover:border-navy-700'
                        }`}
                        onClick={() => setSelectedRoom(room)}
                      >
                        <div className='flex items-center justify-between'>
                          <div>
                            <p className='text-white font-semibold'>{room.name}</p>
                            <p className='text-navy-300 text-sm'>
                              Floor {room.floor}
                              {room.description && ` • ${room.description}`}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRoom(room.id);
                            }}
                            className='text-navy-400 hover:text-red-400 transition-colors'
                          >
                            <i className='fa-solid fa-trash text-sm'></i>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {rooms.length === 0 && (
                <div className='text-center py-8'>
                  <i className='fa-solid fa-building text-navy-600 text-4xl mb-3'></i>
                  <p className='text-navy-300'>No rooms added yet</p>
                </div>
              )}
            </div>
          </div>

          {/* QR Code Display */}
          <div className='glass-panel border-navy-800 rounded-lg p-6'>
            <h3 className='text-xl font-bold text-white mb-4'>QR Code</h3>
            
            {selectedRoom ? (
              <div className='text-center space-y-4'>
                <div className='bg-white p-6 rounded-lg inline-block' ref={qrRef}>
                  <QRCode
                    value={generateQRData(selectedRoom)}
                    size={200}
                    level='M'
                  />
                </div>
                
                <div className='text-left'>
                  <h4 className='text-white font-semibold text-lg mb-2'>
                    {selectedRoom.name}
                  </h4>
                  <p className='text-navy-300 text-sm mb-1'>
                    <strong>Building:</strong> {selectedRoom.building}
                  </p>
                  <p className='text-navy-300 text-sm mb-1'>
                    <strong>Floor:</strong> {selectedRoom.floor}
                  </p>
                  {selectedRoom.description && (
                    <p className='text-navy-300 text-sm mb-1'>
                      <strong>Description:</strong> {selectedRoom.description}
                    </p>
                  )}
                </div>

                <div className='flex gap-3'>
                  <button
                    onClick={() => downloadQR(selectedRoom)}
                    className='flex-1 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors'
                  >
                    <i className='fa-solid fa-download'></i>
                    Download QR
                  </button>
                  
                  <button
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: `QR Code for ${selectedRoom.name}`,
                          text: `Visit ${selectedRoom.name} - ${selectedRoom.building}`,
                          url: generateQRData(selectedRoom)
                        });
                      } else {
                        navigator.clipboard.writeText(generateQRData(selectedRoom));
                        alert('QR code URL copied to clipboard!');
                      }
                    }}
                    className='flex-1 bg-navy-700 hover:bg-navy-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors'
                  >
                    <i className='fa-solid fa-share'></i>
                    Share
                  </button>
                </div>
                
                <div className='text-left bg-navy-900/50 p-3 rounded-lg'>
                  <p className='text-navy-300 text-xs mb-1'>QR Code URL:</p>
                  <p className='text-orange-400 text-xs break-all font-mono'>
                    {generateQRData(selectedRoom)}
                  </p>
                </div>
              </div>
            ) : (
              <div className='text-center py-12'>
                <i className='fa-solid fa-qrcode text-navy-600 text-5xl mb-4'></i>
                <p className='text-navy-300 text-lg'>Select a room to generate QR code</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add Room Modal */}
      {showAddModal && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
          <div className='glass-panel border-navy-800 rounded-lg p-6 max-w-md w-full'>
            <h3 className='text-xl font-bold text-white mb-4'>Add New Room</h3>
            
            <div className='space-y-4'>
              <div>
                <label className='block text-navy-300 text-sm font-semibold mb-2'>
                  Room Name *
                </label>
                <input
                  type='text'
                  value={newRoom.name}
                  onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                  className='w-full bg-navy-900/50 border border-navy-700 rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none'
                  placeholder='e.g., Room 101'
                />
              </div>

              <div>
                <label className='block text-navy-300 text-sm font-semibold mb-2'>
                  Building *
                </label>
                <input
                  type='text'
                  value={newRoom.building}
                  onChange={(e) => setNewRoom({ ...newRoom, building: e.target.value })}
                  className='w-full bg-navy-900/50 border border-navy-700 rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none'
                  placeholder='e.g., Main Building'
                />
              </div>

              <div>
                <label className='block text-navy-300 text-sm font-semibold mb-2'>
                  Floor
                </label>
                <input
                  type='number'
                  value={newRoom.floor}
                  onChange={(e) => setNewRoom({ ...newRoom, floor: parseInt(e.target.value) || 1 })}
                  className='w-full bg-navy-900/50 border border-navy-700 rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none'
                  min='1'
                />
              </div>

              <div>
                <label className='block text-navy-300 text-sm font-semibold mb-2'>
                  Description
                </label>
                <input
                  type='text'
                  value={newRoom.description}
                  onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
                  className='w-full bg-navy-900/50 border border-navy-700 rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none'
                  placeholder='e.g., Computer Lab'
                />
              </div>
            </div>

            <div className='flex gap-3 mt-6'>
              <button
                onClick={() => setShowAddModal(false)}
                className='flex-1 bg-navy-700 hover:bg-navy-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors'
              >
                Cancel
              </button>
              <button
                onClick={handleAddRoom}
                disabled={!newRoom.name.trim() || !newRoom.building.trim()}
                className='flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-navy-700 disabled:text-navy-400 text-white px-4 py-2 rounded-lg font-semibold transition-colors'
              >
                Add Room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}