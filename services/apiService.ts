import type { Quote, User, BusinessInfo, PaymentMethod, Invoice, SystemSettings, ActivityLog } from '../types';

// --- API Service Functions ---
export const API_BASE_URL = 'http://localhost:3001';

// Helper function to handle auth errors
const handleAuthError = (error: any) => {
  if (error.message?.includes('401') || error.message?.includes('Unauthorized') || error.message?.includes('Token')) {
    localStorage.removeItem('token');
    throw new Error('Not authenticated');
  }
  throw error;
};

// Helper function to make authenticated requests
const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Not authenticated');
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };

  try {
    const response = await fetch(url, { ...options, headers });
    
    if (response.status === 401) {
      localStorage.removeItem('token');
      throw new Error('Not authenticated');
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error ${response.status}:`, errorText);
      throw new Error(`API Error: ${response.status}`);
    }
    
    return response;
  } catch (error) {
    console.error('Authenticated fetch error:', error);
    handleAuthError(error);
  }
};

export const register = async (email: string, password: string, businessName: string, businessPhone: string, businessAddress: string): Promise<User> => {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password, businessName, businessPhone, businessAddress })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Registration error:', errorData);
            if (response.status === 400) {
                throw new Error('User already exists');
            }
            throw new Error('Registration failed');
        }

        const data = await response.json();
        localStorage.setItem('token', data.token);
        return data.user;
    } catch (error) {
        console.error('Registration error:', error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('Registration failed');
    }
};

export const login = async (email: string, pass: string): Promise<User> => {
    console.log('Login attempt:', { email, pass });
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password: pass })
        });

        console.log('Login response status:', response.status);

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Login error:', errorData);
            if (response.status === 400 || response.status === 401) {
                throw new Error('Invalid credentials');
            }
            throw new Error('Login failed');
        }

        const data = await response.json();
        console.log('Login successful:', data);
        localStorage.setItem('token', data.token);
        return data.user;
    } catch (error) {
        console.error('Login error:', error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('Login failed');
    }
};

export const logout = async (): Promise<void> => {
    try {
        const token = localStorage.getItem('token');
        if (token) {
            await fetch(`${API_BASE_URL}/auth/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        }
    } catch (error) {
        console.error('Logout failed:', error);
    } finally {
        localStorage.removeItem('token');
    }
};

export const getLoggedInUser = async (): Promise<User | null> => {
    const token = localStorage.getItem('token');
    if (!token) return null;

    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/auth/me`);
        return await response.json();
    } catch (error) {
        console.error('Failed to get user:', error);
        return null;
    }
};

export const updateUserBusinessInfo = async (userId: string, businessInfo: BusinessInfo): Promise<User> => {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/users/${userId}/business-info`, {
            method: 'PUT',
            body: JSON.stringify(businessInfo)
        });

        return await response.json();
    } catch (error) {
        console.error('Error updating business info:', error);
        throw error;
    }
}

export const getQuotes = async (): Promise<Quote[]> => {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/quotes`);
        const data = await response.json();
        console.log('Raw quotes response:', data);

        // The API returns { quotes: Quote[], total: number }
        return data.quotes || [];
    } catch (error) {
        console.error('Error fetching quotes:', error);
        throw error;
    }
};

export const getQuote = async (id: string): Promise<Quote> => {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/quotes/${id}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching quote:', error);
        if (error instanceof Error && error.message.includes('404')) {
            throw new Error('Quote not found');
        }
        throw error;
    }
};

export const saveQuote = async (quoteToSave: Quote): Promise<Quote> => {
    try {
        const method = quoteToSave.id ? 'PUT' : 'POST';
        const url = quoteToSave.id 
            ? `${API_BASE_URL}/quotes/${quoteToSave.id}`
            : `${API_BASE_URL}/quotes`;

        const response = await authenticatedFetch(url, {
            method,
            body: JSON.stringify(quoteToSave)
        });

        return await response.json();
    } catch (error) {
        console.error('Error saving quote:', error);
        throw error;
    }
};

export const getNewQuote = async (businessInfo: BusinessInfo): Promise<Quote> => {
    try {
        console.log('Creating new quote with business info:', businessInfo);
        
        const response = await authenticatedFetch(`${API_BASE_URL}/quotes/new`, {
            method: 'POST',
            body: JSON.stringify({ businessInfo })
        });

        const newQuote = await response.json();
        console.log('New quote created:', newQuote);
        return newQuote;
    } catch (error) {
        console.error('Error creating new quote:', error);
        throw error;
    }
};

export const downloadQuotePDF = async (quoteId: string): Promise<void> => {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/quotes/${quoteId}/pdf`);

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `quote-${quoteId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        console.error('Error downloading PDF:', error);
        throw error;
    }
};

export const uploadLogo = async (userId: string, file: File): Promise<string> => {
    try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Not authenticated');

        const formData = new FormData();
        formData.append('logo', file);

        const response = await fetch(`${API_BASE_URL}/users/${userId}/logo`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (response.status === 401) {
            localStorage.removeItem('token');
            throw new Error('Not authenticated');
        }

        if (!response.ok) {
            throw new Error('Failed to upload logo');
        }

        const data = await response.json();
        return data.logoUrl;
    } catch (error) {
        console.error('Error uploading logo:', error);
        throw error;
    }
};

export const updateQuoteStatus = async (quoteId: string, status: 'draft' | 'sent' | 'approved' | 'rejected'): Promise<Quote> => {
    try {
        // First get the current quote
        const currentQuote = await getQuote(quoteId);

        // Update only the status
        const updatedQuote = { ...currentQuote, status };

        const response = await authenticatedFetch(`${API_BASE_URL}/quotes/${quoteId}`, {
            method: 'PUT',
            body: JSON.stringify(updatedQuote)
        });

        return await response.json();
    } catch (error) {
        console.error('Error updating quote status:', error);
        throw error;
    }
};

export const getAllUsers = async (): Promise<User[]> => {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/users/all`);
        const data = await response.json();
        return data.users || [];
    } catch (error) {
        console.error('Error fetching users:', error);
        throw error;
    }
};

// Payment System APIs
export const getPaymentMethods = async (): Promise<PaymentMethod[]> => {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/payments/methods`);
        const data = await response.json();
        return data.methods || [];
    } catch (error) {
        console.error('Error fetching payment methods:', error);
        throw error;
    }
};

export const getInvoices = async (): Promise<Invoice[]> => {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/payments/invoices`);
        const data = await response.json();
        return data.invoices || [];
    } catch (error) {
        console.error('Error fetching invoices:', error);
        throw error;
    }
};

export const createInvoiceFromQuote = async (quoteId: string, dueDate: string, notes?: string): Promise<Invoice> => {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/payments/invoices`, {
            method: 'POST',
            body: JSON.stringify({ quoteId, dueDate, notes })
        });

        return await response.json();
    } catch (error) {
        console.error('Error creating invoice:', error);
        throw error;
    }
};

// Settings APIs
export const getSystemSettings = async (): Promise<SystemSettings> => {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/settings`);
        const data = await response.json();
        return data.settings || {};
    } catch (error) {
        console.error('Error fetching settings:', error);
        throw error;
    }
};

export const updateSystemSettings = async (settings: SystemSettings): Promise<void> => {
    try {
        await authenticatedFetch(`${API_BASE_URL}/settings`, {
            method: 'PUT',
            body: JSON.stringify({ settings })
        });
    } catch (error) {
        console.error('Error updating settings:', error);
        throw error;
    }
};

export const getActivityLog = async (page = 1, limit = 50): Promise<{ activities: ActivityLog[], pagination: any }> => {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/settings/activity-log?page=${page}&limit=${limit}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching activity log:', error);
        throw error;
    }
};

export const updateUserRole = async (userId: string, role: 'admin' | 'user'): Promise<void> => {
    try {
        await authenticatedFetch(`${API_BASE_URL}/settings/users/${userId}/role`, {
            method: 'PUT',
            body: JSON.stringify({ role })
        });
    } catch (error) {
        console.error('Error updating user role:', error);
        throw error;
    }
};
