import { supabase, type Quote, type QuoteItem, type ActivityLog, type PaymentMethod, type Invoice } from '../lib/supabase';

// Quotes Service
export const quotesService = {
  // Get all quotes for current user
  async getQuotes(): Promise<Quote[]> {
    const { data, error } = await supabase
      .from('quotes')
      .select(`
        *,
        quote_items (*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get single quote with items
  async getQuote(id: string): Promise<Quote | null> {
    const { data, error } = await supabase
      .from('quotes')
      .select(`
        *,
        quote_items (*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  // Create new quote
  async createQuote(quote: Omit<Quote, 'id' | 'created_at' | 'updated_at'>): Promise<Quote> {
    const { data, error } = await supabase
      .from('quotes')
      .insert({
        ...quote,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update quote
  async updateQuote(id: string, updates: Partial<Quote>): Promise<Quote> {
    const { data, error } = await supabase
      .from('quotes')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete quote
  async deleteQuote(id: string): Promise<void> {
    const { error } = await supabase
      .from('quotes')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Generate next quote number
  async generateQuoteNumber(): Promise<string> {
    const { count } = await supabase
      .from('quotes')
      .select('*', { count: 'exact', head: true });

    const nextNumber = (count || 0) + 1;
    return `QM-${new Date().getFullYear()}-${nextNumber.toString().padStart(4, '0')}`;
  }
};

// Quote Items Service
export const quoteItemsService = {
  // Add items to quote
  async addQuoteItems(quoteId: string, items: Omit<QuoteItem, 'id' | 'quote_id' | 'created_at'>[]): Promise<QuoteItem[]> {
    const itemsToInsert = items.map(item => ({
      ...item,
      quote_id: quoteId,
      created_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('quote_items')
      .insert(itemsToInsert)
      .select();

    if (error) throw error;
    return data || [];
  },

  // Update quote item
  async updateQuoteItem(id: string, updates: Partial<QuoteItem>): Promise<QuoteItem> {
    const { data, error } = await supabase
      .from('quote_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete quote item
  async deleteQuoteItem(id: string): Promise<void> {
    const { error } = await supabase
      .from('quote_items')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Delete all items for a quote
  async deleteQuoteItems(quoteId: string): Promise<void> {
    const { error } = await supabase
      .from('quote_items')
      .delete()
      .eq('quote_id', quoteId);

    if (error) throw error;
  }
};

// Activity Logs Service
export const activityService = {
  // Log activity
  async logActivity(action: string, details?: any): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    const { error } = await supabase
      .from('activity_logs')
      .insert({
        user_id: user.id,
        action,
        details,
        created_at: new Date().toISOString()
      });

    if (error) console.error('Error logging activity:', error);
  },

  // Get activity logs
  async getActivityLogs(limit = 50): Promise<ActivityLog[]> {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }
};

// Payment Methods Service
export const paymentMethodsService = {
  // Get payment methods
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Create payment method
  async createPaymentMethod(paymentMethod: Omit<PaymentMethod, 'id' | 'user_id' | 'created_at'>): Promise<PaymentMethod> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('payment_methods')
      .insert({
        ...paymentMethod,
        user_id: user.id,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update payment method
  async updatePaymentMethod(id: string, updates: Partial<PaymentMethod>): Promise<PaymentMethod> {
    const { data, error } = await supabase
      .from('payment_methods')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete payment method
  async deletePaymentMethod(id: string): Promise<void> {
    const { error } = await supabase
      .from('payment_methods')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
  }
};

// Invoices Service
export const invoicesService = {
  // Get invoices
  async getInvoices(): Promise<Invoice[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        quotes (
          client_name,
          quote_number
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Create invoice from quote
  async createInvoiceFromQuote(quoteId: string, dueDate?: string): Promise<Invoice> {
    // Get quote details
    const quote = await quotesService.getQuote(quoteId);
    if (!quote) throw new Error('Quote not found');

    // Generate invoice number
    const { count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true });

    const nextNumber = (count || 0) + 1;
    const invoiceNumber = `INV-${new Date().getFullYear()}-${nextNumber.toString().padStart(4, '0')}`;

    const { data, error } = await supabase
      .from('invoices')
      .insert({
        quote_id: quoteId,
        invoice_number: invoiceNumber,
        amount: quote.total_amount,
        status: 'pending',
        due_date: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update invoice
  async updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice> {
    const { data, error } = await supabase
      .from('invoices')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
