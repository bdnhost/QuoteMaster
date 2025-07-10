import React from 'react';
import type { Quote } from '../types';

interface QuotePreviewProps {
  quote: Quote;
}

const QuotePreview: React.FC<QuotePreviewProps> = ({ quote }) => {
  const subtotal = quote.items?.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) || 0;
  const taxAmount = subtotal * ((quote.taxRate || 0) / 100);
  const total = subtotal + taxAmount;

  // בטיחות נגד undefined/null
  const customer = quote.customer || { name: '', email: '', phone: '', address: '' };
  const businessInfo = quote.businessInfo || { name: '', phone: '', address: '', logoUrl: null };
  const items = quote.items || [];

  return (
    <div id="quote-preview" className="bg-white rounded-lg shadow-lg border border-slate-200 p-8 md:p-12 h-full text-sm">
      <div className="flex justify-between items-start pb-8 border-b-2 border-slate-200">
        <div className="flex-1">
          {businessInfo.logoUrl ? (
            <img src={businessInfo.logoUrl} alt="לוגו" className="max-h-24 mb-4" />
          ) : (
             <h1 className="text-3xl font-bold text-slate-800">{businessInfo.name || "שם העסק"}</h1>
          )}
          <p className="text-slate-600">{businessInfo.name || "שם העסק"}</p>
          <p className="text-slate-600">{businessInfo.address || "כתובת העסק"}</p>
          <p className="text-slate-600">טלפון: {businessInfo.phone || "טלפון"}</p>
        </div>
        <div className="text-left">
          <h2 className="text-3xl font-bold text-slate-400 uppercase tracking-wider">הצעת מחיר</h2>
          <p className="text-slate-600 mt-2">מספר: <span className="font-mono">{quote.quoteNumber || ''}</span></p>
          <p className="text-slate-600">תאריך: <span className="font-mono">{quote.issueDate || ''}</span></p>
          <p className="text-slate-600">בתוקף עד: <span className="font-mono">{quote.validUntil || ''}</span></p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-8 my-8">
        <div>
          <h4 className="font-semibold text-slate-500 mb-2">הצעה עבור:</h4>
          <p className="font-bold text-slate-800">{customer.name || "שם הלקוח"}</p>
          <p className="text-slate-600">{customer.address || "כתובת הלקוח"}</p>
          <p className="text-slate-600">{customer.email || "אימייל"}</p>
          <p className="text-slate-600">{customer.phone || "טלפון"}</p>
        </div>
      </div>

      <table className="w-full text-right mb-8">
        <thead className="border-b-2 border-slate-300">
          <tr>
            <th className="py-2 px-3 font-semibold text-slate-700 text-right">תיאור</th>
            <th className="py-2 px-3 font-semibold text-slate-700 text-center w-24">כמות</th>
            <th className="py-2 px-3 font-semibold text-slate-700 text-center w-32">מחיר יחידה</th>
            <th className="py-2 px-3 font-semibold text-slate-700 text-left w-32">סה"כ</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.id || index} className="border-b border-slate-100">
              <td className="py-3 px-3 text-slate-800">{item.description || ''}</td>
              <td className="py-3 px-3 text-slate-600 text-center">{item.quantity || 0}</td>
              <td className="py-3 px-3 text-slate-600 text-center">₪{(item.unitPrice || 0).toFixed(2)}</td>
              <td className="py-3 px-3 text-slate-800 text-left font-medium">₪{((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end mb-8">
        <div className="w-full max-w-sm">
          <div className="flex justify-between py-2">
            <span className="text-slate-600">סה"כ ביניים:</span>
            <span className="text-slate-800 font-medium">₪{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-slate-600">מע"מ ({quote.taxRate || 0}%):</span>
            <span className="text-slate-800 font-medium">₪{taxAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-2 text-lg font-bold border-t-2 border-slate-300 mt-2">
            <span className="text-slate-900">סה"כ לתשלום:</span>
            <span className="text-slate-900">₪{total.toFixed(2)}</span>
          </div>
        </div>
      </div>
      
      {quote.notes && (
        <div className="mt-8 pt-4 border-t border-slate-200">
          <h4 className="font-semibold text-slate-500 mb-2">הערות ותנאים:</h4>
          <p className="text-slate-600 whitespace-pre-wrap">{quote.notes}</p>
        </div>
      )}

      <div className="text-center text-xs text-slate-400 mt-12">
        תודה על ההזדמנות להגיש הצעה זו.
      </div>
    </div>
  );
};

export default QuotePreview;
