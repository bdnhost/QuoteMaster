import { supabase } from './supabase';

// Advanced Permission Manager for QuoteMaster Pro
export class PermissionManager {
  private static userCache: Map<string, any> = new Map();
  private static cacheExpiry: Map<string, number> = new Map();
  private static CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get current user with caching
   */
  private static async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const cacheKey = user.id;
    const now = Date.now();

    // Check cache
    if (this.userCache.has(cacheKey) && this.cacheExpiry.get(cacheKey)! > now) {
      return this.userCache.get(cacheKey);
    }

    // Fetch from database
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        user_subscriptions (
          *,
          subscription_plans (*)
        )
      `)
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching user data:', error);
      return null;
    }

    // Cache the result
    this.userCache.set(cacheKey, data);
    this.cacheExpiry.set(cacheKey, now + this.CACHE_DURATION);

    return data;
  }

  /**
   * Clear user cache
   */
  static clearCache(userId?: string) {
    if (userId) {
      this.userCache.delete(userId);
      this.cacheExpiry.delete(userId);
    } else {
      this.userCache.clear();
      this.cacheExpiry.clear();
    }
  }

  /**
   * Check if current user is admin
   */
  static async isAdmin(): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();
      return user?.role === 'admin';
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  /**
   * Check if current user can access admin dashboard
   */
  static async canAccessAdminDashboard(): Promise<boolean> {
    return await this.isAdmin();
  }

  /**
   * Check if current user can manage users
   */
  static async canManageUsers(): Promise<boolean> {
    return await this.isAdmin();
  }

  /**
   * Check if current user can view all quotes
   */
  static async canViewAllQuotes(): Promise<boolean> {
    return await this.isAdmin();
  }

  /**
   * Check if current user can view all activity logs
   */
  static async canViewAllActivityLogs(): Promise<boolean> {
    return await this.isAdmin();
  }

  /**
   * Check if current user can manage system settings
   */
  static async canManageSystemSettings(): Promise<boolean> {
    return await this.isAdmin();
  }

  /**
   * Check if current user owns a specific quote
   */
  static async ownsQuote(quoteId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from('quotes')
        .select('user_id')
        .eq('id', quoteId)
        .single();

      if (error) {
        console.error('Error checking quote ownership:', error);
        return false;
      }

      return data?.user_id === user.id;
    } catch (error) {
      console.error('Error in ownsQuote check:', error);
      return false;
    }
  }

  /**
   * Check if current user can edit a specific quote
   */
  static async canEditQuote(quoteId: string): Promise<boolean> {
    // Admin can edit any quote, user can edit only their own
    const isAdmin = await this.isAdmin();
    if (isAdmin) return true;
    
    return await this.ownsQuote(quoteId);
  }

  /**
   * Check if current user can delete a specific quote
   */
  static async canDeleteQuote(quoteId: string): Promise<boolean> {
    // Admin can delete any quote, user can delete only their own
    const isAdmin = await this.isAdmin();
    if (isAdmin) return true;
    
    return await this.ownsQuote(quoteId);
  }

  /**
   * Get user role
   */
  static async getUserRole(): Promise<'admin' | 'user' | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error getting user role:', error);
        return null;
      }

      return data?.role as 'admin' | 'user' || 'user';
    } catch (error) {
      console.error('Error in getUserRole:', error);
      return null;
    }
  }

  /**
   * Ensure user has admin permissions (throws error if not)
   */
  static async requireAdmin(): Promise<void> {
    const isAdmin = await this.isAdmin();
    if (!isAdmin) {
      throw new Error('Access denied: Admin permissions required');
    }
  }

  /**
   * Ensure user owns the quote (throws error if not)
   */
  static async requireQuoteOwnership(quoteId: string): Promise<void> {
    const canEdit = await this.canEditQuote(quoteId);
    if (!canEdit) {
      throw new Error('Access denied: You do not have permission to access this quote');
    }
  }

  /**
   * Get filtered data based on user permissions
   */
  static async getAccessibleQuotes() {
    const isAdmin = await this.isAdmin();
    
    if (isAdmin) {
      // Admin can see all quotes
      return await supabase
        .from('quotes')
        .select(`
          *,
          quote_items (*),
          users (
            business_name,
            email
          )
        `)
        .order('created_at', { ascending: false });
    } else {
      // Regular user sees only their quotes
      return await supabase
        .from('quotes')
        .select(`
          *,
          quote_items (*)
        `)
        .order('created_at', { ascending: false });
    }
  }

  /**
   * Get accessible activity logs based on permissions
   */
  static async getAccessibleActivityLogs() {
    const isAdmin = await this.isAdmin();
    
    if (isAdmin) {
      // Admin can see all activity logs
      return await supabase
        .from('activity_logs')
        .select(`
          *,
          users (
            email,
            business_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);
    } else {
      // Regular user sees only their activity logs
      return await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
    }
  }

  /**
   * Get accessible users based on permissions
   */
  static async getAccessibleUsers() {
    const isAdmin = await this.isAdmin();

    if (!isAdmin) {
      throw new Error('Access denied: Admin permissions required to view users');
    }

    return await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
  }

  /**
   * Get accessible system settings based on permissions
   */
  static async getAccessibleSystemSettings() {
    const isAdmin = await this.isAdmin();

    if (isAdmin) {
      // Admin can see all settings with user info
      return await supabase
        .from('system_settings_with_users')
        .select('*')
        .order('category', { ascending: true });
    } else {
      // Regular users see only public settings
      return await supabase
        .from('system_settings')
        .select('*')
        .eq('is_public', true)
        .order('category', { ascending: true });
    }
  }

  /**
   * Get accessible email templates based on permissions
   */
  static async getAccessibleEmailTemplates() {
    const isAdmin = await this.isAdmin();

    if (!isAdmin) {
      throw new Error('Access denied: Admin permissions required to view email templates');
    }

    return await supabase
      .from('email_templates_with_users')
      .select('*')
      .order('name', { ascending: true });
  }

  /**
   * Get accessible daily stats based on permissions
   */
  static async getAccessibleDailyStats() {
    const isAdmin = await this.isAdmin();

    if (!isAdmin) {
      throw new Error('Access denied: Admin permissions required to view daily stats');
    }

    return await supabase
      .from('daily_stats_with_users')
      .select('*')
      .order('date', { ascending: false })
      .limit(30); // Last 30 days
  }

  /**
   * Check if current user is super admin (first admin)
   */
  static async isSuperAdmin(): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();
      return user?.role === 'admin' && user?.is_super_admin === true;
    } catch (error) {
      console.error('Error checking super admin status:', error);
      return false;
    }
  }

  /**
   * Get user's subscription plan
   */
  static async getUserPlan() {
    try {
      const user = await this.getCurrentUser();
      const activeSubscription = user?.user_subscriptions?.find(
        (sub: any) => sub.status === 'active'
      );
      return activeSubscription?.subscription_plans || null;
    } catch (error) {
      console.error('Error getting user plan:', error);
      return null;
    }
  }

  /**
   * Check feature access based on subscription
   */
  static async hasFeatureAccess(feature: string): Promise<boolean> {
    try {
      const plan = await this.getUserPlan();
      if (!plan) return false; // No active subscription

      const features = plan.features || {};

      switch (feature) {
        case 'unlimited_quotes':
          return features.max_quotes === -1;
        case 'custom_branding':
          return features.custom_branding === true;
        case 'api_access':
          return features.api_access === true;
        case 'priority_support':
          return features.support === 'priority';
        case 'advanced_analytics':
          return features.advanced_analytics === true;
        default:
          return false;
      }
    } catch (error) {
      console.error('Error checking feature access:', error);
      return false;
    }
  }

  /**
   * Admin-specific permissions
   */
  static async canManageSystemSettings(): Promise<boolean> {
    return await this.isSuperAdmin();
  }

  static async canManagePayments(): Promise<boolean> {
    return await this.isAdmin();
  }

  static async canManageSubscriptions(): Promise<boolean> {
    return await this.isSuperAdmin();
  }

  /**
   * Utility functions
   */
  static async requireAdmin(): Promise<void> {
    const isAdmin = await this.isAdmin();
    if (!isAdmin) {
      throw new Error('Access denied: Admin permissions required');
    }
  }

  static async requireSuperAdmin(): Promise<void> {
    const isSuperAdmin = await this.isSuperAdmin();
    if (!isSuperAdmin) {
      throw new Error('Access denied: Super admin permissions required');
    }
  }

  static async requireFeatureAccess(feature: string): Promise<void> {
    const hasAccess = await this.hasFeatureAccess(feature);
    if (!hasAccess) {
      throw new Error(`Access denied: ${feature} feature not available in your plan`);
    }
  }

  /**
   * Get user role display name
   */
  static async getUserRoleDisplay(): Promise<string> {
    try {
      const user = await this.getCurrentUser();
      if (!user) return 'Guest';

      if (user.role === 'admin') {
        return user.is_super_admin ? 'Super Admin' : 'Admin';
      }

      const plan = await this.getUserPlan();
      return plan ? `${plan.name} User` : 'Free User';
    } catch (error) {
      console.error('Error getting user role display:', error);
      return 'User';
    }
  }
}
