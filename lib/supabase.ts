import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Database Types
export interface User {
  id: string
  email: string
  role: 'admin' | 'user'
  business_name?: string
  business_phone?: string
  business_address?: string
  logo_url?: string
  created_at: string
  updated_at: string
}

export interface Quote {
  id: string
  user_id: string
  quote_number: string
  client_name: string
  client_email?: string
  client_phone?: string
  client_address?: string
  status: 'draft' | 'sent' | 'approved' | 'rejected'
  total_amount: number
  notes?: string
  valid_until?: string
  created_at: string
  updated_at: string
  quote_items?: QuoteItem[]
}

export interface QuoteItem {
  id: string
  quote_id: string
  description: string
  quantity: number
  unit_price: number
  total_price: number
  created_at: string
}

export interface ActivityLog {
  id: string
  user_id: string
  action: string
  details?: any
  ip_address?: string
  user_agent?: string
  created_at: string
}

export interface PaymentMethod {
  id: string
  user_id: string
  name: string
  type: string
  details?: any
  is_active: boolean
  created_at: string
}

export interface Invoice {
  id: string
  quote_id: string
  invoice_number: string
  amount: number
  status: 'pending' | 'paid' | 'overdue' | 'cancelled'
  due_date?: string
  paid_date?: string
  payment_method_id?: string
  created_at: string
  updated_at: string
}
