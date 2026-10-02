'use client';

import { useState, useEffect } from 'react';
import { useClockInStore } from '@/store/clockInStore';
import { useAuthStore } from '@/store/authStore';
import { useRecordsStore } from '@/store/recordsStore';
import QRCode from 'react-qr-code';

interface Room {
  id: string;
  name: string;
  floor: number;
  building: string;
  description?: string;
}

export default function KioskStationView() {
  const { student } = useClockInStore();
  const { user } = useAuthStore();
  const { getActiveCount, getCompletedTodayCount, fetchTodayRecords } =
    useRecordsStore();
  
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  // Load today's records so the active/on-break counts are live
  useEffect(() => {
    fetchTodayRecords();
  }, [fetchTodayRecords]);

  // Load rooms from localStorage
  useEffect(() => {
    const savedRooms = localStorage.getItem('hyt-rooms');
    if (savedRooms) {
      const loadedRooms = JSON.parse(savedRooms);
      setRooms(loadedRooms);
      if (loadedRooms.length > 0) {
        setSelectedRoom(loadedRooms[0]); // Select first room by default
      }
    } else {
      // Default rooms if none saved
      const defaultRooms: Room[] = [
        { id: 'room-101', name: 'Room 101', floor: 1, building: 'Main Building', description: 'Computer Lab' },
        { id: 'room-102', name: 'Room 102', floor: 1, building: 'Main Building', description: 'Classroom' },
        { id: 'room-201', name: 'Room 201', floor: 2, building: 'Main Building', description: 'Conference Room' },
        { id: 'auditorium', name: 'Auditorium', floor: 1, building: 'Main Building', description: 'Main Auditorium' },
        { id: 'cafeteria', name: 'Cafeteria', floor: 1, building: 'Student Center', description: 'Dining Area' }
      ];
      setRooms(defaultRooms);
      setSelectedRoom(defaultRooms[0]);
    }
  }, []);

  const generateQRData = (room: Room) => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return `${baseUrl}/visitor?room=${encodeURIComponent(room.id)}&name=${encodeURIComponent(room.name)}&floor=${room.floor}&building=${encodeURIComponent(room.building)}`;
  };

  const activeCount = getActiveCount();
  const onBreakCount = getCompletedTodayCount();

  return (
    <div className='w-full min-h-full bg-navy-950 p-8'>
      <div className='max-w-7xl mx-auto'>
        {/* Header */}
        <div className='mb-8'>
          <div className='flex items-center justify-between mb-4'>
            <div>
              <h1 className='text-3xl font-bold text-white mb-2'>Attendance Station</h1>
              <p className='text-navy-300'>Ground Floor · Attendance Station</p>
            </div>
            <div className='flex items-center gap-3 px-4 py-3 rounded-lg bg-green-500/20 border border-green-500/30'>
              <div className='w-3 h-3 rounded-full bg-green-400 animate-pulse'></div>
              <span className='text-green-300 font-bold text-lg uppercase tracking-wider'>
                Station Active
              </span>
            </div>
          </div>

          {/* Live Stats Bar */}
          <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
            <div className='glass-panel border-navy-800 p-6 rounded-lg'>
              <div className='flex items-center gap-3'>
                <div className='w-14 h-14 rounded-lg bg-orange-500/20 flex items-center justify-center'>
                  <i className='fa-solid fa-users text-orange-400 text-2xl'></i>
                </div>
                <div>
                  <p className='text-navy-300 text-sm mb-1'>Active Users</p>
                  <p className='text-white text-3xl font-bold'>{activeCount}</p>
                </div>
              </div>
            </div>

            <div className='glass-panel border-navy-800 p-6 rounded-lg'>
              <div className='flex items-center gap-3'>
                <div className='w-14 h-14 rounded-lg bg-orange-500/20 flex items-center justify-center'>
                  <i className='fa-solid fa-mug-hot text-orange-400 text-2xl'></i>
                </div>
                <div>
                  <p className='text-navy-300 text-sm mb-1'>Clock Out</p>
                  <p className='text-white text-3xl font-bold'>{onBreakCount}</p>
                </div>
              </div>
            </div>

            <div className='glass-panel border-navy-800 p-6 rounded-lg'>
              <div className='flex items-center gap-3'>
                <div className='w-14 h-14 rounded-lg bg-green-500/20 flex items-center justify-center'>
                  <i className='fa-solid fa-clock text-green-400 text-2xl'></i>
                </div>
                <div>
                  <p className='text-navy-300 text-sm mb-1'>Current Time</p>
                  <p className='text-white text-3xl font-bold'>
                    {new Date().toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className='grid grid-cols-1 xl:grid-cols-3 gap-3'>
          {/* QR Code Panel */}
          <div className='glass-panel border-navy-800 p-8 rounded-lg'>
            <div className='text-center mb-6'>
              <div className='inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/30 mb-4'>
                <i className='fa-solid fa-qrcode text-orange-400'></i>
                <span className='text-orange-300 font-semibold text-sm uppercase tracking-wider'>
                  Check-In
                </span>
              </div>
              <h2 className='text-2xl font-bold text-white mb-2'>Scan to Clock In</h2>
              <p className='text-navy-300'>Use your mobile app to scan this QR code</p>
            </div>

            {/* Large QR Code - the white block is centered so the code sits in the
                middle of the panel instead of hugging the left edge. */}
            <div className='flex justify-center mb-6'>
              {/* Fixed max width so the `width: 100%` on the QR resolves to a
                  real 256px box, which is what lets the centering work. */}
              <div className='bg-paper p-8 rounded-lg w-full max-w-[288px]'>
                <QRCode
                  value='HYT-KIOSK-01-CHECKIN-STATION'
                  size={256}
                  style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                  viewBox={`0 0 256 256`}
                />
              </div>
            </div>

            <div className='space-y-3'>
              <div className='flex items-start gap-3 text-sm'>
                <div className='w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 mt-0.5'>
                  <span className='text-orange-400 font-bold text-xs'>1</span>
                </div>
                <p className='text-navy-200'>Open the HYT-Wayfinder website</p>
              </div>
              <div className='flex items-start gap-3 text-sm'>
                <div className='w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 mt-0.5'>
                  <span className='text-orange-400 font-bold text-xs'>2</span>
                </div>
                <p className='text-navy-200'>Position QR code within the scanner frame</p>
              </div>
              <div className='flex items-start gap-3 text-sm'>
                <div className='w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 mt-0.5'>
                  <span className='text-orange-400 font-bold text-xs'>3</span>
                </div>
                <p className='text-navy-200'>
                  Receive your 3D route to your assigned room
                </p>
              </div>
            </div>
          </div>

          {/* Room Selection Panel */}
          <div className='glass-panel border-navy-800 p-6 rounded-lg'>
            <div className='mb-6'>
              <div className='inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/30 mb-4'>
                <i className='fa-solid fa-building text-blue-400'></i>
                <span className='text-blue-300 font-semibold text-sm uppercase tracking-wider'>
                  Room Selection
                </span>
              </div>
              <h3 className='text-xl font-bold text-white mb-2'>Available Rooms</h3>
              <p className='text-navy-300 text-sm'>Select a room to display its QR code</p>
            </div>

            <div className='space-y-2 max-h-96 overflow-y-auto'>
              {rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoom(room)}
                  className={`w-full p-3 rounded-lg border text-left transition-all ${
                    selectedRoom?.id === room.id
                      ? 'bg-blue-500/20 border-blue-500/50 text-white'
                      : 'bg-navy-900/50 border-navy-700 text-navy-200 hover:border-navy-600 hover:bg-navy-800/50'
                  }`}
                >
                  <div className='font-semibold text-sm'>{room.name}</div>
                  <div className='text-xs opacity-75'>
                    {room.building} • Floor {room.floor}
                    {room.description && ` • ${room.description}`}
                  </div>
                </button>
              ))}
              
              {rooms.length === 0 && (
                <div className='text-center py-8'>
                  <i className='fa-solid fa-building text-navy-600 text-3xl mb-2'></i>
                  <p className='text-navy-400 text-sm'>No rooms available</p>
                </div>
              )}
            </div>
          </div>

          {/* Room QR Code Panel */}
          <div className='glass-panel border-navy-800 p-8 rounded-lg'>
            {selectedRoom ? (
              <>
                <div className='text-center mb-6'>
                  <div className='inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/30 mb-4'>
                    <i className='fa-solid fa-location-dot text-green-400'></i>
                    <span className='text-green-300 font-semibold text-sm uppercase tracking-wider'>
                      Room QR
                    </span>
                  </div>
                  <h3 className='text-xl font-bold text-white mb-1'>{selectedRoom.name}</h3>
                  <p className='text-navy-300 text-sm mb-1'>{selectedRoom.building}</p>
                  <p className='text-navy-400 text-xs'>Floor {selectedRoom.floor}</p>
                </div>

                <div className='flex justify-center mb-6'>
                  <div className='bg-paper p-6 rounded-lg w-full max-w-[240px]'>
                    <QRCode
                      value={generateQRData(selectedRoom)}
                      size={200}
                      style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                      viewBox={`0 0 200 200`}
                    />
                  </div>
                </div>

                <div className='space-y-2 text-center'>
                  <p className='text-navy-300 text-sm'>
                    Scan to navigate to {selectedRoom.name}
                  </p>
                  {selectedRoom.description && (
                    <p className='text-navy-400 text-xs'>
                      {selectedRoom.description}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className='text-center py-12'>
                <i className='fa-solid fa-qrcode text-navy-600 text-4xl mb-4'></i>
                <h3 className='text-white font-semibold mb-2'>No Room Selected</h3>
                <p className='text-navy-300 text-sm'>
                  Choose a room from the list to display its QR code
                </p>
              </div>
            )}
          </div>

          {/* Webcam scanner hidden for the admin station. The admin uses this
              screen to monitor attendance, not to scan personal QR codes. */}
        </div>

        {/* Footer Info */}
        <div className='mt-8 text-center text-navy-500 text-sm'>
          <p>HYT Global Institute · Visitor Management System v2.0</p>
          <p className='mt-1'>For assistance, contact Security Desk: Ext. 1100</p>
        </div>
      </div>
    </div>
  );
}
