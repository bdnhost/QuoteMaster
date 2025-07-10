
import React, { useState, useEffect, useCallback } from 'react';
import type { Quote } from '../types';
import * as api from '../services/apiService';
import { SupabaseQuoteService } from '../services/supabaseQuoteService';
import QuoteForm from '../components/QuoteForm';
import QuotePreview from '../components/QuotePreview';
import Button from '../components/ui/Button';
import StatusDropdown from '../components/ui/StatusDropdown';
import { useAuth } from '../contexts/SupabaseAuthContext';

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
    const loadQuote = async () => {
      setIsLoading(true);
      setError(null);
      try {
        let quoteData;
        if (quoteId === 'new') {
          if(!user) throw new Error("User not found");
          quoteData = await SupabaseQuoteService.createNewQuote();
        } else if (quoteId) {
          quoteData = await SupabaseQuoteService.getQuote(quoteId);
        } else {
          throw new Error("No quote ID provided.");
        }
        setQuote(quoteData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load quote data.");
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
        loadQuote();
    }
  }, [quoteId, user]);

  const handleQuoteChange = useCallback((newQuote: Quote) => {
    setQuote(newQuote);
  }, []);

  const handleSave = async () => {
    if (!quote) return;
    setIsSaving(true);
    try {
      let savedQuote;
      if (quoteId === 'new') {
        savedQuote = await SupabaseQuoteService.createQuote(quote);
        // Update the URL to reflect the new quote ID
        window.location.hash = `#/quotes/${savedQuote.id}`;
        setQuote(savedQuote);
      } else {
        savedQuote = await SupabaseQuoteService.updateQuote(quote.id!, quote);
        setQuote(savedQuote);
      }
    } catch (err) {
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

  if (isLoading) return <div className="text-center p-8">טוען נתונים...</div>;
  if (error) return <div className="text-center p-8 text-red-600">{error}</div>;
  if (!quote) return <div className="text-center p-8">לא נמצאה הצעת מחיר.</div>;

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
