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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      ad_platform_connections: {
        Row: {
          account_id: string | null
          account_name: string | null
          coach_id: string
          created_at: string
          credentials_encrypted: Json | null
          currency: string | null
          error_log: string | null
          id: string
          last_sync_at: string | null
          needs_reconnect: boolean | null
          platform: string
          status: string
          sync_data_scope: string[] | null
          sync_frequency: string | null
          timezone: string | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          account_name?: string | null
          coach_id: string
          created_at?: string
          credentials_encrypted?: Json | null
          currency?: string | null
          error_log?: string | null
          id?: string
          last_sync_at?: string | null
          needs_reconnect?: boolean | null
          platform: string
          status?: string
          sync_data_scope?: string[] | null
          sync_frequency?: string | null
          timezone?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          account_name?: string | null
          coach_id?: string
          created_at?: string
          credentials_encrypted?: Json | null
          currency?: string | null
          error_log?: string | null
          id?: string
          last_sync_at?: string | null
          needs_reconnect?: boolean | null
          platform?: string
          status?: string
          sync_data_scope?: string[] | null
          sync_frequency?: string | null
          timezone?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ai_agent_conversations: {
        Row: {
          coach_id: string | null
          content: string
          conversion_probability: number | null
          created_at: string
          escalation_flag: boolean | null
          id: string
          intent_type: string | null
          mode: string | null
          role: string
          session_id: string
          user_id: string | null
        }
        Insert: {
          coach_id?: string | null
          content: string
          conversion_probability?: number | null
          created_at?: string
          escalation_flag?: boolean | null
          id?: string
          intent_type?: string | null
          mode?: string | null
          role: string
          session_id: string
          user_id?: string | null
        }
        Update: {
          coach_id?: string | null
          content?: string
          conversion_probability?: number | null
          created_at?: string
          escalation_flag?: boolean | null
          id?: string
          intent_type?: string | null
          mode?: string | null
          role?: string
          session_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ai_blogs: {
        Row: {
          author: string | null
          blog_type: string
          category: string
          content: string | null
          created_at: string
          cta_link: string | null
          cta_text: string | null
          excerpt: string
          id: string
          image_url: string | null
          is_published: boolean
          job_data: Json | null
          meta_description: string | null
          meta_title: string | null
          published_at: string
          read_time: string
          slug: string | null
          tags: string[] | null
          title: string
        }
        Insert: {
          author?: string | null
          blog_type?: string
          category?: string
          content?: string | null
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          excerpt: string
          id?: string
          image_url?: string | null
          is_published?: boolean
          job_data?: Json | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string
          read_time?: string
          slug?: string | null
          tags?: string[] | null
          title: string
        }
        Update: {
          author?: string | null
          blog_type?: string
          category?: string
          content?: string | null
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          excerpt?: string
          id?: string
          image_url?: string | null
          is_published?: boolean
          job_data?: Json | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string
          read_time?: string
          slug?: string | null
          tags?: string[] | null
          title?: string
        }
        Relationships: []
      }
      ai_kids_enrollments: {
        Row: {
          assigned_coach_id: string | null
          city: string
          consent_accepted: boolean
          created_at: string
          email: string
          enrolled_by: string
          has_laptop: boolean
          id: string
          interested_course: string
          last_contacted_date: string | null
          lead_status: string
          learning_reason: string | null
          medium_of_education: string
          mobile_country_code: string
          mobile_number: string
          notes: string | null
          parent_name: string
          reference_id: string
          school_name: string
          student_class: string
          student_name: string
          updated_at: string
          whatsapp_country_code: string | null
          whatsapp_number: string | null
        }
        Insert: {
          assigned_coach_id?: string | null
          city: string
          consent_accepted?: boolean
          created_at?: string
          email: string
          enrolled_by: string
          has_laptop?: boolean
          id?: string
          interested_course: string
          last_contacted_date?: string | null
          lead_status?: string
          learning_reason?: string | null
          medium_of_education: string
          mobile_country_code?: string
          mobile_number: string
          notes?: string | null
          parent_name: string
          reference_id?: string
          school_name: string
          student_class: string
          student_name: string
          updated_at?: string
          whatsapp_country_code?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          assigned_coach_id?: string | null
          city?: string
          consent_accepted?: boolean
          created_at?: string
          email?: string
          enrolled_by?: string
          has_laptop?: boolean
          id?: string
          interested_course?: string
          last_contacted_date?: string | null
          lead_status?: string
          learning_reason?: string | null
          medium_of_education?: string
          mobile_country_code?: string
          mobile_number?: string
          notes?: string | null
          parent_name?: string
          reference_id?: string
          school_name?: string
          student_class?: string
          student_name?: string
          updated_at?: string
          whatsapp_country_code?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          coach_id: string | null
          created_at: string
          device_type: string | null
          entity_id: string | null
          entity_type: string | null
          event_name: string
          id: string
          page_url: string | null
          properties: Json
          referrer: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          coach_id?: string | null
          created_at?: string
          device_type?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_name: string
          id?: string
          page_url?: string | null
          properties?: Json
          referrer?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          coach_id?: string | null
          created_at?: string
          device_type?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_name?: string
          id?: string
          page_url?: string | null
          properties?: Json
          referrer?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      approval_requests: {
        Row: {
          coach_id: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          reviewed_at: string | null
          reviewer_comment: string | null
          reviewer_id: string | null
          status: string
          submitted_at: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          reviewed_at?: string | null
          reviewer_comment?: string | null
          reviewer_id?: string | null
          status?: string
          submitted_at?: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          reviewed_at?: string | null
          reviewer_comment?: string | null
          reviewer_id?: string | null
          status?: string
          submitted_at?: string
        }
        Relationships: []
      }
      assignment_leaderboard_settings: {
        Row: {
          course_id: string
          is_enabled: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          course_id: string
          is_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          course_id?: string
          is_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      assignment_submissions: {
        Row: {
          assignment_id: string
          evaluation_status: string | null
          feedback: string | null
          graded_at: string | null
          id: string
          is_late: boolean
          link_type: string | null
          score: number | null
          status: string
          submission_text: string | null
          submission_url: string | null
          submitted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assignment_id: string
          evaluation_status?: string | null
          feedback?: string | null
          graded_at?: string | null
          id?: string
          is_late?: boolean
          link_type?: string | null
          score?: number | null
          status?: string
          submission_text?: string | null
          submission_url?: string | null
          submitted_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assignment_id?: string
          evaluation_status?: string | null
          feedback?: string | null
          graded_at?: string | null
          id?: string
          is_late?: boolean
          link_type?: string | null
          score?: number | null
          status?: string
          submission_text?: string | null
          submission_url?: string | null
          submitted_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          attachment_url: string | null
          coach_id: string | null
          course_id: string
          created_at: string
          deadline_at: string | null
          description: string | null
          due_days: number | null
          id: string
          instructions: string | null
          is_published: boolean
          max_score: number
          module_id: string | null
          passing_marks: number | null
          reference_links: Json
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          attachment_url?: string | null
          coach_id?: string | null
          course_id: string
          created_at?: string
          deadline_at?: string | null
          description?: string | null
          due_days?: number | null
          id?: string
          instructions?: string | null
          is_published?: boolean
          max_score?: number
          module_id?: string | null
          passing_marks?: number | null
          reference_links?: Json
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          attachment_url?: string | null
          coach_id?: string | null
          course_id?: string
          created_at?: string
          deadline_at?: string | null
          description?: string | null
          due_days?: number | null
          id?: string
          instructions?: string | null
          is_published?: boolean
          max_score?: number
          module_id?: string | null
          passing_marks?: number | null
          reference_links?: Json
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_logs: {
        Row: {
          created_at: string
          duration_ms: number | null
          id: string
          message: string | null
          payload: Json | null
          source: string
          status: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          id?: string
          message?: string | null
          payload?: Json | null
          source: string
          status?: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          id?: string
          message?: string | null
          payload?: Json | null
          source?: string
          status?: string
        }
        Relationships: []
      }
      automation_rules: {
        Row: {
          action_config: Json
          action_type: string
          coach_id: string | null
          created_at: string
          id: string
          is_active: boolean
          last_triggered_at: string | null
          name: string
          trigger_conditions: Json
          trigger_count: number
          trigger_event: string
          updated_at: string
        }
        Insert: {
          action_config?: Json
          action_type: string
          coach_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          name: string
          trigger_conditions?: Json
          trigger_count?: number
          trigger_event: string
          updated_at?: string
        }
        Update: {
          action_config?: Json
          action_type?: string
          coach_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          name?: string
          trigger_conditions?: Json
          trigger_count?: number
          trigger_event?: string
          updated_at?: string
        }
        Relationships: []
      }
      blueprint_chat_messages: {
        Row: {
          coach_id: string
          content: string
          created_at: string
          id: string
          role: string
          step_context: number | null
        }
        Insert: {
          coach_id: string
          content: string
          created_at?: string
          id?: string
          role: string
          step_context?: number | null
        }
        Update: {
          coach_id?: string
          content?: string
          created_at?: string
          id?: string
          role?: string
          step_context?: number | null
        }
        Relationships: []
      }
      bundle_items: {
        Row: {
          bundle_id: string
          course_id: string
          created_at: string
          id: string
        }
        Insert: {
          bundle_id: string
          course_id: string
          created_at?: string
          id?: string
        }
        Update: {
          bundle_id?: string
          course_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bundle_items_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "program_bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_items_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_activity_log: {
        Row: {
          campaign_id: string
          channel: string
          clicked_at: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          delivered_at: string | null
          failed_at: string | null
          failure_reason: string | null
          id: string
          opened_at: string | null
          replied_at: string | null
          sent_at: string | null
          source: string | null
          status: string
        }
        Insert: {
          campaign_id: string
          channel?: string
          clicked_at?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          delivered_at?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          opened_at?: string | null
          replied_at?: string | null
          sent_at?: string | null
          source?: string | null
          status?: string
        }
        Update: {
          campaign_id?: string
          channel?: string
          clicked_at?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          delivered_at?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          opened_at?: string | null
          replied_at?: string | null
          sent_at?: string | null
          source?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_activity_log_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_contacts: {
        Row: {
          campaign_id: string
          company: string | null
          country_code: string | null
          created_at: string
          custom_fields: Json | null
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string
          is_duplicate: boolean
          is_valid: boolean
          last_name: string | null
          phone: string | null
          role: string | null
          source: string
          tags: string[] | null
          validation_errors: string[] | null
          whatsapp_number: string | null
        }
        Insert: {
          campaign_id: string
          company?: string | null
          country_code?: string | null
          created_at?: string
          custom_fields?: Json | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          is_duplicate?: boolean
          is_valid?: boolean
          last_name?: string | null
          phone?: string | null
          role?: string | null
          source?: string
          tags?: string[] | null
          validation_errors?: string[] | null
          whatsapp_number?: string | null
        }
        Update: {
          campaign_id?: string
          company?: string | null
          country_code?: string | null
          created_at?: string
          custom_fields?: Json | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          is_duplicate?: boolean
          is_valid?: boolean
          last_name?: string | null
          phone?: string | null
          role?: string | null
          source?: string
          tags?: string[] | null
          validation_errors?: string[] | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_contacts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_metrics: {
        Row: {
          add_to_cart: number | null
          campaign_id_external: string | null
          campaign_name: string
          checkouts: number | null
          clicks: number
          coach_id: string
          conversions: number
          country: string | null
          cpa: number | null
          cpc: number | null
          created_at: string
          ctr: number | null
          date: string
          device: string | null
          gross_revenue: number | null
          id: string
          impressions: number
          leads: number
          net_revenue: number | null
          platform: string
          product_category: string | null
          product_name: string | null
          product_sku: string | null
          purchases: number | null
          refunds: number | null
          revenue: number
          roas: number | null
          source: string | null
          spend: number
          updated_at: string
        }
        Insert: {
          add_to_cart?: number | null
          campaign_id_external?: string | null
          campaign_name: string
          checkouts?: number | null
          clicks?: number
          coach_id: string
          conversions?: number
          country?: string | null
          cpa?: number | null
          cpc?: number | null
          created_at?: string
          ctr?: number | null
          date: string
          device?: string | null
          gross_revenue?: number | null
          id?: string
          impressions?: number
          leads?: number
          net_revenue?: number | null
          platform: string
          product_category?: string | null
          product_name?: string | null
          product_sku?: string | null
          purchases?: number | null
          refunds?: number | null
          revenue?: number
          roas?: number | null
          source?: string | null
          spend?: number
          updated_at?: string
        }
        Update: {
          add_to_cart?: number | null
          campaign_id_external?: string | null
          campaign_name?: string
          checkouts?: number | null
          clicks?: number
          coach_id?: string
          conversions?: number
          country?: string | null
          cpa?: number | null
          cpc?: number | null
          created_at?: string
          ctr?: number | null
          date?: string
          device?: string | null
          gross_revenue?: number | null
          id?: string
          impressions?: number
          leads?: number
          net_revenue?: number | null
          platform?: string
          product_category?: string | null
          product_name?: string | null
          product_sku?: string | null
          purchases?: number | null
          refunds?: number | null
          revenue?: number
          roas?: number | null
          source?: string | null
          spend?: number
          updated_at?: string
        }
        Relationships: []
      }
      certificate_settings: {
        Row: {
          ai_kids_certificates_enabled: boolean
          ai_post_generation_enabled: boolean
          certificates_enabled: boolean
          course_wise_templates_enabled: boolean
          created_at: string
          default_template_id: string | null
          id: string
          linkedin_sharing_enabled: boolean
          monthly_cert_limit: number | null
          public_verification_enabled: boolean
          qr_verification_enabled: boolean
          revocation_enabled: boolean
          signature_upload_enabled: boolean
          singleton: boolean
          updated_at: string
          webinar_cert_enabled: boolean
          workshop_certificates_enabled: boolean
        }
        Insert: {
          ai_kids_certificates_enabled?: boolean
          ai_post_generation_enabled?: boolean
          certificates_enabled?: boolean
          course_wise_templates_enabled?: boolean
          created_at?: string
          default_template_id?: string | null
          id?: string
          linkedin_sharing_enabled?: boolean
          monthly_cert_limit?: number | null
          public_verification_enabled?: boolean
          qr_verification_enabled?: boolean
          revocation_enabled?: boolean
          signature_upload_enabled?: boolean
          singleton?: boolean
          updated_at?: string
          webinar_cert_enabled?: boolean
          workshop_certificates_enabled?: boolean
        }
        Update: {
          ai_kids_certificates_enabled?: boolean
          ai_post_generation_enabled?: boolean
          certificates_enabled?: boolean
          course_wise_templates_enabled?: boolean
          created_at?: string
          default_template_id?: string | null
          id?: string
          linkedin_sharing_enabled?: boolean
          monthly_cert_limit?: number | null
          public_verification_enabled?: boolean
          qr_verification_enabled?: boolean
          revocation_enabled?: boolean
          signature_upload_enabled?: boolean
          singleton?: boolean
          updated_at?: string
          webinar_cert_enabled?: boolean
          workshop_certificates_enabled?: boolean
        }
        Relationships: []
      }
      certificate_templates: {
        Row: {
          background_image_url: string | null
          background_url: string | null
          category: string | null
          coach_id: string | null
          course_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          design_config: Json | null
          id: string
          is_active: boolean
          is_default: boolean
          is_premium: boolean | null
          is_system: boolean | null
          orientation: string | null
          preview_image_url: string | null
          style_tags: string[] | null
          supported_sources: string[] | null
          template_design: Json
          template_kind: string
          tier: string
          title: string
          updated_at: string
          workshop_id: string | null
        }
        Insert: {
          background_image_url?: string | null
          background_url?: string | null
          category?: string | null
          coach_id?: string | null
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          design_config?: Json | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          is_premium?: boolean | null
          is_system?: boolean | null
          orientation?: string | null
          preview_image_url?: string | null
          style_tags?: string[] | null
          supported_sources?: string[] | null
          template_design?: Json
          template_kind?: string
          tier?: string
          title: string
          updated_at?: string
          workshop_id?: string | null
        }
        Update: {
          background_image_url?: string | null
          background_url?: string | null
          category?: string | null
          coach_id?: string | null
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          design_config?: Json | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          is_premium?: boolean | null
          is_system?: boolean | null
          orientation?: string | null
          preview_image_url?: string | null
          style_tags?: string[] | null
          supported_sources?: string[] | null
          template_design?: Json
          template_kind?: string
          tier?: string
          title?: string
          updated_at?: string
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificate_templates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_history: {
        Row: {
          content: string
          created_at: string
          id: string
          lead_id: string
          role: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          lead_id: string
          role: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          lead_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "chatbot_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_leads: {
        Row: {
          company: string | null
          country: string | null
          created_at: string
          email: string
          experience: string | null
          id: string
          industry: string | null
          name: string
          user_id: string | null
          user_type: string
          whatsapp: string
        }
        Insert: {
          company?: string | null
          country?: string | null
          created_at?: string
          email: string
          experience?: string | null
          id?: string
          industry?: string | null
          name: string
          user_id?: string | null
          user_type: string
          whatsapp: string
        }
        Update: {
          company?: string | null
          country?: string | null
          created_at?: string
          email?: string
          experience?: string | null
          id?: string
          industry?: string | null
          name?: string
          user_id?: string | null
          user_type?: string
          whatsapp?: string
        }
        Relationships: []
      }
      client_check_ins: {
        Row: {
          blockers: string | null
          check_in_date: string
          client_id: string
          coach_id: string
          created_at: string
          energy_score: number | null
          habits_completed: Json | null
          id: string
          mood_score: number | null
          reflection: string | null
          wins: string | null
        }
        Insert: {
          blockers?: string | null
          check_in_date?: string
          client_id: string
          coach_id: string
          created_at?: string
          energy_score?: number | null
          habits_completed?: Json | null
          id?: string
          mood_score?: number | null
          reflection?: string | null
          wins?: string | null
        }
        Update: {
          blockers?: string | null
          check_in_date?: string
          client_id?: string
          coach_id?: string
          created_at?: string
          energy_score?: number | null
          habits_completed?: Json | null
          id?: string
          mood_score?: number | null
          reflection?: string | null
          wins?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_check_ins_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "coach_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_goals: {
        Row: {
          client_id: string | null
          coach_id: string
          created_at: string
          description: string | null
          id: string
          priority: string | null
          progress_percent: number
          status: string
          target_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          coach_id: string
          created_at?: string
          description?: string | null
          id?: string
          priority?: string | null
          progress_percent?: number
          status?: string
          target_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          coach_id?: string
          created_at?: string
          description?: string | null
          id?: string
          priority?: string | null
          progress_percent?: number
          status?: string
          target_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_goals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "coach_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_automations: {
        Row: {
          channel: string
          coach_id: string
          created_at: string
          delay_hours: number | null
          id: string
          is_active: boolean
          last_triggered_at: string | null
          message_template: string
          name: string
          trigger_count: number
          trigger_type: string
          updated_at: string
        }
        Insert: {
          channel?: string
          coach_id: string
          created_at?: string
          delay_hours?: number | null
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          message_template: string
          name: string
          trigger_count?: number
          trigger_type: string
          updated_at?: string
        }
        Update: {
          channel?: string
          coach_id?: string
          created_at?: string
          delay_hours?: number | null
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          message_template?: string
          name?: string
          trigger_count?: number
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      coach_blueprints: {
        Row: {
          avatar_inputs: Json | null
          avatar_output: Json | null
          blueprint_pdf_url: string | null
          certificate_url: string | null
          coach_id: string
          completed_at: string | null
          completed_steps: number[]
          created_at: string
          current_step: number
          curriculum_output: Json | null
          dashboard_state: Json | null
          funnel_output: Json | null
          id: string
          is_completed: boolean
          niche_inputs: Json | null
          niche_output: Json | null
          niche_score: number | null
          offer_inputs: Json | null
          offer_output: Json | null
          offer_score: number | null
          pricing_inputs: Json | null
          pricing_output: Json | null
          pricing_score: number | null
          problems_output: Json | null
          roadmap_output: Json | null
          share_slug: string | null
          updated_at: string
        }
        Insert: {
          avatar_inputs?: Json | null
          avatar_output?: Json | null
          blueprint_pdf_url?: string | null
          certificate_url?: string | null
          coach_id: string
          completed_at?: string | null
          completed_steps?: number[]
          created_at?: string
          current_step?: number
          curriculum_output?: Json | null
          dashboard_state?: Json | null
          funnel_output?: Json | null
          id?: string
          is_completed?: boolean
          niche_inputs?: Json | null
          niche_output?: Json | null
          niche_score?: number | null
          offer_inputs?: Json | null
          offer_output?: Json | null
          offer_score?: number | null
          pricing_inputs?: Json | null
          pricing_output?: Json | null
          pricing_score?: number | null
          problems_output?: Json | null
          roadmap_output?: Json | null
          share_slug?: string | null
          updated_at?: string
        }
        Update: {
          avatar_inputs?: Json | null
          avatar_output?: Json | null
          blueprint_pdf_url?: string | null
          certificate_url?: string | null
          coach_id?: string
          completed_at?: string | null
          completed_steps?: number[]
          created_at?: string
          current_step?: number
          curriculum_output?: Json | null
          dashboard_state?: Json | null
          funnel_output?: Json | null
          id?: string
          is_completed?: boolean
          niche_inputs?: Json | null
          niche_output?: Json | null
          niche_score?: number | null
          offer_inputs?: Json | null
          offer_output?: Json | null
          offer_score?: number | null
          pricing_inputs?: Json | null
          pricing_output?: Json | null
          pricing_score?: number | null
          problems_output?: Json | null
          roadmap_output?: Json | null
          share_slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      coach_categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          is_system: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      coach_category_permissions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          category_id: string
          coach_id: string
          created_at: string
          id: string
          is_primary: boolean
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          category_id: string
          coach_id: string
          created_at?: string
          id?: string
          is_primary?: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          category_id?: string
          coach_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_category_permissions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "coach_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_category_requests: {
        Row: {
          admin_response_note: string | null
          coach_id: string
          created_at: string
          id: string
          reason: string | null
          requested_category_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_response_note?: string | null
          coach_id: string
          created_at?: string
          id?: string
          reason?: string | null
          requested_category_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_response_note?: string | null
          coach_id?: string
          created_at?: string
          id?: string
          reason?: string | null
          requested_category_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_category_requests_requested_category_id_fkey"
            columns: ["requested_category_id"]
            isOneToOne: false
            referencedRelation: "coach_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_certificate_counters: {
        Row: {
          coach_id: string
          last_number: number
          year: number
        }
        Insert: {
          coach_id: string
          last_number?: number
          year: number
        }
        Update: {
          coach_id?: string
          last_number?: number
          year?: number
        }
        Relationships: []
      }
      coach_certificate_signatures: {
        Row: {
          coach_id: string
          created_at: string
          designation: string | null
          full_name: string
          id: string
          organization: string | null
          signature_url: string | null
          updated_at: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          designation?: string | null
          full_name: string
          id?: string
          organization?: string | null
          signature_url?: string | null
          updated_at?: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          designation?: string | null
          full_name?: string
          id?: string
          organization?: string | null
          signature_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      coach_clients: {
        Row: {
          avatar_url: string | null
          coach_id: string
          created_at: string
          email: string | null
          full_name: string
          goals: string | null
          health_score: number | null
          id: string
          last_interaction_at: string | null
          lifetime_value: number | null
          notes: string | null
          phone: string | null
          source: string | null
          status: string
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          coach_id: string
          created_at?: string
          email?: string | null
          full_name: string
          goals?: string | null
          health_score?: number | null
          id?: string
          last_interaction_at?: string | null
          lifetime_value?: number | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          coach_id?: string
          created_at?: string
          email?: string | null
          full_name?: string
          goals?: string | null
          health_score?: number | null
          id?: string
          last_interaction_at?: string | null
          lifetime_value?: number | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      coach_commissions: {
        Row: {
          coach_id: string
          commission_percent: number
          id: string
          updated_at: string
        }
        Insert: {
          coach_id: string
          commission_percent?: number
          id?: string
          updated_at?: string
        }
        Update: {
          coach_id?: string
          commission_percent?: number
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      coach_content_assets: {
        Row: {
          asset_type: string
          coach_id: string
          content: string
          created_at: string
          id: string
          is_published: boolean | null
          prompt_used: string | null
          source_session_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          asset_type: string
          coach_id: string
          content: string
          created_at?: string
          id?: string
          is_published?: boolean | null
          prompt_used?: string | null
          source_session_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          asset_type?: string
          coach_id?: string
          content?: string
          created_at?: string
          id?: string
          is_published?: boolean | null
          prompt_used?: string | null
          source_session_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_content_assets_source_session_id_fkey"
            columns: ["source_session_id"]
            isOneToOne: false
            referencedRelation: "coach_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_currency_requests: {
        Row: {
          admin_notes: string | null
          coach_id: string
          created_at: string
          id: string
          requested_currency: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          coach_id: string
          created_at?: string
          id?: string
          requested_currency: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          coach_id?: string
          created_at?: string
          id?: string
          requested_currency?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      coach_currency_settings: {
        Row: {
          allowed_currencies: string[]
          coach_id: string
          created_at: string
          currency_updated_at: string
          primary_currency: string
          updated_at: string
        }
        Insert: {
          allowed_currencies?: string[]
          coach_id: string
          created_at?: string
          currency_updated_at?: string
          primary_currency?: string
          updated_at?: string
        }
        Update: {
          allowed_currencies?: string[]
          coach_id?: string
          created_at?: string
          currency_updated_at?: string
          primary_currency?: string
          updated_at?: string
        }
        Relationships: []
      }
      coach_feature_flags: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          assignments_access: boolean
          automations_access: boolean
          blueprint_access: boolean
          coach_id: string
          contact_access: boolean
          content_studio_access: boolean
          copilot_access: boolean
          courses_access: boolean
          created_at: string
          crm_access: boolean
          external_materials_access: boolean
          feed_access: boolean
          id: string
          kids_courses_access: boolean
          leads_access: boolean
          materials_access: boolean
          messaging_access: boolean
          notes: string | null
          packages_access: boolean
          paid_content_access: boolean
          profile_picture_access: boolean
          progress_access: boolean
          sessions_access: boolean
          status: string
          updated_at: string
          webinar_certification_access: boolean
          workshops_access: boolean
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          assignments_access?: boolean
          automations_access?: boolean
          blueprint_access?: boolean
          coach_id: string
          contact_access?: boolean
          content_studio_access?: boolean
          copilot_access?: boolean
          courses_access?: boolean
          created_at?: string
          crm_access?: boolean
          external_materials_access?: boolean
          feed_access?: boolean
          id?: string
          kids_courses_access?: boolean
          leads_access?: boolean
          materials_access?: boolean
          messaging_access?: boolean
          notes?: string | null
          packages_access?: boolean
          paid_content_access?: boolean
          profile_picture_access?: boolean
          progress_access?: boolean
          sessions_access?: boolean
          status?: string
          updated_at?: string
          webinar_certification_access?: boolean
          workshops_access?: boolean
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          assignments_access?: boolean
          automations_access?: boolean
          blueprint_access?: boolean
          coach_id?: string
          contact_access?: boolean
          content_studio_access?: boolean
          copilot_access?: boolean
          courses_access?: boolean
          created_at?: string
          crm_access?: boolean
          external_materials_access?: boolean
          feed_access?: boolean
          id?: string
          kids_courses_access?: boolean
          leads_access?: boolean
          materials_access?: boolean
          messaging_access?: boolean
          notes?: string | null
          packages_access?: boolean
          paid_content_access?: boolean
          profile_picture_access?: boolean
          progress_access?: boolean
          sessions_access?: boolean
          status?: string
          updated_at?: string
          webinar_certification_access?: boolean
          workshops_access?: boolean
        }
        Relationships: []
      }
      coach_feature_override: {
        Row: {
          coach_id: string
          created_at: string
          enabled: boolean | null
          feature_key: string
          id: string
          notes: string | null
          updated_at: string
          updated_by: string | null
          usage_limit: number | null
        }
        Insert: {
          coach_id: string
          created_at?: string
          enabled?: boolean | null
          feature_key: string
          id?: string
          notes?: string | null
          updated_at?: string
          updated_by?: string | null
          usage_limit?: number | null
        }
        Update: {
          coach_id?: string
          created_at?: string
          enabled?: boolean | null
          feature_key?: string
          id?: string
          notes?: string | null
          updated_at?: string
          updated_by?: string | null
          usage_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_feature_override_feature_key_fkey"
            columns: ["feature_key"]
            isOneToOne: false
            referencedRelation: "features_master"
            referencedColumns: ["feature_key"]
          },
        ]
      }
      coach_leads: {
        Row: {
          coach_id: string
          converted_client_id: string | null
          created_at: string
          email: string | null
          estimated_value: number | null
          full_name: string
          id: string
          next_action: string | null
          next_action_at: string | null
          notes: string | null
          phone: string | null
          position: number | null
          source: string | null
          stage: string
          updated_at: string
        }
        Insert: {
          coach_id: string
          converted_client_id?: string | null
          created_at?: string
          email?: string | null
          estimated_value?: number | null
          full_name: string
          id?: string
          next_action?: string | null
          next_action_at?: string | null
          notes?: string | null
          phone?: string | null
          position?: number | null
          source?: string | null
          stage?: string
          updated_at?: string
        }
        Update: {
          coach_id?: string
          converted_client_id?: string | null
          created_at?: string
          email?: string | null
          estimated_value?: number | null
          full_name?: string
          id?: string
          next_action?: string | null
          next_action_at?: string | null
          notes?: string | null
          phone?: string | null
          position?: number | null
          source?: string | null
          stage?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_leads_converted_client_id_fkey"
            columns: ["converted_client_id"]
            isOneToOne: false
            referencedRelation: "coach_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_materials: {
        Row: {
          category: string | null
          coach_id: string
          created_at: string
          description: string | null
          external_link: string
          id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          coach_id: string
          created_at?: string
          description?: string | null
          external_link: string
          id?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          coach_id?: string
          created_at?: string
          description?: string | null
          external_link?: string
          id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      coach_notification_permissions: {
        Row: {
          can_submit: boolean
          coach_id: string
          created_at: string
          id: string
          is_blocked: boolean
          notes: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          can_submit?: boolean
          coach_id: string
          created_at?: string
          id?: string
          is_blocked?: boolean
          notes?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          can_submit?: boolean
          coach_id?: string
          created_at?: string
          id?: string
          is_blocked?: boolean
          notes?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      coach_packages: {
        Row: {
          billing_interval: string | null
          coach_id: string
          created_at: string
          currency: string | null
          description: string | null
          duration_weeks: number | null
          features: Json | null
          id: string
          is_active: boolean
          is_featured: boolean | null
          name: string
          package_type: string
          price: number
          sessions_included: number | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          billing_interval?: string | null
          coach_id: string
          created_at?: string
          currency?: string | null
          description?: string | null
          duration_weeks?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean
          is_featured?: boolean | null
          name: string
          package_type?: string
          price?: number
          sessions_included?: number | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          billing_interval?: string | null
          coach_id?: string
          created_at?: string
          currency?: string | null
          description?: string | null
          duration_weeks?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean
          is_featured?: boolean | null
          name?: string
          package_type?: string
          price?: number
          sessions_included?: number | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      coach_page_views: {
        Row: {
          coach_user_id: string
          id: string
          referrer: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          viewed_at: string
          visitor_ip: string | null
        }
        Insert: {
          coach_user_id: string
          id?: string
          referrer?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          viewed_at?: string
          visitor_ip?: string | null
        }
        Update: {
          coach_user_id?: string
          id?: string
          referrer?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          viewed_at?: string
          visitor_ip?: string | null
        }
        Relationships: []
      }
      coach_platform_access: {
        Row: {
          coach_id: string
          created_at: string
          granted_by: string | null
          id: string
          is_enabled: boolean
          platform_id: string
          updated_at: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          granted_by?: string | null
          id?: string
          is_enabled?: boolean
          platform_id: string
          updated_at?: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          granted_by?: string | null
          id?: string
          is_enabled?: boolean
          platform_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      coach_session_notes: {
        Row: {
          action_items: Json | null
          client_visible: boolean | null
          coach_id: string
          created_at: string
          external_url: string | null
          file_url: string | null
          id: string
          private_notes: string | null
          session_id: string
          summary: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          action_items?: Json | null
          client_visible?: boolean | null
          coach_id: string
          created_at?: string
          external_url?: string | null
          file_url?: string | null
          id?: string
          private_notes?: string | null
          session_id: string
          summary?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          action_items?: Json | null
          client_visible?: boolean | null
          coach_id?: string
          created_at?: string
          external_url?: string | null
          file_url?: string | null
          id?: string
          private_notes?: string | null
          session_id?: string
          summary?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_session_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "coach_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_sessions: {
        Row: {
          agenda: string | null
          client_id: string | null
          client_name: string | null
          coach_id: string
          course_id: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          location: string | null
          meeting_url: string | null
          notified_on_create: boolean
          outcome: string | null
          parent_session_id: string | null
          recurrence_rule: Json | null
          recurrence_type: string
          reminder_10m_sent: boolean
          reminder_1h_sent: boolean
          reminder_24h_sent: boolean
          reminder_sent: boolean | null
          scheduled_at: string
          session_type: string
          status: string
          tags: string[]
          thumbnail_url: string | null
          title: string
          topic: string | null
          updated_at: string
        }
        Insert: {
          agenda?: string | null
          client_id?: string | null
          client_name?: string | null
          coach_id: string
          course_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          location?: string | null
          meeting_url?: string | null
          notified_on_create?: boolean
          outcome?: string | null
          parent_session_id?: string | null
          recurrence_rule?: Json | null
          recurrence_type?: string
          reminder_10m_sent?: boolean
          reminder_1h_sent?: boolean
          reminder_24h_sent?: boolean
          reminder_sent?: boolean | null
          scheduled_at: string
          session_type?: string
          status?: string
          tags?: string[]
          thumbnail_url?: string | null
          title: string
          topic?: string | null
          updated_at?: string
        }
        Update: {
          agenda?: string | null
          client_id?: string | null
          client_name?: string | null
          coach_id?: string
          course_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          location?: string | null
          meeting_url?: string | null
          notified_on_create?: boolean
          outcome?: string | null
          parent_session_id?: string | null
          recurrence_rule?: Json | null
          recurrence_type?: string
          reminder_10m_sent?: boolean
          reminder_1h_sent?: boolean
          reminder_24h_sent?: boolean
          reminder_sent?: boolean | null
          scheduled_at?: string
          session_type?: string
          status?: string
          tags?: string[]
          thumbnail_url?: string | null
          title?: string
          topic?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "coach_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_sessions_parent_session_id_fkey"
            columns: ["parent_session_id"]
            isOneToOne: false
            referencedRelation: "coach_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_subscriptions: {
        Row: {
          assigned_by: string | null
          bundle_id: string | null
          coach_id: string
          created_at: string
          ends_at: string | null
          id: string
          notes: string | null
          plan_id: string | null
          starts_at: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          bundle_id?: string | null
          coach_id: string
          created_at?: string
          ends_at?: string | null
          id?: string
          notes?: string | null
          plan_id?: string | null
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          bundle_id?: string | null
          coach_id?: string
          created_at?: string
          ends_at?: string | null
          id?: string
          notes?: string | null
          plan_id?: string | null
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_subscriptions_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "feature_bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_template_assignments: {
        Row: {
          assigned_by: string | null
          coach_id: string
          created_at: string
          id: string
          template_id: string
        }
        Insert: {
          assigned_by?: string | null
          coach_id: string
          created_at?: string
          id?: string
          template_id: string
        }
        Update: {
          assigned_by?: string | null
          coach_id?: string
          created_at?: string
          id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_template_assignments_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "certificate_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_template_customizations: {
        Row: {
          background_image_url: string | null
          base_template_id: string | null
          coach_id: string
          created_at: string
          design_config: Json
          id: string
          name: string
          orientation: string | null
          preview_image_url: string | null
          updated_at: string
        }
        Insert: {
          background_image_url?: string | null
          base_template_id?: string | null
          coach_id: string
          created_at?: string
          design_config?: Json
          id?: string
          name: string
          orientation?: string | null
          preview_image_url?: string | null
          updated_at?: string
        }
        Update: {
          background_image_url?: string | null
          base_template_id?: string | null
          coach_id?: string
          created_at?: string
          design_config?: Json
          id?: string
          name?: string
          orientation?: string | null
          preview_image_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_template_customizations_base_template_id_fkey"
            columns: ["base_template_id"]
            isOneToOne: false
            referencedRelation: "certificate_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_template_favorites: {
        Row: {
          coach_id: string
          created_at: string
          id: string
          template_id: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          id?: string
          template_id: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_template_favorites_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "certificate_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_webinar_commissions: {
        Row: {
          coach_id: string
          commission_percent: number
          id: string
          updated_at: string
        }
        Insert: {
          coach_id: string
          commission_percent?: number
          id?: string
          updated_at?: string
        }
        Update: {
          coach_id?: string
          commission_percent?: number
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      coach_website_templates: {
        Row: {
          category: string
          content_sections: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          display_order: number | null
          header_config: Json | null
          hero_variant: string | null
          id: string
          is_premium: boolean | null
          is_published: boolean | null
          layout_variant: string | null
          name: string
          preview_image: string | null
          section_order: Json | null
          section_visibility: Json | null
          theme_color: string | null
          updated_at: string | null
        }
        Insert: {
          category: string
          content_sections?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          header_config?: Json | null
          hero_variant?: string | null
          id?: string
          is_premium?: boolean | null
          is_published?: boolean | null
          layout_variant?: string | null
          name: string
          preview_image?: string | null
          section_order?: Json | null
          section_visibility?: Json | null
          theme_color?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          content_sections?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          header_config?: Json | null
          hero_variant?: string | null
          id?: string
          is_premium?: boolean | null
          is_published?: boolean | null
          layout_variant?: string | null
          name?: string
          preview_image?: string | null
          section_order?: Json | null
          section_visibility?: Json | null
          theme_color?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      coach_websites: {
        Row: {
          about_text: string | null
          admin_note: string | null
          animation_enabled: boolean | null
          banner_url: string | null
          banner_urls: string[] | null
          coach_id: string
          contact_info: Json | null
          content_sections: Json | null
          created_at: string
          custom_html: string | null
          description: string | null
          external_url: string | null
          gallery_images: string[] | null
          github_repo_url: string | null
          header_config: Json | null
          hero_variant: string | null
          id: string
          institute_name: string
          is_live: boolean
          logo_url: string | null
          meta_description: string | null
          meta_title: string | null
          section_order: Json | null
          show_about: boolean | null
          show_contact: boolean | null
          show_courses: boolean | null
          show_gallery: boolean | null
          show_testimonials: boolean | null
          show_video: boolean | null
          slug: string
          social_links: Json | null
          source_mode: string
          status: string
          tagline: string | null
          template_id: string | null
          theme_color: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          about_text?: string | null
          admin_note?: string | null
          animation_enabled?: boolean | null
          banner_url?: string | null
          banner_urls?: string[] | null
          coach_id: string
          contact_info?: Json | null
          content_sections?: Json | null
          created_at?: string
          custom_html?: string | null
          description?: string | null
          external_url?: string | null
          gallery_images?: string[] | null
          github_repo_url?: string | null
          header_config?: Json | null
          hero_variant?: string | null
          id?: string
          institute_name: string
          is_live?: boolean
          logo_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          section_order?: Json | null
          show_about?: boolean | null
          show_contact?: boolean | null
          show_courses?: boolean | null
          show_gallery?: boolean | null
          show_testimonials?: boolean | null
          show_video?: boolean | null
          slug: string
          social_links?: Json | null
          source_mode?: string
          status?: string
          tagline?: string | null
          template_id?: string | null
          theme_color?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          about_text?: string | null
          admin_note?: string | null
          animation_enabled?: boolean | null
          banner_url?: string | null
          banner_urls?: string[] | null
          coach_id?: string
          contact_info?: Json | null
          content_sections?: Json | null
          created_at?: string
          custom_html?: string | null
          description?: string | null
          external_url?: string | null
          gallery_images?: string[] | null
          github_repo_url?: string | null
          header_config?: Json | null
          hero_variant?: string | null
          id?: string
          institute_name?: string
          is_live?: boolean
          logo_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          section_order?: Json | null
          show_about?: boolean | null
          show_contact?: boolean | null
          show_courses?: boolean | null
          show_gallery?: boolean | null
          show_testimonials?: boolean | null
          show_video?: boolean | null
          slug?: string
          social_links?: Json | null
          source_mode?: string
          status?: string
          tagline?: string | null
          template_id?: string | null
          theme_color?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      communication_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      community_answers: {
        Row: {
          answer_text: string
          author_role: string
          created_at: string
          id: string
          is_best_answer: boolean
          like_count: number
          question_id: string
          user_id: string
        }
        Insert: {
          answer_text: string
          author_role?: string
          created_at?: string
          id?: string
          is_best_answer?: boolean
          like_count?: number
          question_id: string
          user_id: string
        }
        Update: {
          answer_text?: string
          author_role?: string
          created_at?: string
          id?: string
          is_best_answer?: boolean
          like_count?: number
          question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "community_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      community_badges: {
        Row: {
          color: string | null
          created_at: string
          criteria: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          criteria?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string
          criteria?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      community_bookmarks: {
        Row: {
          created_at: string
          id: string
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: []
      }
      community_comments: {
        Row: {
          author_id: string
          author_role: string
          content: string
          created_at: string
          id: string
          like_count: number
          post_id: string
          status: string
        }
        Insert: {
          author_id: string
          author_role?: string
          content: string
          created_at?: string
          id?: string
          like_count?: number
          post_id: string
          status?: string
        }
        Update: {
          author_id?: string
          author_role?: string
          content?: string
          created_at?: string
          id?: string
          like_count?: number
          post_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_event_registrations: {
        Row: {
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "community_events"
            referencedColumns: ["id"]
          },
        ]
      }
      community_events: {
        Row: {
          access_type: string
          capacity: number | null
          created_at: string
          description: string | null
          end_time: string | null
          event_type: string
          host_id: string
          host_name: string | null
          id: string
          meeting_url: string | null
          registered_count: number
          replay_url: string | null
          start_time: string
          status: string
          timezone: string | null
          title: string
        }
        Insert: {
          access_type?: string
          capacity?: number | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_type?: string
          host_id: string
          host_name?: string | null
          id?: string
          meeting_url?: string | null
          registered_count?: number
          replay_url?: string | null
          start_time: string
          status?: string
          timezone?: string | null
          title: string
        }
        Update: {
          access_type?: string
          capacity?: number | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_type?: string
          host_id?: string
          host_name?: string | null
          id?: string
          meeting_url?: string | null
          registered_count?: number
          replay_url?: string | null
          start_time?: string
          status?: string
          timezone?: string | null
          title?: string
        }
        Relationships: []
      }
      community_posts: {
        Row: {
          author_id: string
          author_role: string
          comment_count: number
          content: string
          created_at: string
          id: string
          is_featured: boolean
          is_pinned: boolean
          like_count: number
          post_type: string
          status: string
          title: string
          topic_id: string | null
          updated_at: string
          view_count: number
        }
        Insert: {
          author_id: string
          author_role?: string
          comment_count?: number
          content: string
          created_at?: string
          id?: string
          is_featured?: boolean
          is_pinned?: boolean
          like_count?: number
          post_type?: string
          status?: string
          title: string
          topic_id?: string | null
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_id?: string
          author_role?: string
          comment_count?: number
          content?: string
          created_at?: string
          id?: string
          is_featured?: boolean
          is_pinned?: boolean
          like_count?: number
          post_type?: string
          status?: string
          title?: string
          topic_id?: string | null
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "community_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      community_questions: {
        Row: {
          answer_count: number
          created_at: string
          description: string
          id: string
          is_resolved: boolean
          skill_level: string
          status: string
          title: string
          topic_id: string | null
          updated_at: string
          user_id: string
          view_count: number
        }
        Insert: {
          answer_count?: number
          created_at?: string
          description: string
          id?: string
          is_resolved?: boolean
          skill_level?: string
          status?: string
          title: string
          topic_id?: string | null
          updated_at?: string
          user_id: string
          view_count?: number
        }
        Update: {
          answer_count?: number
          created_at?: string
          description?: string
          id?: string
          is_resolved?: boolean
          skill_level?: string
          status?: string
          title?: string
          topic_id?: string | null
          updated_at?: string
          user_id?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "community_questions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "community_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      community_reactions: {
        Row: {
          created_at: string
          id: string
          reaction_type: string
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reaction_type?: string
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reaction_type?: string
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: []
      }
      community_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reported_by: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reported_by: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reported_by?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      community_topic_members: {
        Row: {
          id: string
          joined_at: string
          topic_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          topic_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          topic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_topic_members_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "community_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      community_topics: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          member_count: number
          post_count: number
          slug: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          member_count?: number
          post_count?: number
          slug?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          member_count?: number
          post_count?: number
          slug?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      contact_access_requests: {
        Row: {
          approved_by: string | null
          coach_id: string
          created_at: string
          id: string
          status: string
          updated_at: string
          user_id: string
          user_type: string
        }
        Insert: {
          approved_by?: string | null
          coach_id: string
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
          user_type?: string
        }
        Update: {
          approved_by?: string | null
          coach_id?: string
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
          user_type?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          coach_id: string
          code: string
          course_id: string | null
          created_at: string
          discount_percent: number
          expiry_date: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          revenue_generated: number
          updated_at: string
          usage_count: number
        }
        Insert: {
          coach_id: string
          code: string
          course_id?: string | null
          created_at?: string
          discount_percent?: number
          expiry_date?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          revenue_generated?: number
          updated_at?: string
          usage_count?: number
        }
        Update: {
          coach_id?: string
          code?: string
          course_id?: string | null
          created_at?: string
          discount_percent?: number
          expiry_date?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          revenue_generated?: number
          updated_at?: string
          usage_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "coupons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_access_grants: {
        Row: {
          cohort_id: string | null
          course_id: string
          created_at: string
          email: string | null
          expires_at: string | null
          granted_by: string | null
          id: string
          is_active: boolean
          notes: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cohort_id?: string | null
          course_id: string
          created_at?: string
          email?: string | null
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cohort_id?: string | null
          course_id?: string
          created_at?: string
          email?: string | null
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_access_grants_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "course_cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_access_grants_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_badges: {
        Row: {
          coach_id: string
          course_id: string
          created_at: string
          criteria_type: string
          criteria_value: number | null
          description: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          coach_id: string
          course_id: string
          created_at?: string
          criteria_type?: string
          criteria_value?: number | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          coach_id?: string
          course_id?: string
          created_at?: string
          criteria_type?: string
          criteria_value?: number | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      course_categories: {
        Row: {
          banner_url: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_visible: boolean
          name: string
          slug: string
          sort_order: number
          tagline: string | null
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_visible?: boolean
          name: string
          slug: string
          sort_order?: number
          tagline?: string | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_visible?: boolean
          name?: string
          slug?: string
          sort_order?: number
          tagline?: string | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      course_cohorts: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          max_seats: number | null
          name: string
          sort_order: number
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_seats?: number | null
          name: string
          sort_order?: number
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_seats?: number | null
          name?: string
          sort_order?: number
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_cohorts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_invites: {
        Row: {
          cohort_id: string | null
          course_id: string
          created_at: string
          created_by: string | null
          email: string | null
          expires_at: string | null
          id: string
          max_uses: number
          token: string
          use_count: number
        }
        Insert: {
          cohort_id?: string | null
          course_id: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string
          max_uses?: number
          token?: string
          use_count?: number
        }
        Update: {
          cohort_id?: string | null
          course_id?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string
          max_uses?: number
          token?: string
          use_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_invites_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "course_cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_invites_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_lessons: {
        Row: {
          content_text: string | null
          content_type: string
          content_url: string | null
          created_at: string
          drip_days: number
          duration_minutes: number | null
          id: string
          is_free_preview: boolean
          is_published: boolean
          link_clicks_count: number
          link_type: string | null
          live_session_starts_at: string | null
          live_session_url: string | null
          module_id: string
          open_in_new_tab: boolean
          preview_enabled: boolean
          provider: string | null
          sort_order: number
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content_text?: string | null
          content_type?: string
          content_url?: string | null
          created_at?: string
          drip_days?: number
          duration_minutes?: number | null
          id?: string
          is_free_preview?: boolean
          is_published?: boolean
          link_clicks_count?: number
          link_type?: string | null
          live_session_starts_at?: string | null
          live_session_url?: string | null
          module_id: string
          open_in_new_tab?: boolean
          preview_enabled?: boolean
          provider?: string | null
          sort_order?: number
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content_text?: string | null
          content_type?: string
          content_url?: string | null
          created_at?: string
          drip_days?: number
          duration_minutes?: number | null
          id?: string
          is_free_preview?: boolean
          is_published?: boolean
          link_clicks_count?: number
          link_type?: string | null
          live_session_starts_at?: string | null
          live_session_url?: string | null
          module_id?: string
          open_in_new_tab?: boolean
          preview_enabled?: boolean
          provider?: string | null
          sort_order?: number
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      course_modules: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          access_type: string
          approval_status: string
          category: string
          category_request_id: string | null
          certificate_customization_id: string | null
          certificate_included: boolean | null
          certificate_template_id: string | null
          coach_id: string
          course_type: string
          created_at: string
          curriculum: Json | null
          description: string | null
          discount_percent: number | null
          duration_hours: number
          id: string
          intro_video_url: string | null
          is_published: boolean
          kids_friendly_badge: boolean | null
          language: string
          learning_outcomes: string | null
          level: string
          live_sessions: number | null
          original_price_inr: number | null
          original_price_usd: number | null
          parent_involvement: string | null
          prerequisites: string | null
          price_inr: number
          price_usd: number
          project_count: number | null
          rejection_reason: string | null
          requires_category_approval: boolean
          safety_compliance: boolean | null
          slug: string | null
          status: string
          subtitle: string | null
          target_class: string | null
          thumbnail_approved_at: string | null
          thumbnail_approved_by: string | null
          thumbnail_status: string
          thumbnail_updated_at: string | null
          thumbnail_updated_by: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          access_type?: string
          approval_status?: string
          category?: string
          category_request_id?: string | null
          certificate_customization_id?: string | null
          certificate_included?: boolean | null
          certificate_template_id?: string | null
          coach_id: string
          course_type?: string
          created_at?: string
          curriculum?: Json | null
          description?: string | null
          discount_percent?: number | null
          duration_hours?: number
          id?: string
          intro_video_url?: string | null
          is_published?: boolean
          kids_friendly_badge?: boolean | null
          language?: string
          learning_outcomes?: string | null
          level?: string
          live_sessions?: number | null
          original_price_inr?: number | null
          original_price_usd?: number | null
          parent_involvement?: string | null
          prerequisites?: string | null
          price_inr?: number
          price_usd?: number
          project_count?: number | null
          rejection_reason?: string | null
          requires_category_approval?: boolean
          safety_compliance?: boolean | null
          slug?: string | null
          status?: string
          subtitle?: string | null
          target_class?: string | null
          thumbnail_approved_at?: string | null
          thumbnail_approved_by?: string | null
          thumbnail_status?: string
          thumbnail_updated_at?: string | null
          thumbnail_updated_by?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          access_type?: string
          approval_status?: string
          category?: string
          category_request_id?: string | null
          certificate_customization_id?: string | null
          certificate_included?: boolean | null
          certificate_template_id?: string | null
          coach_id?: string
          course_type?: string
          created_at?: string
          curriculum?: Json | null
          description?: string | null
          discount_percent?: number | null
          duration_hours?: number
          id?: string
          intro_video_url?: string | null
          is_published?: boolean
          kids_friendly_badge?: boolean | null
          language?: string
          learning_outcomes?: string | null
          level?: string
          live_sessions?: number | null
          original_price_inr?: number | null
          original_price_usd?: number | null
          parent_involvement?: string | null
          prerequisites?: string | null
          price_inr?: number
          price_usd?: number
          project_count?: number | null
          rejection_reason?: string | null
          requires_category_approval?: boolean
          safety_compliance?: boolean | null
          slug?: string | null
          status?: string
          subtitle?: string | null
          target_class?: string | null
          thumbnail_approved_at?: string | null
          thumbnail_approved_by?: string | null
          thumbnail_status?: string
          thumbnail_updated_at?: string | null
          thumbnail_updated_by?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_category_request_id_fkey"
            columns: ["category_request_id"]
            isOneToOne: false
            referencedRelation: "coach_category_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_certificate_customization_id_fkey"
            columns: ["certificate_customization_id"]
            isOneToOne: false
            referencedRelation: "coach_template_customizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_certificate_template_id_fkey"
            columns: ["certificate_template_id"]
            isOneToOne: false
            referencedRelation: "certificate_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      currencies: {
        Row: {
          country: string | null
          created_at: string
          currency_code: string
          currency_name: string
          currency_symbol: string
          exchange_rate: number
          id: string
          is_active: boolean
          is_default: boolean
          updated_at: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          currency_code: string
          currency_name: string
          currency_symbol: string
          exchange_rate?: number
          id?: string
          is_active?: boolean
          is_default?: boolean
          updated_at?: string
        }
        Update: {
          country?: string | null
          created_at?: string
          currency_code?: string
          currency_name?: string
          currency_symbol?: string
          exchange_rate?: number
          id?: string
          is_active?: boolean
          is_default?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      curriculum_link_settings: {
        Row: {
          allow_downloadable: boolean
          allow_embed: boolean
          allow_open_new_tab: boolean
          allow_preview: boolean
          allowed_link_types: string[]
          created_at: string
          domain_whitelist: string[]
          id: string
          max_links_per_lesson: number
          require_admin_approval: boolean
          updated_at: string
          updated_by: string | null
          uploads_disabled: boolean
        }
        Insert: {
          allow_downloadable?: boolean
          allow_embed?: boolean
          allow_open_new_tab?: boolean
          allow_preview?: boolean
          allowed_link_types?: string[]
          created_at?: string
          domain_whitelist?: string[]
          id?: string
          max_links_per_lesson?: number
          require_admin_approval?: boolean
          updated_at?: string
          updated_by?: string | null
          uploads_disabled?: boolean
        }
        Update: {
          allow_downloadable?: boolean
          allow_embed?: boolean
          allow_open_new_tab?: boolean
          allow_preview?: boolean
          allowed_link_types?: string[]
          created_at?: string
          domain_whitelist?: string[]
          id?: string
          max_links_per_lesson?: number
          require_admin_approval?: boolean
          updated_at?: string
          updated_by?: string | null
          uploads_disabled?: boolean
        }
        Relationships: []
      }
      daily_zip_level_scores: {
        Row: {
          completed_at: string
          id: string
          level_number: number
          score: number
          time_seconds: number
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          level_number: number
          score?: number
          time_seconds: number
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          level_number?: number
          score?: number
          time_seconds?: number
          user_id?: string
        }
        Relationships: []
      }
      daily_zip_progress: {
        Row: {
          best_time_seconds: number | null
          created_at: string
          current_level: number
          id: string
          total_games_played: number
          total_score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          best_time_seconds?: number | null
          created_at?: string
          current_level?: number
          id?: string
          total_games_played?: number
          total_score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          best_time_seconds?: number | null
          created_at?: string
          current_level?: number
          id?: string
          total_games_played?: number
          total_score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_zip_puzzles: {
        Row: {
          created_at: string
          difficulty: string
          grid_size: number
          id: string
          is_active: boolean
          puzzle_data: Json
          scheduled_date: string | null
          solution_data: Json
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          difficulty?: string
          grid_size?: number
          id?: string
          is_active?: boolean
          puzzle_data?: Json
          scheduled_date?: string | null
          solution_data?: Json
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          difficulty?: string
          grid_size?: number
          id?: string
          is_active?: boolean
          puzzle_data?: Json
          scheduled_date?: string | null
          solution_data?: Json
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_zip_scores: {
        Row: {
          completed_at: string
          id: string
          puzzle_id: string
          score: number
          time_seconds: number
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          puzzle_id: string
          score?: number
          time_seconds: number
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          puzzle_id?: string
          score?: number
          time_seconds?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_zip_scores_puzzle_id_fkey"
            columns: ["puzzle_id"]
            isOneToOne: false
            referencedRelation: "daily_zip_puzzles"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_product_coach_access: {
        Row: {
          allowed_types: string[] | null
          coach_id: string
          created_at: string
          enabled: boolean | null
          id: string
          max_products: number | null
          updated_at: string
        }
        Insert: {
          allowed_types?: string[] | null
          coach_id: string
          created_at?: string
          enabled?: boolean | null
          id?: string
          max_products?: number | null
          updated_at?: string
        }
        Update: {
          allowed_types?: string[] | null
          coach_id?: string
          created_at?: string
          enabled?: boolean | null
          id?: string
          max_products?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      digital_product_orders: {
        Row: {
          amount_paid: number
          buyer_id: string
          coach_id: string
          created_at: string
          currency: string
          delivery_status: string
          gateway_fee: number
          id: string
          net_to_coach: number
          payment_ref: string | null
          payment_status: string
          platform_fee: number
          product_id: string
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          buyer_id: string
          coach_id: string
          created_at?: string
          currency?: string
          delivery_status?: string
          gateway_fee?: number
          id?: string
          net_to_coach?: number
          payment_ref?: string | null
          payment_status?: string
          platform_fee?: number
          product_id: string
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          buyer_id?: string
          coach_id?: string
          created_at?: string
          currency?: string
          delivery_status?: string
          gateway_fee?: number
          id?: string
          net_to_coach?: number
          payment_ref?: string | null
          payment_status?: string
          platform_fee?: number
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_product_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "digital_products"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_product_settings: {
        Row: {
          allow_discount: boolean
          allow_paid: boolean
          allow_refunds: boolean
          allowed_types: string[]
          created_at: string
          global_enabled: boolean
          id: string
          max_price: number | null
          max_products_per_coach: number | null
          min_price: number | null
          platform_commission_percent: number
          require_approval: boolean
          updated_at: string
        }
        Insert: {
          allow_discount?: boolean
          allow_paid?: boolean
          allow_refunds?: boolean
          allowed_types?: string[]
          created_at?: string
          global_enabled?: boolean
          id?: string
          max_price?: number | null
          max_products_per_coach?: number | null
          min_price?: number | null
          platform_commission_percent?: number
          require_approval?: boolean
          updated_at?: string
        }
        Update: {
          allow_discount?: boolean
          allow_paid?: boolean
          allow_refunds?: boolean
          allowed_types?: string[]
          created_at?: string
          global_enabled?: boolean
          id?: string
          max_price?: number | null
          max_products_per_coach?: number | null
          min_price?: number | null
          platform_commission_percent?: number
          require_approval?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      digital_products: {
        Row: {
          approval_status: string
          available_from: string | null
          available_until: string | null
          coach_id: string
          content_text: string | null
          content_url: string | null
          cover_image_url: string | null
          created_at: string
          currency: string
          description: string | null
          discount_price: number | null
          faq: Json
          id: string
          is_paid: boolean
          limited_time: boolean
          pass_gateway_fees: boolean
          price: number | null
          product_type: string
          rejection_reason: string | null
          sales_count: number
          status: string
          tags: string[]
          title: string
          updated_at: string
          views_count: number
        }
        Insert: {
          approval_status?: string
          available_from?: string | null
          available_until?: string | null
          coach_id: string
          content_text?: string | null
          content_url?: string | null
          cover_image_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          discount_price?: number | null
          faq?: Json
          id?: string
          is_paid?: boolean
          limited_time?: boolean
          pass_gateway_fees?: boolean
          price?: number | null
          product_type: string
          rejection_reason?: string | null
          sales_count?: number
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
          views_count?: number
        }
        Update: {
          approval_status?: string
          available_from?: string | null
          available_until?: string | null
          coach_id?: string
          content_text?: string | null
          content_url?: string | null
          cover_image_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          discount_price?: number | null
          faq?: Json
          id?: string
          is_paid?: boolean
          limited_time?: boolean
          pass_gateway_fees?: boolean
          price?: number | null
          product_type?: string
          rejection_reason?: string | null
          sales_count?: number
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
          views_count?: number
        }
        Relationships: []
      }
      drive_access_settings: {
        Row: {
          allowed_mime_types: string[] | null
          id: string
          is_enabled: boolean
          max_upload_size_mb: number
          require_admin_approval: boolean
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          id?: string
          is_enabled?: boolean
          max_upload_size_mb?: number
          require_admin_approval?: boolean
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          id?: string
          is_enabled?: boolean
          max_upload_size_mb?: number
          require_admin_approval?: boolean
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      drive_activity_log: {
        Row: {
          action: string
          coach_id: string
          created_at: string | null
          drive_file_id: string | null
          file_id: string | null
          id: string
          learner_id: string | null
          metadata: Json | null
        }
        Insert: {
          action: string
          coach_id: string
          created_at?: string | null
          drive_file_id?: string | null
          file_id?: string | null
          id?: string
          learner_id?: string | null
          metadata?: Json | null
        }
        Update: {
          action?: string
          coach_id?: string
          created_at?: string | null
          drive_file_id?: string | null
          file_id?: string | null
          id?: string
          learner_id?: string | null
          metadata?: Json | null
        }
        Relationships: []
      }
      drive_coach_overrides: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          coach_id: string
          created_at: string | null
          id: string
          is_approved: boolean | null
          is_suspended: boolean | null
          max_upload_size_mb: number | null
          notes: string | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          coach_id: string
          created_at?: string | null
          id?: string
          is_approved?: boolean | null
          is_suspended?: boolean | null
          max_upload_size_mb?: number | null
          notes?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          coach_id?: string
          created_at?: string | null
          id?: string
          is_approved?: boolean | null
          is_suspended?: boolean | null
          max_upload_size_mb?: number | null
          notes?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      drive_connections: {
        Row: {
          access_token: string | null
          coach_id: string
          connected_at: string | null
          created_at: string | null
          expires_at: string | null
          google_account_email: string | null
          id: string
          last_sync_at: string | null
          provider: string
          quota_total: number | null
          quota_used: number | null
          refresh_token: string | null
          root_folder_id: string | null
          scope: string | null
          status: string
          subfolder_ids: Json | null
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          coach_id: string
          connected_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          google_account_email?: string | null
          id?: string
          last_sync_at?: string | null
          provider?: string
          quota_total?: number | null
          quota_used?: number | null
          refresh_token?: string | null
          root_folder_id?: string | null
          scope?: string | null
          status?: string
          subfolder_ids?: Json | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          coach_id?: string
          connected_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          google_account_email?: string | null
          id?: string
          last_sync_at?: string | null
          provider?: string
          quota_total?: number | null
          quota_used?: number | null
          refresh_token?: string | null
          root_folder_id?: string | null
          scope?: string | null
          status?: string
          subfolder_ids?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      drive_files: {
        Row: {
          ai_processed_at: string | null
          ai_summary: string | null
          ai_tags: string[] | null
          category: string | null
          coach_id: string
          course_id: string | null
          created_at: string | null
          drive_file_id: string
          id: string
          last_synced_at: string | null
          lesson_id: string | null
          mime_type: string | null
          name: string
          parent_folder_id: string | null
          size_bytes: number | null
          thumbnail_link: string | null
          transcript: string | null
          updated_at: string | null
          uploaded_at: string | null
          visibility: string | null
          web_content_link: string | null
          web_view_link: string | null
        }
        Insert: {
          ai_processed_at?: string | null
          ai_summary?: string | null
          ai_tags?: string[] | null
          category?: string | null
          coach_id: string
          course_id?: string | null
          created_at?: string | null
          drive_file_id: string
          id?: string
          last_synced_at?: string | null
          lesson_id?: string | null
          mime_type?: string | null
          name: string
          parent_folder_id?: string | null
          size_bytes?: number | null
          thumbnail_link?: string | null
          transcript?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          visibility?: string | null
          web_content_link?: string | null
          web_view_link?: string | null
        }
        Update: {
          ai_processed_at?: string | null
          ai_summary?: string | null
          ai_tags?: string[] | null
          category?: string | null
          coach_id?: string
          course_id?: string | null
          created_at?: string | null
          drive_file_id?: string
          id?: string
          last_synced_at?: string | null
          lesson_id?: string | null
          mime_type?: string | null
          name?: string
          parent_folder_id?: string | null
          size_bytes?: number | null
          thumbnail_link?: string | null
          transcript?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          visibility?: string | null
          web_content_link?: string | null
          web_view_link?: string | null
        }
        Relationships: []
      }
      email_campaigns: {
        Row: {
          attached_file_name: string | null
          audience_filter: Json | null
          audience_source: string | null
          audience_type: string
          channel: string
          click_rate: number | null
          coach_id: string | null
          content: string
          created_at: string
          cta_link: string | null
          cta_text: string | null
          delivery_rate: number | null
          id: string
          import_mapping: Json | null
          open_rate: number | null
          scheduled_at: string | null
          sender_email: string | null
          sender_name: string | null
          sent_at: string | null
          status: string
          subject: string
          template_name: string | null
          total_bounced: number | null
          total_clicked: number | null
          total_delivered: number | null
          total_duplicates_removed: number | null
          total_failed: number | null
          total_imported: number | null
          total_invalid: number | null
          total_opened: number | null
          total_recipients: number | null
          total_replied: number | null
          total_sent: number | null
          total_unsubscribed: number | null
          total_valid: number | null
          updated_at: string
        }
        Insert: {
          attached_file_name?: string | null
          audience_filter?: Json | null
          audience_source?: string | null
          audience_type?: string
          channel?: string
          click_rate?: number | null
          coach_id?: string | null
          content: string
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          delivery_rate?: number | null
          id?: string
          import_mapping?: Json | null
          open_rate?: number | null
          scheduled_at?: string | null
          sender_email?: string | null
          sender_name?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          template_name?: string | null
          total_bounced?: number | null
          total_clicked?: number | null
          total_delivered?: number | null
          total_duplicates_removed?: number | null
          total_failed?: number | null
          total_imported?: number | null
          total_invalid?: number | null
          total_opened?: number | null
          total_recipients?: number | null
          total_replied?: number | null
          total_sent?: number | null
          total_unsubscribed?: number | null
          total_valid?: number | null
          updated_at?: string
        }
        Update: {
          attached_file_name?: string | null
          audience_filter?: Json | null
          audience_source?: string | null
          audience_type?: string
          channel?: string
          click_rate?: number | null
          coach_id?: string | null
          content?: string
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          delivery_rate?: number | null
          id?: string
          import_mapping?: Json | null
          open_rate?: number | null
          scheduled_at?: string | null
          sender_email?: string | null
          sender_name?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          template_name?: string | null
          total_bounced?: number | null
          total_clicked?: number | null
          total_delivered?: number | null
          total_duplicates_removed?: number | null
          total_failed?: number | null
          total_imported?: number | null
          total_invalid?: number | null
          total_opened?: number | null
          total_recipients?: number | null
          total_replied?: number | null
          total_sent?: number | null
          total_unsubscribed?: number | null
          total_valid?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      email_contacts: {
        Row: {
          country: string | null
          course_enrolled: string | null
          created_at: string
          email: string
          id: string
          is_unsubscribed: boolean | null
          name: string | null
          phone: string | null
          signup_date: string | null
          source: string | null
          user_type: string | null
          whatsapp_number: string | null
        }
        Insert: {
          country?: string | null
          course_enrolled?: string | null
          created_at?: string
          email: string
          id?: string
          is_unsubscribed?: boolean | null
          name?: string | null
          phone?: string | null
          signup_date?: string | null
          source?: string | null
          user_type?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          country?: string | null
          course_enrolled?: string | null
          created_at?: string
          email?: string
          id?: string
          is_unsubscribed?: boolean | null
          name?: string | null
          phone?: string | null
          signup_date?: string | null
          source?: string | null
          user_type?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      email_marketing_access: {
        Row: {
          coach_id: string
          created_at: string
          granted_by: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          granted_by: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          granted_by?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          category: string | null
          content: string
          created_at: string
          cta_link: string | null
          cta_text: string | null
          id: string
          name: string
          subject: string
          template_html: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          id?: string
          name: string
          subject: string
          template_html?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          id?: string
          name?: string
          subject?: string
          template_html?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          amount_paid: number | null
          certificate_url: string | null
          city: string
          coach_id: string
          completed_at: string | null
          contact_number: string
          country: string
          course_id: string
          currency: string | null
          current_job_title: string
          education_qualification: string
          email: string
          enrolled_at: string
          experience_level: string
          full_name: string
          id: string
          industry: string
          last_accessed_at: string | null
          last_accessed_lesson_id: string | null
          learner_id: string
          learning_objective: string | null
          linkedin_profile: string | null
          payment_id: string | null
          payment_locked: boolean
          payment_status: string
          progress_percent: number | null
          whatsapp_number: string
        }
        Insert: {
          amount_paid?: number | null
          certificate_url?: string | null
          city: string
          coach_id: string
          completed_at?: string | null
          contact_number: string
          country: string
          course_id: string
          currency?: string | null
          current_job_title: string
          education_qualification: string
          email: string
          enrolled_at?: string
          experience_level: string
          full_name: string
          id?: string
          industry: string
          last_accessed_at?: string | null
          last_accessed_lesson_id?: string | null
          learner_id: string
          learning_objective?: string | null
          linkedin_profile?: string | null
          payment_id?: string | null
          payment_locked?: boolean
          payment_status?: string
          progress_percent?: number | null
          whatsapp_number: string
        }
        Update: {
          amount_paid?: number | null
          certificate_url?: string | null
          city?: string
          coach_id?: string
          completed_at?: string | null
          contact_number?: string
          country?: string
          course_id?: string
          currency?: string | null
          current_job_title?: string
          education_qualification?: string
          email?: string
          enrolled_at?: string
          experience_level?: string
          full_name?: string
          id?: string
          industry?: string
          last_accessed_at?: string | null
          last_accessed_lesson_id?: string | null
          learner_id?: string
          learning_objective?: string | null
          linkedin_profile?: string | null
          payment_id?: string | null
          payment_locked?: boolean
          payment_status?: string
          progress_percent?: number | null
          whatsapp_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_last_accessed_lesson_id_fkey"
            columns: ["last_accessed_lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_history: {
        Row: {
          assignment_id: string
          created_at: string
          evaluation_status: string | null
          evaluator_id: string
          feedback: string | null
          id: string
          score: number | null
          submission_id: string
        }
        Insert: {
          assignment_id: string
          created_at?: string
          evaluation_status?: string | null
          evaluator_id: string
          feedback?: string | null
          id?: string
          score?: number | null
          submission_id: string
        }
        Update: {
          assignment_id?: string
          created_at?: string
          evaluation_status?: string | null
          evaluator_id?: string
          feedback?: string | null
          id?: string
          score?: number | null
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_history_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "assignment_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      external_link_clicks: {
        Row: {
          access_mode: string
          coach_slug: string | null
          created_at: string
          feature_key: string
          id: string
          referrer: string | null
          required_login: boolean
          user_agent: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          was_authenticated: boolean
        }
        Insert: {
          access_mode?: string
          coach_slug?: string | null
          created_at?: string
          feature_key: string
          id?: string
          referrer?: string | null
          required_login?: boolean
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          was_authenticated?: boolean
        }
        Update: {
          access_mode?: string
          coach_slug?: string | null
          created_at?: string
          feature_key?: string
          id?: string
          referrer?: string | null
          required_login?: boolean
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          was_authenticated?: boolean
        }
        Relationships: []
      }
      external_link_controls: {
        Row: {
          access_mode: string
          category: string
          created_at: string
          description: string | null
          expires_at: string | null
          feature_key: string
          id: string
          is_enabled: boolean
          label: string
          public_url: string | null
          updated_at: string
          updated_by: string | null
          url_template: string | null
        }
        Insert: {
          access_mode?: string
          category?: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          feature_key: string
          id?: string
          is_enabled?: boolean
          label: string
          public_url?: string | null
          updated_at?: string
          updated_by?: string | null
          url_template?: string | null
        }
        Update: {
          access_mode?: string
          category?: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          feature_key?: string
          id?: string
          is_enabled?: boolean
          label?: string
          public_url?: string | null
          updated_at?: string
          updated_by?: string | null
          url_template?: string | null
        }
        Relationships: []
      }
      feature_access_audit_log: {
        Row: {
          changed_by: string | null
          coach_id: string
          created_at: string
          feature_key: string
          id: string
          new_value: Json | null
          old_value: Json | null
          reason: string | null
          source: string
        }
        Insert: {
          changed_by?: string | null
          coach_id: string
          created_at?: string
          feature_key: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          source?: string
        }
        Update: {
          changed_by?: string | null
          coach_id?: string
          created_at?: string
          feature_key?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          source?: string
        }
        Relationships: []
      }
      feature_access_requests: {
        Row: {
          coach_id: string
          created_at: string
          feature_key: string
          id: string
          message: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_note: string | null
          status: string
          updated_at: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          feature_key: string
          id?: string
          message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_note?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          feature_key?: string
          id?: string
          message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_note?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      feature_bundles: {
        Row: {
          created_at: string
          description: string | null
          feature_flags: Json
          id: string
          is_active: boolean
          name: string
          plan_id: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          feature_flags?: Json
          id?: string
          is_active?: boolean
          name: string
          plan_id?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          feature_flags?: Json
          id?: string
          is_active?: boolean
          name?: string
          plan_id?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_bundles_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_control_audit: {
        Row: {
          changed_by: string | null
          coach_id: string | null
          created_at: string
          feature_key: string
          id: string
          new_value: Json | null
          old_value: Json | null
          scope: string
        }
        Insert: {
          changed_by?: string | null
          coach_id?: string | null
          created_at?: string
          feature_key: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          scope: string
        }
        Update: {
          changed_by?: string | null
          coach_id?: string | null
          created_at?: string
          feature_key?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          scope?: string
        }
        Relationships: []
      }
      feature_controls: {
        Row: {
          default_usage_limit: number | null
          feature_key: string
          free_enabled: boolean
          free_usage_limit: number | null
          global_enabled: boolean
          id: string
          premium_enabled: boolean
          premium_usage_limit: number | null
          pro_enabled: boolean
          pro_usage_limit: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          default_usage_limit?: number | null
          feature_key: string
          free_enabled?: boolean
          free_usage_limit?: number | null
          global_enabled?: boolean
          id?: string
          premium_enabled?: boolean
          premium_usage_limit?: number | null
          pro_enabled?: boolean
          pro_usage_limit?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          default_usage_limit?: number | null
          feature_key?: string
          free_enabled?: boolean
          free_usage_limit?: number | null
          global_enabled?: boolean
          id?: string
          premium_enabled?: boolean
          premium_usage_limit?: number | null
          pro_enabled?: boolean
          pro_usage_limit?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_controls_feature_key_fkey"
            columns: ["feature_key"]
            isOneToOne: true
            referencedRelation: "features_master"
            referencedColumns: ["feature_key"]
          },
        ]
      }
      features_master: {
        Row: {
          category: string
          created_at: string
          depends_on: string[] | null
          description: string | null
          feature_key: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          supports_usage_limit: boolean
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          depends_on?: string[] | null
          description?: string | null
          feature_key: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          supports_usage_limit?: boolean
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          depends_on?: string[] | null
          description?: string | null
          feature_key?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          supports_usage_limit?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      funnel_config: {
        Row: {
          created_at: string | null
          day1_delay_hours: number | null
          day1_email_body: string | null
          day1_email_subject: string | null
          day1_enabled: boolean | null
          day2_delay_hours: number | null
          day2_email_body: string | null
          day2_email_subject: string | null
          day2_enabled: boolean | null
          day3_delay_hours: number | null
          day3_email_body: string | null
          day3_email_subject: string | null
          day3_enabled: boolean | null
          id: string
          is_enabled: boolean | null
          landing_page_id: string | null
          updated_at: string | null
          welcome_email_body: string | null
          welcome_email_subject: string | null
          welcome_whatsapp_message: string | null
          whatsapp_enabled: boolean | null
        }
        Insert: {
          created_at?: string | null
          day1_delay_hours?: number | null
          day1_email_body?: string | null
          day1_email_subject?: string | null
          day1_enabled?: boolean | null
          day2_delay_hours?: number | null
          day2_email_body?: string | null
          day2_email_subject?: string | null
          day2_enabled?: boolean | null
          day3_delay_hours?: number | null
          day3_email_body?: string | null
          day3_email_subject?: string | null
          day3_enabled?: boolean | null
          id?: string
          is_enabled?: boolean | null
          landing_page_id?: string | null
          updated_at?: string | null
          welcome_email_body?: string | null
          welcome_email_subject?: string | null
          welcome_whatsapp_message?: string | null
          whatsapp_enabled?: boolean | null
        }
        Update: {
          created_at?: string | null
          day1_delay_hours?: number | null
          day1_email_body?: string | null
          day1_email_subject?: string | null
          day1_enabled?: boolean | null
          day2_delay_hours?: number | null
          day2_email_body?: string | null
          day2_email_subject?: string | null
          day2_enabled?: boolean | null
          day3_delay_hours?: number | null
          day3_email_body?: string | null
          day3_email_subject?: string | null
          day3_enabled?: boolean | null
          id?: string
          is_enabled?: boolean | null
          landing_page_id?: string | null
          updated_at?: string | null
          welcome_email_body?: string | null
          welcome_email_subject?: string | null
          welcome_whatsapp_message?: string | null
          whatsapp_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "funnel_config_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: true
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_email_logs: {
        Row: {
          email_type: string
          error_message: string | null
          id: string
          lead_id: string
          recipient_email: string
          sent_at: string | null
          status: string | null
          subject: string | null
        }
        Insert: {
          email_type: string
          error_message?: string | null
          id?: string
          lead_id: string
          recipient_email: string
          sent_at?: string | null
          status?: string | null
          subject?: string | null
        }
        Update: {
          email_type?: string
          error_message?: string | null
          id?: string
          lead_id?: string
          recipient_email?: string
          sent_at?: string | null
          status?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funnel_email_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "landing_page_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          landing_page_id: string | null
          lead_id: string | null
          metadata: Json | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          landing_page_id?: string | null
          lead_id?: string | null
          metadata?: Json | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          landing_page_id?: string | null
          lead_id?: string | null
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "funnel_events_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "landing_page_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_jobs: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          job_type: string
          landing_page_id: string | null
          lead_id: string
          max_retries: number | null
          processed_at: string | null
          retry_count: number | null
          scheduled_at: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          job_type: string
          landing_page_id?: string | null
          lead_id: string
          max_retries?: number | null
          processed_at?: string | null
          retry_count?: number | null
          scheduled_at?: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          job_type?: string
          landing_page_id?: string | null
          lead_id?: string
          max_retries?: number | null
          processed_at?: string | null
          retry_count?: number | null
          scheduled_at?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funnel_jobs_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_jobs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "landing_page_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_prompts: {
        Row: {
          created_at: string
          id: string
          input_data: Json
          output_prompt: string
          prompt_type: string
          role: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          input_data?: Json
          output_prompt: string
          prompt_type: string
          role?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          input_data?: Json
          output_prompt?: string
          prompt_type?: string
          role?: string
          user_id?: string | null
        }
        Relationships: []
      }
      gsc_connections: {
        Row: {
          access_token: string | null
          created_at: string
          id: string
          last_synced_at: string | null
          refresh_token: string | null
          scope: string | null
          site_url: string
          status: string
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          id?: string
          last_synced_at?: string | null
          refresh_token?: string | null
          scope?: string | null
          site_url: string
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          id?: string
          last_synced_at?: string | null
          refresh_token?: string | null
          scope?: string | null
          site_url?: string
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      inactive_reminder_config: {
        Row: {
          created_at: string
          cta_new_tab: boolean
          cta_text: string
          cta_url: string
          email_body: string
          email_subject: string
          frequency_type: string
          id: string
          inactivity_days: number
          is_enabled: boolean
          repeat_interval_days: number
          updated_at: string
          updated_by: string | null
          user_type: string
        }
        Insert: {
          created_at?: string
          cta_new_tab?: boolean
          cta_text?: string
          cta_url?: string
          email_body?: string
          email_subject?: string
          frequency_type?: string
          id?: string
          inactivity_days?: number
          is_enabled?: boolean
          repeat_interval_days?: number
          updated_at?: string
          updated_by?: string | null
          user_type?: string
        }
        Update: {
          created_at?: string
          cta_new_tab?: boolean
          cta_text?: string
          cta_url?: string
          email_body?: string
          email_subject?: string
          frequency_type?: string
          id?: string
          inactivity_days?: number
          is_enabled?: boolean
          repeat_interval_days?: number
          updated_at?: string
          updated_by?: string | null
          user_type?: string
        }
        Relationships: []
      }
      inactive_reminder_logs: {
        Row: {
          created_at: string
          cycle_count: number | null
          email: string
          error_message: string | null
          id: string
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          cycle_count?: number | null
          email: string
          error_message?: string | null
          id?: string
          status: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          cycle_count?: number | null
          email?: string
          error_message?: string | null
          id?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      inactive_user_tracking: {
        Row: {
          created_at: string
          email_sent_flag: boolean
          id: string
          last_email_sent_date: string | null
          last_login_date: string | null
          reminder_cycle_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_sent_flag?: boolean
          id?: string
          last_email_sent_date?: string | null
          last_login_date?: string | null
          reminder_cycle_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_sent_flag?: boolean
          id?: string
          last_email_sent_date?: string | null
          last_login_date?: string | null
          reminder_cycle_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      indexing_logs: {
        Row: {
          action: string
          api_response: Json | null
          created_at: string
          error_message: string | null
          id: string
          retry_count: number
          seo_page_id: string | null
          status: string
          submitted_at: string
          url: string
        }
        Insert: {
          action?: string
          api_response?: Json | null
          created_at?: string
          error_message?: string | null
          id?: string
          retry_count?: number
          seo_page_id?: string | null
          status?: string
          submitted_at?: string
          url: string
        }
        Update: {
          action?: string
          api_response?: Json | null
          created_at?: string
          error_message?: string | null
          id?: string
          retry_count?: number
          seo_page_id?: string | null
          status?: string
          submitted_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "indexing_logs_seo_page_id_fkey"
            columns: ["seo_page_id"]
            isOneToOne: false
            referencedRelation: "seo_page_metadata"
            referencedColumns: ["id"]
          },
        ]
      }
      issued_certificates: {
        Row: {
          blockchain_hash: string | null
          certificate_number: string
          coach_designation: string | null
          coach_id: string | null
          coach_name: string | null
          coach_organization: string | null
          coach_signature_url: string | null
          completion_date: string | null
          course_id: string | null
          course_name: string | null
          created_at: string
          duration_text: string | null
          email_sent_at: string | null
          id: string
          is_valid: boolean
          issued_at: string
          learner_email: string | null
          learner_name: string | null
          linkedin_share_url: string | null
          pdf_url: string | null
          revoked_at: string | null
          revoked_by: string | null
          revoked_reason: string | null
          source_id: string | null
          source_type: string
          status: string
          template_id: string | null
          updated_at: string
          user_id: string
          verification_token: string
          webinar_id: string | null
        }
        Insert: {
          blockchain_hash?: string | null
          certificate_number: string
          coach_designation?: string | null
          coach_id?: string | null
          coach_name?: string | null
          coach_organization?: string | null
          coach_signature_url?: string | null
          completion_date?: string | null
          course_id?: string | null
          course_name?: string | null
          created_at?: string
          duration_text?: string | null
          email_sent_at?: string | null
          id?: string
          is_valid?: boolean
          issued_at?: string
          learner_email?: string | null
          learner_name?: string | null
          linkedin_share_url?: string | null
          pdf_url?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          revoked_reason?: string | null
          source_id?: string | null
          source_type?: string
          status?: string
          template_id?: string | null
          updated_at?: string
          user_id: string
          verification_token?: string
          webinar_id?: string | null
        }
        Update: {
          blockchain_hash?: string | null
          certificate_number?: string
          coach_designation?: string | null
          coach_id?: string | null
          coach_name?: string | null
          coach_organization?: string | null
          coach_signature_url?: string | null
          completion_date?: string | null
          course_id?: string | null
          course_name?: string | null
          created_at?: string
          duration_text?: string | null
          email_sent_at?: string | null
          id?: string
          is_valid?: boolean
          issued_at?: string
          learner_email?: string | null
          learner_name?: string | null
          linkedin_share_url?: string | null
          pdf_url?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          revoked_reason?: string | null
          source_id?: string | null
          source_type?: string
          status?: string
          template_id?: string | null
          updated_at?: string
          user_id?: string
          verification_token?: string
          webinar_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "issued_certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issued_certificates_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "certificate_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issued_certificates_webinar_id_fkey"
            columns: ["webinar_id"]
            isOneToOne: false
            referencedRelation: "webinars"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_questions: {
        Row: {
          ai_summary: string | null
          author_expertise: string | null
          author_name: string | null
          created_at: string
          detailed_explanation: string | null
          faqs: Json | null
          focus_keyword: string | null
          hero_image_url: string | null
          id: string
          is_published: boolean
          key_takeaways: Json | null
          last_reviewed_at: string | null
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          question: string
          reviewed_by: string | null
          secondary_keywords: string[] | null
          slug: string
          source_references: Json | null
          topic_id: string
          updated_at: string
          view_count: number
        }
        Insert: {
          ai_summary?: string | null
          author_expertise?: string | null
          author_name?: string | null
          created_at?: string
          detailed_explanation?: string | null
          faqs?: Json | null
          focus_keyword?: string | null
          hero_image_url?: string | null
          id?: string
          is_published?: boolean
          key_takeaways?: Json | null
          last_reviewed_at?: string | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          question: string
          reviewed_by?: string | null
          secondary_keywords?: string[] | null
          slug: string
          source_references?: Json | null
          topic_id: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          ai_summary?: string | null
          author_expertise?: string | null
          author_name?: string | null
          created_at?: string
          detailed_explanation?: string | null
          faqs?: Json | null
          focus_keyword?: string | null
          hero_image_url?: string | null
          id?: string
          is_published?: boolean
          key_takeaways?: Json | null
          last_reviewed_at?: string | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          question?: string
          reviewed_by?: string | null
          secondary_keywords?: string[] | null
          slug?: string
          source_references?: Json | null
          topic_id?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_questions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "knowledge_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_topics: {
        Row: {
          created_at: string
          description: string | null
          hero_image_url: string | null
          id: string
          is_published: boolean
          meta_description: string | null
          meta_title: string | null
          name: string
          primary_keyword: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          hero_image_url?: string | null
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          name: string
          primary_keyword?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          hero_image_url?: string | null
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          primary_keyword?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      landing_page_cta_clicks: {
        Row: {
          clicked_at: string | null
          cta_type: string
          id: string
          landing_page_id: string
        }
        Insert: {
          clicked_at?: string | null
          cta_type?: string
          id?: string
          landing_page_id: string
        }
        Update: {
          clicked_at?: string | null
          cta_type?: string
          id?: string
          landing_page_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "landing_page_cta_clicks_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_page_features: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          landing_page_id: string
          sort_order: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          landing_page_id: string
          sort_order?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          landing_page_id?: string
          sort_order?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "landing_page_features_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_page_leads: {
        Row: {
          city: string | null
          created_at: string
          email: string
          id: string
          landing_page_id: string
          lead_status: string | null
          mobile: string
          name: string
          notes: string | null
          source: string | null
          status: string
          updated_at: string
          years_of_expertise: number | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          email: string
          id?: string
          landing_page_id: string
          lead_status?: string | null
          mobile: string
          name: string
          notes?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          years_of_expertise?: number | null
        }
        Update: {
          city?: string | null
          created_at?: string
          email?: string
          id?: string
          landing_page_id?: string
          lead_status?: string | null
          mobile?: string
          name?: string
          notes?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          years_of_expertise?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "landing_page_leads_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_pages: {
        Row: {
          badge_text: string | null
          benefits: Json | null
          canonical_url: string | null
          category: string | null
          coach_id: string | null
          content: Json
          conversions: number
          created_at: string
          cta_link: string | null
          cta_text: string | null
          cta_type: string | null
          email_address: string | null
          floating_cta_animation: string | null
          floating_cta_enabled: boolean | null
          floating_cta_position: string | null
          floating_cta_type: string | null
          headline: string | null
          hero_image_url: string | null
          how_it_works: Json | null
          id: string
          is_published: boolean
          meta_description: string | null
          meta_title: string | null
          phone_number: string | null
          schema_markup: Json | null
          slug: string
          status: string | null
          subheadline: string | null
          theme_color: string | null
          title: string
          trust_points: Json | null
          updated_at: string
          views: number
          whatsapp_message: string | null
          whatsapp_number: string | null
        }
        Insert: {
          badge_text?: string | null
          benefits?: Json | null
          canonical_url?: string | null
          category?: string | null
          coach_id?: string | null
          content?: Json
          conversions?: number
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          cta_type?: string | null
          email_address?: string | null
          floating_cta_animation?: string | null
          floating_cta_enabled?: boolean | null
          floating_cta_position?: string | null
          floating_cta_type?: string | null
          headline?: string | null
          hero_image_url?: string | null
          how_it_works?: Json | null
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          phone_number?: string | null
          schema_markup?: Json | null
          slug: string
          status?: string | null
          subheadline?: string | null
          theme_color?: string | null
          title: string
          trust_points?: Json | null
          updated_at?: string
          views?: number
          whatsapp_message?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          badge_text?: string | null
          benefits?: Json | null
          canonical_url?: string | null
          category?: string | null
          coach_id?: string | null
          content?: Json
          conversions?: number
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          cta_type?: string | null
          email_address?: string | null
          floating_cta_animation?: string | null
          floating_cta_enabled?: boolean | null
          floating_cta_position?: string | null
          floating_cta_type?: string | null
          headline?: string | null
          hero_image_url?: string | null
          how_it_works?: Json | null
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          phone_number?: string | null
          schema_markup?: Json | null
          slug?: string
          status?: string | null
          subheadline?: string | null
          theme_color?: string | null
          title?: string
          trust_points?: Json | null
          updated_at?: string
          views?: number
          whatsapp_message?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      learner_course_badges: {
        Row: {
          awarded_at: string
          badge_id: string
          course_id: string
          id: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          badge_id: string
          course_id: string
          id?: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          badge_id?: string
          course_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learner_course_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "course_badges"
            referencedColumns: ["id"]
          },
        ]
      }
      learner_notifications: {
        Row: {
          clicked_at: string | null
          coach_id: string | null
          created_at: string
          cta_link: string | null
          id: string
          is_read: boolean
          learner_id: string
          message: string
          opened_at: string | null
          request_id: string | null
          title: string
        }
        Insert: {
          clicked_at?: string | null
          coach_id?: string | null
          created_at?: string
          cta_link?: string | null
          id?: string
          is_read?: boolean
          learner_id: string
          message: string
          opened_at?: string | null
          request_id?: string | null
          title: string
        }
        Update: {
          clicked_at?: string | null
          coach_id?: string | null
          created_at?: string
          cta_link?: string | null
          id?: string
          is_read?: boolean
          learner_id?: string
          message?: string
          opened_at?: string | null
          request_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "learner_notifications_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "notification_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      learner_session_access: {
        Row: {
          created_at: string
          id: string
          joined_at: string | null
          last_viewed_at: string
          learner_id: string
          session_id: string
          view_count: number
          viewed_notes: boolean
          watched_recording: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          joined_at?: string | null
          last_viewed_at?: string
          learner_id: string
          session_id: string
          view_count?: number
          viewed_notes?: boolean
          watched_recording?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          joined_at?: string | null
          last_viewed_at?: string
          learner_id?: string
          session_id?: string
          view_count?: number
          viewed_notes?: boolean
          watched_recording?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "learner_session_access_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "coach_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      learner_streaks: {
        Row: {
          current_streak: number
          last_active_date: string | null
          longest_streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          last_active_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          last_active_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      learner_xp: {
        Row: {
          level: number
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          level?: number
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          level?: number
          total_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lecture_media: {
        Row: {
          caption: string | null
          created_at: string
          created_by: string | null
          duration_seconds: number | null
          id: string
          image_url: string | null
          lesson_id: string
          media_type: string
          sort_order: number
          thumbnail_url: string | null
          title: string | null
          updated_at: string
          video_url: string | null
          youtube_mode: string | null
          youtube_url: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          id?: string
          image_url?: string | null
          lesson_id: string
          media_type: string
          sort_order?: number
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          video_url?: string | null
          youtube_mode?: string | null
          youtube_url?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          id?: string
          image_url?: string | null
          lesson_id?: string
          media_type?: string
          sort_order?: number
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          video_url?: string | null
          youtube_mode?: string | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lecture_media_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_bookmarks: {
        Row: {
          course_id: string
          created_at: string
          id: string
          learner_id: string
          lesson_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          learner_id: string
          lesson_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          learner_id?: string
          lesson_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_bookmarks_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_bookmarks_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_discussions: {
        Row: {
          body: string
          course_id: string
          created_at: string
          id: string
          is_pinned: boolean
          lesson_id: string
          parent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          course_id: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          lesson_id: string
          parent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          course_id?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          lesson_id?: string
          parent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_discussions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_discussions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_discussions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "lesson_discussions"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_link_clicks: {
        Row: {
          id: string
          lesson_id: string
          link_type: string | null
          occurred_at: string
          url: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          lesson_id: string
          link_type?: string | null
          occurred_at?: string
          url?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          lesson_id?: string
          link_type?: string | null
          occurred_at?: string
          url?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_link_clicks_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_notes: {
        Row: {
          body: string
          course_id: string
          created_at: string
          id: string
          learner_id: string
          lesson_id: string
          updated_at: string
          video_timestamp_sec: number | null
        }
        Insert: {
          body: string
          course_id: string
          created_at?: string
          id?: string
          learner_id: string
          lesson_id: string
          updated_at?: string
          video_timestamp_sec?: number | null
        }
        Update: {
          body?: string
          course_id?: string
          created_at?: string
          id?: string
          learner_id?: string
          lesson_id?: string
          updated_at?: string
          video_timestamp_sec?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_notes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_notes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed_at: string
          course_id: string
          id: string
          learner_id: string
          lesson_id: string
        }
        Insert: {
          completed_at?: string
          course_id: string
          id?: string
          learner_id: string
          lesson_id: string
        }
        Update: {
          completed_at?: string
          course_id?: string
          id?: string
          learner_id?: string
          lesson_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_resources: {
        Row: {
          created_at: string
          id: string
          kind: string
          lesson_id: string
          sort_order: number
          title: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          lesson_id: string
          sort_order?: number
          title: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          lesson_id?: string
          sort_order?: number
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_resources_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      linkedin_post_generations: {
        Row: {
          action: string
          coach_id: string
          coach_slug: string | null
          created_at: string
          id: string
          image_url: string | null
          post_text: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          visitor_company: string | null
          visitor_excitement: string | null
          visitor_name: string | null
          visitor_role: string | null
        }
        Insert: {
          action?: string
          coach_id: string
          coach_slug?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          post_text?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_company?: string | null
          visitor_excitement?: string | null
          visitor_name?: string | null
          visitor_role?: string | null
        }
        Update: {
          action?: string
          coach_id?: string
          coach_slug?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          post_text?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_company?: string | null
          visitor_excitement?: string | null
          visitor_name?: string | null
          visitor_role?: string | null
        }
        Relationships: []
      }
      marquee_messages: {
        Row: {
          bg_color: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          message: string
          position: string
          scheduled_at: string | null
          scroll_speed: number
          segment: string
          sort_order: number
          text_color: string
          updated_at: string
        }
        Insert: {
          bg_color?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          message: string
          position?: string
          scheduled_at?: string | null
          scroll_speed?: number
          segment?: string
          sort_order?: number
          text_color?: string
          updated_at?: string
        }
        Update: {
          bg_color?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          message?: string
          position?: string
          scheduled_at?: string | null
          scroll_speed?: number
          segment?: string
          sort_order?: number
          text_color?: string
          updated_at?: string
        }
        Relationships: []
      }
      material_downloads: {
        Row: {
          created_at: string
          email: string | null
          id: string
          material_id: string
          source: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          material_id: string
          source?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          material_id?: string
          source?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_downloads_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      material_links: {
        Row: {
          click_count: number
          created_at: string
          download_count: number
          expiry_date: string | null
          id: string
          is_active: boolean
          material_id: string
          token: string
        }
        Insert: {
          click_count?: number
          created_at?: string
          download_count?: number
          expiry_date?: string | null
          id?: string
          is_active?: boolean
          material_id: string
          token: string
        }
        Update: {
          click_count?: number
          created_at?: string
          download_count?: number
          expiry_date?: string | null
          id?: string
          is_active?: boolean
          material_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_links_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          audience_course_id: string | null
          audience_scope: string
          category: string
          coach_id: string | null
          copy_link_clicks: number
          created_at: string
          description: string | null
          download_count: number
          email_share_count: number
          external_url: string | null
          facebook_clicks: number
          facebook_url: string | null
          file_type: string | null
          file_url: string | null
          id: string
          instagram_clicks: number
          instagram_url: string | null
          is_downloadable: boolean
          is_email_shareable: boolean
          is_published: boolean
          linkedin_clicks: number
          linkedin_url: string | null
          resource_type: string
          share_count: number
          slug: string | null
          tags: string[] | null
          thumbnail_url: string | null
          tiktok_clicks: number
          tiktok_url: string | null
          title: string
          twitter_clicks: number
          twitter_url: string | null
          updated_at: string
          view_count: number
          youtube_clicks: number
          youtube_url: string | null
        }
        Insert: {
          audience_course_id?: string | null
          audience_scope?: string
          category?: string
          coach_id?: string | null
          copy_link_clicks?: number
          created_at?: string
          description?: string | null
          download_count?: number
          email_share_count?: number
          external_url?: string | null
          facebook_clicks?: number
          facebook_url?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          instagram_clicks?: number
          instagram_url?: string | null
          is_downloadable?: boolean
          is_email_shareable?: boolean
          is_published?: boolean
          linkedin_clicks?: number
          linkedin_url?: string | null
          resource_type?: string
          share_count?: number
          slug?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          tiktok_clicks?: number
          tiktok_url?: string | null
          title: string
          twitter_clicks?: number
          twitter_url?: string | null
          updated_at?: string
          view_count?: number
          youtube_clicks?: number
          youtube_url?: string | null
        }
        Update: {
          audience_course_id?: string | null
          audience_scope?: string
          category?: string
          coach_id?: string | null
          copy_link_clicks?: number
          created_at?: string
          description?: string | null
          download_count?: number
          email_share_count?: number
          external_url?: string | null
          facebook_clicks?: number
          facebook_url?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          instagram_clicks?: number
          instagram_url?: string | null
          is_downloadable?: boolean
          is_email_shareable?: boolean
          is_published?: boolean
          linkedin_clicks?: number
          linkedin_url?: string | null
          resource_type?: string
          share_count?: number
          slug?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          tiktok_clicks?: number
          tiktok_url?: string | null
          title?: string
          twitter_clicks?: number
          twitter_url?: string | null
          updated_at?: string
          view_count?: number
          youtube_clicks?: number
          youtube_url?: string | null
        }
        Relationships: []
      }
      membership_subscriptions: {
        Row: {
          billing_cycle: string
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          membership_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_cycle?: string
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          membership_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_cycle?: string
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          membership_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_subscriptions_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          coach_id: string
          created_at: string
          current_members: number
          description: string | null
          features: Json
          id: string
          is_active: boolean
          max_members: number | null
          price_monthly_inr: number
          price_monthly_usd: number
          price_yearly_inr: number | null
          price_yearly_usd: number | null
          title: string
          updated_at: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          current_members?: number
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          max_members?: number | null
          price_monthly_inr?: number
          price_monthly_usd?: number
          price_yearly_inr?: number | null
          price_yearly_usd?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          current_members?: number
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          max_members?: number | null
          price_monthly_inr?: number
          price_monthly_usd?: number
          price_yearly_inr?: number | null
          price_yearly_usd?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          parent_id: string | null
          receiver_id: string
          sender_id: string
          subject: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          parent_id?: string | null
          receiver_id: string
          sender_id: string
          subject?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          parent_id?: string | null
          receiver_id?: string
          sender_id?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
          reason: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
          reason?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
          reason?: string | null
        }
        Relationships: []
      }
      notification_requests: {
        Row: {
          audience_type: string
          course_id: string | null
          created_at: string
          cta_link: string | null
          id: string
          message: string
          recipients_count: number
          reviewed_at: string | null
          reviewer_id: string | null
          reviewer_note: string | null
          scheduled_for: string | null
          sent_at: string | null
          status: string
          submitted_by: string
          submitter_role: string
          title: string
          updated_at: string
        }
        Insert: {
          audience_type?: string
          course_id?: string | null
          created_at?: string
          cta_link?: string | null
          id?: string
          message: string
          recipients_count?: number
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_note?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          submitted_by: string
          submitter_role?: string
          title: string
          updated_at?: string
        }
        Update: {
          audience_type?: string
          course_id?: string | null
          created_at?: string
          cta_link?: string | null
          id?: string
          message?: string
          recipients_count?: number
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_note?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          submitted_by?: string
          submitter_role?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          enabled: boolean
          id: string
          key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          enabled?: boolean
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          enabled?: boolean
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      payment_status_audit: {
        Row: {
          changed_at: string
          changed_by: string
          enrollment_id: string
          id: string
          new_status: string
          notes: string | null
          old_status: string
        }
        Insert: {
          changed_at?: string
          changed_by: string
          enrollment_id: string
          id?: string
          new_status: string
          notes?: string | null
          old_status: string
        }
        Update: {
          changed_at?: string
          changed_by?: string
          enrollment_id?: string
          id?: string
          new_status?: string
          notes?: string | null
          old_status?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          coach_earning: number
          coach_id: string
          created_at: string
          currency: string
          enrollment_id: string | null
          id: string
          kind: string
          payment_provider: string
          payment_provider_id: string | null
          platform_commission: number
          status: string
          stripe_session_id: string | null
          stripe_subscription_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          coach_earning?: number
          coach_id: string
          created_at?: string
          currency?: string
          enrollment_id?: string | null
          id?: string
          kind?: string
          payment_provider?: string
          payment_provider_id?: string | null
          platform_commission?: number
          status?: string
          stripe_session_id?: string | null
          stripe_subscription_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          coach_earning?: number
          coach_id?: string
          created_at?: string
          currency?: string
          enrollment_id?: string | null
          id?: string
          kind?: string
          payment_provider?: string
          payment_provider_id?: string | null
          platform_commission?: number
          status?: string
          stripe_session_id?: string | null
          stripe_subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount: number
          coach_id: string
          id: string
          processed_at: string | null
          requested_at: string
          status: string
        }
        Insert: {
          amount: number
          coach_id: string
          id?: string
          processed_at?: string | null
          requested_at?: string
          status?: string
        }
        Update: {
          amount?: number
          coach_id?: string
          id?: string
          processed_at?: string | null
          requested_at?: string
          status?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          action: string
          created_at: string
          id: string
          is_allowed: boolean
          resource: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          is_allowed?: boolean
          resource: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          is_allowed?: boolean
          resource?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      platform_integrations_config: {
        Row: {
          category: string
          created_at: string
          id: string
          is_enabled: boolean
          oauth_config: Json | null
          platform_id: string
          platform_name: string
          setup_guide: Json | null
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          oauth_config?: Json | null
          platform_id: string
          platform_name: string
          setup_guide?: Json | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          oauth_config?: Json | null
          platform_id?: string
          platform_name?: string
          setup_guide?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      private_group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          role: string
          status: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          role?: string
          status?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "private_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "private_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      private_groups: {
        Row: {
          access_type: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          max_members: number | null
          member_count: number
          title: string
        }
        Insert: {
          access_type?: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_members?: number | null
          member_count?: number
          title: string
        }
        Update: {
          access_type?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_members?: number | null
          member_count?: number
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          category: string | null
          category_id: string | null
          certifications: string[] | null
          city: string | null
          coach_profile_image_url: string | null
          company_name: string | null
          contact_number: string | null
          country: string | null
          created_at: string
          education: string | null
          email: string | null
          experience: string | null
          experience_level: string | null
          full_name: string | null
          id: string
          industry: string | null
          intro_video_url: string | null
          is_suspended: boolean
          job_title: string | null
          last_active_at: string | null
          linkedin_profile: string | null
          marketing_consent: boolean
          profile_image_approved_at: string | null
          profile_image_approved_by: string | null
          profile_image_reject_reason: string | null
          profile_image_status: string
          profile_image_uploaded_at: string | null
          public_listing_status: string
          slug: string | null
          social_links: Json | null
          tags: string[] | null
          updated_at: string
          user_id: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          whatsapp_number: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          category?: string | null
          category_id?: string | null
          certifications?: string[] | null
          city?: string | null
          coach_profile_image_url?: string | null
          company_name?: string | null
          contact_number?: string | null
          country?: string | null
          created_at?: string
          education?: string | null
          email?: string | null
          experience?: string | null
          experience_level?: string | null
          full_name?: string | null
          id?: string
          industry?: string | null
          intro_video_url?: string | null
          is_suspended?: boolean
          job_title?: string | null
          last_active_at?: string | null
          linkedin_profile?: string | null
          marketing_consent?: boolean
          profile_image_approved_at?: string | null
          profile_image_approved_by?: string | null
          profile_image_reject_reason?: string | null
          profile_image_status?: string
          profile_image_uploaded_at?: string | null
          public_listing_status?: string
          slug?: string | null
          social_links?: Json | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          category?: string | null
          category_id?: string | null
          certifications?: string[] | null
          city?: string | null
          coach_profile_image_url?: string | null
          company_name?: string | null
          contact_number?: string | null
          country?: string | null
          created_at?: string
          education?: string | null
          email?: string | null
          experience?: string | null
          experience_level?: string | null
          full_name?: string | null
          id?: string
          industry?: string | null
          intro_video_url?: string | null
          is_suspended?: boolean
          job_title?: string | null
          last_active_at?: string | null
          linkedin_profile?: string | null
          marketing_consent?: boolean
          profile_image_approved_at?: string | null
          profile_image_approved_by?: string | null
          profile_image_reject_reason?: string | null
          profile_image_status?: string
          profile_image_uploaded_at?: string | null
          public_listing_status?: string
          slug?: string | null
          social_links?: Json | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "coach_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      program_bundles: {
        Row: {
          bundle_price_inr: number
          bundle_price_usd: number
          coach_id: string
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          revenue_generated: number
          sales_count: number
          title: string
          updated_at: string
        }
        Insert: {
          bundle_price_inr?: number
          bundle_price_usd?: number
          coach_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          revenue_generated?: number
          sales_count?: number
          title: string
          updated_at?: string
        }
        Update: {
          bundle_price_inr?: number
          bundle_price_usd?: number
          coach_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          revenue_generated?: number
          sales_count?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      prompt_library_items: {
        Row: {
          author_role: string
          category: string
          copies_count: number
          created_at: string
          description: string | null
          id: string
          likes_count: number
          prompt_text: string
          saves_count: number
          status: string
          title: string
          updated_at: string
          use_case: string | null
          user_id: string
          visibility: string
        }
        Insert: {
          author_role?: string
          category?: string
          copies_count?: number
          created_at?: string
          description?: string | null
          id?: string
          likes_count?: number
          prompt_text: string
          saves_count?: number
          status?: string
          title: string
          updated_at?: string
          use_case?: string | null
          user_id: string
          visibility?: string
        }
        Update: {
          author_role?: string
          category?: string
          copies_count?: number
          created_at?: string
          description?: string | null
          id?: string
          likes_count?: number
          prompt_text?: string
          saves_count?: number
          status?: string
          title?: string
          updated_at?: string
          use_case?: string | null
          user_id?: string
          visibility?: string
        }
        Relationships: []
      }
      public_linkedin_post_generations: {
        Row: {
          action: string
          created_at: string
          id: string
          user_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          answers: Json
          completed_at: string | null
          id: string
          passed: boolean
          quiz_id: string
          score: number
          started_at: string
          total_points: number
          user_id: string
        }
        Insert: {
          answers?: Json
          completed_at?: string | null
          id?: string
          passed?: boolean
          quiz_id: string
          score?: number
          started_at?: string
          total_points?: number
          user_id: string
        }
        Update: {
          answers?: Json
          completed_at?: string | null
          id?: string
          passed?: boolean
          quiz_id?: string
          score?: number
          started_at?: string
          total_points?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_answer: string
          created_at: string
          id: string
          options: Json
          points: number
          question_text: string
          question_type: string
          quiz_id: string
          sort_order: number
        }
        Insert: {
          correct_answer: string
          created_at?: string
          id?: string
          options?: Json
          points?: number
          question_text: string
          question_type?: string
          quiz_id: string
          sort_order?: number
        }
        Update: {
          correct_answer?: string
          created_at?: string
          id?: string
          options?: Json
          points?: number
          question_text?: string
          question_type?: string
          quiz_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          course_id: string | null
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          lesson_id: string | null
          max_attempts: number | null
          pass_percentage: number
          time_limit_minutes: number | null
          title: string
          updated_at: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          lesson_id?: string | null
          max_attempts?: number | null
          pass_percentage?: number
          time_limit_minutes?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          lesson_id?: string | null
          max_attempts?: number | null
          pass_percentage?: number
          time_limit_minutes?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_clicks: {
        Row: {
          clicked_at: string
          course_id: string | null
          id: string
          referral_code: string | null
          referrer_id: string
          referrer_role: string
          referrer_url: string | null
          user_agent: string | null
          visitor_ip: string | null
        }
        Insert: {
          clicked_at?: string
          course_id?: string | null
          id?: string
          referral_code?: string | null
          referrer_id: string
          referrer_role?: string
          referrer_url?: string | null
          user_agent?: string | null
          visitor_ip?: string | null
        }
        Update: {
          clicked_at?: string
          course_id?: string | null
          id?: string
          referral_code?: string | null
          referrer_id?: string
          referrer_role?: string
          referrer_url?: string | null
          user_agent?: string | null
          visitor_ip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_clicks_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          click_count: number
          commission_earned: number | null
          commission_percent: number
          converted_at: string | null
          course_id: string | null
          created_at: string
          id: string
          points_earned: number | null
          purchase_id: string | null
          referral_code: string | null
          referred_email: string
          referred_user_id: string | null
          referrer_id: string
          referrer_role: string
          status: string
        }
        Insert: {
          click_count?: number
          commission_earned?: number | null
          commission_percent?: number
          converted_at?: string | null
          course_id?: string | null
          created_at?: string
          id?: string
          points_earned?: number | null
          purchase_id?: string | null
          referral_code?: string | null
          referred_email: string
          referred_user_id?: string | null
          referrer_id: string
          referrer_role: string
          status?: string
        }
        Update: {
          click_count?: number
          commission_earned?: number | null
          commission_percent?: number
          converted_at?: string | null
          course_id?: string | null
          created_at?: string
          id?: string
          points_earned?: number | null
          purchase_id?: string | null
          referral_code?: string | null
          referred_email?: string
          referred_user_id?: string | null
          referrer_id?: string
          referrer_role?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      report_audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          resource_id: string | null
          resource_type: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      report_sharing_requests: {
        Row: {
          access_token: string | null
          admin_notes: string | null
          approved_at: string | null
          coach_id: string
          created_at: string
          id: string
          recipient_email: string
          recipient_name: string
          recipient_role: string | null
          rejected_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          admin_notes?: string | null
          approved_at?: string | null
          coach_id: string
          created_at?: string
          id?: string
          recipient_email: string
          recipient_name: string
          recipient_role?: string | null
          rejected_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          admin_notes?: string | null
          approved_at?: string | null
          coach_id?: string
          created_at?: string
          id?: string
          recipient_email?: string
          recipient_name?: string
          recipient_role?: string | null
          rejected_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      review_replies: {
        Row: {
          coach_id: string
          created_at: string
          id: string
          reply_text: string
          review_id: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          id?: string
          reply_text: string
          review_id: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          id?: string
          reply_text?: string
          review_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_replies_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "public_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_replies_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          coach_id: string
          comment: string | null
          course_id: string
          created_at: string
          id: string
          is_approved: boolean
          learner_id: string
          rating: number
          review_text: string | null
          status: string
          updated_at: string
        }
        Insert: {
          coach_id: string
          comment?: string | null
          course_id: string
          created_at?: string
          id?: string
          is_approved?: boolean
          learner_id: string
          rating: number
          review_text?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          coach_id?: string
          comment?: string | null
          course_id?: string
          created_at?: string
          id?: string
          is_approved?: boolean
          learner_id?: string
          rating?: number
          review_text?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_alerts: {
        Row: {
          alert_type: string
          coach_id: string | null
          created_at: string
          details: Json | null
          id: string
          is_resolved: boolean
          message: string
          page_url: string
          resolved_at: string | null
          severity: string
          updated_at: string
        }
        Insert: {
          alert_type: string
          coach_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          is_resolved?: boolean
          message: string
          page_url: string
          resolved_at?: string | null
          severity?: string
          updated_at?: string
        }
        Update: {
          alert_type?: string
          coach_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          is_resolved?: boolean
          message?: string
          page_url?: string
          resolved_at?: string | null
          severity?: string
          updated_at?: string
        }
        Relationships: []
      }
      seo_page_metadata: {
        Row: {
          canonical_url: string | null
          coach_id: string | null
          content_length: number | null
          crawl_errors: string | null
          created_at: string
          h1_tag: string | null
          heading_structure: Json | null
          id: string
          image_alt_text: string | null
          image_count: number | null
          images_with_alt: number | null
          index_status: string
          indexed_date: string | null
          indexing_submitted_at: string | null
          internal_links_count: number | null
          is_auto_generated: boolean
          last_crawled_at: string | null
          meta_description: string | null
          meta_title: string | null
          page_title: string | null
          page_type: string
          page_url: string
          primary_keyword: string | null
          robots_directive: string
          schema_markup: Json | null
          secondary_keywords: string[] | null
          seo_score: number | null
          seo_suggestions: Json | null
          sitemap_included: boolean
          updated_at: string
        }
        Insert: {
          canonical_url?: string | null
          coach_id?: string | null
          content_length?: number | null
          crawl_errors?: string | null
          created_at?: string
          h1_tag?: string | null
          heading_structure?: Json | null
          id?: string
          image_alt_text?: string | null
          image_count?: number | null
          images_with_alt?: number | null
          index_status?: string
          indexed_date?: string | null
          indexing_submitted_at?: string | null
          internal_links_count?: number | null
          is_auto_generated?: boolean
          last_crawled_at?: string | null
          meta_description?: string | null
          meta_title?: string | null
          page_title?: string | null
          page_type?: string
          page_url: string
          primary_keyword?: string | null
          robots_directive?: string
          schema_markup?: Json | null
          secondary_keywords?: string[] | null
          seo_score?: number | null
          seo_suggestions?: Json | null
          sitemap_included?: boolean
          updated_at?: string
        }
        Update: {
          canonical_url?: string | null
          coach_id?: string | null
          content_length?: number | null
          crawl_errors?: string | null
          created_at?: string
          h1_tag?: string | null
          heading_structure?: Json | null
          id?: string
          image_alt_text?: string | null
          image_count?: number | null
          images_with_alt?: number | null
          index_status?: string
          indexed_date?: string | null
          indexing_submitted_at?: string | null
          internal_links_count?: number | null
          is_auto_generated?: boolean
          last_crawled_at?: string | null
          meta_description?: string | null
          meta_title?: string | null
          page_title?: string | null
          page_type?: string
          page_url?: string
          primary_keyword?: string | null
          robots_directive?: string
          schema_markup?: Json | null
          secondary_keywords?: string[] | null
          seo_score?: number | null
          seo_suggestions?: Json | null
          sitemap_included?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      seo_ping_log: {
        Row: {
          http_status: number | null
          id: string
          pinged_at: string
          response_body: string | null
          search_engine: string
          sitemap_url: string
          status: string
        }
        Insert: {
          http_status?: number | null
          id?: string
          pinged_at?: string
          response_body?: string | null
          search_engine: string
          sitemap_url: string
          status: string
        }
        Update: {
          http_status?: number | null
          id?: string
          pinged_at?: string
          response_body?: string | null
          search_engine?: string
          sitemap_url?: string
          status?: string
        }
        Relationships: []
      }
      seo_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      seo_templates: {
        Row: {
          created_at: string
          default_schema_type: string | null
          h1_template: string | null
          id: string
          is_active: boolean
          meta_description_template: string
          meta_title_template: string
          name: string
          page_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_schema_type?: string | null
          h1_template?: string | null
          id?: string
          is_active?: boolean
          meta_description_template: string
          meta_title_template: string
          name: string
          page_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_schema_type?: string | null
          h1_template?: string | null
          id?: string
          is_active?: boolean
          meta_description_template?: string
          meta_title_template?: string
          name?: string
          page_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          availability_schedule: Json | null
          booking_url: string | null
          category: string | null
          coach_id: string
          created_at: string
          currency: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          is_published: boolean
          max_bookings_per_day: number | null
          price_inr: number
          price_usd: number
          service_type: string
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          total_bookings: number
          updated_at: string
        }
        Insert: {
          availability_schedule?: Json | null
          booking_url?: string | null
          category?: string | null
          coach_id: string
          created_at?: string
          currency?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          is_published?: boolean
          max_bookings_per_day?: number | null
          price_inr?: number
          price_usd?: number
          service_type?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          total_bookings?: number
          updated_at?: string
        }
        Update: {
          availability_schedule?: Json | null
          booking_url?: string | null
          category?: string | null
          coach_id?: string
          created_at?: string
          currency?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          is_published?: boolean
          max_bookings_per_day?: number | null
          price_inr?: number
          price_usd?: number
          service_type?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          total_bookings?: number
          updated_at?: string
        }
        Relationships: []
      }
      session_recordings: {
        Row: {
          coach_id: string
          created_at: string
          id: string
          provider: string | null
          recording_url: string
          session_id: string
          title: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          id?: string
          provider?: string | null
          recording_url: string
          session_id: string
          title: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          id?: string
          provider?: string | null
          recording_url?: string
          session_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_recordings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "coach_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_resources: {
        Row: {
          coach_id: string
          created_at: string
          external_url: string | null
          file_url: string | null
          id: string
          resource_type: string
          session_id: string
          title: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          external_url?: string | null
          file_url?: string | null
          id?: string
          resource_type?: string
          session_id: string
          title: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          external_url?: string | null
          file_url?: string | null
          id?: string
          resource_type?: string
          session_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_resources_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "coach_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      signup_submissions: {
        Row: {
          created_at: string
          email: string
          field_count: number
          form_data: Json
          id: string
          signup_method: string
          source_url: string | null
          user_agent: string | null
          user_id: string | null
          user_type: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          created_at?: string
          email: string
          field_count?: number
          form_data?: Json
          id?: string
          signup_method?: string
          source_url?: string | null
          user_agent?: string | null
          user_id?: string | null
          user_type: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          field_count?: number
          form_data?: Json
          id?: string
          signup_method?: string
          source_url?: string | null
          user_agent?: string | null
          user_id?: string | null
          user_type?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      social_posts: {
        Row: {
          content: string
          created_at: string
          hashtags: string[] | null
          id: string
          image_url: string | null
          link_url: string | null
          platforms: string[] | null
          published_at: string | null
          scheduled_at: string | null
          status: string
          title: string | null
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          content: string
          created_at?: string
          hashtags?: string[] | null
          id?: string
          image_url?: string | null
          link_url?: string | null
          platforms?: string[] | null
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          hashtags?: string[] | null
          id?: string
          image_url?: string | null
          link_url?: string | null
          platforms?: string[] | null
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: []
      }
      stripe_subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          price_id: string
          product_id: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id: string
          product_id: string
          status?: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id?: string
          product_id?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          billing_interval: string
          created_at: string
          currency: string
          description: string | null
          highlight: boolean
          id: string
          is_active: boolean
          name: string
          price: number
          price_usd: number | null
          slug: string
          sort_order: number
          stripe_product_slug: string | null
          updated_at: string
        }
        Insert: {
          billing_interval?: string
          created_at?: string
          currency?: string
          description?: string | null
          highlight?: boolean
          id?: string
          is_active?: boolean
          name: string
          price?: number
          price_usd?: number | null
          slug: string
          sort_order?: number
          stripe_product_slug?: string | null
          updated_at?: string
        }
        Update: {
          billing_interval?: string
          created_at?: string
          currency?: string
          description?: string | null
          highlight?: boolean
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          price_usd?: number | null
          slug?: string
          sort_order?: number
          stripe_product_slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      thumbnail_access: {
        Row: {
          coach_id: string
          created_at: string
          granted_by: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          granted_by: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          granted_by?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          coach_earnings: number
          coach_id: string | null
          created_at: string
          currency: string
          id: string
          metadata: Json | null
          payment_gateway_id: string | null
          payment_method: string | null
          platform_fee: number
          reference_id: string | null
          reference_type: string | null
          refund_reason: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount?: number
          coach_earnings?: number
          coach_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          payment_gateway_id?: string | null
          payment_method?: string | null
          platform_fee?: number
          reference_id?: string | null
          reference_type?: string | null
          refund_reason?: string | null
          status?: string
          type?: string
          user_id: string
        }
        Update: {
          amount?: number
          coach_earnings?: number
          coach_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          payment_gateway_id?: string | null
          payment_method?: string | null
          platform_fee?: number
          reference_id?: string | null
          reference_type?: string | null
          refund_reason?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          awarded_at: string
          badge_id: string
          id: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          badge_id: string
          id?: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          badge_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "community_badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webinar_payments: {
        Row: {
          amount: number
          coupon_code: string | null
          created_at: string
          currency: string
          discount_percent: number | null
          id: string
          learner_id: string
          payment_id: string | null
          payment_status: string
          webinar_id: string
        }
        Insert: {
          amount?: number
          coupon_code?: string | null
          created_at?: string
          currency?: string
          discount_percent?: number | null
          id?: string
          learner_id: string
          payment_id?: string | null
          payment_status?: string
          webinar_id: string
        }
        Update: {
          amount?: number
          coupon_code?: string | null
          created_at?: string
          currency?: string
          discount_percent?: number | null
          id?: string
          learner_id?: string
          payment_id?: string | null
          payment_status?: string
          webinar_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webinar_payments_webinar_id_fkey"
            columns: ["webinar_id"]
            isOneToOne: false
            referencedRelation: "webinars"
            referencedColumns: ["id"]
          },
        ]
      }
      webinar_registrations: {
        Row: {
          amount_paid: number
          attended: boolean
          converted: boolean
          email_sent: boolean
          id: string
          join_time: string | null
          learner_id: string
          leave_time: string | null
          payment_id: string | null
          payment_status: string
          registered_at: string
          registrant_email: string | null
          registrant_name: string | null
          registrant_phone: string | null
          reminder_10m_sent: boolean
          reminder_1h_sent: boolean
          reminder_24h_sent: boolean
          watch_duration_minutes: number | null
          webinar_id: string
        }
        Insert: {
          amount_paid?: number
          attended?: boolean
          converted?: boolean
          email_sent?: boolean
          id?: string
          join_time?: string | null
          learner_id: string
          leave_time?: string | null
          payment_id?: string | null
          payment_status?: string
          registered_at?: string
          registrant_email?: string | null
          registrant_name?: string | null
          registrant_phone?: string | null
          reminder_10m_sent?: boolean
          reminder_1h_sent?: boolean
          reminder_24h_sent?: boolean
          watch_duration_minutes?: number | null
          webinar_id: string
        }
        Update: {
          amount_paid?: number
          attended?: boolean
          converted?: boolean
          email_sent?: boolean
          id?: string
          join_time?: string | null
          learner_id?: string
          leave_time?: string | null
          payment_id?: string | null
          payment_status?: string
          registered_at?: string
          registrant_email?: string | null
          registrant_name?: string | null
          registrant_phone?: string | null
          reminder_10m_sent?: boolean
          reminder_1h_sent?: boolean
          reminder_24h_sent?: boolean
          watch_duration_minutes?: number | null
          webinar_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webinar_registrations_webinar_id_fkey"
            columns: ["webinar_id"]
            isOneToOne: false
            referencedRelation: "webinars"
            referencedColumns: ["id"]
          },
        ]
      }
      webinars: {
        Row: {
          auto_record: boolean
          cert_completion_criteria: string
          cert_description: string | null
          cert_enabled: boolean
          cert_qr_enabled: boolean
          cert_signature_id: string | null
          cert_template_id: string | null
          cert_title: string | null
          cert_validity_months: number | null
          certificate_customization_id: string | null
          certificate_template_id: string | null
          coach_id: string
          coupon_code: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_paid: boolean
          is_published: boolean
          is_recurring: boolean
          learning_outcomes: string | null
          max_attendees: number | null
          meeting_type: string
          price_inr: number
          price_usd: number
          recurring_pattern: string | null
          registration_required: boolean
          skills_covered: string | null
          timezone: string
          title: string
          total_revenue: number
          updated_at: string
          waiting_room: boolean
          webinar_date: string
          webinar_link: string
          webinar_link_status: string
          webinar_time: string
          webinar_type: string
        }
        Insert: {
          auto_record?: boolean
          cert_completion_criteria?: string
          cert_description?: string | null
          cert_enabled?: boolean
          cert_qr_enabled?: boolean
          cert_signature_id?: string | null
          cert_template_id?: string | null
          cert_title?: string | null
          cert_validity_months?: number | null
          certificate_customization_id?: string | null
          certificate_template_id?: string | null
          coach_id: string
          coupon_code?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_paid?: boolean
          is_published?: boolean
          is_recurring?: boolean
          learning_outcomes?: string | null
          max_attendees?: number | null
          meeting_type?: string
          price_inr?: number
          price_usd?: number
          recurring_pattern?: string | null
          registration_required?: boolean
          skills_covered?: string | null
          timezone?: string
          title: string
          total_revenue?: number
          updated_at?: string
          waiting_room?: boolean
          webinar_date: string
          webinar_link: string
          webinar_link_status?: string
          webinar_time: string
          webinar_type?: string
        }
        Update: {
          auto_record?: boolean
          cert_completion_criteria?: string
          cert_description?: string | null
          cert_enabled?: boolean
          cert_qr_enabled?: boolean
          cert_signature_id?: string | null
          cert_template_id?: string | null
          cert_title?: string | null
          cert_validity_months?: number | null
          certificate_customization_id?: string | null
          certificate_template_id?: string | null
          coach_id?: string
          coupon_code?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_paid?: boolean
          is_published?: boolean
          is_recurring?: boolean
          learning_outcomes?: string | null
          max_attendees?: number | null
          meeting_type?: string
          price_inr?: number
          price_usd?: number
          recurring_pattern?: string | null
          registration_required?: boolean
          skills_covered?: string | null
          timezone?: string
          title?: string
          total_revenue?: number
          updated_at?: string
          waiting_room?: boolean
          webinar_date?: string
          webinar_link?: string
          webinar_link_status?: string
          webinar_time?: string
          webinar_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "webinars_cert_signature_id_fkey"
            columns: ["cert_signature_id"]
            isOneToOne: false
            referencedRelation: "coach_certificate_signatures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webinars_cert_template_id_fkey"
            columns: ["cert_template_id"]
            isOneToOne: false
            referencedRelation: "certificate_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webinars_certificate_customization_id_fkey"
            columns: ["certificate_customization_id"]
            isOneToOne: false
            referencedRelation: "coach_template_customizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webinars_certificate_template_id_fkey"
            columns: ["certificate_template_id"]
            isOneToOne: false
            referencedRelation: "certificate_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_access: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          coach_id: string
          created_at: string
          daily_message_limit: number | null
          granted_by: string | null
          id: string
          is_active: boolean
          is_approved: boolean
          meta_display_name: string | null
          meta_phone_number_id: string | null
          meta_waba_id: string | null
          monthly_campaign_credits: number | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          coach_id: string
          created_at?: string
          daily_message_limit?: number | null
          granted_by?: string | null
          id?: string
          is_active?: boolean
          is_approved?: boolean
          meta_display_name?: string | null
          meta_phone_number_id?: string | null
          meta_waba_id?: string | null
          monthly_campaign_credits?: number | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          coach_id?: string
          created_at?: string
          daily_message_limit?: number | null
          granted_by?: string | null
          id?: string
          is_active?: boolean
          is_approved?: boolean
          meta_display_name?: string | null
          meta_phone_number_id?: string | null
          meta_waba_id?: string | null
          monthly_campaign_credits?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_automation_runs: {
        Row: {
          automation_id: string
          coach_id: string
          conversation_id: string | null
          created_at: string
          error: string | null
          id: string
          result: Json | null
          status: string
          trigger_payload: Json | null
        }
        Insert: {
          automation_id: string
          coach_id: string
          conversation_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          result?: Json | null
          status?: string
          trigger_payload?: Json | null
        }
        Update: {
          automation_id?: string
          coach_id?: string
          conversation_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          result?: Json | null
          status?: string
          trigger_payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_automation_runs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_automations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_automations: {
        Row: {
          actions: Json
          ai_persona: string | null
          coach_id: string
          created_at: string
          id: string
          is_active: boolean
          last_run_at: string | null
          name: string
          total_runs: number
          trigger_config: Json
          trigger_type: string
          updated_at: string
          use_ai_reply: boolean
        }
        Insert: {
          actions?: Json
          ai_persona?: string | null
          coach_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name: string
          total_runs?: number
          trigger_config?: Json
          trigger_type: string
          updated_at?: string
          use_ai_reply?: boolean
        }
        Update: {
          actions?: Json
          ai_persona?: string | null
          coach_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name?: string
          total_runs?: number
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
          use_ai_reply?: boolean
        }
        Relationships: []
      }
      whatsapp_campaigns: {
        Row: {
          audience_tags: string[] | null
          audience_type: string
          coach_id: string
          created_at: string
          id: string
          name: string
          scheduled_at: string | null
          sent_at: string | null
          status: string
          template_id: string | null
          template_variables: Json | null
          total_clicked: number | null
          total_delivered: number | null
          total_failed: number | null
          total_read: number | null
          total_recipients: number | null
          total_replied: number | null
          total_sent: number | null
          updated_at: string
        }
        Insert: {
          audience_tags?: string[] | null
          audience_type?: string
          coach_id: string
          created_at?: string
          id?: string
          name: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          template_id?: string | null
          template_variables?: Json | null
          total_clicked?: number | null
          total_delivered?: number | null
          total_failed?: number | null
          total_read?: number | null
          total_recipients?: number | null
          total_replied?: number | null
          total_sent?: number | null
          updated_at?: string
        }
        Update: {
          audience_tags?: string[] | null
          audience_type?: string
          coach_id?: string
          created_at?: string
          id?: string
          name?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          template_id?: string | null
          template_variables?: Json | null
          total_clicked?: number | null
          total_delivered?: number | null
          total_failed?: number | null
          total_read?: number | null
          total_recipients?: number | null
          total_replied?: number | null
          total_sent?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_coach_subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          coach_id: string
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_id: string
          provider: string | null
          provider_subscription_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          coach_id: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id: string
          provider?: string | null
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          coach_id?: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string
          provider?: string | null
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_coach_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_contacts: {
        Row: {
          coach_id: string
          created_at: string
          email: string | null
          id: string
          is_opted_in: boolean
          name: string | null
          phone: string
          source: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          email?: string | null
          id?: string
          is_opted_in?: boolean
          name?: string | null
          phone: string
          source?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          email?: string | null
          id?: string
          is_opted_in?: boolean
          name?: string | null
          phone?: string
          source?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_conversations: {
        Row: {
          assigned_to: string | null
          coach_id: string
          contact_id: string | null
          contact_name: string | null
          created_at: string
          id: string
          is_archived: boolean
          last_message_at: string
          last_message_preview: string | null
          unread_count: number
          updated_at: string
          wa_phone: string
        }
        Insert: {
          assigned_to?: string | null
          coach_id: string
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean
          last_message_at?: string
          last_message_preview?: string | null
          unread_count?: number
          updated_at?: string
          wa_phone: string
        }
        Update: {
          assigned_to?: string | null
          coach_id?: string
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean
          last_message_at?: string
          last_message_preview?: string | null
          unread_count?: number
          updated_at?: string
          wa_phone?: string
        }
        Relationships: []
      }
      whatsapp_credential_requests: {
        Row: {
          coach_id: string
          created_at: string
          id: string
          note: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          id?: string
          note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          id?: string
          note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_credentials: {
        Row: {
          coach_id: string
          created_at: string
          id: string
          login_url: string
          password: string | null
          updated_at: string
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          coach_id: string
          created_at?: string
          id?: string
          login_url?: string
          password?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          coach_id?: string
          created_at?: string
          id?: string
          login_url?: string
          password?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      whatsapp_credit_transactions: {
        Row: {
          balance_after: number
          campaign_id: string | null
          coach_id: string
          created_at: string
          delta: number
          id: string
          notes: string | null
          payment_id: string | null
          reason: string
        }
        Insert: {
          balance_after: number
          campaign_id?: string | null
          coach_id: string
          created_at?: string
          delta: number
          id?: string
          notes?: string | null
          payment_id?: string | null
          reason: string
        }
        Update: {
          balance_after?: number
          campaign_id?: string | null
          coach_id?: string
          created_at?: string
          delta?: number
          id?: string
          notes?: string | null
          payment_id?: string | null
          reason?: string
        }
        Relationships: []
      }
      whatsapp_credits: {
        Row: {
          balance: number
          coach_id: string
          created_at: string
          id: string
          last_reset_at: string | null
          monthly_quota: number
          next_reset_at: string | null
          updated_at: string
        }
        Insert: {
          balance?: number
          coach_id: string
          created_at?: string
          id?: string
          last_reset_at?: string | null
          monthly_quota?: number
          next_reset_at?: string | null
          updated_at?: string
        }
        Update: {
          balance?: number
          coach_id?: string
          created_at?: string
          id?: string
          last_reset_at?: string | null
          monthly_quota?: number
          next_reset_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          campaign_id: string | null
          coach_id: string
          content: string | null
          conversation_id: string
          created_at: string
          direction: string
          error: string | null
          id: string
          media_type: string | null
          media_url: string | null
          sent_by: string | null
          status: string
          template_id: string | null
          template_name: string | null
          wa_message_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          coach_id: string
          content?: string | null
          conversation_id: string
          created_at?: string
          direction: string
          error?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          sent_by?: string | null
          status?: string
          template_id?: string | null
          template_name?: string | null
          wa_message_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          coach_id?: string
          content?: string | null
          conversation_id?: string
          created_at?: string
          direction?: string
          error?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          sent_by?: string | null
          status?: string
          template_id?: string | null
          template_name?: string | null
          wa_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_subscription_plans: {
        Row: {
          created_at: string
          features: Json
          id: string
          is_active: boolean
          monthly_messages: number
          name: string
          price_inr: number
          price_usd: number
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          features?: Json
          id?: string
          is_active?: boolean
          monthly_messages: number
          name: string
          price_inr?: number
          price_usd?: number
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          features?: Json
          id?: string
          is_active?: boolean
          monthly_messages?: number
          name?: string
          price_inr?: number
          price_usd?: number
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_templates: {
        Row: {
          category: string
          coach_id: string | null
          content: string
          created_at: string
          id: string
          is_global: boolean
          name: string
          status: string
          updated_at: string
          variables: string[] | null
        }
        Insert: {
          category?: string
          coach_id?: string | null
          content: string
          created_at?: string
          id?: string
          is_global?: boolean
          name: string
          status?: string
          updated_at?: string
          variables?: string[] | null
        }
        Update: {
          category?: string
          coach_id?: string | null
          content?: string
          created_at?: string
          id?: string
          is_global?: boolean
          name?: string
          status?: string
          updated_at?: string
          variables?: string[] | null
        }
        Relationships: []
      }
      wishlists: {
        Row: {
          course_id: string
          created_at: string
          id: string
          learner_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          learner_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          learner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      workshop_access: {
        Row: {
          analytics_access: boolean
          coach_id: string
          created_at: string
          email_sending: boolean
          id: string
          is_active: boolean
          meeting_creation: boolean
          recording_access: boolean
          updated_at: string
        }
        Insert: {
          analytics_access?: boolean
          coach_id: string
          created_at?: string
          email_sending?: boolean
          id?: string
          is_active?: boolean
          meeting_creation?: boolean
          recording_access?: boolean
          updated_at?: string
        }
        Update: {
          analytics_access?: boolean
          coach_id?: string
          created_at?: string
          email_sending?: boolean
          id?: string
          is_active?: boolean
          meeting_creation?: boolean
          recording_access?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      workshop_registrations: {
        Row: {
          created_at: string
          id: string
          joined_at: string | null
          left_at: string | null
          status: string
          user_id: string
          watch_duration_seconds: number | null
          workshop_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          status?: string
          user_id: string
          watch_duration_seconds?: number | null
          workshop_id: string
        }
        Update: {
          created_at?: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          status?: string
          user_id?: string
          watch_duration_seconds?: number | null
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshop_registrations_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      workshops: {
        Row: {
          cert_description: string | null
          cert_enabled: boolean | null
          cert_title: string | null
          certificate_customization_id: string | null
          certificate_template_id: string | null
          coach_id: string
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_recurring: boolean
          max_attendees: number | null
          meeting_provider: string | null
          meeting_url: string | null
          recording_url: string | null
          recurrence_pattern: string | null
          scheduled_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          cert_description?: string | null
          cert_enabled?: boolean | null
          cert_title?: string | null
          certificate_customization_id?: string | null
          certificate_template_id?: string | null
          coach_id: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_recurring?: boolean
          max_attendees?: number | null
          meeting_provider?: string | null
          meeting_url?: string | null
          recording_url?: string | null
          recurrence_pattern?: string | null
          scheduled_at: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          cert_description?: string | null
          cert_enabled?: boolean | null
          cert_title?: string | null
          certificate_customization_id?: string | null
          certificate_template_id?: string | null
          coach_id?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_recurring?: boolean
          max_attendees?: number | null
          meeting_provider?: string | null
          meeting_url?: string | null
          recording_url?: string | null
          recurrence_pattern?: string | null
          scheduled_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshops_certificate_customization_id_fkey"
            columns: ["certificate_customization_id"]
            isOneToOne: false
            referencedRelation: "coach_template_customizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshops_certificate_template_id_fkey"
            columns: ["certificate_template_id"]
            isOneToOne: false
            referencedRelation: "certificate_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      xp_events: {
        Row: {
          course_id: string | null
          created_at: string
          id: string
          points: number
          source: string
          source_id: string | null
          user_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          id?: string
          points: number
          source: string
          source_id?: string | null
          user_id: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          id?: string
          points?: number
          source?: string
          source_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      coach_profiles_public: {
        Row: {
          avatar_url: string | null
          bio: string | null
          category: string | null
          certifications: string[] | null
          country: string | null
          created_at: string | null
          education: string | null
          experience: string | null
          full_name: string | null
          industry: string | null
          intro_video_url: string | null
          job_title: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          category?: string | null
          certifications?: string[] | null
          country?: string | null
          created_at?: string | null
          education?: string | null
          experience?: string | null
          full_name?: string | null
          industry?: string | null
          intro_video_url?: string | null
          job_title?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          category?: string | null
          certifications?: string[] | null
          country?: string | null
          created_at?: string | null
          education?: string | null
          experience?: string | null
          full_name?: string | null
          industry?: string | null
          intro_video_url?: string | null
          job_title?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      coach_public_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          category: string | null
          category_id: string | null
          certifications: string[] | null
          city: string | null
          company_name: string | null
          country: string | null
          created_at: string | null
          education: string | null
          experience: string | null
          experience_level: string | null
          full_name: string | null
          id: string | null
          industry: string | null
          intro_video_url: string | null
          is_suspended: boolean | null
          job_title: string | null
          last_active_at: string | null
          linkedin_profile: string | null
          public_listing_status: string | null
          slug: string | null
          social_links: Json | null
          tags: string[] | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          category?: string | null
          category_id?: string | null
          certifications?: string[] | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          education?: string | null
          experience?: string | null
          experience_level?: string | null
          full_name?: string | null
          id?: string | null
          industry?: string | null
          intro_video_url?: string | null
          is_suspended?: boolean | null
          job_title?: string | null
          last_active_at?: string | null
          linkedin_profile?: string | null
          public_listing_status?: string | null
          slug?: string | null
          social_links?: Json | null
          tags?: string[] | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          category?: string | null
          category_id?: string | null
          certifications?: string[] | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          education?: string | null
          experience?: string | null
          experience_level?: string | null
          full_name?: string | null
          id?: string | null
          industry?: string | null
          intro_video_url?: string | null
          is_suspended?: boolean | null
          job_title?: string | null
          last_active_at?: string | null
          linkedin_profile?: string | null
          public_listing_status?: string | null
          slug?: string | null
          social_links?: Json | null
          tags?: string[] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "coach_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      course_leaderboard_v: {
        Row: {
          avg_score: number | null
          completed_count: number | null
          course_id: string | null
          last_submitted_at: string | null
          rank_position: number | null
          submitted_count: number | null
          total_published: number | null
          total_score: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      public_reviews: {
        Row: {
          anonymous_reviewer_id: string | null
          coach_id: string | null
          comment: string | null
          course_id: string | null
          created_at: string | null
          id: string | null
          rating: number | null
        }
        Insert: {
          anonymous_reviewer_id?: never
          coach_id?: string | null
          comment?: string | null
          course_id?: string | null
          created_at?: string | null
          id?: string | null
          rating?: number | null
        }
        Update: {
          anonymous_reviewer_id?: never
          coach_id?: string | null
          comment?: string | null
          course_id?: string | null
          created_at?: string | null
          id?: string | null
          rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      approve_notification_request: {
        Args: { _request_id: string; _reviewer_note?: string }
        Returns: Json
      }
      award_xp: {
        Args: {
          _course_id?: string
          _points: number
          _source: string
          _source_id?: string
          _user_id: string
        }
        Returns: Json
      }
      coach_has_assignments_access: {
        Args: { _coach_id: string }
        Returns: boolean
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      drive_get_effective_access: { Args: { _coach_id: string }; Returns: Json }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_coach_effective_features: {
        Args: { _coach_id: string }
        Returns: Json
      }
      get_digital_product_access: { Args: { _coach_id: string }; Returns: Json }
      get_effective_feature: {
        Args: { _coach_id: string; _feature_key: string; _plan?: string }
        Returns: Json
      }
      get_quiz_questions_for_learner: {
        Args: { _quiz_id: string }
        Returns: {
          id: string
          options: Json
          points: number
          question_text: string
          question_type: string
          quiz_id: string
          sort_order: number
        }[]
      }
      get_webinar_join_link: { Args: { _webinar_id: string }; Returns: string }
      grade_quiz_attempt: {
        Args: { _answers: Json; _quiz_id: string }
        Returns: Json
      }
      has_active_subscription: {
        Args: { check_env?: string; user_uuid: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      learner_enrolled_in_course: {
        Args: { _course: string; _learner: string }
        Returns: boolean
      }
      learner_enrolled_with_coach: {
        Args: { _coach: string; _learner: string }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      next_certificate_number: {
        Args: { _coach_id: string; _year: number }
        Returns: string
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      recompute_course_progress: {
        Args: { _course: string; _learner: string }
        Returns: number
      }
      redeem_course_invite: { Args: { _token: string }; Returns: Json }
      reject_notification_request: {
        Args: { _request_id: string; _reviewer_note?: string }
        Returns: Json
      }
      review_coach_profile_image: {
        Args: { _action: string; _coach_id: string; _reason?: string }
        Returns: Json
      }
      revoke_certificate: {
        Args: { _certificate_id: string; _reason: string }
        Returns: Json
      }
      update_learner_streak: { Args: { _user_id: string }; Returns: Json }
      user_has_course_access: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
      verify_certificate_public: { Args: { _token: string }; Returns: Json }
      wa_admin_grant_credits: {
        Args: {
          _amount: number
          _coach_id: string
          _notes?: string
          _reason?: string
        }
        Returns: Json
      }
      wa_consume_credit: {
        Args: { _campaign_id?: string; _coach_id: string; _count: number }
        Returns: Json
      }
      wa_get_or_create_conversation: {
        Args: { _coach_id: string; _contact_name?: string; _wa_phone: string }
        Returns: string
      }
    }
    Enums: {
      app_role:
        | "learner"
        | "coach"
        | "admin"
        | "super_admin"
        | "moderator"
        | "finance_admin"
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
      app_role: [
        "learner",
        "coach",
        "admin",
        "super_admin",
        "moderator",
        "finance_admin",
      ],
    },
  },
} as const
