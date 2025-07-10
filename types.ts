
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
    businessInfo: BusinessInfo;
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