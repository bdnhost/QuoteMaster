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

      // Generate quote number with retry mechanism
      let quoteNumber: string;
      let quoteData: any;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        try {
          quoteNumber = await this.generateQuoteNumber();

          // Try to create quote
          const { data, error } = await supabase
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

          if (error) {
            if (error.code === '23505' && attempts < maxAttempts - 1) {
              // Duplicate key error, try again with new number
              attempts++;
              console.warn(`Quote number ${quoteNumber} already exists, retrying... (attempt ${attempts})`);
              continue;
            }
            throw error;
          }

          quoteData = data;
          break;
        } catch (error) {
          attempts++;
          if (attempts >= maxAttempts) {
            throw new Error(`Failed to create quote after ${maxAttempts} attempts: ${error}`);
          }
        }
      }

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const year = new Date().getFullYear();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');

    // Try to get the highest number for this user in this year
    const { data, error } = await supabase
      .from('quotes')
      .select('quote_number')
      .eq('user_id', user.id)
      .like('quote_number', `${year}${month}-%`)
      .order('quote_number', { ascending: false })
      .limit(1);

    if (error) throw error;

    let nextNum = 1;
    if (data && data.length > 0) {
      const lastQuoteNumber = data[0].quote_number;
      const parts = lastQuoteNumber.split('-');
      if (parts.length >= 2) {
        const lastNum = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastNum)) nextNum = lastNum + 1;
      }
    }

    // Format: YYYYMM-XXX (e.g., 202412-001)
    const baseNumber = `${year}${month}-${nextNum.toString().padStart(3, '0')}`;

    // Double-check uniqueness by trying to find existing quote with this number
    const { data: existingQuote } = await supabase
      .from('quotes')
      .select('id')
      .eq('quote_number', baseNumber)
      .limit(1);

    if (existingQuote && existingQuote.length > 0) {
      // If still exists, add timestamp to make it unique
      const timestamp = Date.now().toString().slice(-4);
      return `${year}${month}-${nextNum.toString().padStart(3, '0')}-${timestamp}`;
    }

    return baseNumber;
  }

  /**
   * Transform Supabase quote data to Quote type
   */
  private static transformSupabaseQuote(data: any): Quote {
    // Ensure data exists and has required properties
    if (!data) {
      throw new Error('Quote data is null or undefined');
    }

    return {
      id: data.id || '',
      quoteNumber: data.quote_number || '',
      businessInfo: {
        name: data.business_name || '',
        phone: data.business_phone || '',
        address: data.business_address || '',
        logoUrl: data.business_logo || ''
      },
      customer: {
        name: data.client_name || '',
        email: data.client_email || '',
        phone: data.client_phone || '',
        address: data.client_address || ''
      },
      items: (data.quote_items || []).map((item: any): ServiceItem => ({
        id: item.id || '',
        description: item.description || '',
        quantity: item.quantity || 0,
        unitPrice: parseFloat(item.unit_price) || 0
      })),
      notes: data.notes || '',
      issueDate: data.created_at ? new Date(data.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      validUntil: data.valid_until || '',
      taxRate: 17,
      status: data.status || 'draft'
    };
  }
}
