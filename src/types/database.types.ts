export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      customers: {
        Row: {
          id: string
          name: string
          address: string
          phone: string | null
          email: string | null
          type: 'Residential' | 'Commercial' | 'Workshop'
          cost: number
          day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday' | null
          route_order: number | null
          distance_from_shop_km: number | null
          distance_from_shop_miles: number | null
          latitude: number | null
          longitude: number | null
          has_additional_work: boolean
          additional_work_cost: number | null
          created_at: string
          updated_at: string
          archived_at: string | null
        }
        Insert: {
          id?: string
          name: string
          address: string
          phone?: string | null
          email?: string | null
          type: 'Residential' | 'Commercial' | 'Workshop'
          cost?: number
          day?: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday' | null
          route_order?: number | null
          distance_from_shop_km?: number | null
          distance_from_shop_miles?: number | null
          latitude?: number | null
          longitude?: number | null
          has_additional_work?: boolean
          additional_work_cost?: number | null
          created_at?: string
          updated_at?: string
          archived_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          address?: string
          phone?: string | null
          email?: string | null
          type?: 'Residential' | 'Commercial' | 'Workshop'
          cost?: number
          day?: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday' | null
          route_order?: number | null
          distance_from_shop_km?: number | null
          distance_from_shop_miles?: number | null
          latitude?: number | null
          longitude?: number | null
          has_additional_work?: boolean
          additional_work_cost?: number | null
          created_at?: string
          updated_at?: string
          archived_at?: string | null
        }
      }
      products_services: {
        Row: {
          id: string
          name: string
          description: string | null
          type: 'mowing' | 'trimming' | 'edging' | 'fertilizing' | 'aeration' | 'seeding' | 'mulching' | 'leaf_removal' | 'snow_removal' | 'other'
          base_cost: number
          unit: 'per_sqft' | 'per_hour' | 'flat' | 'per_acre'
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          type: 'mowing' | 'trimming' | 'edging' | 'fertilizing' | 'aeration' | 'seeding' | 'mulching' | 'leaf_removal' | 'snow_removal' | 'other'
          base_cost?: number
          unit: 'per_sqft' | 'per_hour' | 'flat' | 'per_acre'
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          type?: 'mowing' | 'trimming' | 'edging' | 'fertilizing' | 'aeration' | 'seeding' | 'mulching' | 'leaf_removal' | 'snow_removal' | 'other'
          base_cost?: number
          unit?: 'per_sqft' | 'per_hour' | 'flat' | 'per_acre'
          active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      customer_products: {
        Row: {
          id: string
          customer_id: string
          product_id: string
          frequency: 'once' | 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'seasonal' | 'yearly'
          custom_cost: number | null
          start_date: string
          end_date: string | null
          auto_renew: boolean
          last_service_date: string | null
          next_service_date: string | null
          active: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          product_id: string
          frequency: 'once' | 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'seasonal' | 'yearly'
          custom_cost?: number | null
          start_date: string
          end_date?: string | null
          auto_renew?: boolean
          last_service_date?: string | null
          next_service_date?: string | null
          active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          product_id?: string
          frequency?: 'once' | 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'seasonal' | 'yearly'
          custom_cost?: number | null
          start_date?: string
          end_date?: string | null
          auto_renew?: boolean
          last_service_date?: string | null
          next_service_date?: string | null
          active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      routes: {
        Row: {
          id: string
          name: string | null
          date: string
          day_of_week: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday'
          status: 'planned' | 'in_progress' | 'completed' | 'cancelled'
          driver_id: string | null
          driver_name: string | null
          start_time: string | null
          end_time: string | null
          total_distance_km: number | null
          total_distance_miles: number | null
          total_duration_minutes: number | null
          estimated_fuel_cost: number | null
          average_duration_minutes: number | null
          optimized_waypoints: Json | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name?: string | null
          date: string
          day_of_week: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday'
          status?: 'planned' | 'in_progress' | 'completed' | 'cancelled'
          driver_id?: string | null
          driver_name?: string | null
          start_time?: string | null
          end_time?: string | null
          total_distance_km?: number | null
          total_distance_miles?: number | null
          total_duration_minutes?: number | null
          estimated_fuel_cost?: number | null
          average_duration_minutes?: number | null
          optimized_waypoints?: Json | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          date?: string
          day_of_week?: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday'
          status?: 'planned' | 'in_progress' | 'completed' | 'cancelled'
          driver_id?: string | null
          driver_name?: string | null
          start_time?: string | null
          end_time?: string | null
          total_distance_km?: number | null
          total_distance_miles?: number | null
          total_duration_minutes?: number | null
          estimated_fuel_cost?: number | null
          average_duration_minutes?: number | null
          optimized_waypoints?: Json | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      route_stops: {
        Row: {
          id: string
          route_id: string
          customer_id: string
          stop_order: number
          status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'cancelled'
          scheduled_arrival_time: string | null
          actual_arrival_time: string | null
          scheduled_departure_time: string | null
          actual_departure_time: string | null
          estimated_duration_minutes: number | null
          actual_duration_minutes: number | null
          service_notes: string | null
          skip_reason: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          route_id: string
          customer_id: string
          stop_order: number
          status?: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'cancelled'
          scheduled_arrival_time?: string | null
          actual_arrival_time?: string | null
          scheduled_departure_time?: string | null
          actual_departure_time?: string | null
          estimated_duration_minutes?: number | null
          actual_duration_minutes?: number | null
          service_notes?: string | null
          skip_reason?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          route_id?: string
          customer_id?: string
          stop_order?: number
          status?: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'cancelled'
          scheduled_arrival_time?: string | null
          actual_arrival_time?: string | null
          scheduled_departure_time?: string | null
          actual_departure_time?: string | null
          estimated_duration_minutes?: number | null
          actual_duration_minutes?: number | null
          service_notes?: string | null
          skip_reason?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      service_history: {
        Row: {
          id: string
          customer_id: string
          route_stop_id: string | null
          product_id: string | null
          service_date: string
          service_type: string
          cost: number
          duration_minutes: number | null
          weather_conditions: string | null
          temperature_f: number | null
          notes: string | null
          photos: string[] | null
          completed_by: string | null
          customer_rating: number | null
          customer_feedback: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          route_stop_id?: string | null
          product_id?: string | null
          service_date: string
          service_type: string
          cost?: number
          duration_minutes?: number | null
          weather_conditions?: string | null
          temperature_f?: number | null
          notes?: string | null
          photos?: string[] | null
          completed_by?: string | null
          customer_rating?: number | null
          customer_feedback?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          route_stop_id?: string | null
          product_id?: string | null
          service_date?: string
          service_type?: string
          cost?: number
          duration_minutes?: number | null
          weather_conditions?: string | null
          temperature_f?: number | null
          notes?: string | null
          photos?: string[] | null
          completed_by?: string | null
          customer_rating?: number | null
          customer_feedback?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      inquiries: {
        Row: {
          id: string
          name: string
          email: string
          phone: string | null
          address: string
          property_type: 'Residential' | 'Commercial' | 'Other' | null
          lot_size: string | null
          services_interested: string[] | null
          preferred_contact_method: 'email' | 'phone' | 'text' | null
          preferred_contact_time: string | null
          status: 'pending' | 'contacted' | 'quoted' | 'converted' | 'declined' | 'spam'
          notes: string | null
          internal_notes: string | null
          source: string | null
          converted_customer_id: string | null
          contacted_at: string | null
          contacted_by: string | null
          quote_amount: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          phone?: string | null
          address: string
          property_type?: 'Residential' | 'Commercial' | 'Other' | null
          lot_size?: string | null
          services_interested?: string[] | null
          preferred_contact_method?: 'email' | 'phone' | 'text' | null
          preferred_contact_time?: string | null
          status?: 'pending' | 'contacted' | 'quoted' | 'converted' | 'declined' | 'spam'
          notes?: string | null
          internal_notes?: string | null
          source?: string | null
          converted_customer_id?: string | null
          contacted_at?: string | null
          contacted_by?: string | null
          quote_amount?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          phone?: string | null
          address?: string
          property_type?: 'Residential' | 'Commercial' | 'Other' | null
          lot_size?: string | null
          services_interested?: string[] | null
          preferred_contact_method?: 'email' | 'phone' | 'text' | null
          preferred_contact_time?: string | null
          status?: 'pending' | 'contacted' | 'quoted' | 'converted' | 'declined' | 'spam'
          notes?: string | null
          internal_notes?: string | null
          source?: string | null
          converted_customer_id?: string | null
          contacted_at?: string | null
          contacted_by?: string | null
          quote_amount?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      invoices: {
        Row: {
          id: string
          customer_id: string
          invoice_number: number
          status: 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'void'
          issue_date: string
          due_date: string | null
          currency: string
          subtotal: number
          tax: number
          total: number
          amount_paid: number
          notes: string | null
          stripe_invoice_id: string | null
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          invoice_number?: number
          status?: 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'void'
          issue_date?: string
          due_date?: string | null
          currency?: string
          subtotal?: number
          tax?: number
          total?: number
          amount_paid?: number
          notes?: string | null
          stripe_invoice_id?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          invoice_number?: number
          status?: 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'void'
          issue_date?: string
          due_date?: string | null
          currency?: string
          subtotal?: number
          tax?: number
          total?: number
          amount_paid?: number
          notes?: string | null
          stripe_invoice_id?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      invoice_line_items: {
        Row: {
          id: string
          invoice_id: string
          product_id: string | null
          description: string
          quantity: number
          unit_price: number
          total: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          product_id?: string | null
          description: string
          quantity?: number
          unit_price?: number
          total?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          product_id?: string | null
          description?: string
          quantity?: number
          unit_price?: number
          total?: number
          created_at?: string
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          invoice_id: string
          amount: number
          currency: string
          method: 'cash' | 'check' | 'card' | 'bank_transfer' | 'stripe' | 'manual' | 'other'
          status: 'pending' | 'succeeded' | 'failed' | 'refunded'
          paid_at: string | null
          reference: string | null
          stripe_payment_intent_id: string | null
          stripe_charge_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          amount: number
          currency?: string
          method?: 'cash' | 'check' | 'card' | 'bank_transfer' | 'stripe' | 'manual' | 'other'
          status?: 'pending' | 'succeeded' | 'failed' | 'refunded'
          paid_at?: string | null
          reference?: string | null
          stripe_payment_intent_id?: string | null
          stripe_charge_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          amount?: number
          currency?: string
          method?: 'cash' | 'check' | 'card' | 'bank_transfer' | 'stripe' | 'manual' | 'other'
          status?: 'pending' | 'succeeded' | 'failed' | 'refunded'
          paid_at?: string | null
          reference?: string | null
          stripe_payment_intent_id?: string | null
          stripe_charge_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      inquiry_rate_limits: {
        Row: {
          ip: string
          window_start: string
          request_count: number
          updated_at: string
        }
        Insert: {
          ip: string
          window_start: string
          request_count?: number
          updated_at?: string
        }
        Update: {
          ip?: string
          window_start?: string
          request_count?: number
          updated_at?: string
        }
      }
      google_sheets_connections: {
        Row: {
          id: string
          singleton: boolean
          access_token_secret_id: string | null
          refresh_token_secret_id: string | null
          scope: string | null
          token_type: string | null
          expiry_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          singleton?: boolean
          access_token_secret_id?: string | null
          refresh_token_secret_id?: string | null
          scope?: string | null
          token_type?: string | null
          expiry_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          singleton?: boolean
          access_token_secret_id?: string | null
          refresh_token_secret_id?: string | null
          scope?: string | null
          token_type?: string | null
          expiry_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      crew_members: {
        Row: {
          id: string
          name: string
          email: string | null
          phone: string | null
          role: string
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email?: string | null
          phone?: string | null
          role?: string
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          phone?: string | null
          role?: string
          active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          user_id: string
          role: 'admin' | 'staff'
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          role?: 'admin' | 'staff'
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          role?: 'admin' | 'staff'
          created_at?: string
          updated_at?: string
        }
      }
      settings: {
        Row: {
          id: string
          singleton: boolean
          business_name: string
          business_email: string | null
          business_phone: string | null
          shop_address: string
          shop_lat: number
          shop_lng: number
          notify_new_inquiry_email: boolean
          notify_new_inquiry_sms: boolean
          notify_route_completed_email: boolean
          notify_route_completed_sms: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          singleton?: boolean
          business_name?: string
          business_email?: string | null
          business_phone?: string | null
          shop_address?: string
          shop_lat?: number
          shop_lng?: number
          notify_new_inquiry_email?: boolean
          notify_new_inquiry_sms?: boolean
          notify_route_completed_email?: boolean
          notify_route_completed_sms?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          singleton?: boolean
          business_name?: string
          business_email?: string | null
          business_phone?: string | null
          shop_address?: string
          shop_lat?: number
          shop_lng?: number
          notify_new_inquiry_email?: boolean
          notify_new_inquiry_sms?: boolean
          notify_route_completed_email?: boolean
          notify_route_completed_sms?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      route_times: {
        Row: {
          id: string
          route_id: string | null
          started_at: string
          ended_at: string
          duration_minutes: number
          created_at: string
        }
        Insert: {
          id?: string
          route_id?: string | null
          started_at: string
          ended_at: string
          duration_minutes: number
          created_at?: string
        }
        Update: {
          id?: string
          route_id?: string | null
          started_at?: string
          ended_at?: string
          duration_minutes?: number
          created_at?: string
        }
      }
    }
    Views: {
      customer_metrics: {
        Row: {
          id: string
          name: string
          type: string
          base_cost: number
          total_services: number
          lifetime_revenue: number
          avg_service_cost: number
          last_service_date: string | null
          avg_rating: number
          services_last_90_days: number
        }
      }
      route_average_durations: {
        Row: {
          route_id: string
          date: string
          day_of_week: string
          status: string
          driver_id: string | null
          driver_name: string | null
          average_duration_minutes: number | null
          total_duration_minutes: number | null
          start_time: string | null
          end_time: string | null
          samples: number
          calculated_avg_minutes: number
        }
      }
      route_statistics: {
        Row: {
          id: string
          name: string | null
          date: string
          day_of_week: string
          status: string
          total_stops: number
          completed_stops: number
          skipped_stops: number
          total_distance_miles: number | null
          total_duration_minutes: number | null
          total_revenue: number
          estimated_fuel_cost: number | null
        }
      }
    }
    Functions: {
      calculate_distance_miles: {
        Args: {
          lat1: number
          lng1: number
          lat2: number
          lng2: number
        }
        Returns: number
      }
      get_customers_by_day: {
        Args: {
          day_name: string
        }
        Returns: Array<{
          id: string
          name: string
          address: string
          type: string
          cost: number
          route_order: number
          distance_from_shop_miles: number
          has_additional_work: boolean
          additional_work_cost: number
        }>
      }
      get_public_business_profile: {
        Args: Record<PropertyKey, never>
        Returns: Array<{
          business_name: string
          business_email: string | null
          business_phone: string | null
        }>
      }
      is_admin: {
        Args: {
          check_user: string
        }
        Returns: boolean
      }
      update_route_orders: {
        Args: {
          customer_ids: string[]
          day_name: string
        }
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Type exports for convenience
export type Customer = Database['public']['Tables']['customers']['Row']
export type CustomerInsert = Database['public']['Tables']['customers']['Insert']
export type CustomerUpdate = Database['public']['Tables']['customers']['Update']

export type Product = Database['public']['Tables']['products_services']['Row']
export type ProductInsert = Database['public']['Tables']['products_services']['Insert']
export type ProductUpdate = Database['public']['Tables']['products_services']['Update']

export type CustomerProduct = Database['public']['Tables']['customer_products']['Row']
export type CustomerProductInsert = Database['public']['Tables']['customer_products']['Insert']
export type CustomerProductUpdate = Database['public']['Tables']['customer_products']['Update']

export type CrewMember = Database['public']['Tables']['crew_members']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type Route = Database['public']['Tables']['routes']['Row']
export type RouteInsert = Database['public']['Tables']['routes']['Insert']
export type RouteUpdate = Database['public']['Tables']['routes']['Update']

export type RouteStop = Database['public']['Tables']['route_stops']['Row']
export type RouteStopInsert = Database['public']['Tables']['route_stops']['Insert']
export type RouteStopUpdate = Database['public']['Tables']['route_stops']['Update']

export type RouteTime = Database['public']['Tables']['route_times']['Row']
export type RouteTimeInsert = Database['public']['Tables']['route_times']['Insert']
export type RouteTimeUpdate = Database['public']['Tables']['route_times']['Update']

export type Settings = Database['public']['Tables']['settings']['Row']
export type SettingsInsert = Database['public']['Tables']['settings']['Insert']
export type SettingsUpdate = Database['public']['Tables']['settings']['Update']

export type ServiceHistory = Database['public']['Tables']['service_history']['Row']
export type ServiceHistoryInsert = Database['public']['Tables']['service_history']['Insert']
export type ServiceHistoryUpdate = Database['public']['Tables']['service_history']['Update']

export type Inquiry = Database['public']['Tables']['inquiries']['Row']
export type InquiryInsert = Database['public']['Tables']['inquiries']['Insert']
export type InquiryUpdate = Database['public']['Tables']['inquiries']['Update']

export type Invoice = Database['public']['Tables']['invoices']['Row']
export type InvoiceInsert = Database['public']['Tables']['invoices']['Insert']
export type InvoiceUpdate = Database['public']['Tables']['invoices']['Update']

export type InvoiceLineItem = Database['public']['Tables']['invoice_line_items']['Row']
export type InvoiceLineItemInsert = Database['public']['Tables']['invoice_line_items']['Insert']
export type InvoiceLineItemUpdate = Database['public']['Tables']['invoice_line_items']['Update']

export type Payment = Database['public']['Tables']['payments']['Row']
export type PaymentInsert = Database['public']['Tables']['payments']['Insert']
export type PaymentUpdate = Database['public']['Tables']['payments']['Update']

export type InquiryRateLimit = Database['public']['Tables']['inquiry_rate_limits']['Row']
export type InquiryRateLimitInsert = Database['public']['Tables']['inquiry_rate_limits']['Insert']
export type InquiryRateLimitUpdate = Database['public']['Tables']['inquiry_rate_limits']['Update']

export type GoogleSheetsConnection = Database['public']['Tables']['google_sheets_connections']['Row']
export type GoogleSheetsConnectionInsert = Database['public']['Tables']['google_sheets_connections']['Insert']
export type GoogleSheetsConnectionUpdate = Database['public']['Tables']['google_sheets_connections']['Update']

export type CustomerMetric = Database['public']['Views']['customer_metrics']['Row']
export type RouteStatistic = Database['public']['Views']['route_statistics']['Row']
export type RouteAverageDuration = Database['public']['Views']['route_average_durations']['Row']
