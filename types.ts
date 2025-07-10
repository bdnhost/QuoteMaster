
export interface ServiceItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Customer {
  name: string;
  email: string;
  phone: string;
  address: string;
}

export interface BusinessInfo {
  name: string;
  phone: string;
  address: string;
  logoUrl: string | null;
}

export type QuoteStatus = 'draft' | 'sent' | 'approved' | 'rejected';

export interface Quote {
  id: string;
  quoteNumber: string;
  businessInfo: BusinessInfo;
  customer: Customer;
  items: ServiceItem[];
  notes: string;
  issueDate: string;
  validUntil: string;
  taxRate: number; // e.g., 17 for 17% VAT
  status: QuoteStatus;
}

export interface User {
    id: string;
    email: string;
    role: 'admin' | 'user';
    is_super_admin?: boolean;
    business_name?: string;
    business_phone?: string;
    business_address?: string;
    logo_url?: string;
    stripe_customer_id?: string;
    created_at: string;
    updated_at: string;
    // Legacy support
    businessInfo?: BusinessInfo;
    createdAt?: string;
}

export interface PaymentMethod {
    id: string;
    name: string;
    type: 'bank_transfer' | 'credit_card' | 'cash' | 'check' | 'paypal' | 'other';
    isActive: boolean;
    description?: string;
}

export interface Invoice {
    id: string;
    invoiceNumber: string;
    quoteId?: string;
    userId: string;
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    customerAddress?: string;
    issueDate: string;
    dueDate?: string;
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    totalAmount: number;
    status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
    notes?: string;
    items: InvoiceItem[];
    createdAt: string;
    updatedAt: string;
}

export interface InvoiceItem {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
}

export interface Payment {
    id: string;
    paymentNumber: string;
    invoiceId: string;
    userId: string;
    paymentMethodId?: string;
    amount: number;
    paymentDate: string;
    referenceNumber?: string;
    notes?: string;
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    createdAt: string;
    updatedAt: string;
}

export interface SystemSettings {
    [key: string]: {
        value: any;
        type: 'string' | 'number' | 'boolean' | 'json';
        description: string;
    };
}

export interface ActivityLog {
    id: string;
    userId?: string;
    userEmail?: string;
    businessName?: string;
    action: string;
    entityType?: string;
    entityId?: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
    createdAt: string;
}

export interface QuoteTemplate {
    id: string;
    name: string;
    description?: string;
    templateData: any;
    isDefault: boolean;
    isActive: boolean;
    createdBy?: string;
    createdAt: string;
    updatedAt: string;
}

// New types for admin system
export interface PaymentProvider {
    id: string;
    name: string;
    display_name: string;
    is_active: boolean;
    config: any;
    created_at: string;
    updated_at: string;
}

export interface PaymentTransaction {
    id: string;
    invoice_id: string;
    provider_id: string;
    external_transaction_id: string;
    amount: number;
    currency: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
    provider_response: any;
    created_at: string;
    updated_at: string;
}

export interface SubscriptionPlan {
    id: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    billing_interval: 'monthly' | 'yearly';
    features: {
        max_quotes: number;
        max_storage_mb: number;
        support: string;
        custom_branding?: boolean;
        api_access?: boolean;
        advanced_analytics?: boolean;
    };
    is_active: boolean;
    stripe_price_id?: string;
    created_at: string;
    updated_at: string;
}

export interface UserSubscription {
    id: string;
    user_id: string;
    plan_id: string;
    stripe_subscription_id?: string;
    status: 'active' | 'canceled' | 'past_due' | 'unpaid';
    current_period_start: string;
    current_period_end: string;
    cancel_at_period_end: boolean;
    created_at: string;
    updated_at: string;
    subscription_plans?: SubscriptionPlan;
}

export interface SystemSetting {
    id: string;
    key: string;
    value: any;
    description: string;
    category: string;
    is_public: boolean;
    created_at: string;
    updated_at: string;
}

export interface EmailTemplate {
    id: string;
    name: string;
    subject: string;
    html_content: string;
    text_content?: string;
    variables: string[];
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface Notification {
    id: string;
    user_id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    is_read: boolean;
    action_url?: string;
    metadata: any;
    created_at: string;
}

export interface FileUpload {
    id: string;
    user_id: string;
    filename: string;
    original_filename: string;
    file_size: number;
    mime_type: string;
    storage_path: string;
    is_public: boolean;
    metadata: any;
    created_at: string;
}

export interface DailyStat {
    id: string;
    date: string;
    total_users: number;
    new_users: number;
    total_quotes: number;
    new_quotes: number;
    total_invoices: number;
    new_invoices: number;
    total_revenue: number;
    new_revenue: number;
    created_at: string;
}