export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      achievements: {
        Row: {
          code: string;
          created_at: string;
          description: NonNullable<Json>;
          icon: string;
          id: string;
          name: NonNullable<Json>;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          code: string;
          created_at?: string;
          description: NonNullable<Json>;
          icon?: string;
          id?: string;
          name: NonNullable<Json>;
          updated_at?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          description?: NonNullable<Json>;
          icon?: string;
          id?: string;
          name?: NonNullable<Json>;
          updated_at?: string;
        };
        Relationships: [];
      };
      adjustments: {
        Row: {
          adjusted_by: string | null;
          confirmation_id: string | null;
          created_at: string;
          field: string;
          id: string;
          new_value: string;
          old_value: string | null;
          org_id: string;
          reason: string;
          session_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          adjusted_by?: string | null;
          confirmation_id?: string | null;
          created_at?: string;
          field: string;
          id?: string;
          new_value: string;
          old_value?: string | null;
          org_id: string;
          reason: string;
          session_id?: string | null;
        };
        Update: {
          adjusted_by?: string | null;
          confirmation_id?: string | null;
          created_at?: string;
          field?: string;
          id?: string;
          new_value?: string;
          old_value?: string | null;
          org_id?: string;
          reason?: string;
          session_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'adjustments_adjusted_by_fkey';
            columns: ['adjusted_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'adjustments_confirmation_id_fkey';
            columns: ['confirmation_id'];
            isOneToOne: false;
            referencedRelation: 'hour_confirmations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'adjustments_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'adjustments_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'attendance_sessions';
            referencedColumns: ['id'];
          },
        ];
      };
      attendance_sessions: {
        Row: {
          check_in_at: string;
          check_in_lat: number | null;
          check_in_lng: number | null;
          check_in_method: Database['public']['Enums']['attendance_method'];
          check_out_at: string | null;
          check_out_event_id: string | null;
          check_out_lat: number | null;
          check_out_lng: number | null;
          check_out_method: Database['public']['Enums']['attendance_method'] | null;
          client_event_id: string | null;
          created_at: string;
          id: string;
          offline: boolean;
          org_id: string;
          quest_id: string;
          recorded_by: string | null;
          status: Database['public']['Enums']['attendance_status'];
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          check_in_at: string;
          check_in_lat?: number | null;
          check_in_lng?: number | null;
          check_in_method: Database['public']['Enums']['attendance_method'];
          check_out_at?: string | null;
          check_out_event_id?: string | null;
          check_out_lat?: number | null;
          check_out_lng?: number | null;
          check_out_method?: Database['public']['Enums']['attendance_method'] | null;
          client_event_id?: string | null;
          created_at?: string;
          id?: string;
          offline?: boolean;
          org_id: string;
          quest_id: string;
          recorded_by?: string | null;
          status?: Database['public']['Enums']['attendance_status'];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          check_in_at?: string;
          check_in_lat?: number | null;
          check_in_lng?: number | null;
          check_in_method?: Database['public']['Enums']['attendance_method'];
          check_out_at?: string | null;
          check_out_event_id?: string | null;
          check_out_lat?: number | null;
          check_out_lng?: number | null;
          check_out_method?: Database['public']['Enums']['attendance_method'] | null;
          client_event_id?: string | null;
          created_at?: string;
          id?: string;
          offline?: boolean;
          org_id?: string;
          quest_id?: string;
          recorded_by?: string | null;
          status?: Database['public']['Enums']['attendance_status'];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'attendance_sessions_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'attendance_sessions_quest_id_fkey';
            columns: ['quest_id'];
            isOneToOne: false;
            referencedRelation: 'quests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'attendance_sessions_recorded_by_fkey';
            columns: ['recorded_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'attendance_sessions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          entity: string;
          entity_id: string | null;
          id: number;
          new_value: Json | null;
          old_value: Json | null;
          org_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          entity: string;
          entity_id?: string | null;
          id?: never;
          new_value?: Json | null;
          old_value?: Json | null;
          org_id?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          entity?: string;
          entity_id?: string | null;
          id?: never;
          new_value?: Json | null;
          old_value?: Json | null;
          org_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_log_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      certificates: {
        Row: {
          avg_rating: number | null;
          created_at: string;
          full_name: string;
          id: string;
          issued_at: string;
          org_id: string;
          pdf_path: string | null;
          quests: NonNullable<Json>;
          quests_count: number;
          revoked_at: string | null;
          skills: NonNullable<Json>;
          total_minutes: number;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          avg_rating?: number | null;
          created_at?: string;
          full_name: string;
          id?: string;
          issued_at?: string;
          org_id: string;
          pdf_path?: string | null;
          quests?: NonNullable<Json>;
          quests_count: number;
          revoked_at?: string | null;
          skills?: NonNullable<Json>;
          total_minutes: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          avg_rating?: number | null;
          created_at?: string;
          full_name?: string;
          id?: string;
          issued_at?: string;
          org_id?: string;
          pdf_path?: string | null;
          quests?: NonNullable<Json>;
          quests_count?: number;
          revoked_at?: string | null;
          skills?: NonNullable<Json>;
          total_minutes?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'certificates_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'certificates_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      disputes: {
        Row: {
          comment: string;
          confirmation_id: string;
          created_at: string;
          id: string;
          org_id: string;
          resolution: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          status: Database['public']['Enums']['dispute_status'];
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          comment: string;
          confirmation_id: string;
          created_at?: string;
          id?: string;
          org_id: string;
          resolution?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: Database['public']['Enums']['dispute_status'];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          comment?: string;
          confirmation_id?: string;
          created_at?: string;
          id?: string;
          org_id?: string;
          resolution?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: Database['public']['Enums']['dispute_status'];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'disputes_confirmation_id_fkey';
            columns: ['confirmation_id'];
            isOneToOne: false;
            referencedRelation: 'hour_confirmations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'disputes_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'disputes_resolved_by_fkey';
            columns: ['resolved_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'disputes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      hour_confirmations: {
        Row: {
          comment: string;
          confirmed_at: string;
          confirmed_by: string | null;
          confirmed_minutes: number;
          created_at: string;
          id: string;
          org_id: string;
          quest_id: string;
          rating_activity: number;
          rating_quality: number;
          rating_teamwork: number;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          comment?: string;
          confirmed_at?: string;
          confirmed_by?: string | null;
          confirmed_minutes: number;
          created_at?: string;
          id?: string;
          org_id: string;
          quest_id: string;
          rating_activity: number;
          rating_quality: number;
          rating_teamwork: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          comment?: string;
          confirmed_at?: string;
          confirmed_by?: string | null;
          confirmed_minutes?: number;
          created_at?: string;
          id?: string;
          org_id?: string;
          quest_id?: string;
          rating_activity?: number;
          rating_quality?: number;
          rating_teamwork?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'hour_confirmations_confirmed_by_fkey';
            columns: ['confirmed_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hour_confirmations_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hour_confirmations_quest_id_fkey';
            columns: ['quest_id'];
            isOneToOne: false;
            referencedRelation: 'quests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hour_confirmations_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      join_requests: {
        Row: {
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          id: string;
          message: string;
          org_id: string;
          status: Database['public']['Enums']['join_request_status'];
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          id?: string;
          message?: string;
          org_id: string;
          status?: Database['public']['Enums']['join_request_status'];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          id?: string;
          message?: string;
          org_id?: string;
          status?: Database['public']['Enums']['join_request_status'];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'join_requests_decided_by_fkey';
            columns: ['decided_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'join_requests_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'join_requests_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      levels: {
        Row: {
          code: string;
          created_at: string;
          min_points: number;
          position: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          code: string;
          created_at?: string;
          min_points: number;
          position: number;
          updated_at?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          min_points?: number;
          position?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      memberships: {
        Row: {
          created_at: string;
          id: string;
          org_id: string;
          role: Database['public']['Enums']['org_role'];
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          org_id: string;
          role?: Database['public']['Enums']['org_role'];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          org_id?: string;
          role?: Database['public']['Enums']['org_role'];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'memberships_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'memberships_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          created_at: string;
          id: string;
          org_id: string | null;
          payload: NonNullable<Json>;
          read_at: string | null;
          type: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          org_id?: string | null;
          payload?: NonNullable<Json>;
          read_at?: string | null;
          type: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          org_id?: string | null;
          payload?: NonNullable<Json>;
          read_at?: string | null;
          type?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      org_invites: {
        Row: {
          code: string;
          created_at: string;
          created_by: string | null;
          expires_at: string | null;
          id: string;
          max_uses: number | null;
          org_id: string;
          revoked_at: string | null;
          role: Database['public']['Enums']['org_role'];
          updated_at: string;
          uses: number;
        };
        ComputedFields: never;
        Insert: {
          code?: string;
          created_at?: string;
          created_by?: string | null;
          expires_at?: string | null;
          id?: string;
          max_uses?: number | null;
          org_id: string;
          revoked_at?: string | null;
          role?: Database['public']['Enums']['org_role'];
          updated_at?: string;
          uses?: number;
        };
        Update: {
          code?: string;
          created_at?: string;
          created_by?: string | null;
          expires_at?: string | null;
          id?: string;
          max_uses?: number | null;
          org_id?: string;
          revoked_at?: string | null;
          role?: Database['public']['Enums']['org_role'];
          updated_at?: string;
          uses?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'org_invites_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'org_invites_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      organizations: {
        Row: {
          created_at: string;
          created_by: string | null;
          description: string;
          id: string;
          logo_path: string | null;
          name: string;
          slug: string;
          timezone: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          description?: string;
          id?: string;
          logo_path?: string | null;
          name: string;
          slug: string;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          description?: string;
          id?: string;
          logo_path?: string | null;
          name?: string;
          slug?: string;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'organizations_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      points_ledger: {
        Row: {
          confirmation_id: string | null;
          created_at: string;
          id: number;
          org_id: string;
          points: number;
          quest_id: string | null;
          reason: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          confirmation_id?: string | null;
          created_at?: string;
          id?: never;
          org_id: string;
          points: number;
          quest_id?: string | null;
          reason: string;
          user_id: string;
        };
        Update: {
          confirmation_id?: string | null;
          created_at?: string;
          id?: never;
          org_id?: string;
          points?: number;
          quest_id?: string | null;
          reason?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'points_ledger_confirmation_id_fkey';
            columns: ['confirmation_id'];
            isOneToOne: false;
            referencedRelation: 'hour_confirmations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'points_ledger_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'points_ledger_quest_id_fkey';
            columns: ['quest_id'];
            isOneToOne: false;
            referencedRelation: 'quests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'points_ledger_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      points_rules: {
        Row: {
          created_at: string;
          difficulty: Database['public']['Enums']['quest_difficulty'];
          points_per_hour: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          difficulty: Database['public']['Enums']['quest_difficulty'];
          points_per_hour: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          difficulty?: Database['public']['Enums']['quest_difficulty'];
          points_per_hour?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_path: string | null;
          created_at: string;
          full_name: string;
          hide_from_leaderboard: boolean;
          id: string;
          locale: string | null;
          timezone: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          avatar_path?: string | null;
          created_at?: string;
          full_name?: string;
          hide_from_leaderboard?: boolean;
          id: string;
          locale?: string | null;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          avatar_path?: string | null;
          created_at?: string;
          full_name?: string;
          hide_from_leaderboard?: boolean;
          id?: string;
          locale?: string | null;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      quest_signups: {
        Row: {
          cancelled_at: string | null;
          created_at: string;
          id: string;
          org_id: string;
          quest_id: string;
          status: Database['public']['Enums']['signup_status'];
          status_changed_at: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          cancelled_at?: string | null;
          created_at?: string;
          id?: string;
          org_id: string;
          quest_id: string;
          status?: Database['public']['Enums']['signup_status'];
          status_changed_at?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          cancelled_at?: string | null;
          created_at?: string;
          id?: string;
          org_id?: string;
          quest_id?: string;
          status?: Database['public']['Enums']['signup_status'];
          status_changed_at?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'quest_signups_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quest_signups_quest_id_fkey';
            columns: ['quest_id'];
            isOneToOne: false;
            referencedRelation: 'quests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quest_signups_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      quest_skills: {
        Row: {
          created_at: string;
          quest_id: string;
          skill_id: string;
          updated_at: string;
          xp: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          quest_id: string;
          skill_id: string;
          updated_at?: string;
          xp?: number;
        };
        Update: {
          created_at?: string;
          quest_id?: string;
          skill_id?: string;
          updated_at?: string;
          xp?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'quest_skills_quest_id_fkey';
            columns: ['quest_id'];
            isOneToOne: false;
            referencedRelation: 'quests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quest_skills_skill_id_fkey';
            columns: ['skill_id'];
            isOneToOne: false;
            referencedRelation: 'skills';
            referencedColumns: ['id'];
          },
        ];
      };
      quests: {
        Row: {
          address: string;
          after_photo_path: string | null;
          area_m2: number | null;
          bags_collected: number | null;
          before_photo_path: string | null;
          bring_items: string[];
          cancel_deadline_hours: number;
          capacity: number;
          coordinator_contact: string | null;
          coordinator_id: string | null;
          created_at: string;
          created_by: string | null;
          description: string;
          difficulty: Database['public']['Enums']['quest_difficulty'];
          ends_at: string;
          id: string;
          lat: number;
          lng: number;
          org_id: string;
          provided_items: string[];
          radius_m: number;
          starts_at: string;
          status: Database['public']['Enums']['quest_status'];
          task_id: string | null;
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          address: string;
          after_photo_path?: string | null;
          area_m2?: number | null;
          bags_collected?: number | null;
          before_photo_path?: string | null;
          bring_items?: string[];
          cancel_deadline_hours?: number;
          capacity: number;
          coordinator_contact?: string | null;
          coordinator_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string;
          difficulty: Database['public']['Enums']['quest_difficulty'];
          ends_at: string;
          id?: string;
          lat: number;
          lng: number;
          org_id: string;
          provided_items?: string[];
          radius_m?: number;
          starts_at: string;
          status?: Database['public']['Enums']['quest_status'];
          task_id?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          address?: string;
          after_photo_path?: string | null;
          area_m2?: number | null;
          bags_collected?: number | null;
          before_photo_path?: string | null;
          bring_items?: string[];
          cancel_deadline_hours?: number;
          capacity?: number;
          coordinator_contact?: string | null;
          coordinator_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string;
          difficulty?: Database['public']['Enums']['quest_difficulty'];
          ends_at?: string;
          id?: string;
          lat?: number;
          lng?: number;
          org_id?: string;
          provided_items?: string[];
          radius_m?: number;
          starts_at?: string;
          status?: Database['public']['Enums']['quest_status'];
          task_id?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'quests_coordinator_id_fkey';
            columns: ['coordinator_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quests_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quests_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quests_task_id_fkey';
            columns: ['task_id'];
            isOneToOne: false;
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
        ];
      };
      rating_multipliers: {
        Row: {
          created_at: string;
          multiplier_pct: number;
          rating: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          multiplier_pct: number;
          rating: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          multiplier_pct?: number;
          rating?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      skills: {
        Row: {
          code: string;
          created_at: string;
          id: string;
          name: NonNullable<Json>;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          code: string;
          created_at?: string;
          id?: string;
          name: NonNullable<Json>;
          updated_at?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          id?: string;
          name?: NonNullable<Json>;
          updated_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          address: string | null;
          created_at: string;
          created_by: string | null;
          description: string;
          id: string;
          lat: number | null;
          lng: number | null;
          org_id: string;
          status: Database['public']['Enums']['task_status'];
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          address?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string;
          id?: string;
          lat?: number | null;
          lng?: number | null;
          org_id: string;
          status?: Database['public']['Enums']['task_status'];
          title: string;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string;
          id?: string;
          lat?: number | null;
          lng?: number | null;
          org_id?: string;
          status?: Database['public']['Enums']['task_status'];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tasks_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      user_achievements: {
        Row: {
          achievement_id: string;
          created_at: string;
          org_id: string | null;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          achievement_id: string;
          created_at?: string;
          org_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          achievement_id?: string;
          created_at?: string;
          org_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_achievements_achievement_id_fkey';
            columns: ['achievement_id'];
            isOneToOne: false;
            referencedRelation: 'achievements';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_achievements_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_achievements_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      user_skills: {
        Row: {
          created_at: string;
          skill_id: string;
          updated_at: string;
          user_id: string;
          xp: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          skill_id: string;
          updated_at?: string;
          user_id: string;
          xp?: number;
        };
        Update: {
          created_at?: string;
          skill_id?: string;
          updated_at?: string;
          user_id?: string;
          xp?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'user_skills_skill_id_fkey';
            columns: ['skill_id'];
            isOneToOne: false;
            referencedRelation: 'skills';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_skills_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_invite: {
        Args: { p_code: string };
        Returns: {
          created_at: string;
          id: string;
          org_id: string;
          role: Database['public']['Enums']['org_role'];
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'memberships';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      adjust_session: {
        Args: {
          p_check_in_at: string;
          p_check_out_at: string;
          p_reason: string;
          p_session_id: string;
        };
        Returns: {
          check_in_at: string;
          check_in_lat: number | null;
          check_in_lng: number | null;
          check_in_method: Database['public']['Enums']['attendance_method'];
          check_out_at: string | null;
          check_out_event_id: string | null;
          check_out_lat: number | null;
          check_out_lng: number | null;
          check_out_method: Database['public']['Enums']['attendance_method'] | null;
          client_event_id: string | null;
          created_at: string;
          id: string;
          offline: boolean;
          org_id: string;
          quest_id: string;
          recorded_by: string | null;
          status: Database['public']['Enums']['attendance_status'];
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'attendance_sessions';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      cancel_join_request: { Args: { p_request_id: string }; Returns: undefined };
      cancel_signup: {
        Args: { p_quest_id: string };
        Returns: {
          cancelled_at: string | null;
          created_at: string;
          id: string;
          org_id: string;
          quest_id: string;
          status: Database['public']['Enums']['signup_status'];
          status_changed_at: string;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'quest_signups';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      check_in: {
        Args: {
          p_client_event_id: string;
          p_device_time?: string;
          p_lat: number;
          p_lng: number;
          p_token: string;
        };
        Returns: {
          check_in_at: string;
          check_in_lat: number | null;
          check_in_lng: number | null;
          check_in_method: Database['public']['Enums']['attendance_method'];
          check_out_at: string | null;
          check_out_event_id: string | null;
          check_out_lat: number | null;
          check_out_lng: number | null;
          check_out_method: Database['public']['Enums']['attendance_method'] | null;
          client_event_id: string | null;
          created_at: string;
          id: string;
          offline: boolean;
          org_id: string;
          quest_id: string;
          recorded_by: string | null;
          status: Database['public']['Enums']['attendance_status'];
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'attendance_sessions';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      check_out: {
        Args: {
          p_client_event_id: string;
          p_device_time?: string;
          p_lat: number;
          p_lng: number;
          p_token: string;
        };
        Returns: {
          check_in_at: string;
          check_in_lat: number | null;
          check_in_lng: number | null;
          check_in_method: Database['public']['Enums']['attendance_method'];
          check_out_at: string | null;
          check_out_event_id: string | null;
          check_out_lat: number | null;
          check_out_lng: number | null;
          check_out_method: Database['public']['Enums']['attendance_method'] | null;
          client_event_id: string | null;
          created_at: string;
          id: string;
          offline: boolean;
          org_id: string;
          quest_id: string;
          recorded_by: string | null;
          status: Database['public']['Enums']['attendance_status'];
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'attendance_sessions';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      confirm_hours: { Args: { p_items: Json; p_quest_id: string }; Returns: number };
      create_invite: {
        Args: {
          p_expires_in_hours?: number;
          p_max_uses?: number;
          p_org_id: string;
          p_role?: Database['public']['Enums']['org_role'];
        };
        Returns: {
          code: string;
          created_at: string;
          created_by: string | null;
          expires_at: string | null;
          id: string;
          max_uses: number | null;
          org_id: string;
          revoked_at: string | null;
          role: Database['public']['Enums']['org_role'];
          updated_at: string;
          uses: number;
        };
        SetofOptions: {
          from: '*';
          to: 'org_invites';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_organization: {
        Args: { p_description?: string; p_name: string; p_slug: string };
        Returns: {
          created_at: string;
          created_by: string | null;
          description: string;
          id: string;
          logo_path: string | null;
          name: string;
          slug: string;
          timezone: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'organizations';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      decide_join_request: {
        Args: { p_approve: boolean; p_request_id: string };
        Returns: {
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          id: string;
          message: string;
          org_id: string;
          status: Database['public']['Enums']['join_request_status'];
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'join_requests';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      finish_shift: { Args: { p_quest_id: string }; Returns: number };
      get_invite_preview: {
        Args: { p_code: string };
        Returns: {
          is_member: boolean;
          org_description: string;
          org_id: string;
          org_name: string;
          problem: string;
          role: Database['public']['Enums']['org_role'];
        }[];
      };
      get_quest: {
        Args: { p_quest_id: string };
        Returns: {
          address: string;
          after_photo_path: string;
          before_photo_path: string;
          bring_items: string[];
          can_manage: boolean;
          cancel_deadline_hours: number;
          capacity: number;
          coordinator_contact: string;
          coordinator_id: string;
          coordinator_name: string;
          description: string;
          difficulty: Database['public']['Enums']['quest_difficulty'];
          ends_at: string;
          id: string;
          lat: number;
          lng: number;
          my_status: Database['public']['Enums']['signup_status'];
          my_waitlist_position: number;
          org_id: string;
          org_name: string;
          provided_items: string[];
          radius_m: number;
          skills: Json;
          starts_at: string;
          status: Database['public']['Enums']['quest_status'];
          taken: number;
          title: string;
          waitlisted: number;
        }[];
      };
      get_shift_qr: {
        Args: { p_quest_id: string; p_windows?: number };
        Returns: {
          token: string;
          valid_from: string;
          valid_until: string;
        }[];
      };
      hours_report: {
        Args: { p_from: string; p_org_id: string; p_to: string };
        Returns: {
          confirmed_at: string;
          confirmed_by_name: string;
          difficulty: Database['public']['Enums']['quest_difficulty'];
          minutes: number;
          points: number;
          quest_date: string;
          quest_title: string;
          rating_activity: number;
          rating_quality: number;
          rating_teamwork: number;
          volunteer_id: string;
          volunteer_name: string;
        }[];
      };
      issue_certificate: {
        Args: { p_org_id: string };
        Returns: {
          avg_rating: number | null;
          created_at: string;
          full_name: string;
          id: string;
          issued_at: string;
          org_id: string;
          pdf_path: string | null;
          quests: NonNullable<Json>;
          quests_count: number;
          revoked_at: string | null;
          skills: NonNullable<Json>;
          total_minutes: number;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'certificates';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      list_audit_log: {
        Args: { p_before?: number; p_limit?: number; p_org_id: string };
        Returns: {
          action: string;
          actor_name: string;
          created_at: string;
          entity: string;
          entity_id: string;
          id: number;
          new_value: Json;
          old_value: Json;
        }[];
      };
      list_disputes: {
        Args: { p_org_id: string; p_status?: Database['public']['Enums']['dispute_status'] };
        Returns: {
          comment: string;
          confirmed_by_name: string;
          confirmed_minutes: number;
          created_at: string;
          full_name: string;
          id: string;
          quest_id: string;
          quest_starts_at: string;
          quest_title: string;
          resolution: string;
          resolved_at: string;
          resolved_by_name: string;
          status: Database['public']['Enums']['dispute_status'];
          user_id: string;
        }[];
      };
      list_join_requests: {
        Args: { p_org_id: string };
        Returns: {
          created_at: string;
          full_name: string;
          id: string;
          message: string;
          user_id: string;
        }[];
      };
      list_org_certificates: {
        Args: { p_org_id: string };
        Returns: {
          full_name: string;
          id: string;
          issued_at: string;
          revoked_at: string;
          total_minutes: number;
        }[];
      };
      list_org_members: {
        Args: { p_org_id: string };
        Returns: {
          full_name: string;
          joined_at: string;
          membership_id: string;
          role: Database['public']['Enums']['org_role'];
          user_id: string;
        }[];
      };
      list_quest_participants: {
        Args: { p_quest_id: string };
        Returns: {
          full_name: string;
          queue_position: number;
          signed_at: string;
          status: Database['public']['Enums']['signup_status'];
          user_id: string;
        }[];
      };
      manual_check_in: {
        Args: {
          p_client_event_id?: string;
          p_device_time?: string;
          p_quest_id: string;
          p_user_id: string;
        };
        Returns: {
          check_in_at: string;
          check_in_lat: number | null;
          check_in_lng: number | null;
          check_in_method: Database['public']['Enums']['attendance_method'];
          check_out_at: string | null;
          check_out_event_id: string | null;
          check_out_lat: number | null;
          check_out_lng: number | null;
          check_out_method: Database['public']['Enums']['attendance_method'] | null;
          client_event_id: string | null;
          created_at: string;
          id: string;
          offline: boolean;
          org_id: string;
          quest_id: string;
          recorded_by: string | null;
          status: Database['public']['Enums']['attendance_status'];
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'attendance_sessions';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      manual_check_out: {
        Args: {
          p_client_event_id?: string;
          p_device_time?: string;
          p_quest_id: string;
          p_user_id: string;
        };
        Returns: {
          check_in_at: string;
          check_in_lat: number | null;
          check_in_lng: number | null;
          check_in_method: Database['public']['Enums']['attendance_method'];
          check_out_at: string | null;
          check_out_event_id: string | null;
          check_out_lat: number | null;
          check_out_lng: number | null;
          check_out_method: Database['public']['Enums']['attendance_method'] | null;
          client_event_id: string | null;
          created_at: string;
          id: string;
          offline: boolean;
          org_id: string;
          quest_id: string;
          recorded_by: string | null;
          status: Database['public']['Enums']['attendance_status'];
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'attendance_sessions';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      my_benefit: {
        Args: Record<PropertyKey, never>;
        Returns: {
          achievements: Json;
          avg_rating: number;
          hide_from_leaderboard: boolean;
          level_code: string;
          level_min_points: number;
          month_minutes: number;
          next_level_code: string;
          next_level_min_points: number;
          quests_count: number;
          skills: Json;
          team_area_m2: number;
          team_bags: number;
          timezone: string;
          total_minutes: number;
          total_points: number;
          week_minutes: number;
        }[];
      };
      my_hours: {
        Args: { p_from?: string; p_to?: string };
        Returns: {
          minutes: number;
          quests: number;
        }[];
      };
      my_quest_attendance: {
        Args: { p_quest_id: string };
        Returns: {
          adjustments: Json;
          confirmation: Json;
          raw_minutes: number;
          rounded_minutes: number;
          sessions: Json;
        }[];
      };
      my_quests: {
        Args: Record<PropertyKey, never>;
        Returns: {
          address: string;
          capacity: number;
          difficulty: Database['public']['Enums']['quest_difficulty'];
          ends_at: string;
          id: string;
          my_status: Database['public']['Enums']['signup_status'];
          my_waitlist_position: number;
          org_name: string;
          starts_at: string;
          status: Database['public']['Enums']['quest_status'];
          taken: number;
          title: string;
        }[];
      };
      open_dispute: {
        Args: { p_comment: string; p_confirmation_id: string };
        Returns: {
          comment: string;
          confirmation_id: string;
          created_at: string;
          id: string;
          org_id: string;
          resolution: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          status: Database['public']['Enums']['dispute_status'];
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'disputes';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      org_leaderboard: {
        Args: { p_org_id: string; p_period?: string };
        Returns: {
          full_name: string;
          is_me: boolean;
          minutes: number;
          place: number;
          points: number;
          user_id: string;
        }[];
      };
      quest_feed: {
        Args: { p_from?: string; p_org_id?: string; p_to?: string };
        Returns: {
          address: string;
          can_manage: boolean;
          capacity: number;
          difficulty: Database['public']['Enums']['quest_difficulty'];
          ends_at: string;
          id: string;
          lat: number;
          lng: number;
          my_status: Database['public']['Enums']['signup_status'];
          org_id: string;
          org_name: string;
          starts_at: string;
          status: Database['public']['Enums']['quest_status'];
          taken: number;
          title: string;
          waitlisted: number;
        }[];
      };
      request_to_join: {
        Args: { p_message?: string; p_org_id: string };
        Returns: {
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          id: string;
          message: string;
          org_id: string;
          status: Database['public']['Enums']['join_request_status'];
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'join_requests';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      resolve_dispute: {
        Args: {
          p_dispute_id: string;
          p_minutes?: number;
          p_resolution: string;
          p_status: Database['public']['Enums']['dispute_status'];
        };
        Returns: {
          comment: string;
          confirmation_id: string;
          created_at: string;
          id: string;
          org_id: string;
          resolution: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          status: Database['public']['Enums']['dispute_status'];
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'disputes';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      revoke_certificate: {
        Args: { p_id: string };
        Returns: {
          avg_rating: number | null;
          created_at: string;
          full_name: string;
          id: string;
          issued_at: string;
          org_id: string;
          pdf_path: string | null;
          quests: NonNullable<Json>;
          quests_count: number;
          revoked_at: string | null;
          skills: NonNullable<Json>;
          total_minutes: number;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'certificates';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      revoke_invite: { Args: { p_invite_id: string }; Returns: undefined };
      save_quest: {
        Args: { p_data: Json; p_org_id: string; p_quest_id?: string; p_skill_ids?: string[] };
        Returns: {
          address: string;
          after_photo_path: string | null;
          area_m2: number | null;
          bags_collected: number | null;
          before_photo_path: string | null;
          bring_items: string[];
          cancel_deadline_hours: number;
          capacity: number;
          coordinator_contact: string | null;
          coordinator_id: string | null;
          created_at: string;
          created_by: string | null;
          description: string;
          difficulty: Database['public']['Enums']['quest_difficulty'];
          ends_at: string;
          id: string;
          lat: number;
          lng: number;
          org_id: string;
          provided_items: string[];
          radius_m: number;
          starts_at: string;
          status: Database['public']['Enums']['quest_status'];
          task_id: string | null;
          title: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'quests';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      search_organizations: {
        Args: { p_query: string };
        Returns: {
          description: string;
          id: string;
          is_member: boolean;
          members_count: number;
          name: string;
          slug: string;
        }[];
      };
      set_member_role: {
        Args: { p_membership_id: string; p_role: Database['public']['Enums']['org_role'] };
        Returns: {
          created_at: string;
          id: string;
          org_id: string;
          role: Database['public']['Enums']['org_role'];
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'memberships';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      set_quest_contribution: {
        Args: { p_area_m2: number; p_bags: number; p_quest_id: string };
        Returns: {
          address: string;
          after_photo_path: string | null;
          area_m2: number | null;
          bags_collected: number | null;
          before_photo_path: string | null;
          bring_items: string[];
          cancel_deadline_hours: number;
          capacity: number;
          coordinator_contact: string | null;
          coordinator_id: string | null;
          created_at: string;
          created_by: string | null;
          description: string;
          difficulty: Database['public']['Enums']['quest_difficulty'];
          ends_at: string;
          id: string;
          lat: number;
          lng: number;
          org_id: string;
          provided_items: string[];
          radius_m: number;
          starts_at: string;
          status: Database['public']['Enums']['quest_status'];
          task_id: string | null;
          title: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'quests';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      shift_summary: {
        Args: { p_quest_id: string };
        Returns: {
          confirmation: Json;
          first_check_in: string;
          full_name: string;
          last_check_out: string;
          methods: string[];
          needs_confirmation: boolean;
          offline: boolean;
          present: boolean;
          raw_minutes: number;
          rounded_minutes: number;
          sessions: Json;
          signed_up: boolean;
          user_id: string;
        }[];
      };
      signup_for_quest: {
        Args: { p_quest_id: string };
        Returns: {
          cancelled_at: string | null;
          created_at: string;
          id: string;
          org_id: string;
          quest_id: string;
          status: Database['public']['Enums']['signup_status'];
          status_changed_at: string;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'quest_signups';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      start_shift: {
        Args: { p_quest_id: string };
        Returns: {
          address: string;
          after_photo_path: string | null;
          area_m2: number | null;
          bags_collected: number | null;
          before_photo_path: string | null;
          bring_items: string[];
          cancel_deadline_hours: number;
          capacity: number;
          coordinator_contact: string | null;
          coordinator_id: string | null;
          created_at: string;
          created_by: string | null;
          description: string;
          difficulty: Database['public']['Enums']['quest_difficulty'];
          ends_at: string;
          id: string;
          lat: number;
          lng: number;
          org_id: string;
          provided_items: string[];
          radius_m: number;
          starts_at: string;
          status: Database['public']['Enums']['quest_status'];
          task_id: string | null;
          title: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'quests';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      verify_certificate: {
        Args: { p_id: string };
        Returns: {
          avg_rating: number;
          full_name: string;
          id: string;
          issued_at: string;
          org_name: string;
          quests: Json;
          quests_count: number;
          revoked_at: string;
          skills: Json;
          total_minutes: number;
        }[];
      };
    };
    Enums: {
      attendance_method: 'qr' | 'manual' | 'auto';
      attendance_status: 'active' | 'closed' | 'needs_confirmation' | 'confirmed';
      dispute_status: 'open' | 'resolved' | 'rejected';
      join_request_status: 'pending' | 'approved' | 'rejected' | 'cancelled';
      org_role: 'admin' | 'coordinator' | 'volunteer';
      quest_difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
      quest_status: 'draft' | 'published' | 'in_progress' | 'completed' | 'cancelled';
      signup_status: 'signed_up' | 'waitlisted' | 'cancelled';
      task_status: 'open' | 'in_progress' | 'done' | 'cancelled';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      attendance_method: ['qr', 'manual', 'auto'],
      attendance_status: ['active', 'closed', 'needs_confirmation', 'confirmed'],
      dispute_status: ['open', 'resolved', 'rejected'],
      join_request_status: ['pending', 'approved', 'rejected', 'cancelled'],
      org_role: ['admin', 'coordinator', 'volunteer'],
      quest_difficulty: ['easy', 'medium', 'hard', 'extreme'],
      quest_status: ['draft', 'published', 'in_progress', 'completed', 'cancelled'],
      signup_status: ['signed_up', 'waitlisted', 'cancelled'],
      task_status: ['open', 'in_progress', 'done', 'cancelled'],
    },
  },
} as const;
