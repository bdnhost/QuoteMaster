import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { supabase, type User as SupabaseUser } from '../lib/supabase';
import type { User as AuthUser, BusinessInfo } from '../types';
import { Session, AuthError } from '@supabase/supabase-js';

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser | null>;
  logout: () => Promise<void>;
  register: (email: string, password: string, businessName: string, businessPhone: string, businessAddress: string) => Promise<AuthUser | null>;
  updateUserBusinessInfo: (businessInfo: BusinessInfo) => Promise<AuthUser | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const SupabaseAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Convert Supabase user to our User type
  const convertSupabaseUser = (supabaseUser: SupabaseUser, authUser: any): AuthUser => {
    return {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      role: authUser.role || 'user',
      businessName: authUser.business_name || '',
      businessPhone: authUser.business_phone || '',
      businessAddress: authUser.business_address || '',
      logoUrl: authUser.logo_url || null,
      createdAt: authUser.created_at || new Date().toISOString(),
      updatedAt: authUser.updated_at || new Date().toISOString()
    };
  };

  // Get user profile from our users table
  const getUserProfile = async (userId: string): Promise<SupabaseUser | null> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getUserProfile:', error);
      return null;
    }
  };

  // Create user profile in our users table
  const createUserProfile = async (userId: string, email: string, businessInfo: Partial<BusinessInfo> = {}): Promise<SupabaseUser | null> => {
    // Check if this is the first user (should be admin)
    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    const isFirstUser = count === 0;

    const { data, error } = await supabase
      .from('users')
      .insert({
        id: userId,
        email,
        role: isFirstUser ? 'admin' : 'user',
        business_name: businessInfo.businessName || '',
        business_phone: businessInfo.businessPhone || '',
        business_address: businessInfo.businessAddress || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user profile:', error);
      return null;
    }

    return data;
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');

        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting session:', error);
          if (mounted) {
            setIsLoading(false);
          }
          return;
        }

        console.log('Session:', session?.user?.email || 'No session');

        if (mounted) {
          setSession(session);

          if (session?.user) {
            try {
              const profile = await getUserProfile(session.user.id);
              if (profile && mounted) {
                setUser(convertSupabaseUser(session.user, profile));
                console.log('User profile loaded:', profile.email);
              } else if (mounted) {
                console.warn('No user profile found, creating one...');
                const newProfile = await createUserProfile(session.user.id, session.user.email || '');
                if (newProfile && mounted) {
                  setUser(convertSupabaseUser(session.user, newProfile));
                  console.log('New user profile created:', newProfile.email);
                }
              }
            } catch (profileError) {
              console.error('Error getting user profile:', profileError);
            }
          } else {
            setUser(null);
          }

          setIsLoading(false);
          console.log('Auth initialization complete');
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    // Add timeout as fallback - increased to 10 seconds
    const timeoutId = setTimeout(() => {
      if (mounted) {
        console.warn('Auth initialization timeout - forcing loading to false');
        setIsLoading(false);
        setSession(null);
        setUser(null);
      }
    }, 10000); // 10 second timeout

    // Initialize auth
    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);

      if (!mounted) return;

      setSession(session);

      if (session?.user) {
        try {
          let profile = await getUserProfile(session.user.id);

          // If profile doesn't exist, create it
          if (!profile) {
            profile = await createUserProfile(session.user.id, session.user.email || '');
          }

          if (profile && mounted) {
            setUser(convertSupabaseUser(session.user, profile));
          }
        } catch (error) {
          console.error('Error handling auth change:', error);
        }
      } else {
        setUser(null);
      }

      if (mounted) {
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<AuthUser | null> => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        const profile = await getUserProfile(data.user.id);
        if (profile) {
          const authUser = convertSupabaseUser(data.user, profile);
          setUser(authUser);
          return authUser;
        }
      }

      return null;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    email: string, 
    password: string, 
    businessName: string, 
    businessPhone: string, 
    businessAddress: string
  ): Promise<AuthUser | null> => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        const profile = await createUserProfile(data.user.id, email, {
          businessName,
          businessPhone,
          businessAddress
        });

        if (profile) {
          const authUser = convertSupabaseUser(data.user, profile);
          setUser(authUser);
          return authUser;
        }
      }

      return null;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const updateUserBusinessInfo = async (businessInfo: BusinessInfo): Promise<AuthUser | null> => {
    try {
      if (!user) return null;

      const { data, error } = await supabase
        .from('users')
        .update({
          business_name: businessInfo.businessName,
          business_phone: businessInfo.businessPhone,
          business_address: businessInfo.businessAddress,
          logo_url: businessInfo.logoUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      if (data && session?.user) {
        const updatedUser = convertSupabaseUser(session.user, data);
        setUser(updatedUser);
        return updatedUser;
      }

      return null;
    } catch (error) {
      console.error('Update user info error:', error);
      throw error;
    }
  };

  const value = {
    user,
    session,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    register,
    updateUserBusinessInfo,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a SupabaseAuthProvider');
  }
  return context;
};
