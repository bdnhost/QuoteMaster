import { supabase } from '../lib/supabase';
import type { Quote, ServiceItem } from '../types';

export class SupabaseQuoteService {
  
  /**
   * Get all quotes for the current user
   */
  static async getQuotes(): Promise<Quote[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          quote_items (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform Supabase data to Quote format
      return (data || []).map(this.transformSupabaseQuote);
    } catch (error) {
      console.error('Error fetching quotes:', error);
      throw error;
    }
  }

  /**
   * Get a specific quote by ID
   */
  static async getQuote(id: string): Promise<Quote | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          quote_items (*)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return this.transformSupabaseQuote(data);
    } catch (error) {
      console.error('Error fetching quote:', error);
      throw error;
    }
  }

  /**
   * Create a new quote
   */
  static async createQuote(quote: Partial<Quote>): Promise<Quote> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user's business info
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('business_name, business_phone, business_address')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;

      // Generate quote number
      const quoteNumber = await this.generateQuoteNumber();

      // Create quote
      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .insert({
          user_id: user.id,
          quote_number: quoteNumber,
          client_name: quote.customer?.name || '',
          client_email: quote.customer?.email || '',
          client_phone: quote.customer?.phone || '',
          client_address: quote.customer?.address || '',
          notes: quote.notes || '',
          valid_until: quote.validUntil || null,
          status: 'draft',
          total_amount: 0
        })
        .select()
        .single();

      if (quoteError) throw quoteError;

      // Add items if provided
      if (quote.items && quote.items.length > 0) {
        const { error: itemsError } = await supabase
          .from('quote_items')
          .insert(
            quote.items.map(item => ({
              quote_id: quoteData.id,
              description: item.description,
              quantity: item.quantity,
              unit_price: item.unitPrice
            }))
          );

        if (itemsError) throw itemsError;

        // Update total amount
        const totalAmount = quote.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        await supabase
          .from('quotes')
          .update({ total_amount: totalAmount })
          .eq('id', quoteData.id);
      }

      // Fetch the complete quote with items
      return await this.getQuote(quoteData.id) as Quote;
    } catch (error) {
      console.error('Error creating quote:', error);
      throw error;
    }
  }

  /**
   * Update an existing quote
   */
  static async updateQuote(id: string, quote: Partial<Quote>): Promise<Quote> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update quote
      const { error: quoteError } = await supabase
        .from('quotes')
        .update({
          client_name: quote.customer?.name,
          client_email: quote.customer?.email,
          client_phone: quote.customer?.phone,
          client_address: quote.customer?.address,
          notes: quote.notes,
          valid_until: quote.validUntil,
          status: quote.status,
          total_amount: quote.items ? quote.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) : 0
        })
        .eq('id', id);

      if (quoteError) throw quoteError;

      // Update items
      if (quote.items) {
        // Delete existing items
        await supabase
          .from('quote_items')
          .delete()
          .eq('quote_id', id);

        // Insert new items
        if (quote.items.length > 0) {
          const { error: itemsError } = await supabase
            .from('quote_items')
            .insert(
              quote.items.map(item => ({
                quote_id: id,
                description: item.description,
                quantity: item.quantity,
                unit_price: item.unitPrice
              }))
            );

          if (itemsError) throw itemsError;
        }
      }

      // Fetch the updated quote
      return await this.getQuote(id) as Quote;
    } catch (error) {
      console.error('Error updating quote:', error);
      throw error;
    }
  }

  /**
   * Delete a quote
   */
  static async deleteQuote(id: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('quotes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting quote:', error);
      throw error;
    }
  }

  /**
   * Create a new quote template
   */
  static async createNewQuote(): Promise<Quote> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user's business info
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('business_name, business_phone, business_address')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;

      const quoteNumber = await this.generateQuoteNumber();
      const today = new Date();
      const validUntil = new Date(today);
      validUntil.setDate(validUntil.getDate() + 30);

      return {
        id: crypto.randomUUID(),
        quoteNumber,
        businessInfo: {
          name: userData.business_name || '',
          phone: userData.business_phone || '',
          address: userData.business_address || '',
          logoUrl: ''
        },
        customer: {
          name: '',
          email: '',
          phone: '',
          address: ''
        },
        items: [],
        notes: 'המחיר כולל עבודה וחומרים.\nתנאי תשלום: 50% מקדמה, 50% בסיום העבודה.',
        issueDate: today.toISOString().split('T')[0],
        validUntil: validUntil.toISOString().split('T')[0],
        taxRate: 17,
        status: 'draft'
      };
    } catch (error) {
      console.error('Error creating new quote template:', error);
      throw error;
    }
  }

  /**
   * Generate a unique quote number
   */
  private static async generateQuoteNumber(): Promise<string> {
    const year = new Date().getFullYear();
    
    const { data, error } = await supabase
      .from('quotes')
      .select('quote_number')
      .like('quote_number', `${year}-%`)
      .order('quote_number', { ascending: false })
      .limit(1);

    if (error) throw error;

    let nextNum = 1;
    if (data && data.length > 0) {
      const lastNum = parseInt(data[0].quote_number.split('-')[1], 10);
      if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }

    return `${year}-${nextNum.toString().padStart(3, '0')}`;
  }

  /**
   * Transform Supabase quote data to Quote type
   */
  private static transformSupabaseQuote(data: any): Quote {
    return {
      id: data.id,
      quoteNumber: data.quote_number,
      businessInfo: {
        name: '', // Will be filled from user data
        phone: '',
        address: '',
        logoUrl: ''
      },
      customer: {
        name: data.client_name || '',
        email: data.client_email || '',
        phone: data.client_phone || '',
        address: data.client_address || ''
      },
      items: (data.quote_items || []).map((item: any): ServiceItem => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: parseFloat(item.unit_price)
      })),
      notes: data.notes || '',
      issueDate: data.created_at ? new Date(data.created_at).toISOString().split('T')[0] : '',
      validUntil: data.valid_until || '',
      taxRate: 17,
      status: data.status || 'draft'
    };
  }
}
