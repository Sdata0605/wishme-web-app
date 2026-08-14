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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      abandoned_cart_tracking: {
        Row: {
          cart_data: Json | null
          celebrity_id: string | null
          checkout_completed: boolean | null
          checkout_started_at: string | null
          created_at: string | null
          id: string
          reminder_sent: boolean | null
          reminder_sent_at: string | null
          service_type: string | null
          user_id: string
        }
        Insert: {
          cart_data?: Json | null
          celebrity_id?: string | null
          checkout_completed?: boolean | null
          checkout_started_at?: string | null
          created_at?: string | null
          id?: string
          reminder_sent?: boolean | null
          reminder_sent_at?: string | null
          service_type?: string | null
          user_id: string
        }
        Update: {
          cart_data?: Json | null
          celebrity_id?: string | null
          checkout_completed?: boolean | null
          checkout_started_at?: string | null
          created_at?: string | null
          id?: string
          reminder_sent?: boolean | null
          reminder_sent_at?: string | null
          service_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "abandoned_cart_tracking_celebrity_id_fkey"
            columns: ["celebrity_id"]
            isOneToOne: false
            referencedRelation: "celebrities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abandoned_cart_tracking_celebrity_id_fkey"
            columns: ["celebrity_id"]
            isOneToOne: false
            referencedRelation: "celebrities_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abandoned_cart_tracking_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abandoned_cart_tracking_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      addresses: {
        Row: {
          address_line_1: string
          address_line_2: string | null
          address_type: string | null
          area: string | null
          city: string
          country_id: string | null
          created_at: string
          id: string
          is_default: boolean | null
          pincode: string
          state: string
          state_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line_1: string
          address_line_2?: string | null
          address_type?: string | null
          area?: string | null
          city: string
          country_id?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          pincode: string
          state: string
          state_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line_1?: string
          address_line_2?: string | null
          address_type?: string | null
          area?: string | null
          city?: string
          country_id?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          pincode?: string
          state?: string
          state_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "addresses_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_media_assets: {
        Row: {
          asset_type: string
          celebrity_id: string | null
          created_at: string | null
          display_order: number | null
          file_url: string
          id: string
          is_active: boolean | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          asset_type: string
          celebrity_id?: string | null
          created_at?: string | null
          display_order?: number | null
          file_url: string
          id?: string
          is_active?: boolean | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          asset_type?: string
          celebrity_id?: string | null
          created_at?: string | null
          display_order?: number | null
          file_url?: string
          id?: string
          is_active?: boolean | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_media_assets_celebrity_id_fkey"
            columns: ["celebrity_id"]
            isOneToOne: false
            referencedRelation: "celebrities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_media_assets_celebrity_id_fkey"
            columns: ["celebrity_id"]
            isOneToOne: false
            referencedRelation: "celebrities_public"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          actions: Json | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_voice_input: boolean | null
          role: string
          suggestions: Json | null
        }
        Insert: {
          actions?: Json | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_voice_input?: boolean | null
          role: string
          suggestions?: Json | null
        }
        Update: {
          actions?: Json | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_voice_input?: boolean | null
          role?: string
          suggestions?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_analytics: {
        Row: {
          action_type: string
          conversation_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          action_type: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          action_type?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_analytics_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_user_preferences: {
        Row: {
          auto_open_on_voice: boolean | null
          created_at: string
          default_minimized: boolean | null
          id: string
          language: string | null
          updated_at: string
          user_id: string
          voice_enabled: boolean | null
        }
        Insert: {
          auto_open_on_voice?: boolean | null
          created_at?: string
          default_minimized?: boolean | null
          id?: string
          language?: string | null
          updated_at?: string
          user_id: string
          voice_enabled?: boolean | null
        }
        Update: {
          auto_open_on_voice?: boolean | null
          created_at?: string
          default_minimized?: boolean | null
          id?: string
          language?: string | null
          updated_at?: string
          user_id?: string
          voice_enabled?: boolean | null
        }
        Relationships: []
      }
      api_key_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string | null
          error_message: string | null
          id: string
          key_name: string
          success: boolean | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          key_name: string
          success?: boolean | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          key_name?: string
          success?: boolean | null
        }
        Relationships: []
      }
      areas: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          pincode: string
          state_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          pincode: string
          state_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          pincode?: string
          state_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "areas_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
        ]
      }
      audio_isolation_generations: {
        Row: {
          audio_url: string | null
          created_at: string
          credits_used: number | null
          id: string
          original_file_name: string | null
          status: string
          user_id: string
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          credits_used?: number | null
          id?: string
          original_file_name?: string | null
          status?: string
          user_id: string
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          credits_used?: number | null
          id?: string
          original_file_name?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audio_isolation_generations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audio_isolation_generations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_details: {
        Row: {
          account_holder_name: string
          account_number: string
          account_type: string | null
          bank_name: string
          created_at: string
          id: string
          ifsc_code: string
          is_default: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_holder_name: string
          account_number: string
          account_type?: string | null
          bank_name: string
          created_at?: string
          id?: string
          ifsc_code: string
          is_default?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_holder_name?: string
          account_number?: string
          account_type?: string | null
          bank_name?: string
          created_at?: string
          id?: string
          ifsc_code?: string
          is_default?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          admin_notes: string | null
          card_url: string | null
          celebrity_commission: number | null
          celebrity_id: string
          celebrity_reminder_sent: boolean | null
          commission_percentage: number | null
          completed_at: string | null
          created_at: string | null
          delivery_date: string | null
          delivery_type: string | null
          discount_amount: number | null
          elevenlabs_audio_b2_key: string | null
          elevenlabs_audio_url: string | null
          final_merged_video_key: string | null
          final_price: number
          generated_prompt: string | null
          generated_script: string | null
          generation_error: string | null
          generation_started_at: string | null
          generation_status: string | null
          heygen_intro_duration_seconds: number | null
          heygen_intro_status: string | null
          heygen_intro_url: string | null
          heygen_intro_video_id: string | null
          heygen_video_id: string | null
          id: string
          instructions: string | null
          lipsync_completed_at: string | null
          lipsync_error: string | null
          lipsync_provider: string
          lipsync_started_at: string | null
          merge_error: string | null
          merge_status: string | null
          message: string | null
          occasion_video_id: string | null
          order_type: string | null
          original_price: number
          personalised_intro_script: string | null
          platform_fee: number | null
          processed_by: string | null
          recipient_name: string | null
          recipient_relationship: string | null
          recipient_verification_code: string | null
          recipient_video_accessed: boolean | null
          recipient_video_accessed_at: string | null
          script_content: string | null
          selected_base_video_mood: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          shotstack_render_id: string | null
          status: Database["public"]["Enums"]["booking_status"] | null
          syncso_job_id: string | null
          updated_at: string | null
          user_id: string
          video_file_key: string | null
          video_generation_method: string | null
          video_sent_at: string | null
          video_sent_by: string | null
          video_status: string | null
          video_url: string | null
          wishme_payment_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          card_url?: string | null
          celebrity_commission?: number | null
          celebrity_id: string
          celebrity_reminder_sent?: boolean | null
          commission_percentage?: number | null
          completed_at?: string | null
          created_at?: string | null
          delivery_date?: string | null
          delivery_type?: string | null
          discount_amount?: number | null
          elevenlabs_audio_b2_key?: string | null
          elevenlabs_audio_url?: string | null
          final_merged_video_key?: string | null
          final_price: number
          generated_prompt?: string | null
          generated_script?: string | null
          generation_error?: string | null
          generation_started_at?: string | null
          generation_status?: string | null
          heygen_intro_duration_seconds?: number | null
          heygen_intro_status?: string | null
          heygen_intro_url?: string | null
          heygen_intro_video_id?: string | null
          heygen_video_id?: string | null
          id?: string
          instructions?: string | null
          lipsync_completed_at?: string | null
          lipsync_error?: string | null
          lipsync_provider?: string
          lipsync_started_at?: string | null
          merge_error?: string | null
          merge_status?: string | null
          message?: string | null
          occasion_video_id?: string | null
          order_type?: string | null
          original_price: number
          personalised_intro_script?: string | null
          platform_fee?: number | null
          processed_by?: string | null
          recipient_name?: string | null
          recipient_relationship?: string | null
          recipient_verification_code?: string | null
          recipient_video_accessed?: boolean | null
          recipient_video_accessed_at?: string | null
          script_content?: string | null
          selected_base_video_mood?: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          shotstack_render_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          syncso_job_id?: string | null
          updated_at?: string | null
          user_id: string
          video_file_key?: string | null
          video_generation_method?: string | null
          video_sent_at?: string | null
          video_sent_by?: string | null
          video_status?: string | null
          video_url?: string | null
          wishme_payment_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          card_url?: string | null
          celebrity_commission?: number | null
          celebrity_id?: string
          celebrity_reminder_sent?: boolean | null
          commission_percentage?: number | null
          completed_at?: string | null
          created_at?: string | null
          delivery_date?: string | null
          delivery_type?: string | null
          discount_amount?: number | null
          elevenlabs_audio_b2_key?: string | null
          elevenlabs_audio_url?: string | null
          final_merged_video_key?: string | null
          final_price?: number
          generated_prompt?: string | null
          generated_script?: string | null
          generation_error?: string | null
          generation_started_at?: string | null
          generation_status?: string | null
          heygen_intro_duration_seconds?: number | null
          heygen_intro_status?: string | null
          heygen_intro_url?: string | null
          heygen_intro_video_id?: string | null
          heygen_video_id?: string | null
          id?: string
          instructions?: string | null
          lipsync_completed_at?: string | null
          lipsync_error?: string | null
          lipsync_provider?: string
          lipsync_started_at?: string | null
          merge_error?: string | null
          merge_status?: string | null
          message?: string | null
          occasion_video_id?: string | null
          order_type?: string | null
          original_price?: number
          personalised_intro_script?: string | null
          platform_fee?: number | null
          processed_by?: string | null
          recipient_name?: string | null
          recipient_relationship?: string | null
          recipient_verification_code?: string | null
          recipient_video_accessed?: boolean | null
          recipient_video_accessed_at?: string | null
          script_content?: string | null
          selected_base_video_mood?: string | null
          service_type?: Database["public"]["Enums"]["service_type"]
          shotstack_render_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          syncso_job_id?: string | null
          updated_at?: string | null
          user_id?: string
          video_file_key?: string | null
          video_generation_method?: string | null
          video_sent_at?: string | null
          video_sent_by?: string | null
          video_status?: string | null
          video_url?: string | null
          wishme_payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_celebrity_id_fkey"
            columns: ["celebrity_id"]
            isOneToOne: false
            referencedRelation: "celebrities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_celebrity_id_fkey"
            columns: ["celebrity_id"]
            isOneToOne: false
            referencedRelation: "celebrities_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_occasion_video_id_fkey"
            columns: ["occasion_video_id"]
            isOneToOne: false
            referencedRelation: "celebrity_occasion_videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "public_profile_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_video_sent_by_fkey"
            columns: ["video_sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_video_sent_by_fkey"
            columns: ["video_sent_by"]
            isOneToOne: false
            referencedRelation: "public_profile_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      celebrities: {
        Row: {
          anniversary_date: string | null
          available_balance: number | null
          avatar_trained: boolean | null
          base_video_celebratory_key: string | null
          base_video_festive_key: string | null
          base_video_heartfelt_key: string | null
          base_video_traditional_key: string | null
          bio: string | null
          category: string
          commission_percentage: number | null
          consent_given_at: string | null
          consent_photo_url: string | null
          consent_status: string | null
          consent_video_url: string | null
          created_at: string | null
          date_of_birth: string | null
          delivery_time: string | null
          elevenlabs_professional_voice_id: string | null
          followers: string | null
          heygen_avatar_id: string | null
          heygen_voice_id: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_verified: boolean | null
          location: string | null
          name: string
          other_occasions: string | null
          profile_id: string | null
          promotional_image_url: string | null
          rating: number | null
          review_count: number | null
          service_prices: Json | null
          social_media: Json | null
          total_earnings: number | null
          updated_at: string | null
          vapi_phone_id: string | null
          vapi_voice_id: string | null
          verification_status: string | null
          video_generation_provider: string
          video_thumbnail_url: string | null
          voice_call_price: number | null
          webhook_url: string | null
        }
        Insert: {
          anniversary_date?: string | null
          available_balance?: number | null
          avatar_trained?: boolean | null
          base_video_celebratory_key?: string | null
          base_video_festive_key?: string | null
          base_video_heartfelt_key?: string | null
          base_video_traditional_key?: string | null
          bio?: string | null
          category: string
          commission_percentage?: number | null
          consent_given_at?: string | null
          consent_photo_url?: string | null
          consent_status?: string | null
          consent_video_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          delivery_time?: string | null
          elevenlabs_professional_voice_id?: string | null
          followers?: string | null
          heygen_avatar_id?: string | null
          heygen_voice_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          location?: string | null
          name: string
          other_occasions?: string | null
          profile_id?: string | null
          promotional_image_url?: string | null
          rating?: number | null
          review_count?: number | null
          service_prices?: Json | null
          social_media?: Json | null
          total_earnings?: number | null
          updated_at?: string | null
          vapi_phone_id?: string | null
          vapi_voice_id?: string | null
          verification_status?: string | null
          video_generation_provider?: string
          video_thumbnail_url?: string | null
          voice_call_price?: number | null
          webhook_url?: string | null
        }
        Update: {
          anniversary_date?: string | null
          available_balance?: number | null
          avatar_trained?: boolean | null
          base_video_celebratory_key?: string | null
          base_video_festive_key?: string | null
          base_video_heartfelt_key?: string | null
          base_video_traditional_key?: string | null
          bio?: string | null
          category?: string
          commission_percentage?: number | null
          consent_given_at?: string | null
          consent_photo_url?: string | null
          consent_status?: string | null
          consent_video_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          delivery_time?: string | null
          elevenlabs_professional_voice_id?: string | null
          followers?: string | null
          heygen_avatar_id?: string | null
          heygen_voice_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          location?: string | null
          name?: string
          other_occasions?: string | null
          profile_id?: string | null
          promotional_image_url?: string | null
          rating?: number | null
          review_count?: number | null
          service_prices?: Json | null
          social_media?: Json | null
          total_earnings?: number | null
          updated_at?: string | null
          vapi_phone_id?: string | null
          vapi_voice_id?: string | null
          verification_status?: string | null
          video_generation_provider?: string
          video_thumbnail_url?: string | null
          voice_call_price?: number | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "celebrities_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "celebrities_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profile_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      celebrity_applications: {
        Row: {
          achievements: string | null
          admin_notes: string | null
          applied_at: string | null
          bio: string
          category: string | null
          created_at: string | null
          created_celebrity_id: string | null
          date_of_birth: string | null
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string
          portfolio_link: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          social_media: Json | null
          stage_name: string
          status: string
          updated_at: string | null
        }
        Insert: {
          achievements?: string | null
          admin_notes?: string | null
          applied_at?: string | null
          bio: string
          category?: string | null
          created_at?: string | null
          created_celebrity_id?: string | null
          date_of_birth?: string | null
          email: string
          first_name: string
          id?: string
          last_name: string
          phone: string
          portfolio_link?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          social_media?: Json | null
          stage_name: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          achievements?: string | null
          admin_notes?: string | null
          applied_at?: string | null
          bio?: string
          category?: string | null
          created_at?: string | null
          created_celebrity_id?: string | null
          date_of_birth?: string | null
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string
          portfolio_link?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          social_media?: Json | null
          stage_name?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "celebrity_applications_created_celebrity_id_fkey"
            columns: ["created_celebrity_id"]
            isOneToOne: false
            referencedRelation: "celebrities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "celebrity_applications_created_celebrity_id_fkey"
            columns: ["created_celebrity_id"]
            isOneToOne: false
            referencedRelation: "celebrities_public"
            referencedColumns: ["id"]
          },
        ]
      }
      celebrity_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      celebrity_events: {
        Row: {
          celebrity_id: string
          created_at: string | null
          description: string | null
          event_date: string
          event_type: string | null
          id: string
          is_public: boolean | null
          location: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          celebrity_id: string
          created_at?: string | null
          description?: string | null
          event_date: string
          event_type?: string | null
          id?: string
          is_public?: boolean | null
          location?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          celebrity_id?: string
          created_at?: string | null
          description?: string | null
          event_date?: string
          event_type?: string | null
          id?: string
          is_public?: boolean | null
          location?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "celebrity_events_celebrity_id_fkey"
            columns: ["celebrity_id"]
            isOneToOne: false
            referencedRelation: "celebrities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "celebrity_events_celebrity_id_fkey"
            columns: ["celebrity_id"]
            isOneToOne: false
            referencedRelation: "celebrities_public"
            referencedColumns: ["id"]
          },
        ]
      }
      celebrity_favorite_pricing: {
        Row: {
          celebrity_commission_percentage: number
          celebrity_id: string
          created_at: string
          id: string
          is_enabled: boolean
          price: number
          referrer_commission_percentage: number
          updated_at: string
        }
        Insert: {
          celebrity_commission_percentage?: number
          celebrity_id: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          price?: number
          referrer_commission_percentage?: number
          updated_at?: string
        }
        Update: {
          celebrity_commission_percentage?: number
          celebrity_id?: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          price?: number
          referrer_commission_percentage?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "celebrity_favorite_pricing_celebrity_id_fkey"
            columns: ["celebrity_id"]
            isOneToOne: true
            referencedRelation: "celebrities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "celebrity_favorite_pricing_celebrity_id_fkey"
            columns: ["celebrity_id"]
            isOneToOne: true
            referencedRelation: "celebrities_public"
            referencedColumns: ["id"]
          },
        ]
      }
      celebrity_favorites: {
        Row: {
          auto_renew: boolean | null
          cancelled_at: string | null
          celebrity_commission: number | null
          celebrity_id: string
          created_at: string
          id: string
          payment_method: string | null
          price_paid: number
          referrer_commission: number | null
          status: string
          subscription_expires_at: string | null
          subscription_start_date: string | null
          user_id: string
        }
        Insert: {
          auto_renew?: boolean | null
          cancelled_at?: string | null
          celebrity_commission?: number | null
          celebrity_id: string
          created_at?: string
          id?: string
          payment_method?: string | null
          price_paid: number
          referrer_commission?: number | null
          status?: string
          subscription_expires_at?: string | null
          subscription_start_date?: string | null
          user_id: string
        }
        Update: {
          auto_renew?: boolean | null
          cancelled_at?: string | null
          celebrity_commission?: number | null
          celebrity_id?: string
          created_at?: string
          id?: string
          payment_method?: string | null
          price_paid?: number
          referrer_commission?: number | null
          status?: string
          subscription_expires_at?: string | null
          subscription_start_date?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "celebrity_favorites_celebrity_id_fkey"
            columns: ["celebrity_id"]
            isOneToOne: false
            referencedRelation: "celebrities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "celebrity_favorites_celebrity_id_fkey"
            columns: ["celebrity_id"]
            isOneToOne: false
            referencedRelation: "celebrities_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "celebrity_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "celebrity_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      celebrity_media: {
        Row: {
          celebrity_id: string
          consent_recorded: boolean | null
          consent_timestamp: string | null
          created_at: string | null
          description: string | null
          file_url: string
          id: string
          is_avatar_content: boolean | null
          is_promotional: boolean | null
          is_public: boolean | null
          media_type: string
          thumbnail_url: string | null
          title: string
        }
        Insert: {
          celebrity_id: string
          consent_recorded?: boolean | null
          consent_timestamp?: string | null
          created_at?: string | null
          description?: string | null
          file_url: string
          id?: string
          is_avatar_content?: boolean | null
          is_promotional?: boolean | null
          is_public?: boolean | null
          media_type: string
          thumbnail_url?: string | null
          title: string
        }
        Update: {
          celebrity_id?: string
          consent_recorded?: boolean | null
          consent_timestamp?: string | null
          created_at?: string | null
          description?: string | null
          file_url?: string
          id?: string
          is_avatar_content?: boolean | null
          is_promotional?: boolean | null
          is_public?: boolean | null
          media_type?: string
          thumbnail_url?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "celebrity_media_celebrity_id_fkey"
            columns: ["celebrity_id"]
            isOneToOne: false
            referencedRelation: "celebrities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "celebrity_media_celebrity_id_fkey"
            columns: ["celebrity_id"]
            isOneToOne: false
            referencedRelation: "celebrities_public"
            referencedColumns: ["id"]
          },
        ]
      }
      celebrity_notifications: {
        Row: {
          celebrity_id: string
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          read_at: string | null
          title: string
          type: string
        }
        Insert: {
          celebrity_id: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          read_at?: string | null
          title: string
          type?: string
        }
        Update: {
          celebrity_id?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          read_at?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "celebrity_notifications_celebrity_id_fkey"
            columns: ["celebrity_id"]
            isOneToOne: false
            referencedRelation: "celebrities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "celebrity_notifications_celebrity_id_fkey"
            columns: ["celebrity_id"]
            isOneToOne: false
            referencedRelation: "celebrities_public"
            referencedColumns: ["id"]
          },
        ]
      }
      celebrity_occasion_videos: {
        Row: {
          celebrity_id: string
          created_at: string
          duration_seconds: number | null
          id: string
          is_active: boolean
          occasion_type: string
          opening_pause_seconds: number
          title: string | null
          updated_at: string
          video_b2_key: string
          video_url: string | null
        }
        Insert: {
          celebrity_id: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          is_active?: boolean
          occasion_type: string
          opening_pause_seconds?: number
          title?: string | null
          updated_at?: string
          video_b2_key: string
          video_url?: string | null
        }
        Update: {
          celebrity_id?: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          is_active?: boolean
          occasion_type?: string
          opening_pause_seconds?: number
          title?: string | null
          updated_at?: string
          video_b2_key?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "celebrity_occasion_videos_celebrity_id_fkey"
            columns: ["celebrity_id"]
            isOneToOne: false
            referencedRelation: "celebrities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "celebrity_occasion_videos_celebrity_id_fkey"
            columns: ["celebrity_id"]
            isOneToOne: false
            referencedRelation: "celebrities_public"
            referencedColumns: ["id"]
          },
        ]
      }
      celebrity_occasions: {
        Row: {
          auto_reply_enabled: boolean
          auto_reply_template: string | null
          celebrity_id: string
          created_at: string
          id: string
          is_public: boolean
          occasion_date: string
          occasion_name: string
          occasion_type: string
          updated_at: string
        }
        Insert: {
          auto_reply_enabled?: boolean
          auto_reply_template?: string | null
          celebrity_id: string
          created_at?: string
          id?: string
          is_public?: boolean
          occasion_date: string
          occasion_name: string
          occasion_type: string
          updated_at?: string
        }
        Update: {
          auto_reply_enabled?: boolean
          auto_reply_template?: string | null
          celebrity_id?: string
          created_at?: string
          id?: string
          is_public?: boolean
          occasion_date?: string
          occasion_name?: string
          occasion_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "celebrity_occasions_celebrity_id_fkey"
            columns: ["celebrity_id"]
            isOneToOne: false
            referencedRelation: "celebrities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "celebrity_occasions_celebrity_id_fkey"
            columns: ["celebrity_id"]
            isOneToOne: false
            referencedRelation: "celebrities_public"
            referencedColumns: ["id"]
          },
        ]
      }
      celebrity_reviews: {
        Row: {
          booking_id: string
          celebrity_id: string
          created_at: string
          id: string
          rating: number
          review_text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_id: string
          celebrity_id: string
          created_at?: string
          id?: string
          rating: number
          review_text?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_id?: string
          celebrity_id?: string
          created_at?: string
          id?: string
          rating?: number
          review_text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "celebrity_reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "celebrity_reviews_celebrity_id_fkey"
            columns: ["celebrity_id"]
            isOneToOne: false
            referencedRelation: "celebrities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "celebrity_reviews_celebrity_id_fkey"
            columns: ["celebrity_id"]
            isOneToOne: false
            referencedRelation: "celebrities_public"
            referencedColumns: ["id"]
          },
        ]
      }
      celebrity_settings: {
        Row: {
          ai_auto_reply_enabled: boolean | null
          auto_accept_bookings: boolean | null
          auto_reply_enabled: boolean | null
          booking_alerts: boolean | null
          celebrity_id: string
          commission_alerts: boolean | null
          created_at: string | null
          email_notifications: boolean | null
          id: string
          marketing_emails: boolean | null
          updated_at: string | null
        }
        Insert: {
          ai_auto_reply_enabled?: boolean | null
          auto_accept_bookings?: boolean | null
          auto_reply_enabled?: boolean | null
          booking_alerts?: boolean | null
          celebrity_id: string
          commission_alerts?: boolean | null
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          marketing_emails?: boolean | null
          updated_at?: string | null
        }
        Update: {
          ai_auto_reply_enabled?: boolean | null
          auto_accept_bookings?: boolean | null
          auto_reply_enabled?: boolean | null
          booking_alerts?: boolean | null
          celebrity_id?: string
          commission_alerts?: boolean | null
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          marketing_emails?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "celebrity_settings_celebrity_id_fkey"
            columns: ["celebrity_id"]
            isOneToOne: true
            referencedRelation: "celebrities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "celebrity_settings_celebrity_id_fkey"
            columns: ["celebrity_id"]
            isOneToOne: true
            referencedRelation: "celebrities_public"
            referencedColumns: ["id"]
          },
        ]
      }
      celebrity_wallet_transactions: {
        Row: {
          amount: number
          booking_id: string | null
          celebrity_id: string
          commission_percentage: number | null
          created_at: string | null
          description: string | null
          gross_amount: number | null
          id: string
          platform_fee: number | null
          processed_at: string | null
          status: string | null
          tds_amount: number | null
          tds_percentage: number | null
          transaction_type: string
        }
        Insert: {
          amount: number
          booking_id?: string | null
          celebrity_id: string
          commission_percentage?: number | null
          created_at?: string | null
          description?: string | null
          gross_amount?: number | null
          id?: string
          platform_fee?: number | null
          processed_at?: string | null
          status?: string | null
          tds_amount?: number | null
          tds_percentage?: number | null
          transaction_type: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          celebrity_id?: string
          commission_percentage?: number | null
          created_at?: string | null
          description?: string | null
          gross_amount?: number | null
          id?: string
          platform_fee?: number | null
          processed_at?: string | null
          status?: string | null
          tds_amount?: number | null
          tds_percentage?: number | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "celebrity_wallet_transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "celebrity_wallet_transactions_celebrity_id_fkey"
            columns: ["celebrity_id"]
            isOneToOne: false
            referencedRelation: "celebrities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "celebrity_wallet_transactions_celebrity_id_fkey"
            columns: ["celebrity_id"]
            isOneToOne: false
            referencedRelation: "celebrities_public"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          celebrity_id: string
          closed_at: string | null
          closed_reason: string | null
          created_at: string
          id: string
          is_closed: boolean | null
          last_message_at: string
          message_count: number | null
          unread_count_celebrity: number
          unread_count_user: number
          user_id: string
        }
        Insert: {
          celebrity_id: string
          closed_at?: string | null
          closed_reason?: string | null
          created_at?: string
          id?: string
          is_closed?: boolean | null
          last_message_at?: string
          message_count?: number | null
          unread_count_celebrity?: number
          unread_count_user?: number
          user_id: string
        }
        Update: {
          celebrity_id?: string
          closed_at?: string | null
          closed_reason?: string | null
          created_at?: string
          id?: string
          is_closed?: boolean | null
          last_message_at?: string
          message_count?: number | null
          unread_count_celebrity?: number
          unread_count_user?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_celebrity_id_fkey"
            columns: ["celebrity_id"]
            isOneToOne: false
            referencedRelation: "celebrities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_celebrity_id_fkey"
            columns: ["celebrity_id"]
            isOneToOne: false
            referencedRelation: "celebrities_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      delivery_type_pricing: {
        Row: {
          base_price: number
          created_at: string | null
          delivery_type: string
          id: string
          updated_at: string | null
        }
        Insert: {
          base_price?: number
          created_at?: string | null
          delivery_type: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          base_price?: number
          created_at?: string | null
          delivery_type?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      email_otp_verifications: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          is_used: boolean
          otp_hash: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          is_used?: boolean
          otp_hash: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          is_used?: boolean
          otp_hash?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      greeting_card_generations: {
        Row: {
          amount_charged: number
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          generated_image_url: string | null
          greeting_text: string | null
          id: string
          occasion_name: string
          original_prompt: string
          prompt_refinement_used: boolean | null
          recipient_name: string
          reference_image_source: string | null
          reference_image_url: string | null
          refined_prompt: string | null
          saved_to_library: boolean | null
          status: string | null
          user_id: string
          wishme_payment_id: string | null
        }
        Insert: {
          amount_charged?: number
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          generated_image_url?: string | null
          greeting_text?: string | null
          id?: string
          occasion_name: string
          original_prompt: string
          prompt_refinement_used?: boolean | null
          recipient_name: string
          reference_image_source?: string | null
          reference_image_url?: string | null
          refined_prompt?: string | null
          saved_to_library?: boolean | null
          status?: string | null
          user_id: string
          wishme_payment_id?: string | null
        }
        Update: {
          amount_charged?: number
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          generated_image_url?: string | null
          greeting_text?: string | null
          id?: string
          occasion_name?: string
          original_prompt?: string
          prompt_refinement_used?: boolean | null
          recipient_name?: string
          reference_image_source?: string | null
          reference_image_url?: string | null
          refined_prompt?: string | null
          saved_to_library?: boolean | null
          status?: string | null
          user_id?: string
          wishme_payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "greeting_card_generations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "greeting_card_generations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      image_music_generations: {
        Row: {
          amount_charged: number | null
          audio_url: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          duration_seconds: number | null
          genre: string | null
          has_vocals: boolean | null
          id: string
          image_url: string | null
          lyrics: string | null
          mood: string | null
          status: string | null
          user_id: string
          video_url: string | null
          vocal_url: string | null
        }
        Insert: {
          amount_charged?: number | null
          audio_url?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          genre?: string | null
          has_vocals?: boolean | null
          id?: string
          image_url?: string | null
          lyrics?: string | null
          mood?: string | null
          status?: string | null
          user_id: string
          video_url?: string | null
          vocal_url?: string | null
        }
        Update: {
          amount_charged?: number | null
          audio_url?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          genre?: string | null
          has_vocals?: boolean | null
          id?: string
          image_url?: string | null
          lyrics?: string | null
          mood?: string | null
          status?: string | null
          user_id?: string
          video_url?: string | null
          vocal_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "image_music_generations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "image_music_generations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      image_promotions: {
        Row: {
          branding_details: string | null
          celebrity_id: string
          completed_at: string | null
          concept: string
          created_at: string
          error_message: string | null
          generated_image_url: string | null
          id: string
          price_paid: number
          status: string
          user_id: string
        }
        Insert: {
          branding_details?: string | null
          celebrity_id: string
          completed_at?: string | null
          concept: string
          created_at?: string
          error_message?: string | null
          generated_image_url?: string | null
          id?: string
          price_paid: number
          status?: string
          user_id: string
        }
        Update: {
          branding_details?: string | null
          celebrity_id?: string
          completed_at?: string | null
          concept?: string
          created_at?: string
          error_message?: string | null
          generated_image_url?: string | null
          id?: string
          price_paid?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "image_promotions_celebrity_id_fkey"
            columns: ["celebrity_id"]
            isOneToOne: false
            referencedRelation: "celebrities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "image_promotions_celebrity_id_fkey"
            columns: ["celebrity_id"]
            isOneToOne: false
            referencedRelation: "celebrities_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "image_promotions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "image_promotions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_alert_recipients: {
        Row: {
          alert_types: Json
          channels: Json
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
          role_tag: string
          whatsapp: string | null
        }
        Insert: {
          alert_types?: Json
          channels?: Json
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          role_tag?: string
          whatsapp?: string | null
        }
        Update: {
          alert_types?: Json
          channels?: Json
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          role_tag?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      loved_ones: {
        Row: {
          created_at: string | null
          date_of_birth: string | null
          email: string | null
          first_name: string
          id: string
          import_source: string | null
          last_name: string | null
          notes: string | null
          occasions: Json | null
          phone: string | null
          relationship: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          first_name: string
          id?: string
          import_source?: string | null
          last_name?: string | null
          notes?: string | null
          occasions?: Json | null
          phone?: string | null
          relationship?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          first_name?: string
          id?: string
          import_source?: string | null
          last_name?: string | null
          notes?: string | null
          occasions?: Json | null
          phone?: string | null
          relationship?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loved_ones_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loved_ones_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      media_library: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          display_order: number | null
          duration_seconds: number | null
          file_key: string
          file_name: string
          file_size: number | null
          file_type: string
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          mime_type: string | null
          tags: string[] | null
          thumbnail_key: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          duration_seconds?: number | null
          file_key: string
          file_name: string
          file_size?: number | null
          file_type: string
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          mime_type?: string | null
          tags?: string[] | null
          thumbnail_key?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          duration_seconds?: number | null
          file_key?: string
          file_name?: string
          file_size?: number | null
          file_type?: string
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          mime_type?: string | null
          tags?: string[] | null
          thumbnail_key?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_library_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_library_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profile_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      message_campaigns: {
        Row: {
          channel: string
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          failed_count: number | null
          id: string
          name: string
          recipient_filter: Json | null
          scheduled_at: string | null
          sent_count: number | null
          started_at: string | null
          status: string | null
          template_id: string | null
          total_recipients: number | null
          updated_at: string | null
        }
        Insert: {
          channel: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          failed_count?: number | null
          id?: string
          name: string
          recipient_filter?: Json | null
          scheduled_at?: string | null
          sent_count?: number | null
          started_at?: string | null
          status?: string | null
          template_id?: string | null
          total_recipients?: number | null
          updated_at?: string | null
        }
        Update: {
          channel?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          failed_count?: number | null
          id?: string
          name?: string
          recipient_filter?: Json | null
          scheduled_at?: string | null
          sent_count?: number | null
          started_at?: string | null
          status?: string | null
          template_id?: string | null
          total_recipients?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profile_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      message_events: {
        Row: {
          category: string | null
          created_at: string | null
          delay_minutes: number | null
          description: string | null
          email_enabled: boolean | null
          email_template_id: string | null
          event_key: string
          id: string
          is_enabled: boolean | null
          label: string | null
          recipient_type: string | null
          sms_enabled: boolean | null
          sms_flow_id: string | null
          sms_template_id: string | null
          updated_at: string | null
          whatsapp_enabled: boolean | null
          whatsapp_template_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          delay_minutes?: number | null
          description?: string | null
          email_enabled?: boolean | null
          email_template_id?: string | null
          event_key: string
          id?: string
          is_enabled?: boolean | null
          label?: string | null
          recipient_type?: string | null
          sms_enabled?: boolean | null
          sms_flow_id?: string | null
          sms_template_id?: string | null
          updated_at?: string | null
          whatsapp_enabled?: boolean | null
          whatsapp_template_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          delay_minutes?: number | null
          description?: string | null
          email_enabled?: boolean | null
          email_template_id?: string | null
          event_key?: string
          id?: string
          is_enabled?: boolean | null
          label?: string | null
          recipient_type?: string | null
          sms_enabled?: boolean | null
          sms_flow_id?: string | null
          sms_template_id?: string | null
          updated_at?: string | null
          whatsapp_enabled?: boolean | null
          whatsapp_template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_events_email_template_id_fkey"
            columns: ["email_template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_events_sms_template_id_fkey"
            columns: ["sms_template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_events_whatsapp_template_id_fkey"
            columns: ["whatsapp_template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      message_logs: {
        Row: {
          channel: string
          error_message: string | null
          event_key: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient: string
          sent_at: string | null
          status: string
          template_id: string | null
          template_name: string | null
          user_id: string | null
        }
        Insert: {
          channel: string
          error_message?: string | null
          event_key?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient: string
          sent_at?: string | null
          status: string
          template_id?: string | null
          template_name?: string | null
          user_id?: string | null
        }
        Update: {
          channel?: string
          error_message?: string | null
          event_key?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient?: string
          sent_at?: string | null
          status?: string
          template_id?: string | null
          template_name?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          channel: string
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          name: string
          subject: string | null
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          channel: string
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          subject?: string | null
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          channel?: string
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          subject?: string | null
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profile_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          conversation_id: string
          conversation_message_number: number | null
          created_at: string
          id: string
          is_ai_generated: boolean
          is_read: boolean
          message_text: string
          sender_id: string
          sender_type: string
        }
        Insert: {
          conversation_id: string
          conversation_message_number?: number | null
          created_at?: string
          id?: string
          is_ai_generated?: boolean
          is_read?: boolean
          message_text: string
          sender_id: string
          sender_type: string
        }
        Update: {
          conversation_id?: string
          conversation_message_number?: number | null
          created_at?: string
          id?: string
          is_ai_generated?: boolean
          is_read?: boolean
          message_text?: string
          sender_id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "public_profile_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      messaging_settings: {
        Row: {
          description: string | null
          id: string
          is_encrypted: boolean | null
          setting_key: string
          setting_value: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          is_encrypted?: boolean | null
          setting_key: string
          setting_value?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          is_encrypted?: boolean | null
          setting_key?: string
          setting_value?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messaging_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messaging_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "public_profile_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      music_generations: {
        Row: {
          api_task_id: string | null
          completed_at: string | null
          created_at: string
          credits_used: number
          download_url: string | null
          duration: number | null
          error_message: string | null
          generation_type: Database["public"]["Enums"]["music_generation_type"]
          genre: string | null
          id: string
          lyrics: string | null
          mood: string | null
          price_paid: number | null
          prompt: string | null
          song_title: string
          song_url: string | null
          status: Database["public"]["Enums"]["music_generation_status"]
          user_id: string
          wishme_payment_id: string | null
        }
        Insert: {
          api_task_id?: string | null
          completed_at?: string | null
          created_at?: string
          credits_used?: number
          download_url?: string | null
          duration?: number | null
          error_message?: string | null
          generation_type?: Database["public"]["Enums"]["music_generation_type"]
          genre?: string | null
          id?: string
          lyrics?: string | null
          mood?: string | null
          price_paid?: number | null
          prompt?: string | null
          song_title: string
          song_url?: string | null
          status?: Database["public"]["Enums"]["music_generation_status"]
          user_id: string
          wishme_payment_id?: string | null
        }
        Update: {
          api_task_id?: string | null
          completed_at?: string | null
          created_at?: string
          credits_used?: number
          download_url?: string | null
          duration?: number | null
          error_message?: string | null
          generation_type?: Database["public"]["Enums"]["music_generation_type"]
          genre?: string | null
          id?: string
          lyrics?: string | null
          mood?: string | null
          price_paid?: number | null
          prompt?: string | null
          song_title?: string
          song_url?: string | null
          status?: Database["public"]["Enums"]["music_generation_status"]
          user_id?: string
          wishme_payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "music_generations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "music_generations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscriptions: {
        Row: {
          created_at: string | null
          email: string
          id: string
          status: string | null
          subscribed_at: string | null
          unsubscribed_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          status?: string | null
          subscribed_at?: string | null
          unsubscribed_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          status?: string | null
          subscribed_at?: string | null
          unsubscribed_at?: string | null
        }
        Relationships: []
      }
      occasion_alerts: {
        Row: {
          alert_days_before: number | null
          alert_enabled: boolean | null
          auto_send_enabled: boolean | null
          celebrity_id: string | null
          created_at: string | null
          id: string
          loved_one_id: string | null
          max_budget: number | null
          message_template: string | null
          occasion_date: string
          occasion_name: string | null
          occasion_type: string
          preferred_celebrity_id: string | null
          reminder_time: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alert_days_before?: number | null
          alert_enabled?: boolean | null
          auto_send_enabled?: boolean | null
          celebrity_id?: string | null
          created_at?: string | null
          id?: string
          loved_one_id?: string | null
          max_budget?: number | null
          message_template?: string | null
          occasion_date: string
          occasion_name?: string | null
          occasion_type: string
          preferred_celebrity_id?: string | null
          reminder_time?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alert_days_before?: number | null
          alert_enabled?: boolean | null
          auto_send_enabled?: boolean | null
          celebrity_id?: string | null
          created_at?: string | null
          id?: string
          loved_one_id?: string | null
          max_budget?: number | null
          message_template?: string | null
          occasion_date?: string
          occasion_name?: string | null
          occasion_type?: string
          preferred_celebrity_id?: string | null
          reminder_time?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "occasion_alerts_celebrity_id_fkey"
            columns: ["celebrity_id"]
            isOneToOne: false
            referencedRelation: "celebrities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "occasion_alerts_celebrity_id_fkey"
            columns: ["celebrity_id"]
            isOneToOne: false
            referencedRelation: "celebrities_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "occasion_alerts_loved_one_id_fkey"
            columns: ["loved_one_id"]
            isOneToOne: false
            referencedRelation: "loved_ones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "occasion_alerts_preferred_celebrity_id_fkey"
            columns: ["preferred_celebrity_id"]
            isOneToOne: false
            referencedRelation: "celebrities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "occasion_alerts_preferred_celebrity_id_fkey"
            columns: ["preferred_celebrity_id"]
            isOneToOne: false
            referencedRelation: "celebrities_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "occasion_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "occasion_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      occasion_bookings: {
        Row: {
          ai_generated_content: string | null
          ai_video_url: string | null
          booking_type: string
          celebrity_id: string
          created_at: string | null
          greeting_card_url: string | null
          id: string
          message: string
          occasion_id: string
          price: number
          recipient_email: string | null
          recipient_name: string
          recipient_phone: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_generated_content?: string | null
          ai_video_url?: string | null
          booking_type: string
          celebrity_id: string
          created_at?: string | null
          greeting_card_url?: string | null
          id?: string
          message: string
          occasion_id: string
          price: number
          recipient_email?: string | null
          recipient_name: string
          recipient_phone?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_generated_content?: string | null
          ai_video_url?: string | null
          booking_type?: string
          celebrity_id?: string
          created_at?: string | null
          greeting_card_url?: string | null
          id?: string
          message?: string
          occasion_id?: string
          price?: number
          recipient_email?: string | null
          recipient_name?: string
          recipient_phone?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "occasion_bookings_celebrity_id_fkey"
            columns: ["celebrity_id"]
            isOneToOne: false
            referencedRelation: "celebrities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "occasion_bookings_celebrity_id_fkey"
            columns: ["celebrity_id"]
            isOneToOne: false
            referencedRelation: "celebrities_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "occasion_bookings_occasion_id_fkey"
            columns: ["occasion_id"]
            isOneToOne: false
            referencedRelation: "occasions"
            referencedColumns: ["id"]
          },
        ]
      }
      occasion_wishes: {
        Row: {
          celebrity_id: string
          created_at: string
          id: string
          message: string
          occasion_id: string
          reply_message: string | null
          reply_sent_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          celebrity_id: string
          created_at?: string
          id?: string
          message: string
          occasion_id: string
          reply_message?: string | null
          reply_sent_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          celebrity_id?: string
          created_at?: string
          id?: string
          message?: string
          occasion_id?: string
          reply_message?: string | null
          reply_sent_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "occasion_wishes_celebrity_id_fkey"
            columns: ["celebrity_id"]
            isOneToOne: false
            referencedRelation: "celebrities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "occasion_wishes_celebrity_id_fkey"
            columns: ["celebrity_id"]
            isOneToOne: false
            referencedRelation: "celebrities_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "occasion_wishes_occasion_id_fkey"
            columns: ["occasion_id"]
            isOneToOne: false
            referencedRelation: "celebrity_occasions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "occasion_wishes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "occasion_wishes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      occasions: {
        Row: {
          created_at: string | null
          date: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_featured: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          greeting_card_id: string | null
          id: string
          image_promotion_id: string | null
          music_generation_id: string | null
          paid_at: string | null
          payment_method: string
          photo_wish_id: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          service_type: string | null
          status: string | null
          user_id: string | null
          voice_call_id: string | null
          wish_order_id: string | null
          wishme_payment_id: string
        }
        Insert: {
          amount: number
          booking_id?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          greeting_card_id?: string | null
          id?: string
          image_promotion_id?: string | null
          music_generation_id?: string | null
          paid_at?: string | null
          payment_method: string
          photo_wish_id?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          service_type?: string | null
          status?: string | null
          user_id?: string | null
          voice_call_id?: string | null
          wish_order_id?: string | null
          wishme_payment_id: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          greeting_card_id?: string | null
          id?: string
          image_promotion_id?: string | null
          music_generation_id?: string | null
          paid_at?: string | null
          payment_method?: string
          photo_wish_id?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          service_type?: string | null
          status?: string | null
          user_id?: string | null
          voice_call_id?: string | null
          wish_order_id?: string | null
          wishme_payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_requests: {
        Row: {
          account_holder_name: string
          admin_notes: string | null
          bank_account_number: string
          bank_name: string
          celebrity_id: string
          id: string
          ifsc_code: string
          processed_at: string | null
          processed_by: string | null
          profile_id: string
          requested_amount: number
          requested_at: string
          status: string
        }
        Insert: {
          account_holder_name: string
          admin_notes?: string | null
          bank_account_number: string
          bank_name: string
          celebrity_id: string
          id?: string
          ifsc_code: string
          processed_at?: string | null
          processed_by?: string | null
          profile_id: string
          requested_amount: number
          requested_at?: string
          status?: string
        }
        Update: {
          account_holder_name?: string
          admin_notes?: string | null
          bank_account_number?: string
          bank_name?: string
          celebrity_id?: string
          id?: string
          ifsc_code?: string
          processed_at?: string | null
          processed_by?: string | null
          profile_id?: string
          requested_amount?: number
          requested_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_requests_celebrity_id_fkey"
            columns: ["celebrity_id"]
            isOneToOne: false
            referencedRelation: "celebrities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_requests_celebrity_id_fkey"
            columns: ["celebrity_id"]
            isOneToOne: false
            referencedRelation: "celebrities_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "public_profile_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profile_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_wishes: {
        Row: {
          amount_charged: number | null
          completed_at: string | null
          created_at: string
          edited_image_url: string | null
          error_message: string | null
          id: string
          occasion: string
          original_image_url: string
          recipient_name: string
          sender_name: string | null
          status: string | null
          text_style: string | null
          user_id: string
          wish_message: string
        }
        Insert: {
          amount_charged?: number | null
          completed_at?: string | null
          created_at?: string
          edited_image_url?: string | null
          error_message?: string | null
          id?: string
          occasion: string
          original_image_url: string
          recipient_name: string
          sender_name?: string | null
          status?: string | null
          text_style?: string | null
          user_id: string
          wish_message: string
        }
        Update: {
          amount_charged?: number | null
          completed_at?: string | null
          created_at?: string
          edited_image_url?: string | null
          error_message?: string | null
          id?: string
          occasion?: string
          original_image_url?: string
          recipient_name?: string
          sender_name?: string | null
          status?: string | null
          text_style?: string | null
          user_id?: string
          wish_message?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_wishes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_wishes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string | null
          discount_percentage: number | null
          features: Json | null
          id: string
          is_active: boolean | null
          is_popular: boolean | null
          name: string
          original_price: number | null
          price: number
          referral_commission_l1: number | null
          referral_commission_l2: number | null
          service_discount_percentage: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          discount_percentage?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          name: string
          original_price?: number | null
          price: number
          referral_commission_l1?: number | null
          referral_commission_l2?: number | null
          service_discount_percentage?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          discount_percentage?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          name?: string
          original_price?: number | null
          price?: number
          referral_commission_l1?: number | null
          referral_commission_l2?: number | null
          service_discount_percentage?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          setting_key: string
          setting_value: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          aadhaar_number: string | null
          aadhaar_verified: boolean | null
          address: string | null
          avatar_url: string | null
          bank_account_holder_name: string | null
          bank_account_number: string | null
          bank_ifsc: string | null
          bank_name: string | null
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          is_active: boolean | null
          is_flagged: boolean | null
          last_name: string | null
          pan_document_url: string | null
          pan_number: string | null
          pan_verified: boolean | null
          phone: string | null
          plan: Database["public"]["Enums"]["user_plan"] | null
          profile_completion_percentage: number | null
          referral_4day_reminder_sent: boolean | null
          referral_code: string | null
          referral_url: string | null
          referred_by: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
          user_id: string
          wallet_balance: number | null
        }
        Insert: {
          aadhaar_number?: string | null
          aadhaar_verified?: boolean | null
          address?: string | null
          avatar_url?: string | null
          bank_account_holder_name?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          created_at?: string | null
          email: string
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          is_flagged?: boolean | null
          last_name?: string | null
          pan_document_url?: string | null
          pan_number?: string | null
          pan_verified?: boolean | null
          phone?: string | null
          plan?: Database["public"]["Enums"]["user_plan"] | null
          profile_completion_percentage?: number | null
          referral_4day_reminder_sent?: boolean | null
          referral_code?: string | null
          referral_url?: string | null
          referred_by?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id: string
          wallet_balance?: number | null
        }
        Update: {
          aadhaar_number?: string | null
          aadhaar_verified?: boolean | null
          address?: string | null
          avatar_url?: string | null
          bank_account_holder_name?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          is_flagged?: boolean | null
          last_name?: string | null
          pan_document_url?: string | null
          pan_number?: string | null
          pan_verified?: boolean | null
          phone?: string | null
          plan?: Database["public"]["Enums"]["user_plan"] | null
          profile_completion_percentage?: number | null
          referral_4day_reminder_sent?: boolean | null
          referral_code?: string | null
          referral_url?: string | null
          referred_by?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id?: string
          wallet_balance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "public_profile_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_transactions: {
        Row: {
          booking_id: string | null
          commission_amount: number
          commission_level: number
          created_at: string | null
          id: string
          order_type: string | null
          referred_id: string
          referrer_id: string
          status: string | null
        }
        Insert: {
          booking_id?: string | null
          commission_amount: number
          commission_level: number
          created_at?: string | null
          id?: string
          order_type?: string | null
          referred_id: string
          referrer_id: string
          status?: string | null
        }
        Update: {
          booking_id?: string | null
          commission_amount?: number
          commission_level?: number
          created_at?: string | null
          id?: string
          order_type?: string | null
          referred_id?: string
          referrer_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_transactions_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_transactions_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "public_profile_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_transactions_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_transactions_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "public_profile_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_messages: {
        Row: {
          channel: string
          created_at: string | null
          error_message: string | null
          id: string
          order_id: string | null
          order_type: string | null
          payload: Json | null
          recipient_email: string | null
          recipient_name: string | null
          recipient_whatsapp: string | null
          scheduled_at: string
          sent_at: string | null
          status: string | null
          template_id: string | null
          user_id: string | null
        }
        Insert: {
          channel: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          order_id?: string | null
          order_type?: string | null
          payload?: Json | null
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_whatsapp?: string | null
          scheduled_at: string
          sent_at?: string | null
          status?: string | null
          template_id?: string | null
          user_id?: string | null
        }
        Update: {
          channel?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          order_id?: string | null
          order_type?: string | null
          payload?: Json | null
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_whatsapp?: string | null
          scheduled_at?: string
          sent_at?: string | null
          status?: string | null
          template_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_messages_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      sound_effect_generations: {
        Row: {
          audio_url: string | null
          created_at: string
          credits_used: number | null
          description: string
          duration_seconds: number | null
          id: string
          status: string
          user_id: string
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          credits_used?: number | null
          description: string
          duration_seconds?: number | null
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          credits_used?: number | null
          description?: string
          duration_seconds?: number | null
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sound_effect_generations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sound_effect_generations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      states: {
        Row: {
          code: string | null
          country_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          country_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          country_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "states_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_usage: {
        Row: {
          amount_paid: number
          favorite_id: string
          id: string
          payment_method: string
          service_type: string
          used_at: string | null
        }
        Insert: {
          amount_paid: number
          favorite_id: string
          id?: string
          payment_method: string
          service_type: string
          used_at?: string | null
        }
        Update: {
          amount_paid?: number
          favorite_id?: string
          id?: string
          payment_method?: string
          service_type?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_usage_favorite_id_fkey"
            columns: ["favorite_id"]
            isOneToOne: false
            referencedRelation: "celebrity_favorites"
            referencedColumns: ["id"]
          },
        ]
      }
      tds_reports: {
        Row: {
          created_at: string
          id: string
          month: number
          pdf_url: string | null
          profile_id: string
          report_data: Json
          report_type: string
          total_gross_amount: number
          total_net_amount: number
          total_tds_amount: number
          transaction_count: number
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          month: number
          pdf_url?: string | null
          profile_id: string
          report_data?: Json
          report_type: string
          total_gross_amount?: number
          total_net_amount?: number
          total_tds_amount?: number
          transaction_count?: number
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          month?: number
          pdf_url?: string | null
          profile_id?: string
          report_data?: Json
          report_type?: string
          total_gross_amount?: number
          total_net_amount?: number
          total_tds_amount?: number
          transaction_count?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "tds_reports_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tds_reports_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profile_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      tts_generations: {
        Row: {
          audio_url: string | null
          created_at: string
          credits_used: number | null
          id: string
          status: string
          text: string
          user_id: string
          voice_id: string
          voice_name: string | null
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          credits_used?: number | null
          id?: string
          status?: string
          text: string
          user_id: string
          voice_id: string
          voice_name?: string | null
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          credits_used?: number | null
          id?: string
          status?: string
          text?: string
          user_id?: string
          voice_id?: string
          voice_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tts_generations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tts_generations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_ads: {
        Row: {
          admin_notes: string | null
          aspect_ratio: string | null
          avatar_id: string | null
          avatar_name: string | null
          background_type: string | null
          call_to_action: string | null
          celebrity_id: string | null
          completed_at: string | null
          created_at: string
          generation_error: string | null
          heygen_video_id: string | null
          hook_style: string | null
          id: string
          price_paid: number | null
          product_description: string | null
          product_image_url: string
          product_name: string
          prompt: string | null
          script: string | null
          status: string
          thumbnail_url: string | null
          updated_at: string
          user_id: string
          video_file_key: string | null
          video_style: string | null
          video_url: string | null
          voice_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          aspect_ratio?: string | null
          avatar_id?: string | null
          avatar_name?: string | null
          background_type?: string | null
          call_to_action?: string | null
          celebrity_id?: string | null
          completed_at?: string | null
          created_at?: string
          generation_error?: string | null
          heygen_video_id?: string | null
          hook_style?: string | null
          id?: string
          price_paid?: number | null
          product_description?: string | null
          product_image_url: string
          product_name: string
          prompt?: string | null
          script?: string | null
          status?: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
          video_file_key?: string | null
          video_style?: string | null
          video_url?: string | null
          voice_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          aspect_ratio?: string | null
          avatar_id?: string | null
          avatar_name?: string | null
          background_type?: string | null
          call_to_action?: string | null
          celebrity_id?: string | null
          completed_at?: string | null
          created_at?: string
          generation_error?: string | null
          heygen_video_id?: string | null
          hook_style?: string | null
          id?: string
          price_paid?: number | null
          product_description?: string | null
          product_image_url?: string
          product_name?: string
          prompt?: string | null
          script?: string | null
          status?: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
          video_file_key?: string | null
          video_style?: string | null
          video_url?: string | null
          voice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ugc_ads_celebrity_id_fkey"
            columns: ["celebrity_id"]
            isOneToOne: false
            referencedRelation: "celebrities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_ads_celebrity_id_fkey"
            columns: ["celebrity_id"]
            isOneToOne: false
            referencedRelation: "celebrities_public"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_video_generations: {
        Row: {
          ai_model: string | null
          celebrity_id: string
          completed_at: string | null
          concept: string
          created_at: string
          error_message: string | null
          generation_metadata: Json | null
          heygen_video_id: string | null
          id: string
          price_paid: number
          script: string | null
          status: string
          thumbnail_generated_by_ai: boolean | null
          thumbnail_url: string | null
          user_id: string
          video_url: string | null
        }
        Insert: {
          ai_model?: string | null
          celebrity_id: string
          completed_at?: string | null
          concept: string
          created_at?: string
          error_message?: string | null
          generation_metadata?: Json | null
          heygen_video_id?: string | null
          id?: string
          price_paid: number
          script?: string | null
          status?: string
          thumbnail_generated_by_ai?: boolean | null
          thumbnail_url?: string | null
          user_id: string
          video_url?: string | null
        }
        Update: {
          ai_model?: string | null
          celebrity_id?: string
          completed_at?: string | null
          concept?: string
          created_at?: string
          error_message?: string | null
          generation_metadata?: Json | null
          heygen_video_id?: string | null
          id?: string
          price_paid?: number
          script?: string | null
          status?: string
          thumbnail_generated_by_ai?: boolean | null
          thumbnail_url?: string | null
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ugc_video_generations_celebrity_id_fkey"
            columns: ["celebrity_id"]
            isOneToOne: false
            referencedRelation: "celebrities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_video_generations_celebrity_id_fkey"
            columns: ["celebrity_id"]
            isOneToOne: false
            referencedRelation: "celebrities_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_video_generations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_video_generations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_logs: {
        Row: {
          action_category: string
          action_label: string
          action_type: string
          created_at: string
          device_type: string | null
          entity_id: string | null
          entity_label: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          profile_id: string | null
          severity: string
          user_agent: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
          user_plan: string | null
          user_role: string | null
        }
        Insert: {
          action_category: string
          action_label: string
          action_type: string
          created_at?: string
          device_type?: string | null
          entity_id?: string | null
          entity_label?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          profile_id?: string | null
          severity?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
          user_plan?: string | null
          user_role?: string | null
        }
        Update: {
          action_category?: string
          action_label?: string
          action_type?: string
          created_at?: string
          device_type?: string | null
          entity_id?: string | null
          entity_label?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          profile_id?: string | null
          severity?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
          user_plan?: string | null
          user_role?: string | null
        }
        Relationships: []
      }
      user_cloned_voices: {
        Row: {
          created_at: string | null
          elevenlabs_voice_id: string
          id: string
          user_id: string
          voice_description: string | null
          voice_name: string
        }
        Insert: {
          created_at?: string | null
          elevenlabs_voice_id: string
          id?: string
          user_id: string
          voice_description?: string | null
          voice_name: string
        }
        Update: {
          created_at?: string | null
          elevenlabs_voice_id?: string
          id?: string
          user_id?: string
          voice_description?: string | null
          voice_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_cloned_voices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_cloned_voices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      user_music_credits: {
        Row: {
          created_at: string
          free_generations_limit: number
          free_generations_used: number
          last_reset_date: string
          paid_credits: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          free_generations_limit?: number
          free_generations_used?: number
          last_reset_date?: string
          paid_credits?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          free_generations_limit?: number
          free_generations_used?: number
          last_reset_date?: string
          paid_credits?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_music_credits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_music_credits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profile_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_singing_personas: {
        Row: {
          audio_file_key: string | null
          clip_id: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          persona_id: string
          status: string | null
          task_id: string | null
          user_id: string
        }
        Insert: {
          audio_file_key?: string | null
          clip_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          persona_id: string
          status?: string | null
          task_id?: string | null
          user_id: string
        }
        Update: {
          audio_file_key?: string | null
          clip_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          persona_id?: string
          status?: string | null
          task_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_singing_personas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_singing_personas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      user_vapi_voices: {
        Row: {
          audio_url: string | null
          created_at: string
          id: string
          user_id: string
          vapi_voice_id: string
          voice_name: string
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          id?: string
          user_id: string
          vapi_voice_id: string
          voice_name: string
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          id?: string
          user_id?: string
          vapi_voice_id?: string
          voice_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_vapi_voices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_vapi_voices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      user_withdrawal_requests: {
        Row: {
          account_holder_name: string
          account_number: string
          admin_notes: string | null
          bank_name: string
          id: string
          ifsc_code: string
          processed_at: string | null
          processed_by: string | null
          profile_id: string
          requested_amount: number
          requested_at: string
          status: string
        }
        Insert: {
          account_holder_name: string
          account_number: string
          admin_notes?: string | null
          bank_name: string
          id?: string
          ifsc_code: string
          processed_at?: string | null
          processed_by?: string | null
          profile_id: string
          requested_amount: number
          requested_at?: string
          status?: string
        }
        Update: {
          account_holder_name?: string
          account_number?: string
          admin_notes?: string | null
          bank_name?: string
          id?: string
          ifsc_code?: string
          processed_at?: string | null
          processed_by?: string | null
          profile_id?: string
          requested_amount?: number
          requested_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_withdrawal_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_withdrawal_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "public_profile_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_withdrawal_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_withdrawal_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profile_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      verified_emails: {
        Row: {
          email: string
          expires_at: string
          id: string
          verified_at: string
        }
        Insert: {
          email: string
          expires_at: string
          id?: string
          verified_at?: string
        }
        Update: {
          email?: string
          expires_at?: string
          id?: string
          verified_at?: string
        }
        Relationships: []
      }
      voice_call_wishes: {
        Row: {
          call_config: Json | null
          call_duration_seconds: number | null
          call_status: string | null
          call_transcript: string | null
          celebrity_id: string | null
          completed_at: string | null
          created_at: string
          disconnect_reason: string | null
          error_message: string | null
          id: string
          occasion: string
          price_paid: number
          recipient_name: string
          recipient_phone: string
          scheduled_at: string | null
          sender_name: string | null
          user_id: string
          vapi_call_id: string | null
          vapi_voice_id: string
          vapi_voice_name: string | null
          webhook_payload: Json | null
        }
        Insert: {
          call_config?: Json | null
          call_duration_seconds?: number | null
          call_status?: string | null
          call_transcript?: string | null
          celebrity_id?: string | null
          completed_at?: string | null
          created_at?: string
          disconnect_reason?: string | null
          error_message?: string | null
          id?: string
          occasion: string
          price_paid?: number
          recipient_name: string
          recipient_phone: string
          scheduled_at?: string | null
          sender_name?: string | null
          user_id: string
          vapi_call_id?: string | null
          vapi_voice_id: string
          vapi_voice_name?: string | null
          webhook_payload?: Json | null
        }
        Update: {
          call_config?: Json | null
          call_duration_seconds?: number | null
          call_status?: string | null
          call_transcript?: string | null
          celebrity_id?: string | null
          completed_at?: string | null
          created_at?: string
          disconnect_reason?: string | null
          error_message?: string | null
          id?: string
          occasion?: string
          price_paid?: number
          recipient_name?: string
          recipient_phone?: string
          scheduled_at?: string | null
          sender_name?: string | null
          user_id?: string
          vapi_call_id?: string | null
          vapi_voice_id?: string
          vapi_voice_name?: string | null
          webhook_payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "voice_call_wishes_celebrity_id_fkey"
            columns: ["celebrity_id"]
            isOneToOne: false
            referencedRelation: "celebrities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_call_wishes_celebrity_id_fkey"
            columns: ["celebrity_id"]
            isOneToOne: false
            referencedRelation: "celebrities_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_call_wishes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_call_wishes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_conversion_generations: {
        Row: {
          audio_url: string | null
          created_at: string
          credits_used: number | null
          id: string
          original_file_name: string | null
          status: string
          target_voice_id: string
          target_voice_name: string | null
          user_id: string
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          credits_used?: number | null
          id?: string
          original_file_name?: string | null
          status?: string
          target_voice_id: string
          target_voice_name?: string | null
          user_id: string
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          credits_used?: number | null
          id?: string
          original_file_name?: string | null
          status?: string
          target_voice_id?: string
          target_voice_name?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_conversion_generations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_conversion_generations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string | null
          description: string | null
          id: string
          payment_method: string | null
          payment_screenshot_url: string | null
          processed_at: string | null
          processed_by: string | null
          status: string
          transaction_details: Json | null
          transaction_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          payment_method?: string | null
          payment_screenshot_url?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          transaction_details?: Json | null
          transaction_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          payment_method?: string | null
          payment_screenshot_url?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          transaction_details?: Json | null
          transaction_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "public_profile_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      wish_celebrity_orders: {
        Row: {
          amount_paid: number | null
          card_approved: boolean | null
          card_generation_type: string | null
          card_prompt: string | null
          card_url: string | null
          celebrity_id: string
          completed_at: string | null
          created_at: string | null
          discount_amount: number | null
          discount_percentage: number | null
          generated_card_image_url: string | null
          generated_card_text: string | null
          generation_attempts: number | null
          greeting_text: string | null
          id: string
          message: string
          occasion_type: string
          payment_method: string | null
          payment_status: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          recipient_name: string | null
          reference_image_url: string | null
          status: string | null
          updated_at: string | null
          user_id: string
          user_uploaded_card_url: string | null
          user_uploaded_video_url: string | null
          wishme_payment_id: string | null
        }
        Insert: {
          amount_paid?: number | null
          card_approved?: boolean | null
          card_generation_type?: string | null
          card_prompt?: string | null
          card_url?: string | null
          celebrity_id: string
          completed_at?: string | null
          created_at?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          generated_card_image_url?: string | null
          generated_card_text?: string | null
          generation_attempts?: number | null
          greeting_text?: string | null
          id?: string
          message: string
          occasion_type: string
          payment_method?: string | null
          payment_status?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          recipient_name?: string | null
          reference_image_url?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
          user_uploaded_card_url?: string | null
          user_uploaded_video_url?: string | null
          wishme_payment_id?: string | null
        }
        Update: {
          amount_paid?: number | null
          card_approved?: boolean | null
          card_generation_type?: string | null
          card_prompt?: string | null
          card_url?: string | null
          celebrity_id?: string
          completed_at?: string | null
          created_at?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          generated_card_image_url?: string | null
          generated_card_text?: string | null
          generation_attempts?: number | null
          greeting_text?: string | null
          id?: string
          message?: string
          occasion_type?: string
          payment_method?: string | null
          payment_status?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          recipient_name?: string | null
          reference_image_url?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
          user_uploaded_card_url?: string | null
          user_uploaded_video_url?: string | null
          wishme_payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wish_celebrity_orders_celebrity_id_fkey"
            columns: ["celebrity_id"]
            isOneToOne: false
            referencedRelation: "celebrities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wish_celebrity_orders_celebrity_id_fkey"
            columns: ["celebrity_id"]
            isOneToOne: false
            referencedRelation: "celebrities_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wish_celebrity_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wish_celebrity_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_basic"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      celebrities_public: {
        Row: {
          anniversary_date: string | null
          avatar_trained: boolean | null
          bio: string | null
          category: string | null
          created_at: string | null
          date_of_birth: string | null
          delivery_time: string | null
          followers: string | null
          heygen_avatar_id: string | null
          heygen_voice_id: string | null
          id: string | null
          image_url: string | null
          is_active: boolean | null
          is_verified: boolean | null
          location: string | null
          name: string | null
          other_occasions: string | null
          rating: number | null
          review_count: number | null
          service_prices: Json | null
          social_media: Json | null
          updated_at: string | null
          video_thumbnail_url: string | null
          voice_call_price: number | null
        }
        Insert: {
          anniversary_date?: string | null
          avatar_trained?: boolean | null
          bio?: string | null
          category?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          delivery_time?: string | null
          followers?: string | null
          heygen_avatar_id?: string | null
          heygen_voice_id?: string | null
          id?: string | null
          image_url?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          location?: string | null
          name?: string | null
          other_occasions?: string | null
          rating?: number | null
          review_count?: number | null
          service_prices?: Json | null
          social_media?: Json | null
          updated_at?: string | null
          video_thumbnail_url?: string | null
          voice_call_price?: number | null
        }
        Update: {
          anniversary_date?: string | null
          avatar_trained?: boolean | null
          bio?: string | null
          category?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          delivery_time?: string | null
          followers?: string | null
          heygen_avatar_id?: string | null
          heygen_voice_id?: string | null
          id?: string | null
          image_url?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          location?: string | null
          name?: string | null
          other_occasions?: string | null
          rating?: number | null
          review_count?: number | null
          service_prices?: Json | null
          social_media?: Json | null
          updated_at?: string | null
          video_thumbnail_url?: string | null
          voice_call_price?: number | null
        }
        Relationships: []
      }
      public_profile_basic: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          first_name: string | null
          id: string | null
          last_name: string | null
          referral_code: string | null
          referral_url: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          referral_code?: string | null
          referral_url?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          referral_code?: string | null
          referral_url?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      cleanup_expired_otps: { Args: never; Returns: undefined }
      create_admin_user: { Args: never; Returns: undefined }
      cron_booking_deadline_reminders: { Args: never; Returns: undefined }
      cron_monthly_tds_reports: { Args: never; Returns: undefined }
      cron_occasion_reminders: { Args: never; Returns: undefined }
      cron_plan_expiry: { Args: never; Returns: undefined }
      cron_referral_reminders: { Args: never; Returns: undefined }
      cron_subscription_expiry: { Args: never; Returns: undefined }
      generate_conversation_title: {
        Args: { conversation_uuid: string }
        Returns: string
      }
      generate_referral_code: { Args: never; Returns: string }
      generate_referral_url: { Args: { profile_id: string }; Returns: string }
      get_my_profile_id: { Args: never; Returns: string }
      get_my_referrals: {
        Args: never
        Returns: {
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          plan: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_by_auth_uid: { Args: never; Returns: boolean }
      is_owner_or_admin: { Args: { _user_id: string }; Returns: boolean }
      is_subscribed_to_celebrity: {
        Args: { _celebrity_id: string; _user_id: string }
        Returns: boolean
      }
      make_user_admin: { Args: { user_email: string }; Returns: undefined }
      purchase_celebrity_subscription: {
        Args: {
          p_celebrity_id: string
          p_payment_method?: string
          p_price: number
        }
        Returns: Json
      }
      reset_monthly_music_credits: { Args: never; Returns: undefined }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "celebrity"
      booking_status:
        | "pending"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "video_sent"
        | "failed"
      music_generation_status: "pending" | "processing" | "completed" | "failed"
      music_generation_type: "with_lyrics" | "instrumental" | "custom"
      service_type: "video_wish" | "image_promotion" | "video_promotion"
      user_plan: "basic" | "premium" | "elite"
      user_role: "user" | "celebrity" | "admin"
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
      app_role: ["admin", "moderator", "user", "celebrity"],
      booking_status: [
        "pending",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
        "video_sent",
        "failed",
      ],
      music_generation_status: ["pending", "processing", "completed", "failed"],
      music_generation_type: ["with_lyrics", "instrumental", "custom"],
      service_type: ["video_wish", "image_promotion", "video_promotion"],
      user_plan: ["basic", "premium", "elite"],
      user_role: ["user", "celebrity", "admin"],
    },
  },
} as const
