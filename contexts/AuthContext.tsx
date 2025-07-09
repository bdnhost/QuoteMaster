
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkLoggedIn = async () => {
      setIsLoading(true);
      try {
        const currentUser = await api.getLoggedInUser();
        setUser(currentUser);
      } catch (error) {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkLoggedIn();
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const loggedInUser = await api.login(email, pass);
      setUser(loggedInUser);
      return loggedInUser;
    } catch (error) {
      setUser(null);
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
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    api.logout();
    setUser(null);
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
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
