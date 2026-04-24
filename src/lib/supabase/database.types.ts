export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      announcement_reads: {
        Row: {
          announcement_id: string
          id: string
          member_id: string
          read_at: string
        }
        Insert: {
          announcement_id: string
          id?: string
          member_id: string
          read_at?: string
        }
        Update: {
          announcement_id?: string
          id?: string
          member_id?: string
          read_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "store_announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_reads_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "store_members"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_maintenance_logs: {
        Row: {
          asset_id: string
          cost: number | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          maintenance_date: string
          maintenance_type: string | null
          next_inspection_date: string | null
          performed_by: string | null
          updated_at: string
        }
        Insert: {
          asset_id: string
          cost?: number | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          maintenance_date: string
          maintenance_type?: string | null
          next_inspection_date?: string | null
          performed_by?: string | null
          updated_at?: string
        }
        Update: {
          asset_id?: string
          cost?: number | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          maintenance_date?: string
          maintenance_type?: string | null
          next_inspection_date?: string | null
          performed_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_maintenance_logs_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "store_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_status_logs: {
        Row: {
          asset_id: string
          changed_by: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["asset_status"] | null
          id: string
          note: string | null
          to_status: Database["public"]["Enums"]["asset_status"]
        }
        Insert: {
          asset_id: string
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["asset_status"] | null
          id?: string
          note?: string | null
          to_status: Database["public"]["Enums"]["asset_status"]
        }
        Update: {
          asset_id?: string
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["asset_status"] | null
          id?: string
          note?: string | null
          to_status?: Database["public"]["Enums"]["asset_status"]
        }
        Relationships: [
          {
            foreignKeyName: "asset_status_logs_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "store_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balances: {
        Row: {
          created_at: string
          id: string
          member_id: string
          store_id: string
          total_days: number | null
          updated_at: string
          used_days: number
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          store_id: string
          total_days?: number | null
          updated_at?: string
          used_days?: number
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          store_id?: string
          total_days?: number | null
          updated_at?: string
          used_days?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "store_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          attachment_url: string | null
          created_at: string
          deleted_at: string | null
          end_date: string
          id: string
          leave_type: string
          member_id: string
          reason: string | null
          reject_reason: string | null
          requested_days: number
          resolved_at: string | null
          resolved_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          status: Database["public"]["Enums"]["leave_status"] | null
          store_id: string
          updated_at: string
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          deleted_at?: string | null
          end_date: string
          id?: string
          leave_type: string
          member_id: string
          reason?: string | null
          reject_reason?: string | null
          requested_days?: number
          resolved_at?: string | null
          resolved_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["leave_status"] | null
          store_id: string
          updated_at?: string
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          deleted_at?: string | null
          end_date?: string
          id?: string
          leave_type?: string
          member_id?: string
          reason?: string | null
          reject_reason?: string | null
          requested_days?: number
          resolved_at?: string | null
          resolved_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["leave_status"] | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "store_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "store_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      member_contracts: {
        Row: {
          contract_file_url: string | null
          contract_type: string
          created_at: string
          deleted_at: string | null
          id: string
          member_id: string
          modusign_document_id: string | null
          sent_at: string | null
          signed_at: string | null
          status: Database["public"]["Enums"]["contract_status"] | null
          store_id: string
          updated_at: string
        }
        Insert: {
          contract_file_url?: string | null
          contract_type: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          member_id: string
          modusign_document_id?: string | null
          sent_at?: string | null
          signed_at?: string | null
          status?: Database["public"]["Enums"]["contract_status"] | null
          store_id: string
          updated_at?: string
        }
        Update: {
          contract_file_url?: string | null
          contract_type?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          member_id?: string
          modusign_document_id?: string | null
          sent_at?: string | null
          signed_at?: string | null
          status?: Database["public"]["Enums"]["contract_status"] | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_contracts_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "store_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_contracts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_records: {
        Row: {
          base_pay: number
          confirmed_at: string | null
          created_at: string
          employment_insurance: number
          gross_pay: number
          health_insurance: number
          id: string
          income_tax: number
          local_income_tax: number
          long_term_care: number
          national_pension: number
          net_pay: number
          note: string | null
          overtime_hours: number
          overtime_pay: number
          paid_at: string | null
          period_month: number
          period_year: number
          staff_id: string
          status: Database["public"]["Enums"]["payroll_status"]
          store_id: string
          total_deduction: number
          updated_at: string
          wage_type: Database["public"]["Enums"]["wage_type"]
          weekly_holiday_pay: number
          work_days: number
          work_hours: number
        }
        Insert: {
          base_pay?: number
          confirmed_at?: string | null
          created_at?: string
          employment_insurance?: number
          gross_pay?: number
          health_insurance?: number
          id?: string
          income_tax?: number
          local_income_tax?: number
          long_term_care?: number
          national_pension?: number
          net_pay?: number
          note?: string | null
          overtime_hours?: number
          overtime_pay?: number
          paid_at?: string | null
          period_month: number
          period_year: number
          staff_id: string
          status?: Database["public"]["Enums"]["payroll_status"]
          store_id: string
          total_deduction?: number
          updated_at?: string
          wage_type: Database["public"]["Enums"]["wage_type"]
          weekly_holiday_pay?: number
          work_days?: number
          work_hours?: number
        }
        Update: {
          base_pay?: number
          confirmed_at?: string | null
          created_at?: string
          employment_insurance?: number
          gross_pay?: number
          health_insurance?: number
          id?: string
          income_tax?: number
          local_income_tax?: number
          long_term_care?: number
          national_pension?: number
          net_pay?: number
          note?: string | null
          overtime_hours?: number
          overtime_pay?: number
          paid_at?: string | null
          period_month?: number
          period_year?: number
          staff_id?: string
          status?: Database["public"]["Enums"]["payroll_status"]
          store_id?: string
          total_deduction?: number
          updated_at?: string
          wage_type?: Database["public"]["Enums"]["wage_type"]
          weekly_holiday_pay?: number
          work_days?: number
          work_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_records_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "store_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_records_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_platform_admin: boolean | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_platform_admin?: boolean | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_platform_admin?: boolean | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      schedules: {
        Row: {
          break_minutes: number | null
          created_at: string
          deleted_at: string | null
          end_time: string
          id: string
          is_ai_recommended: boolean | null
          member_id: string
          plan_date: string
          schedule_type: string | null
          start_time: string
          store_id: string
          updated_at: string
        }
        Insert: {
          break_minutes?: number | null
          created_at?: string
          deleted_at?: string | null
          end_time: string
          id?: string
          is_ai_recommended?: boolean | null
          member_id: string
          plan_date: string
          schedule_type?: string | null
          start_time: string
          store_id: string
          updated_at?: string
        }
        Update: {
          break_minutes?: number | null
          created_at?: string
          deleted_at?: string | null
          end_time?: string
          id?: string
          is_ai_recommended?: boolean | null
          member_id?: string
          plan_date?: string
          schedule_type?: string | null
          start_time?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedules_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "store_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_announcements: {
        Row: {
          announcement_type: string | null
          author_id: string
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          is_pinned: boolean | null
          store_id: string
          target_member_ids: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          announcement_type?: string | null
          author_id: string
          content: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_pinned?: boolean | null
          store_id: string
          target_member_ids?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          announcement_type?: string | null
          author_id?: string
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_pinned?: boolean | null
          store_id?: string
          target_member_ids?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "store_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_announcements_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_assets: {
        Row: {
          as_contact: string | null
          as_url: string | null
          as_usage_count: number | null
          as_vendor_name: string | null
          category: string | null
          created_at: string
          deleted_at: string | null
          id: string
          image_url: string | null
          installation_location: string | null
          manufacturer: string | null
          model_name: string | null
          name: string
          next_inspection_date: string | null
          notes: string | null
          purchase_amount: number | null
          purchase_date: string | null
          serial_number: string | null
          status: Database["public"]["Enums"]["asset_status"] | null
          store_id: string
          updated_at: string
          vendor_id: string | null
          warranty_expiry_date: string | null
        }
        Insert: {
          as_contact?: string | null
          as_url?: string | null
          as_usage_count?: number | null
          as_vendor_name?: string | null
          category?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          image_url?: string | null
          installation_location?: string | null
          manufacturer?: string | null
          model_name?: string | null
          name: string
          next_inspection_date?: string | null
          notes?: string | null
          purchase_amount?: number | null
          purchase_date?: string | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["asset_status"] | null
          store_id: string
          updated_at?: string
          vendor_id?: string | null
          warranty_expiry_date?: string | null
        }
        Update: {
          as_contact?: string | null
          as_url?: string | null
          as_usage_count?: number | null
          as_vendor_name?: string | null
          category?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          image_url?: string | null
          installation_location?: string | null
          manufacturer?: string | null
          model_name?: string | null
          name?: string
          next_inspection_date?: string | null
          notes?: string | null
          purchase_amount?: number | null
          purchase_date?: string | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["asset_status"] | null
          store_id?: string
          updated_at?: string
          vendor_id?: string | null
          warranty_expiry_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_assets_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_assets_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      store_attendance: {
        Row: {
          break_end_time: string | null
          break_start_time: string | null
          clock_in_time: string | null
          clock_out_time: string | null
          created_at: string
          deleted_at: string | null
          id: string
          member_id: string
          notes: string | null
          payroll_meta: Json | null
          schedule_id: string | null
          snapshot_hourly_wage: number | null
          status: Database["public"]["Enums"]["attendance_status"] | null
          store_id: string
          target_date: string
          total_break_minutes: number | null
          updated_at: string
        }
        Insert: {
          break_end_time?: string | null
          break_start_time?: string | null
          clock_in_time?: string | null
          clock_out_time?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          member_id: string
          notes?: string | null
          payroll_meta?: Json | null
          schedule_id?: string | null
          snapshot_hourly_wage?: number | null
          status?: Database["public"]["Enums"]["attendance_status"] | null
          store_id: string
          target_date: string
          total_break_minutes?: number | null
          updated_at?: string
        }
        Update: {
          break_end_time?: string | null
          break_start_time?: string | null
          clock_in_time?: string | null
          clock_out_time?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          member_id?: string
          notes?: string | null
          payroll_meta?: Json | null
          schedule_id?: string | null
          snapshot_hourly_wage?: number | null
          status?: Database["public"]["Enums"]["attendance_status"] | null
          store_id?: string
          target_date?: string
          total_break_minutes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_attendance_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "store_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_attendance_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_attendance_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_attendance_requests: {
        Row: {
          attendance_id: string | null
          created_at: string
          deleted_at: string | null
          id: string
          member_id: string
          reason: string | null
          reject_reason: string | null
          requested_clock_in: string | null
          requested_clock_out: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["attendance_request_status"]
          store_id: string
          target_date: string
          updated_at: string
        }
        Insert: {
          attendance_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          member_id: string
          reason?: string | null
          reject_reason?: string | null
          requested_clock_in?: string | null
          requested_clock_out?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["attendance_request_status"]
          store_id: string
          target_date: string
          updated_at?: string
        }
        Update: {
          attendance_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          member_id?: string
          reason?: string | null
          reject_reason?: string | null
          requested_clock_in?: string | null
          requested_clock_out?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["attendance_request_status"]
          store_id?: string
          target_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_attendance_requests_attendance_id_fkey"
            columns: ["attendance_id"]
            isOneToOne: false
            referencedRelation: "store_attendance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_attendance_requests_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "store_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_attendance_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "store_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_attendance_requests_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_handovers: {
        Row: {
          ai_summary: Json | null
          author_id: string
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          store_id: string
          target_role_id: string | null
          updated_at: string
        }
        Insert: {
          ai_summary?: Json | null
          author_id: string
          content: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          store_id: string
          target_role_id?: string | null
          updated_at?: string
        }
        Update: {
          ai_summary?: Json | null
          author_id?: string
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          store_id?: string
          target_role_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_handovers_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "store_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_handovers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_handovers_target_role_id_fkey"
            columns: ["target_role_id"]
            isOneToOne: false
            referencedRelation: "store_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      store_members: {
        Row: {
          address: string | null
          base_daily_wage: number | null
          base_hourly_wage: number | null
          base_monthly_wage: number | null
          base_yearly_wage: number | null
          birth_date: string | null
          contract_end_date: string | null
          contract_status: string | null
          custom_pay_day: number | null
          custom_wage_settings: Json | null
          deleted_at: string | null
          details: Json | null
          email: string | null
          emergency_contact: string | null
          employment_type: string | null
          hired_at: string | null
          id: string
          insurance_status: Json | null
          joined_at: string
          memo: string | null
          modusign_document_id: string | null
          name: string | null
          phone: string | null
          resigned_at: string | null
          role: string | null
          role_id: string
          status: Database["public"]["Enums"]["member_status"]
          store_id: string
          updated_at: string
          user_id: string | null
          wage_type: Database["public"]["Enums"]["wage_type"]
          weekly_holiday: number | null
          work_hours: string | null
          work_schedules: Json | null
        }
        Insert: {
          address?: string | null
          base_daily_wage?: number | null
          base_hourly_wage?: number | null
          base_monthly_wage?: number | null
          base_yearly_wage?: number | null
          birth_date?: string | null
          contract_end_date?: string | null
          contract_status?: string | null
          custom_pay_day?: number | null
          custom_wage_settings?: Json | null
          deleted_at?: string | null
          details?: Json | null
          email?: string | null
          emergency_contact?: string | null
          employment_type?: string | null
          hired_at?: string | null
          id?: string
          insurance_status?: Json | null
          joined_at?: string
          memo?: string | null
          modusign_document_id?: string | null
          name?: string | null
          phone?: string | null
          resigned_at?: string | null
          role?: string | null
          role_id: string
          status?: Database["public"]["Enums"]["member_status"]
          store_id: string
          updated_at?: string
          user_id?: string | null
          wage_type?: Database["public"]["Enums"]["wage_type"]
          weekly_holiday?: number | null
          work_hours?: string | null
          work_schedules?: Json | null
        }
        Update: {
          address?: string | null
          base_daily_wage?: number | null
          base_hourly_wage?: number | null
          base_monthly_wage?: number | null
          base_yearly_wage?: number | null
          birth_date?: string | null
          contract_end_date?: string | null
          contract_status?: string | null
          custom_pay_day?: number | null
          custom_wage_settings?: Json | null
          deleted_at?: string | null
          details?: Json | null
          email?: string | null
          emergency_contact?: string | null
          employment_type?: string | null
          hired_at?: string | null
          id?: string
          insurance_status?: Json | null
          joined_at?: string
          memo?: string | null
          modusign_document_id?: string | null
          name?: string | null
          phone?: string | null
          resigned_at?: string | null
          role?: string | null
          role_id?: string
          status?: Database["public"]["Enums"]["member_status"]
          store_id?: string
          updated_at?: string
          user_id?: string | null
          wage_type?: Database["public"]["Enums"]["wage_type"]
          weekly_holiday?: number | null
          work_hours?: string | null
          work_schedules?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "store_members_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "store_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_members_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      store_roles: {
        Row: {
          color: string | null
          created_at: string
          deleted_at: string | null
          hierarchy_level: number
          id: string
          is_system: boolean | null
          name: string
          parent_id: string | null
          permissions: Json
          store_id: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          hierarchy_level?: number
          id?: string
          is_system?: boolean | null
          name: string
          parent_id?: string | null
          permissions?: Json
          store_id: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          hierarchy_level?: number
          id?: string
          is_system?: boolean | null
          name?: string
          parent_id?: string | null
          permissions?: Json
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_roles_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "store_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_roles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address: string | null
          address_detail: string | null
          attendance_radius: number | null
          business_number: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          image_url: string | null
          invite_code: string | null
          latitude: number | null
          leave_calc_type: string | null
          longitude: number | null
          name: string
          operating_hours: Json | null
          owner_name: string | null
          pay_day: number | null
          stamp_image_url: string | null
          store_phone: string | null
          updated_at: string
          wage_end_day: number | null
          wage_exceptions: Json | null
          wage_start_day: number | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          address_detail?: string | null
          attendance_radius?: number | null
          business_number?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          invite_code?: string | null
          latitude?: number | null
          leave_calc_type?: string | null
          longitude?: number | null
          name: string
          operating_hours?: Json | null
          owner_name?: string | null
          pay_day?: number | null
          stamp_image_url?: string | null
          store_phone?: string | null
          updated_at?: string
          wage_end_day?: number | null
          wage_exceptions?: Json | null
          wage_start_day?: number | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          address_detail?: string | null
          attendance_radius?: number | null
          business_number?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          invite_code?: string | null
          latitude?: number | null
          leave_calc_type?: string | null
          longitude?: number | null
          name?: string
          operating_hours?: Json | null
          owner_name?: string | null
          pay_day?: number | null
          stamp_image_url?: string | null
          store_phone?: string | null
          updated_at?: string
          wage_end_day?: number | null
          wage_exceptions?: Json | null
          wage_start_day?: number | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stores_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_date: string | null
          assigned_role_ids: string[] | null
          assignee_id: string | null
          assigner_id: string | null
          category: string | null
          checklist: Json | null
          completed_at: string | null
          completion_note: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          done_at: string | null
          due_date: string | null
          id: string
          is_done: boolean | null
          is_routine: boolean | null
          is_template: boolean | null
          priority: string | null
          schedule_id: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["task_status"]
          store_id: string
          task_type: string | null
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assigned_date?: string | null
          assigned_role_ids?: string[] | null
          assignee_id?: string | null
          assigner_id?: string | null
          category?: string | null
          checklist?: Json | null
          completed_at?: string | null
          completion_note?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          done_at?: string | null
          due_date?: string | null
          id?: string
          is_done?: boolean | null
          is_routine?: boolean | null
          is_template?: boolean | null
          priority?: string | null
          schedule_id?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          store_id: string
          task_type?: string | null
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assigned_date?: string | null
          assigned_role_ids?: string[] | null
          assignee_id?: string | null
          assigner_id?: string | null
          category?: string | null
          checklist?: Json | null
          completed_at?: string | null
          completion_note?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          done_at?: string | null
          due_date?: string | null
          id?: string
          is_done?: boolean | null
          is_routine?: boolean | null
          is_template?: boolean | null
          priority?: string | null
          schedule_id?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          store_id?: string
          task_type?: string | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "store_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigner_id_fkey"
            columns: ["assigner_id"]
            isOneToOne: false
            referencedRelation: "store_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_transactions: {
        Row: {
          amount: number
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          payment_status: string
          statement_file_url: string | null
          store_id: string
          tax_invoice_file_url: string | null
          transaction_date: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          payment_status?: string
          statement_file_url?: string | null
          store_id: string
          tax_invoice_file_url?: string | null
          transaction_date: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          payment_status?: string
          statement_file_url?: string | null
          store_id?: string
          tax_invoice_file_url?: string | null
          transaction_date?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_transactions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_transactions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          bank_account: string | null
          business_number: string | null
          category: string | null
          contact_number: string | null
          contract_amount: number | null
          contract_end_date: string | null
          contract_file_url: string | null
          contract_start_date: string | null
          contract_type: string | null
          created_at: string
          deleted_at: string | null
          direct_contact: string | null
          email: string | null
          id: string
          is_auto_renewal: boolean | null
          manager_name: string | null
          name: string
          notes: string | null
          payment_cycle: string | null
          store_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          bank_account?: string | null
          business_number?: string | null
          category?: string | null
          contact_number?: string | null
          contract_amount?: number | null
          contract_end_date?: string | null
          contract_file_url?: string | null
          contract_start_date?: string | null
          contract_type?: string | null
          created_at?: string
          deleted_at?: string | null
          direct_contact?: string | null
          email?: string | null
          id?: string
          is_auto_renewal?: boolean | null
          manager_name?: string | null
          name: string
          notes?: string | null
          payment_cycle?: string | null
          store_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          bank_account?: string | null
          business_number?: string | null
          category?: string | null
          contact_number?: string | null
          contract_amount?: number | null
          contract_end_date?: string | null
          contract_file_url?: string | null
          contract_start_date?: string | null
          contract_type?: string | null
          created_at?: string
          deleted_at?: string | null
          direct_contact?: string | null
          email?: string | null
          id?: string
          is_auto_renewal?: boolean | null
          manager_name?: string | null
          name?: string
          notes?: string | null
          payment_cycle?: string | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendors_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_announcements: {
        Args: { store_id_param: string }
        Returns: boolean
      }
      generate_invite_code: { Args: never; Returns: string }
      get_current_member_id: {
        Args: { store_id_param: string }
        Returns: string
      }
      has_role_permission: {
        Args: { permission_code: string; store_id_param: string }
        Returns: boolean
      }
      has_store_permission: {
        Args: { permission_param: string; store_id_param: string }
        Returns: boolean
      }
      is_store_member: { Args: { store_id_param: string }; Returns: boolean }
      verify_invite_code: {
        Args: { code: string }
        Returns: {
          address: string
          description: string
          id: string
          name: string
        }[]
      }
    }
    Enums: {
      asset_status:
        | "active"
        | "needs_inspection"
        | "in_repair"
        | "disposed"
        | "under_repair"
        | "as_submitted"
      attendance_request_status: "pending" | "approved" | "rejected"
      attendance_status: "working" | "completed" | "absent"
      contract_status:
        | "draft"
        | "sent"
        | "viewed"
        | "signed"
        | "expired"
        | "canceled"
      leave_status: "pending" | "approved" | "rejected" | "canceled"
      member_status: "active" | "invited" | "pending_approval" | "inactive"
      payroll_status: "draft" | "confirmed" | "paid"
      task_status:
        | "pending"
        | "in_progress"
        | "on_hold"
        | "completed"
        | "verified"
      wage_type: "hourly" | "monthly" | "daily" | "yearly"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      asset_status: [
        "active",
        "needs_inspection",
        "in_repair",
        "disposed",
        "under_repair",
        "as_submitted",
      ],
      attendance_request_status: ["pending", "approved", "rejected"],
      attendance_status: ["working", "completed", "absent"],
      contract_status: [
        "draft",
        "sent",
        "viewed",
        "signed",
        "expired",
        "canceled",
      ],
      leave_status: ["pending", "approved", "rejected", "canceled"],
      member_status: ["active", "invited", "pending_approval", "inactive"],
      payroll_status: ["draft", "confirmed", "paid"],
      task_status: [
        "pending",
        "in_progress",
        "on_hold",
        "completed",
        "verified",
      ],
      wage_type: ["hourly", "monthly", "daily", "yearly"],
    },
  },
} as const

