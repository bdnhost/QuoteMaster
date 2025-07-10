import React, { useState, useEffect, useCallback } from 'react';
import type { Quote } from '../types';
import * as api from '../services/apiService';
import QuoteForm from '../components/QuoteForm';
import QuotePreview from '../components/QuotePreview';
import Button from '../components/ui/Button';
import StatusDropdown from '../components/ui/StatusDropdown';
import { useAuth } from '../contexts/AuthContext';

interface QuoteEditorPageProps {
  quoteId?: string;
}

const QuoteEditorPage: React.FC<QuoteEditorPageProps> = ({ quoteId }) => {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    let isCancelled = false;

    const loadQuote = async () => {
      setIsLoading(true);
      setError(null);
      try {
        let quoteData;
        if (quoteId === 'new') {
          if(!user) throw new Error("User not found");
          quoteData = await api.getNewQuote(user.businessInfo);
        } else if (quoteId) {
          quoteData = await api.getQuote(quoteId);
        } else {
          throw new Error("No quote ID provided.");
        }

        if (!isCancelled) {
          // Ensure the quote has all required fields
          const safeQuote: Quote = {
            id: quoteData.id || '',
            quoteNumber: quoteData.quoteNumber || '',
            businessInfo: quoteData.businessInfo || { name: '', phone: '', address: '', logoUrl: null },
            customer: quoteData.customer || { name: '', email: '', phone: '', address: '' },
            items: quoteData.items || [],
            notes: quoteData.notes || '',
            issueDate: quoteData.issueDate || '',
            validUntil: quoteData.validUntil || '',
            taxRate: quoteData.taxRate || 17,
            status: quoteData.status || 'draft'
          };
          setQuote(safeQuote);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Error loading quote:', err);
          setError(err instanceof Error ? err.message : "Failed to load quote data.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    if (user) {
        loadQuote();
    }

    return () => {
      isCancelled = true;
    };
  }, [quoteId, user]);

  const handleQuoteChange = useCallback((newQuote: Quote) => {
    setQuote(newQuote);
  }, []);

  const handleSave = async () => {
    if (!quote) return;
    setIsSaving(true);
    setError(null);
    try {
      const savedQuote = await api.saveQuote(quote);
      setQuote(savedQuote);
      
      // On successful save of a new quote, update the URL to reflect its new ID
      if (quoteId === 'new' && savedQuote.id) {
          window.location.hash = `#/quotes/${savedQuote.id}`;
      }
    } catch (err) {
        console.error('Error saving quote:', err);
        setError(err instanceof Error ? err.message : "Failed to save quote.");
    } finally {
        setIsSaving(false);
    }
  };

  const handlePrint = () => {
      window.print();
  };

  const handleDownloadPDF = async () => {
    if (!quote?.id) {
      setError('יש לשמור את ההצעה לפני הורדת PDF');
      return;
    }

    try {
      await api.downloadQuotePDF(quote.id);
    } catch (error) {
      console.error('PDF download error:', error);
      if (error instanceof Error) {
        if (error.message.includes('Not authenticated')) {
          setError('נדרשת התחברות מחדש. אנא התחבר שוב.');
        } else if (error.message.includes('Quote not found')) {
          setError('הצעת המחיר לא נמצאה.');
        } else {
          setError('שגיאה בהורדת PDF. אנא נסה שוב.');
        }
      } else {
        setError('שגיאה בהורדת PDF. אנא נסה שוב.');
      }
    }
  };

  const handleStatusChange = async (newStatus: 'draft' | 'sent' | 'approved' | 'rejected') => {
    if (!quote?.id) return;

    setUpdatingStatus(true);
    setError(null);
    try {
      const updatedQuote = await api.updateQuoteStatus(quote.id, newStatus);
      setQuote(updatedQuote);
    } catch (error) {
      console.error('Status update error:', error);
      setError('שגיאה בעדכון סטטוס ההצעה. אנא נסה שוב.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center p-8">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-slate-600">טוען נתונים...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-red-800 mb-2">שגיאה</h3>
          <p className="text-red-600">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            נסה שוב
          </button>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="text-center p-8">
        <h3 className="text-lg font-medium text-slate-800">לא נמצאה הצעת מחיר</h3>
        <p className="text-slate-600 mt-2">אנא נסה שוב או צור הצעה חדשה.</p>
        <button 
          onClick={() => window.location.hash = '#/quotes/new'} 
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          צור הצעה חדשה
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6 no-print">
        <h2 className="text-2xl font-bold text-slate-800">
            {quoteId === 'new' ? 'יצירת הצעת מחיר חדשה' : `עריכת הצעה #${quote.quoteNumber}`}
        </h2>
        <div className="flex gap-2 items-center">
            {quote?.id && (
                <div className="flex items-center gap-2 ml-4">
                    <span className="text-sm text-slate-600">סטטוס:</span>
                    <StatusDropdown
                        currentStatus={quote.status}
                        onStatusChange={handleStatusChange}
                        disabled={updatingStatus}
                    />
                </div>
            )}
            <Button onClick={handlePrint} variant="secondary">הדפס</Button>
            <Button onClick={handleDownloadPDF} variant="secondary" disabled={!quote?.id}>
                הורד PDF
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'שומר...' : 'שמור שינויים'}
            </Button>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
          <button 
            onClick={() => setError(null)} 
            className="mt-2 text-sm text-red-500 hover:text-red-700"
          >
            סגור הודעה
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-8">
        <div className="no-print">
          <QuoteForm quote={quote} onQuoteChange={handleQuoteChange} />
        </div>
        <div className="hidden lg:block lg:sticky top-8 self-start">
          <QuotePreview quote={quote} />
        </div>
        <div className="lg:hidden mt-8">
          <QuotePreview quote={quote} />
        </div>
      </div>
    </>
  );
};

export default QuoteEditorPage;
