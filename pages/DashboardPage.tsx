import React, { useState, useEffect } from 'react';
import type { Quote } from '../types';
import * as api from '../services/apiService';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import StatusDropdown from '../components/ui/StatusDropdown';

const statusMap: { [key in Quote['status']]: { text: string; color: string } } = {
    draft: { text: 'טיוטה', color: 'bg-slate-200 text-slate-800' },
    sent: { text: 'נשלחה', color: 'bg-blue-200 text-blue-800' },
    approved: { text: 'אושרה', color: 'bg-green-200 text-green-800' },
    rejected: { text: 'נדחתה', color: 'bg-red-200 text-red-800' },
};

const DashboardPage: React.FC = () => {
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchQuotes = async () => {
            try {
                setError(null);
                const data = await api.getQuotes();
                setQuotes(data || []);
            } catch (error) {
                console.error("Failed to fetch quotes", error);
                setError("שגיאה בטעינת הצעות המחיר. אנא נסה שוב.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchQuotes();
    }, []);

    const handleStatusChange = async (quoteId: string, newStatus: 'draft' | 'sent' | 'approved' | 'rejected') => {
        setUpdatingStatus(quoteId);
        setError(null);
        try {
            const updatedQuote = await api.updateQuoteStatus(quoteId, newStatus);
            setQuotes(prevQuotes =>
                prevQuotes.map(quote =>
                    quote.id === quoteId ? updatedQuote : quote
                )
            );
        } catch (error) {
            console.error('Failed to update quote status:', error);
            setError('שגיאה בעדכון סטטוס ההצעה. אנא נסה שוב.');
        } finally {
            setUpdatingStatus(null);
        }
    };

    const calculateTotal = (quote: Quote) => {
        try {
            if (!quote.items || !Array.isArray(quote.items)) {
                return 0;
            }
            const subtotal = quote.items.reduce((sum, item) => {
                const quantity = item.quantity || 0;
                const unitPrice = item.unitPrice || 0;
                return sum + (quantity * unitPrice);
            }, 0);
            const taxRate = quote.taxRate || 0;
            return subtotal * (1 + taxRate / 100);
        } catch (error) {
            console.error('Error calculating total for quote:', quote.id, error);
            return 0;
        }
    };

    const formatDate = (dateString: string | undefined) => {
        if (!dateString) return '';
        try {
            return new Date(dateString).toLocaleDateString('he-IL');
        } catch (error) {
            return dateString;
        }
    };
    
    if (isLoading) {
        return (
            <Card title="הצעות המחיר שלי">
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4 text-slate-600">טוען הצעות מחיר...</p>
                </div>
            </Card>
        );
    }

    if (error) {
        return (
            <Card title="הצעות המחיר שלי">
                <div className="text-center py-12">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                        <h3 className="text-lg font-medium text-red-800 mb-2">שגיאה</h3>
                        <p className="text-red-600 mb-4">{error}</p>
                        <button 
                            onClick={() => window.location.reload()} 
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                            נסה שוב
                        </button>
                    </div>
                </div>
            </Card>
        );
    }
    
    return (
        <Card title="הצעות המחיר שלי" actions={
            <Button onClick={() => window.location.hash = '#/quotes/new'}>
                + יצירת הצעה חדשה
            </Button>
        }>
            {quotes.length === 0 ? (
                <div className="text-center py-12">
                    <h3 className="text-lg font-medium text-slate-800">עדיין אין לך הצעות מחיר</h3>
                    <p className="text-slate-500 mt-2">לחץ על "יצירת הצעה חדשה" כדי להתחיל.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="p-3 font-semibold text-slate-600">מספר הצעה</th>
                                <th className="p-3 font-semibold text-slate-600">לקוח</th>
                                <th className="p-3 font-semibold text-slate-600">תאריך</th>
                                <th className="p-3 font-semibold text-slate-600">סכום</th>
                                <th className="p-3 font-semibold text-slate-600">סטטוס</th>
                                <th className="p-3 font-semibold text-slate-600">פעולות</th>
                            </tr>
                        </thead>
                        <tbody>
                            {quotes.map(quote => {
                                const customer = quote.customer || { name: 'לא צוין', email: '', phone: '', address: '' };
                                const total = calculateTotal(quote);
                                
                                return (
                                    <tr key={quote.id || Math.random()} className="border-b hover:bg-slate-50">
                                        <td className="p-3 font-mono text-slate-700">{quote.quoteNumber || 'ללא מספר'}</td>
                                        <td className="p-3 text-slate-800">{customer.name || 'לא צוין'}</td>
                                        <td className="p-3 text-slate-600">{formatDate(quote.issueDate)}</td>
                                        <td className="p-3 font-medium text-slate-800">₪{total.toFixed(2)}</td>
                                        <td className="p-3">
                                            <StatusDropdown
                                                currentStatus={quote.status}
                                                onStatusChange={(newStatus) => handleStatusChange(quote.id, newStatus)}
                                                disabled={updatingStatus === quote.id}
                                            />
                                        </td>
                                        <td className="p-3">
                                            <a 
                                                href={`#/quotes/${quote.id}`} 
                                                className="font-medium text-blue-600 hover:text-blue-800"
                                            >
                                                עריכה
                                            </a>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </Card>
    );
};

export default DashboardPage;
