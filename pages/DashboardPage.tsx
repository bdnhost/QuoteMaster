
import React, { useState, useEffect } from 'react';
import type { Quote } from '../types';
import * as api from '../services/apiService';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const statusMap: { [key in Quote['status']]: { text: string; color: string } } = {
    draft: { text: 'טיוטה', color: 'bg-slate-200 text-slate-800' },
    sent: { text: 'נשלחה', color: 'bg-blue-200 text-blue-800' },
    approved: { text: 'אושרה', color: 'bg-green-200 text-green-800' },
    rejected: { text: 'נדחתה', color: 'bg-red-200 text-red-800' },
};

const DashboardPage: React.FC = () => {
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchQuotes = async () => {
            try {
                const data = await api.getQuotes();
                setQuotes(data);
            } catch (error) {
                console.error("Failed to fetch quotes", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchQuotes();
    }, []);

    const calculateTotal = (quote: Quote) => {
        const subtotal = quote.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
        return subtotal * (1 + quote.taxRate / 100);
    };
    
    return (
        <Card title="הצעות המחיר שלי" actions={
            <Button onClick={() => window.location.hash = '#/quotes/new'}>
                + יצירת הצעה חדשה
            </Button>
        }>
            {isLoading ? (
                <p>טוען הצעות מחיר...</p>
            ) : quotes.length === 0 ? (
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
                            {quotes.map(quote => (
                                <tr key={quote.id} className="border-b hover:bg-slate-50">
                                    <td className="p-3 font-mono text-slate-700">{quote.quoteNumber}</td>
                                    <td className="p-3 text-slate-800">{quote.customer.name}</td>
                                    <td className="p-3 text-slate-600">{quote.issueDate}</td>
                                    <td className="p-3 font-medium text-slate-800">₪{calculateTotal(quote).toFixed(2)}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusMap[quote.status].color}`}>
                                            {statusMap[quote.status].text}
                                        </span>
                                    </td>
                                    <td className="p-3">
                                        <a href={`#/quotes/${quote.id}`} className="font-medium text-blue-600 hover:text-blue-800">
                                            עריכה
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Card>
    );
};

export default DashboardPage;
