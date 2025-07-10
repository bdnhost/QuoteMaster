import { supabase } from '../lib/supabase';

// Stripe Payment Service for QuoteMaster Pro
export class StripeService {
  private static stripePublishableKey: string | null = null;

  /**
   * Initialize Stripe with publishable key from settings
   */
  static async initialize(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'stripe_publishable_key')
        .single();

      if (error) throw error;
      
      this.stripePublishableKey = data.value as string;
      
      if (!this.stripePublishableKey) {
        throw new Error('Stripe publishable key not configured');
      }
    } catch (error) {
      console.error('Failed to initialize Stripe:', error);
      throw error;
    }
  }

  /**
   * Create payment intent for invoice
   */
  static async createPaymentIntent(invoiceId: string, amount: number, currency: string = 'USD') {
    try {
      // Call Supabase Edge Function for payment intent creation
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          invoice_id: invoiceId,
          amount: Math.round(amount * 100), // Convert to cents
          currency: currency.toLowerCase(),
        }
      });

      if (error) throw error;

      // Store transaction record
      await this.createTransactionRecord(invoiceId, data.payment_intent_id, amount, currency);

      return data;
    } catch (error) {
      console.error('Failed to create payment intent:', error);
      throw error;
    }
  }

  /**
   * Create subscription for user
   */
  static async createSubscription(planId: string, paymentMethodId: string) {
    try {
      const { data, error } = await supabase.functions.invoke('create-subscription', {
        body: {
          plan_id: planId,
          payment_method_id: paymentMethodId,
        }
      });

      if (error) throw error;

      // Update user subscription record
      await this.updateUserSubscription(data.subscription);

      return data;
    } catch (error) {
      console.error('Failed to create subscription:', error);
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  static async cancelSubscription(subscriptionId: string) {
    try {
      const { data, error } = await supabase.functions.invoke('cancel-subscription', {
        body: {
          subscription_id: subscriptionId,
        }
      });

      if (error) throw error;

      // Update local subscription record
      await supabase
        .from('user_subscriptions')
        .update({
          status: 'canceled',
          cancel_at_period_end: true,
          updated_at: new Date().toISOString()
        })
        .eq('stripe_subscription_id', subscriptionId);

      return data;
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      throw error;
    }
  }

  /**
   * Get subscription plans
   */
  static async getSubscriptionPlans() {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to get subscription plans:', error);
      throw error;
    }
  }

  /**
   * Get user's current subscription
   */
  static async getUserSubscription() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          subscription_plans (*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') throw error; // Ignore "not found" error
      return data;
    } catch (error) {
      console.error('Failed to get user subscription:', error);
      return null;
    }
  }

  /**
   * Handle webhook events
   */
  static async handleWebhook(event: any) {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event.data.object);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailure(event.data.object);
          break;
        case 'invoice.payment_succeeded':
          await this.handleSubscriptionPayment(event.data.object);
          break;
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdate(event.data.object);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionCancellation(event.data.object);
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      console.error('Webhook handling error:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private static async createTransactionRecord(invoiceId: string, paymentIntentId: string, amount: number, currency: string) {
    const { data: provider } = await supabase
      .from('payment_providers')
      .select('id')
      .eq('name', 'stripe')
      .single();

    await supabase
      .from('payment_transactions')
      .insert({
        invoice_id: invoiceId,
        provider_id: provider?.id,
        external_transaction_id: paymentIntentId,
        amount,
        currency,
        status: 'pending'
      });
  }

  private static async updateUserSubscription(subscription: any) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('id')
      .eq('stripe_price_id', subscription.items.data[0].price.id)
      .single();

    await supabase
      .from('user_subscriptions')
      .upsert({
        user_id: user.id,
        plan_id: plan?.id,
        stripe_subscription_id: subscription.id,
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end
      });
  }

  private static async handlePaymentSuccess(paymentIntent: any) {
    await supabase
      .from('payment_transactions')
      .update({
        status: 'completed',
        provider_response: paymentIntent,
        updated_at: new Date().toISOString()
      })
      .eq('external_transaction_id', paymentIntent.id);

    // Update invoice status
    const { data: transaction } = await supabase
      .from('payment_transactions')
      .select('invoice_id')
      .eq('external_transaction_id', paymentIntent.id)
      .single();

    if (transaction) {
      await supabase
        .from('invoices')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString()
        })
        .eq('id', transaction.invoice_id);
    }
  }

  private static async handlePaymentFailure(paymentIntent: any) {
    await supabase
      .from('payment_transactions')
      .update({
        status: 'failed',
        provider_response: paymentIntent,
        updated_at: new Date().toISOString()
      })
      .eq('external_transaction_id', paymentIntent.id);
  }

  private static async handleSubscriptionPayment(invoice: any) {
    // Handle successful subscription payment
    console.log('Subscription payment succeeded:', invoice.id);
  }

  private static async handleSubscriptionUpdate(subscription: any) {
    await this.updateUserSubscription(subscription);
  }

  private static async handleSubscriptionCancellation(subscription: any) {
    await supabase
      .from('user_subscriptions')
      .update({
        status: 'canceled',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id);
  }
}
