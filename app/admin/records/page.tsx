'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useRecordsStore } from '@/store/recordsStore';
import Link from 'next/link';
import UserProfile from '@/components/UserProfile';

export default function RecordsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { records, fetchRecords } = useRecordsStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      router.push('/login');
    } else {
      // Fetch all records when component mounts
      fetchRecords();
    }
  }, [isAuthenticated, user, router, fetchRecords]);

  if (!isAuthenticated || user?.role !== 'admin') {
    return null;
  }

  // Filter records
  const filteredRecords = records.filter((record) => {
    const matchesSearch =
      record.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.room.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <>
      <div className="min-h-screen bg-slate-950">
        {/* Header */}
        <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="flex items-center gap-3">
                <div className="w-12 h-12 flex items-center justify-center overflow-hidden">
                  <img src="/hyt_logo.png" alt="HYT Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h1 className="text-white font-bold text-lg leading-none">Clock-In Records</h1>
                  <p className="text-slate-400 text-xs mt-0.5">All check-in/check-out logs</p>
                </div>
              </Link>
            </div>

            <UserProfile />
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-6">
            <Link
              href="/admin"
              className="text-slate-400 hover:text-slate-300 flex items-center gap-2 transition-colors"
            >
              <i className="fa-solid fa-arrow-left"></i>
              <span>Back to Dashboard</span>
            </Link>

            <button
              className="px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 transition-all flex items-center gap-2"
            >
              <i className="fa-solid fa-download"></i>
              Export CSV
            </button>
          </div>

          {/* Filters */}
          <div className="glass-panel border-slate-800 rounded-2xl p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Search</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <i className="fa-solid fa-magnifying-glass text-slate-500"></i>
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name, destination, or room..."
                    className="
                      w-full pl-12 pr-4 py-3 rounded-lg
                      bg-slate-900/50 border border-slate-700
                      text-white placeholder-slate-500
                      focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500
                      transition-all
                    "
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
                <div className="flex gap-2">
                  {(['all', 'active', 'completed'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`
                        flex-1 px-4 py-3 rounded-lg font-semibold text-sm transition-all
                        ${
                          statusFilter === status
                            ? 'bg-cyan-500/20 text-cyan-300 border-2 border-cyan-500'
                            : 'bg-slate-900/50 text-slate-400 border-2 border-slate-700 hover:border-slate-600'
                        }
                      `}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Records Table */}
          <div className="glass-panel border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900/50 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Destination
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Time In
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Time Out
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredRecords.map((record) => (
                    <tr
                      key={record.id}
                      className="hover:bg-slate-900/30 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                            <i className="fa-solid fa-user text-cyan-400"></i>
                          </div>
                          <div>
                            <p className="text-white font-semibold">{record.userName || 'User ' + record.userId.slice(0, 8)}</p>
                            <p className="text-slate-500 text-xs">{record.userId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30"
                        >
                          User
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-white font-medium">{record.destination}</p>
                        <p className="text-slate-400 text-sm">
                          {record.building} • {record.room}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-300">
                        {record.timeIn.toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-300">
                        {record.timeOut
                          ? record.timeOut.toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-300">
                        {record.duration || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                            record.status === 'active'
                              ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredRecords.length === 0 && (
                <div className="text-center py-16">
                  <i className="fa-solid fa-inbox text-slate-600 text-5xl mb-4"></i>
                  <p className="text-slate-400 text-lg">No records found</p>
                  <p className="text-slate-500 text-sm mt-1">Try adjusting your filters</p>
                </div>
              )}
            </div>
          </div>

          {/* Results Summary */}
          <div className="mt-4 text-center text-slate-400 text-sm">
            Showing {filteredRecords.length} of {records.length} records
          </div>
        </main>
      </div>
    </>
  );
}
