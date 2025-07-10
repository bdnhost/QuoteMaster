import React, { useState, useCallback } from 'react';
import type { Quote, ServiceItem } from '../types';
import Card from './ui/Card';
import Input from './ui/Input';
import Button from './ui/Button';
import LogoUploader from './ui/LogoUploader';
import ServiceItemRow from './ServiceItemRow';
import { generateQuoteItems } from '../services/geminiService';

interface QuoteFormProps {
  quote: Quote;
  onQuoteChange: (newQuote: Quote) => void;
}

const QuoteForm: React.FC<QuoteFormProps> = ({ quote, onQuoteChange }) => {
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // בטיחות נגד undefined/null
  const customer = quote.customer || { name: '', email: '', phone: '', address: '' };
  const businessInfo = quote.businessInfo || { name: '', phone: '', address: '', logoUrl: null };
  const items = quote.items || [];

  const handleFieldChange = (section: 'businessInfo' | 'customer', field: string, value: any) => {
    const currentSection = section === 'businessInfo' ? businessInfo : customer;
    const newQuote = { 
      ...quote, 
      [section]: { ...currentSection, [field]: value } 
    };
    onQuoteChange(newQuote);
  };

  const handleSimpleChange = (field: keyof Omit<Quote, 'businessInfo' | 'customer' | 'items'>, value: any) => {
    onQuoteChange({ ...quote, [field]: value });
  };
  
  const handleLogoChange = (file: File | null) => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleFieldChange('businessInfo', 'logoUrl', reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      handleFieldChange('businessInfo', 'logoUrl', null);
    }
  };

  const handleAddItem = () => {
    const newItem: ServiceItem = {
      id: crypto.randomUUID(),
      description: '',
      quantity: 1,
      unitPrice: 0,
    };
    onQuoteChange({ ...quote, items: [...items, newItem] });
  };

  const handleUpdateItem = (id: string, field: keyof Omit<ServiceItem, 'id'>, value: string | number) => {
    const updatedItems = items.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    );
    onQuoteChange({ ...quote, items: updatedItems });
  };
  
  const handleRemoveItem = (id: string) => {
    onQuoteChange({ ...quote, items: items.filter(item => item.id !== id) });
  };
  
  const handleGenerateWithAI = useCallback(async () => {
    if (!aiPrompt) return;
    setIsGenerating(true);
    setAiError(null);
    try {
      const generatedItems = await generateQuoteItems(aiPrompt);
      const newServiceItems: ServiceItem[] = generatedItems.map(item => ({
        ...item,
        id: crypto.randomUUID(),
      }));
      onQuoteChange({ ...quote, items: [...items, ...newServiceItems] });
      setAiPrompt('');
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "An unknown error occurred.");
    } finally {
      setIsGenerating(false);
    }
  }, [aiPrompt, quote, onQuoteChange, items]);

  const subtotal = items.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0);
  const taxAmount = subtotal * ((quote.taxRate || 0) / 100);
  const total = subtotal + taxAmount;

  return (
    <div className="space-y-6">
      <Card title="פרטי העסק שלך">
        <div className="space-y-4">
          <LogoUploader logoUrl={businessInfo.logoUrl} onLogoChange={handleLogoChange} />
          <Input label="שם העסק" value={businessInfo.name || ''} onChange={e => handleFieldChange('businessInfo', 'name', e.target.value)} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="טלפון" type="tel" value={businessInfo.phone || ''} onChange={e => handleFieldChange('businessInfo', 'phone', e.target.value)} />
            <Input label="כתובת" value={businessInfo.address || ''} onChange={e => handleFieldChange('businessInfo', 'address', e.target.value)} />
          </div>
        </div>
      </Card>
      
      <Card title="פרטי הלקוח">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="שם הלקוח" value={customer.name || ''} onChange={e => handleFieldChange('customer', 'name', e.target.value)} />
          <Input label="אימייל" type="email" value={customer.email || ''} onChange={e => handleFieldChange('customer', 'email', e.target.value)} />
          <Input label="טלפון" type="tel" value={customer.phone || ''} onChange={e => handleFieldChange('customer', 'phone', e.target.value)} />
          <Input label="כתובת" value={customer.address || ''} onChange={e => handleFieldChange('customer', 'address', e.target.value)} />
        </div>
      </Card>

      <Card title="פריטים בהצעה">
        <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-800">יצירה מהירה עם AI</h4>
                <p className="text-sm text-blue-700 mb-2">תאר את העבודה במילים פשוטות (למשל: "שיפוץ חדר אמבטיה קטן") והמערכת תציע פריטים.</p>
                <div className="flex gap-2">
                    <input 
                        value={aiPrompt}
                        onChange={e => setAiPrompt(e.target.value)}
                        placeholder="לדוגמה: ניקיון דירת 4 חדרים אחרי שיפוץ"
                        className="flex-grow block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        disabled={isGenerating}
                    />
                    <Button onClick={handleGenerateWithAI} disabled={isGenerating || !aiPrompt}>
                        {isGenerating ? 'יוצר...' : 'הצע פריטים'}
                    </Button>
                </div>
                {aiError && <p className="text-sm text-red-600 mt-2">{aiError}</p>}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right text-slate-500">
                <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                  <tr>
                    <th className="p-2 font-semibold">תיאור</th>
                    <th className="p-2 font-semibold w-24">כמות</th>
                    <th className="p-2 font-semibold w-32">מחיר יחידה</th>
                    <th className="p-2 font-semibold w-32">סה"כ</th>
                    <th className="p-2 font-semibold w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <ServiceItemRow key={item.id || `item-${index}`} item={item} onUpdate={handleUpdateItem} onRemove={handleRemoveItem} taxRate={quote.taxRate || 0} />
                  ))}
                </tbody>
              </table>
            </div>
            <Button onClick={handleAddItem} variant="secondary">הוסף פריט ידנית</Button>
        </div>
      </Card>

      <Card title="סיכום ותנאים">
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <Input label="תאריך הוצאה" type="date" value={quote.issueDate || ''} onChange={e => handleSimpleChange('issueDate', e.target.value)} />
                <Input label="בתוקף עד" type="date" value={quote.validUntil || ''} onChange={e => handleSimpleChange('validUntil', e.target.value)} />
            </div>
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-1">הערות ותנאים</label>
            <textarea
              id="notes"
              rows={4}
              value={quote.notes || ''}
              onChange={e => handleSimpleChange('notes', e.target.value)}
              className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            ></textarea>
          </div>
          <div className="flex justify-end">
            <div className="w-full md:w-1/2 space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-slate-600">סה"כ לפני מע"מ:</span>
                    <span className="font-semibold text-slate-800">₪{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-slate-600">מע"מ ({quote.taxRate || 0}%):</span>
                    <div className="flex items-center gap-2">
                        <input type="number" value={quote.taxRate || 0} onChange={e => handleSimpleChange('taxRate', parseFloat(e.target.value) || 0)} className="w-16 p-1 border rounded-md text-center"/>
                        <span className="font-semibold text-slate-800">₪{taxAmount.toFixed(2)}</span>
                    </div>
                </div>
                <div className="flex justify-between border-t pt-2 mt-2">
                    <span className="text-lg font-bold text-slate-900">סה"כ לתשלום:</span>
                    <span className="text-lg font-bold text-slate-900">₪{total.toFixed(2)}</span>
                </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default QuoteForm;
