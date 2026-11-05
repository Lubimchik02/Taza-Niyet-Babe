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
      [_ in never]: never;
    };
    Enums: {
      attendance_method: 'qr' | 'manual' | 'auto';
      attendance_status: 'active' | 'closed' | 'needs_confirmation' | 'confirmed';
      dispute_status: 'open' | 'resolved' | 'rejected';
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
      org_role: ['admin', 'coordinator', 'volunteer'],
      quest_difficulty: ['easy', 'medium', 'hard', 'extreme'],
      quest_status: ['draft', 'published', 'in_progress', 'completed', 'cancelled'],
      signup_status: ['signed_up', 'waitlisted', 'cancelled'],
      task_status: ['open', 'in_progress', 'done', 'cancelled'],
    },
  },
} as const;
