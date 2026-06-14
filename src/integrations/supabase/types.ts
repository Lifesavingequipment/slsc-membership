export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      carpool_passengers: {
        Row: {
          assigned_at: string
          carpool_id: string
          id: string
          notes: string | null
          pickup_location: string | null
          session_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          carpool_id: string
          id?: string
          notes?: string | null
          pickup_location?: string | null
          session_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          carpool_id?: string
          id?: string
          notes?: string | null
          pickup_location?: string | null
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "carpool_passengers_carpool_id_fkey"
            columns: ["carpool_id"]
            isOneToOne: false
            referencedRelation: "carpools"
            referencedColumns: ["id"]
          },
        ]
      }
      carpool_requests: {
        Row: {
          club_id: string
          created_at: string
          id: string
          notes: string | null
          pickup_location: string
          preferred_time: string | null
          session_id: string
          status: Database["public"]["Enums"]["carpool_request_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          notes?: string | null
          pickup_location: string
          preferred_time?: string | null
          session_id: string
          status?: Database["public"]["Enums"]["carpool_request_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          pickup_location?: string
          preferred_time?: string | null
          session_id?: string
          status?: Database["public"]["Enums"]["carpool_request_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      carpools: {
        Row: {
          available_seats: number
          can_tow_trailer: boolean
          club_id: string
          created_at: string
          departure_location: string
          departure_time: string
          driver_user_id: string
          id: string
          notes: string | null
          session_id: string
          status: Database["public"]["Enums"]["carpool_status"]
          updated_at: string
          vehicle_name: string
        }
        Insert: {
          available_seats: number
          can_tow_trailer?: boolean
          club_id: string
          created_at?: string
          departure_location: string
          departure_time: string
          driver_user_id: string
          id?: string
          notes?: string | null
          session_id: string
          status?: Database["public"]["Enums"]["carpool_status"]
          updated_at?: string
          vehicle_name: string
        }
        Update: {
          available_seats?: number
          can_tow_trailer?: boolean
          club_id?: string
          created_at?: string
          departure_location?: string
          departure_time?: string
          driver_user_id?: string
          id?: string
          notes?: string | null
          session_id?: string
          status?: Database["public"]["Enums"]["carpool_status"]
          updated_at?: string
          vehicle_name?: string
        }
        Relationships: []
      }
      club_invite_codes: {
        Row: {
          active: boolean
          club_id: string
          code: string
          created_at: string
          created_by: string | null
          id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          club_id: string
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          club_id?: string
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      club_memberships: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          club_id: string
          id: string
          requested_at: string
          status: Database["public"]["Enums"]["membership_status"]
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          club_id: string
          id?: string
          requested_at?: string
          status?: Database["public"]["Enums"]["membership_status"]
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          club_id?: string
          id?: string
          requested_at?: string
          status?: Database["public"]["Enums"]["membership_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_memberships_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          location: string | null
          logo_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          location?: string | null
          logo_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          location?: string | null
          logo_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      equipment: {
        Row: {
          category: string | null
          club_id: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          notes: string | null
          serial_number: string | null
          status: Database["public"]["Enums"]["equipment_status"]
          updated_at: string
        }
        Insert: {
          category?: string | null
          club_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          notes?: string | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["equipment_status"]
          updated_at?: string
        }
        Update: {
          category?: string | null
          club_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          notes?: string | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["equipment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_faults: {
        Row: {
          club_id: string
          created_at: string
          description: string
          equipment_id: string | null
          equipment_name: string | null
          id: string
          reported_at: string
          reported_by: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["fault_status"]
          title: string | null
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          description: string
          equipment_id?: string | null
          equipment_name?: string | null
          id?: string
          reported_at?: string
          reported_by: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["fault_status"]
          title?: string | null
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          description?: string
          equipment_id?: string | null
          equipment_name?: string | null
          id?: string
          reported_at?: string
          reported_by?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["fault_status"]
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_faults_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_faults_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_list_items: {
        Row: {
          category: string
          created_at: string
          id: string
          list_id: string
          name: string
          quantity: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          list_id: string
          name: string
          quantity?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          list_id?: string
          name?: string
          quantity?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "equipment_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_list_packed: {
        Row: {
          item_id: string
          packed_at: string
          packed_by: string
        }
        Insert: {
          item_id: string
          packed_at?: string
          packed_by: string
        }
        Update: {
          item_id?: string
          packed_at?: string
          packed_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_list_packed_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "equipment_list_items"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_lists: {
        Row: {
          club_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      locations: {
        Row: {
          address: string | null
          club_id: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          club_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          club_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      member_emergency_contacts: {
        Row: {
          club_id: string
          created_at: string
          email: string | null
          id: string
          is_primary: boolean
          name: string
          phone: string
          relationship: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name: string
          phone: string
          relationship?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name?: string
          phone?: string
          relationship?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      member_medical_info: {
        Row: {
          allergies: string | null
          blood_type: string | null
          club_id: string
          conditions: string | null
          created_at: string
          id: string
          medications: string | null
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allergies?: string | null
          blood_type?: string | null
          club_id: string
          conditions?: string | null
          created_at?: string
          id?: string
          medications?: string | null
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allergies?: string | null
          blood_type?: string | null
          club_id?: string
          conditions?: string | null
          created_at?: string
          id?: string
          medications?: string | null
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      member_partners: {
        Row: {
          club_id: string
          created_at: string
          created_by: string | null
          crew_id: string
          driver_id: string
          id: string
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          created_by?: string | null
          crew_id: string
          driver_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          created_by?: string | null
          crew_id?: string
          driver_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_partners_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_partners_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_partners_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_partners_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      member_preferences: {
        Row: {
          created_at: string
          notify_carpool_pending: boolean
          notify_carpool_updates: boolean
          notify_equipment: boolean
          notify_fault_reports: boolean
          notify_join_requests: boolean
          notify_new_sessions: boolean
          notify_session_reminders: boolean
          settings_section_order: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          notify_carpool_pending?: boolean
          notify_carpool_updates?: boolean
          notify_equipment?: boolean
          notify_fault_reports?: boolean
          notify_join_requests?: boolean
          notify_new_sessions?: boolean
          notify_session_reminders?: boolean
          settings_section_order?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          notify_carpool_pending?: boolean
          notify_carpool_updates?: boolean
          notify_equipment?: boolean
          notify_fault_reports?: boolean
          notify_join_requests?: boolean
          notify_new_sessions?: boolean
          notify_session_reminders?: boolean
          settings_section_order?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_owners: {
        Row: {
          created_at: string
          granted_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age_division: Database["public"]["Enums"]["age_division"] | null
          avatar_url: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          gender: string | null
          id: string
          last_name: string | null
          nationality: string | null
          passport_expiry: string | null
          passport_number: string | null
          phone: string | null
          preferred_roles: string[]
          updated_at: string
        }
        Insert: {
          age_division?: Database["public"]["Enums"]["age_division"] | null
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          gender?: string | null
          id: string
          last_name?: string | null
          nationality?: string | null
          passport_expiry?: string | null
          passport_number?: string | null
          phone?: string | null
          preferred_roles?: string[]
          updated_at?: string
        }
        Update: {
          age_division?: Database["public"]["Enums"]["age_division"] | null
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          last_name?: string | null
          nationality?: string | null
          passport_expiry?: string | null
          passport_number?: string | null
          phone?: string | null
          preferred_roles?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      session_attendance: {
        Row: {
          created_at: string
          id: string
          marked_at: string
          marked_by: string | null
          note: string | null
          session_id: string
          status: Database["public"]["Enums"]["attendance_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          marked_at?: string
          marked_by?: string | null
          note?: string | null
          session_id: string
          status: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          marked_at?: string
          marked_by?: string | null
          note?: string | null
          session_id?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_attendance_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      session_club_vehicles: {
        Row: {
          can_tow: boolean
          club_id: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          pickup_location: string | null
          seats: number
          session_id: string
          updated_at: string
        }
        Insert: {
          can_tow?: boolean
          club_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          pickup_location?: string | null
          seats?: number
          session_id: string
          updated_at?: string
        }
        Update: {
          can_tow?: boolean
          club_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          pickup_location?: string | null
          seats?: number
          session_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      session_draw_configs: {
        Row: {
          created_at: string
          lanes_count: number
          session_id: string
          updated_at: string
          updated_by: string | null
          waves_count: number
        }
        Insert: {
          created_at?: string
          lanes_count?: number
          session_id: string
          updated_at?: string
          updated_by?: string | null
          waves_count?: number
        }
        Update: {
          created_at?: string
          lanes_count?: number
          session_id?: string
          updated_at?: string
          updated_by?: string | null
          waves_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "session_draw_configs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_draw_configs_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      session_equipment: {
        Row: {
          checked: boolean
          checked_at: string | null
          checked_by: string | null
          created_at: string
          equipment_id: string
          id: string
          notes: string | null
          session_id: string
          updated_at: string
        }
        Insert: {
          checked?: boolean
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string
          equipment_id: string
          id?: string
          notes?: string | null
          session_id: string
          updated_at?: string
        }
        Update: {
          checked?: boolean
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string
          equipment_id?: string
          id?: string
          notes?: string | null
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_equipment_checked_by_fkey"
            columns: ["checked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      session_rsvps: {
        Row: {
          created_at: string
          id: string
          note: string | null
          session_id: string
          status: Database["public"]["Enums"]["rsvp_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          session_id: string
          status?: Database["public"]["Enums"]["rsvp_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          session_id?: string
          status?: Database["public"]["Enums"]["rsvp_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_rsvps_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_teams: {
        Row: {
          created_at: string
          crew_id: string | null
          driver_id: string | null
          id: string
          lane: number | null
          notes: string | null
          patient_id: string | null
          session_id: string
          updated_at: string
          wave: number | null
          wave_name: string | null
        }
        Insert: {
          created_at?: string
          crew_id?: string | null
          driver_id?: string | null
          id?: string
          lane?: number | null
          notes?: string | null
          patient_id?: string | null
          session_id: string
          updated_at?: string
          wave?: number | null
          wave_name?: string | null
        }
        Update: {
          created_at?: string
          crew_id?: string | null
          driver_id?: string | null
          id?: string
          lane?: number | null
          notes?: string | null
          patient_id?: string | null
          session_id?: string
          updated_at?: string
          wave?: number | null
          wave_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_teams_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_teams_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_teams_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          capacity: number | null
          carpool_enabled: boolean
          carpool_pickups: string[]
          club_id: string
          created_at: string
          created_by: string | null
          ends_at: string | null
          format: Database["public"]["Enums"]["session_format"]
          id: string
          location: string | null
          location_id: string | null
          notes: string | null
          repeat_frequency: Database["public"]["Enums"]["repeat_frequency"]
          rsvp_deadline: string | null
          session_type: Database["public"]["Enums"]["session_type"]
          starts_at: string
          survey_enabled: boolean
          title: string
          trailers_required: number
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          carpool_enabled?: boolean
          carpool_pickups?: string[]
          club_id: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          format?: Database["public"]["Enums"]["session_format"]
          id?: string
          location?: string | null
          location_id?: string | null
          notes?: string | null
          repeat_frequency?: Database["public"]["Enums"]["repeat_frequency"]
          rsvp_deadline?: string | null
          session_type?: Database["public"]["Enums"]["session_type"]
          starts_at: string
          survey_enabled?: boolean
          title: string
          trailers_required?: number
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          carpool_enabled?: boolean
          carpool_pickups?: string[]
          club_id?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          format?: Database["public"]["Enums"]["session_format"]
          id?: string
          location?: string | null
          location_id?: string | null
          notes?: string | null
          repeat_frequency?: Database["public"]["Enums"]["repeat_frequency"]
          rsvp_deadline?: string | null
          session_type?: Database["public"]["Enums"]["session_type"]
          starts_at?: string
          survey_enabled?: boolean
          title?: string
          trailers_required?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          club_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          club_id?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          club_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_platform_owner: { Args: never; Returns: string }
      get_platform_stats: { Args: never; Returns: Json }
      grant_platform_owner: { Args: { _email: string }; Returns: string }
      has_role: {
        Args: {
          _club_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_approved_member: {
        Args: { _club_id: string; _user_id: string }
        Returns: boolean
      }
      is_club_admin: {
        Args: { _club_id: string; _user_id: string }
        Returns: boolean
      }
      is_platform_owner: { Args: { _user_id: string }; Returns: boolean }
      list_platform_coaches: {
        Args: never
        Returns: {
          club_id: string
          club_name: string
          email: string
          full_name: string
          role: string
          user_id: string
        }[]
      }
      list_platform_owners: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          user_id: string
        }[]
      }
      redeem_club_invite_code: { Args: { _code: string }; Returns: string }
      revoke_platform_owner: { Args: { _user_id: string }; Returns: undefined }
    }
    Enums: {
      age_division: "u23" | "open" | "masters_35" | "masters_45"
      app_role: "owner" | "club_admin" | "coach" | "member"
      attendance_status: "present" | "absent" | "excused" | "injured"
      carpool_request_status: "pending" | "assigned" | "cancelled"
      carpool_status: "open" | "full" | "cancelled"
      equipment_status: "active" | "retired"
      fault_status: "open" | "repaired" | "cleared"
      membership_status: "pending" | "approved" | "rejected"
      repeat_frequency: "none" | "daily" | "weekly" | "fortnightly" | "monthly"
      rsvp_status: "going" | "maybe" | "not_going"
      session_format: "team" | "individual"
      session_type: "training" | "fitness" | "theory" | "other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      age_division: ["u23", "open", "masters_35", "masters_45"],
      app_role: ["owner", "club_admin", "coach", "member"],
      attendance_status: ["present", "absent", "excused", "injured"],
      carpool_request_status: ["pending", "assigned", "cancelled"],
      carpool_status: ["open", "full", "cancelled"],
      equipment_status: ["active", "retired"],
      fault_status: ["open", "repaired", "cleared"],
      membership_status: ["pending", "approved", "rejected"],
      repeat_frequency: ["none", "daily", "weekly", "fortnightly", "monthly"],
      rsvp_status: ["going", "maybe", "not_going"],
      session_format: ["team", "individual"],
      session_type: ["training", "fitness", "theory", "other"],
    },
  },
} as const
