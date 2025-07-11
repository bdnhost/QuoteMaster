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
  const { user, isAuthenticated, checkAuthStatus } = useAuth();

  // Check authentication on mount and route change
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('User not authenticated, redirecting to login');
      window.location.hash = '#/login';
      return;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const loadQuote = async () => {
      if (!isAuthenticated || !user) {
        console.log('Cannot load quote: user not authenticated');
        setError('נדרשת התחברות למערכת');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      
      try {
        let quoteData;
        
        if (quoteId === 'new') {
          console.log('Creating new quote for user:', user.email);
          quoteData = await api.getNewQuote(user.businessInfo);
        } else if (quoteId) {
          console.log('Loading existing quote:', quoteId);
          quoteData = await api.getQuote(quoteId);
        } else {
          throw new Error("No quote ID provided.");
        }
        
        console.log('Quote loaded successfully:', quoteData);
        setQuote(quoteData);
      } catch (err) {
        console.error('Error loading quote:', err);
        
        if (err instanceof Error) {
          if (err.message.includes('Not authenticated')) {
            setError('נדרשת התחברות מחדש למערכת');
            // Check auth status and potentially redirect
            checkAuthStatus().then(() => {
              if (!isAuthenticated) {
                window.location.hash = '#/login';
              }
            });
          } else if (err.message.includes('Quote not found')) {
            setError('הצעת המחיר לא נמצאה');
          } else {
            setError(err.message);
          }
        } else {
          setError("שגיאה בטעינת נתוני ההצעה");
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (user && isAuthenticated) {
      loadQuote();
    }
  }, [quoteId, user, isAuthenticated, checkAuthStatus]);

  const handleQuoteChange = useCallback((newQuote: Quote) => {
    setQuote(newQuote);
  }, []);

  const handleSave = async () => {
    if (!quote) return;
    
    if (!isAuthenticated || !user) {
      setError('נדרשת התחברות למערכת');
      return;
    }

    setIsSaving(true);
    setError(null);
    
    try {
      console.log('Saving quote:', quote);
      const savedQuote = await api.saveQuote(quote);
      console.log('Quote saved successfully:', savedQuote);
      
      setQuote(savedQuote);
      
      // On successful save of a new quote, update the URL to reflect its new ID
      if (quoteId === 'new' && savedQuote.id) {
          console.log('Redirecting to saved quote:', savedQuote.id);
          window.location.hash = `#/quotes/${savedQuote.id}`;
      }
    } catch (err) {
        console.error('Error saving quote:', err);
        
        if (err instanceof Error) {
          if (err.message.includes('Not authenticated')) {
            setError('נדרשת התחברות מחדש למערכת');
            checkAuthStatus();
          } else {
            setError(err.message);
          }
        } else {
          setError("שגיאה בשמירת ההצעה");
        }
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

    if (!isAuthenticated) {
      setError('נדרשת התחברות למערכת');
      return;
    }

    try {
      await api.downloadQuotePDF(quote.id);
    } catch (error) {
      console.error('PDF download error:', error);
      if (error instanceof Error) {
        if (error.message.includes('Not authenticated')) {
          setError('נדרשת התחברות מחדש. אנא התחבר שוב.');
          checkAuthStatus();
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
    if (!quote?.id || !isAuthenticated) return;

    setUpdatingStatus(true);
    try {
      const updatedQuote = await api.updateQuoteStatus(quote.id, newStatus);
      setQuote(updatedQuote);
    } catch (error) {
      console.error('Status update error:', error);
      if (error instanceof Error && error.message.includes('Not authenticated')) {
        setError('נדרשת התחברות מחדש למערכת');
        checkAuthStatus();
      } else {
        setError('שגיאה בעדכון סטטוס ההצעה. אנא נסה שוב.');
      }
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="text-center p-8">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p>טוען נתונים...</p>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="text-center p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg mx-auto max-w-md">
          <h3 className="font-semibold mb-2">שגיאה</h3>
          <p>{error}</p>
          <div className="mt-4 space-x-2">
            <Button onClick={() => window.location.hash = '#/dashboard'} variant="secondary">
              חזור לדשבורד
            </Button>
            {error.includes('התחברות') && (
              <Button onClick={() => window.location.hash = '#/login'}>
                התחבר מחדש
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show not found state
  if (!quote) {
    return (
      <div className="text-center p-8">
        <h3 className="text-lg font-medium text-slate-800 mb-4">לא נמצאה הצעת מחיר</h3>
        <Button onClick={() => window.location.hash = '#/dashboard'} variant="secondary">
          חזור לדשבורד
        </Button>
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
