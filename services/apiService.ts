import type { Quote, User, BusinessInfo, PaymentMethod, Invoice, SystemSettings, ActivityLog } from '../types';

// --- API Service Functions ---
export const API_BASE_URL = 'http://localhost:3001';

// פונקציה עזר ליצירת quote בטוח
const createSafeQuote = (data: any): Quote => {
  return {
    id: data.id || '',
    quoteNumber: data.quoteNumber || '',
    businessInfo: data.businessInfo || { name: '', phone: '', address: '', logoUrl: null },
    customer: data.customer || { name: '', email: '', phone: '', address: '' },
    items: Array.isArray(data.items) ? data.items : [],
    notes: data.notes || '',
    issueDate: data.issueDate || '',
    validUntil: data.validUntil || '',
    taxRate: typeof data.taxRate === 'number' ? data.taxRate : 17,
    status: data.status || 'draft'
  };
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
            throw new Error('Registration failed');
        }

        const data = await response.json();
        if (data.token) {
            localStorage.setItem('token', data.token);
        }
        return data.user;
    } catch (error) {
        console.error('Registration error:', error);
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
            throw new Error('Invalid credentials');
        }

        const data = await response.json();
        console.log('Login successful:', data);
        if (data.token) {
            localStorage.setItem('token', data.token);
        }
        return data.user;
    } catch (error) {
        console.error('Login error:', error);
        throw new Error('Login failed');
    }
};

export const logout = async (): Promise<void> => {
    try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
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
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Not authenticated');
        }

        return await response.json();
    } catch (error) {
        console.error('Failed to get user:', error);
        return null;
    }
};

export const updateUserBusinessInfo = async (userId: string, businessInfo: BusinessInfo): Promise<User> => {
    try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}/business-info`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(businessInfo)
        });

        if (!response.ok) {
            throw new Error('Failed to update business info');
        }

        return await response.json();
    } catch (error) {
        console.error('Error updating business info:', error);
        throw error;
    }
}

export const getQuotes = async (): Promise<Quote[]> => {
    try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${API_BASE_URL}/quotes`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch quotes');
        }

        const data = await response.json();
        console.log('Raw quotes response:', data);

        // The API returns { quotes: Quote[], total: number }
        const quotes = data.quotes || [];
        return quotes.map((quote: any) => createSafeQuote(quote));
    } catch (error) {
        console.error('Error fetching quotes:', error);
        throw error;
    }
};

export const getQuote = async (id: string): Promise<Quote> => {
    try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${API_BASE_URL}/quotes/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Quote not found');
        }

        const data = await response.json();
        return createSafeQuote(data);
    } catch (error) {
        console.error('Error fetching quote:', error);
        throw error;
    }
};

export const saveQuote = async (quoteToSave: Quote): Promise<Quote> => {
    try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Not authenticated');

        const method = quoteToSave.id ? 'PUT' : 'POST';
        const url = quoteToSave.id 
            ? `${API_BASE_URL}/quotes/${quoteToSave.id}`
            : `${API_BASE_URL}/quotes`;

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(quoteToSave)
        });

        if (!response.ok) {
            throw new Error('Failed to save quote');
        }

        const data = await response.json();
        return createSafeQuote(data);
    } catch (error) {
        console.error('Error saving quote:', error);
        throw error;
    }
};

export const getNewQuote = async (businessInfo: BusinessInfo): Promise<Quote> => {
    try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${API_BASE_URL}/quotes/new`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ businessInfo })
        });

        if (!response.ok) {
            throw new Error('Failed to create new quote');
        }

        const data = await response.json();
        return createSafeQuote(data);
    } catch (error) {
        console.error('Error creating new quote:', error);
        throw error;
    }
};

export const downloadQuotePDF = async (quoteId: string): Promise<void> => {
    try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${API_BASE_URL}/quotes/${quoteId}/pdf`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to generate PDF');
        }

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
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Not authenticated');

        // First get the current quote
        const currentQuote = await getQuote(quoteId);

        // Update only the status
        const updatedQuote = { ...currentQuote, status };

        const response = await fetch(`${API_BASE_URL}/quotes/${quoteId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updatedQuote)
        });

        if (!response.ok) {
            throw new Error('Failed to update quote status');
        }

        const data = await response.json();
        return createSafeQuote(data);
    } catch (error) {
        console.error('Error updating quote status:', error);
        throw error;
    }
};

export const getAllUsers = async (): Promise<User[]> => {
    try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${API_BASE_URL}/users/all`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch users');
        }

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
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${API_BASE_URL}/payments/methods`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch payment methods');
        }

        const data = await response.json();
        return data.methods || [];
    } catch (error) {
        console.error('Error fetching payment methods:', error);
        throw error;
    }
};

export const getInvoices = async (): Promise<Invoice[]> => {
    try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${API_BASE_URL}/payments/invoices`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch invoices');
        }

        const data = await response.json();
        return data.invoices || [];
    } catch (error) {
        console.error('Error fetching invoices:', error);
        throw error;
    }
};

export const createInvoiceFromQuote = async (quoteId: string, dueDate: string, notes?: string): Promise<Invoice> => {
    try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${API_BASE_URL}/payments/invoices`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ quoteId, dueDate, notes })
        });

        if (!response.ok) {
            throw new Error('Failed to create invoice');
        }

        return await response.json();
    } catch (error) {
        console.error('Error creating invoice:', error);
        throw error;
    }
};

// Settings APIs
export const getSystemSettings = async (): Promise<SystemSettings> => {
    try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${API_BASE_URL}/settings`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch settings');
        }

        const data = await response.json();
        return data.settings || {};
    } catch (error) {
        console.error('Error fetching settings:', error);
        throw error;
    }
};

export const updateSystemSettings = async (settings: SystemSettings): Promise<void> => {
    try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${API_BASE_URL}/settings`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ settings })
        });

        if (!response.ok) {
            throw new Error('Failed to update settings');
        }
    } catch (error) {
        console.error('Error updating settings:', error);
        throw error;
    }
};

export const getActivityLog = async (page = 1, limit = 50): Promise<{ activities: ActivityLog[], pagination: any }> => {
    try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${API_BASE_URL}/settings/activity-log?page=${page}&limit=${limit}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch activity log');
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching activity log:', error);
        throw error;
    }
};

export const updateUserRole = async (userId: string, role: 'admin' | 'user'): Promise<void> => {
    try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${API_BASE_URL}/settings/users/${userId}/role`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ role })
        });

        if (!response.ok) {
            throw new Error('Failed to update user role');
        }
    } catch (error) {
        console.error('Error updating user role:', error);
        throw error;
    }
};
