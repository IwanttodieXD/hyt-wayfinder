import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export interface ClockInRecord {
  id: string;
  userId: string;
  userName?: string; // Fetched via join
  destination: string;
  building: string;
  room: string;
  timeIn: Date;
  timeOut: Date | null;
  status: 'active' | 'completed';
  duration?: string;
  scheduleId?: string | null;
}

interface RecordsState {
  records: ClockInRecord[];
  isLoading: boolean;
  
  // Actions
  addRecord: (record: Omit<ClockInRecord, 'id' | 'status' | 'timeOut' | 'duration' | 'scheduleId'>) => Promise<{ success: boolean; error?: string; recordId?: string }>;
  clockOutRecord: (recordId: string) => Promise<{ success: boolean; error?: string }>;
  getActiveCount: () => number;
  getTodayCount: () => number;
  getCompletedTodayCount: () => number;
  getAllRecords: () => ClockInRecord[];
  getRecordsByDate: (date: Date) => ClockInRecord[];
  fetchRecords: () => Promise<void>;
  fetchTodayRecords: () => Promise<void>;
}

function calculateDuration(timeIn: Date, timeOut: Date): string {
  const diff = timeOut.getTime() - timeIn.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

export const useRecordsStore = create<RecordsState>((set, get) => ({
  records: [],
  isLoading: false,

  addRecord: async (data) => {
    set({ isLoading: true });
    
    try {
      const { data: recordData, error } = await supabase
        .from('clock_in_records')
        .insert([
          {
            user_id: data.userId,
            destination: data.destination,
            building: data.building,
            room: data.room,
            time_in: data.timeIn.toISOString(),
            status: 'active',
          },
        ])
        .select()
        .single();

      if (error) {
        set({ isLoading: false });
        return { success: false, error: error.message };
      }

      if (recordData) {
        const newRecord: ClockInRecord = {
          id: recordData.id,
          userId: recordData.user_id,
          destination: recordData.destination,
          building: recordData.building,
          room: recordData.room,
          timeIn: new Date(recordData.time_in),
          timeOut: recordData.time_out ? new Date(recordData.time_out) : null,
          status: recordData.status as 'active' | 'completed',
          duration: recordData.duration || undefined,
          scheduleId: recordData.schedule_id || undefined,
        };

        set((state) => ({
          records: [newRecord, ...state.records],
          isLoading: false
        }));

        return { success: true, recordId: recordData.id };
      }

      return { success: true };
    } catch (error) {
      set({ isLoading: false });
      return { success: false, error: 'An unexpected error occurred' };
    }
  },

  clockOutRecord: async (recordId) => {
    set({ isLoading: true });
    
    try {
      const timeOut = new Date();

      // The duration needs the original time_in. Prefer the in-memory row, but
      // fall back to reading it from the database: after a page refresh this
      // store starts empty, and bailing out with "Record not found" would
      // leave the row stuck on 'active' forever.
      let timeIn = get().records.find((r) => r.id === recordId)?.timeIn;

      if (!timeIn) {
        const { data, error: lookupError } = await supabase
          .from('clock_in_records')
          .select('time_in')
          .eq('id', recordId)
          .maybeSingle();

        if (lookupError) {
          set({ isLoading: false });
          return { success: false, error: lookupError.message };
        }

        if (!data) {
          set({ isLoading: false });
          return { success: false, error: 'This clock-in record no longer exists.' };
        }

        timeIn = new Date(data.time_in);
      }

      const duration = calculateDuration(timeIn, timeOut);

      const { error } = await supabase
        .from('clock_in_records')
        .update({
          time_out: timeOut.toISOString(),
          status: 'completed',
          duration,
        })
        .eq('id', recordId);

      if (error) {
        set({ isLoading: false });
        return { success: false, error: error.message };
      }

      set((state) => ({
        records: state.records.map((r) => {
          if (r.id === recordId) {
            return {
              ...r,
              timeOut,
              status: 'completed' as const,
              duration,
            };
          }
          return r;
        }),
        isLoading: false,
      }));

      return { success: true };
    } catch (error) {
      set({ isLoading: false });
      return { success: false, error: 'An unexpected error occurred' };
    }
  },

  getActiveCount: () => {
    return get().records.filter((r) => r.status === 'active').length;
  },

  getTodayCount: () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return get().records.filter((r) => {
      const recordDate = new Date(r.timeIn);
      recordDate.setHours(0, 0, 0, 0);
      return recordDate.getTime() === today.getTime();
    }).length;
  },

  getCompletedTodayCount: () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return get().records.filter((r) => {
      const recordDate = new Date(r.timeIn);
      recordDate.setHours(0, 0, 0, 0);
      return (
        recordDate.getTime() === today.getTime() &&
        r.status === 'completed'
      );
    }).length;
  },

  getAllRecords: () => {
    return get().records;
  },

  getRecordsByDate: (date) => {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    return get().records.filter((r) => {
      const recordDate = new Date(r.timeIn);
      recordDate.setHours(0, 0, 0, 0);
      return recordDate.getTime() === targetDate.getTime();
    });
  },

  fetchRecords: async () => {
    set({ isLoading: true });

    try {
      const { data, error } = await supabase
        .from('clock_in_records')
        .select(`
          *,
          users:user_id (
            name
          )
        `)
        .order('time_in', { ascending: false });

      if (error) {
        console.error('Error fetching records:', error);
        set({ isLoading: false });
        return;
      }

      if (data) {
        const records: ClockInRecord[] = data.map((record: any) => ({
          id: record.id,
          userId: record.user_id,
          userName: record.users?.name || 'Unknown User',
          destination: record.destination,
          building: record.building,
          room: record.room,
          timeIn: new Date(record.time_in),
          timeOut: record.time_out ? new Date(record.time_out) : null,
          status: record.status as 'active' | 'completed',
          duration: record.duration || undefined,
          scheduleId: record.schedule_id || undefined,
        }));

        set({ records, isLoading: false });
      }
    } catch (error) {
      console.error('Error fetching records:', error);
      set({ isLoading: false });
    }
  },

  fetchTodayRecords: async () => {
    set({ isLoading: true });

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const { data, error } = await supabase
        .from('clock_in_records')
        .select(`
          *,
          users:user_id (
            name
          )
        `)
        .gte('time_in', todayISO)
        .order('time_in', { ascending: false });

      if (error) {
        console.error('Error fetching today records:', error);
        set({ isLoading: false });
        return;
      }

      if (data) {
        const records: ClockInRecord[] = data.map((record: any) => ({
          id: record.id,
          userId: record.user_id,
          userName: record.users?.name || 'Unknown User',
          destination: record.destination,
          building: record.building,
          room: record.room,
          timeIn: new Date(record.time_in),
          timeOut: record.time_out ? new Date(record.time_out) : null,
          status: record.status as 'active' | 'completed',
          duration: record.duration || undefined,
          scheduleId: record.schedule_id || undefined,
        }));

        set({ records, isLoading: false });
      }
    } catch (error) {
      console.error('Error fetching today records:', error);
      set({ isLoading: false });
    }
  },
}));
