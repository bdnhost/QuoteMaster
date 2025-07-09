
import React, { useState, useEffect, useCallback } from 'react';
import type { Quote } from '../types';
import * as api from '../services/apiService';
import QuoteForm from '../components/QuoteForm';
import QuotePreview from '../components/QuotePreview';
import Button from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';

interface QuoteEditorPageProps {
  quoteId?: string;
}

const QuoteEditorPage: React.FC<QuoteEditorPageProps> = ({ quoteId }) => {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
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
      await api.saveQuote(quote);
      // On successful save of a new quote, update the URL to reflect its new ID
      if (quoteId === 'new') {
          window.location.hash = `#/quotes/${quote.id}`;
      }
    } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save quote.");
    } finally {
        setIsSaving(false);
    }
  };

  const handlePrint = () => {
      window.print();
  }

  if (isLoading) return <div className="text-center p-8">טוען נתונים...</div>;
  if (error) return <div className="text-center p-8 text-red-600">{error}</div>;
  if (!quote) return <div className="text-center p-8">לא נמצאה הצעת מחיר.</div>;

  return (
    <>
      <div className="flex justify-between items-center mb-6 no-print">
        <h2 className="text-2xl font-bold text-slate-800">
            {quoteId === 'new' ? 'יצירת הצעת מחיר חדשה' : `עריכת הצעה #${quote.quoteNumber}`}
        </h2>
        <div className="flex gap-2">
            <Button onClick={handlePrint} variant="secondary">הדפס / PDF</Button>
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
