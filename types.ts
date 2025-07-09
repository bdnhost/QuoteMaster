
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
    businessInfo: BusinessInfo;
}