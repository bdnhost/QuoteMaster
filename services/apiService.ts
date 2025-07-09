
import type { Quote, User, BusinessInfo } from '../types';

// --- API Service Functions ---
const API_BASE_URL = 'http://localhost:3001';

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
            throw new Error('Registration failed');
        }

        const data = await response.json();
        localStorage.setItem('token', data.token);
        return data.user;
    } catch (error) {
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
        localStorage.setItem('token', data.token);
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
        localStorage.removeItem('token');
    } catch (error) {
        console.error('Logout failed:', error);
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

        return await response.json();
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

        return await response.json();
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

        return await response.json();
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

        return await response.json();
    } catch (error) {
        console.error('Error creating new quote:', error);
        throw error;
    }
};
