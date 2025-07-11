import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import type { User, BusinessInfo } from '../types';
import * as api from '../services/apiService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<User | null>;
  logout: () => void;
  register: (email: string, password: string, businessName: string, businessPhone: string, businessAddress: string) => Promise<User | null>;
  updateUserBusinessInfo: (businessInfo: BusinessInfo) => Promise<User | null>;
  checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);

  const checkAuthStatus = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      setIsLoading(false);
      setAuthInitialized(true);
      return;
    }

    try {
      const currentUser = await api.getLoggedInUser();
      if (currentUser) {
        setUser(currentUser);
      } else {
        // Token is invalid, remove it
        localStorage.removeItem('token');
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Clear invalid token
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setIsLoading(false);
      setAuthInitialized(true);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const loggedInUser = await api.login(email, pass);
      setUser(loggedInUser);
      return loggedInUser;
    } catch (error) {
      setUser(null);
      localStorage.removeItem('token'); // Clear any invalid token
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, businessName: string, businessPhone: string, businessAddress: string) => {
    setIsLoading(true);
    try {
      const newUser = await api.register(email, password, businessName, businessPhone, businessAddress);
      setUser(newUser);
      return newUser;
    } catch (error) {
      setUser(null);
      localStorage.removeItem('token'); // Clear any invalid token
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    api.logout();
    setUser(null);
    localStorage.removeItem('token');
    // Redirect to landing page
    window.location.hash = '#/landing';
  };
  
  const updateUserBusinessInfo = async (businessInfo: BusinessInfo) => {
      if (!user) {
          throw new Error("User not authenticated");
      }
      setIsLoading(true);
      try {
          const updatedUser = await api.updateUserBusinessInfo(user.id, businessInfo);
          setUser(updatedUser);
          return updatedUser;
      } catch(error) {
          console.error("Failed to update user info:", error);
          throw error;
      } finally {
          setIsLoading(false);
      }
  }

  const value = {
    user,
    isAuthenticated: !!user && authInitialized,
    isLoading,
    login,
    logout,
    register,
    updateUserBusinessInfo,
    checkAuthStatus,
  };

  // Don't render children until auth is initialized
  if (!authInitialized) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
