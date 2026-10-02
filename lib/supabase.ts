import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types matching your Supabase schema
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          role: 'admin' | 'trainer' | 'trainee' | 'visitor';
          avatar: string | null;
          destination: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          role?: 'admin' | 'trainer' | 'trainee' | 'visitor';
          avatar?: string | null;
          destination?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string;
          name?: string;
          role?: 'admin' | 'trainer' | 'trainee' | 'visitor';
          avatar?: string | null;
          destination?: string | null;
          updated_at?: string;
        };
      };
      schedules: {
        Row: {
          id: string;
          user_id: string;
          destination: string;
          building: string;
          room: string;
          scheduled_start: string;
          scheduled_end: string;
          status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          destination: string;
          building: string;
          room: string;
          scheduled_start: string;
          scheduled_end: string;
          status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          destination?: string;
          building?: string;
          room?: string;
          scheduled_start?: string;
          scheduled_end?: string;
          status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
          notes?: string | null;
          updated_at?: string;
        };
      };
      clock_in_records: {
        Row: {
          id: string;
          user_id: string;
          destination: string;
          building: string;
          room: string;
          time_in: string;
          time_out: string | null;
          status: 'active' | 'completed';
          duration: string | null;
          created_at: string;
          updated_at: string;
          schedule_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          destination: string;
          building: string;
          room: string;
          time_in?: string;
          time_out?: string | null;
          status?: 'active' | 'completed';
          duration?: string | null;
          created_at?: string;
          updated_at?: string;
          schedule_id?: string | null;
        };
        Update: {
          time_out?: string | null;
          status?: 'active' | 'completed';
          duration?: string | null;
          updated_at?: string;
          schedule_id?: string | null;
        };
      };
    };
  };
}
