
import React from 'react';
import type { ServiceItem } from '../types';
import Input from './ui/Input';

interface ServiceItemRowProps {
  item: ServiceItem;
  onUpdate: (id: string, field: keyof Omit<ServiceItem, 'id'>, value: string | number) => void;
  onRemove: (id: string) => void;
  taxRate: number;
}

const ServiceItemRow: React.FC<ServiceItemRowProps> = ({ item, onUpdate, onRemove, taxRate }) => {
  const total = item.quantity * item.unitPrice;

  const handleUpdate = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      if (!item.id) return;
      const parsedValue = name === 'description' ? value : parseFloat(value) || 0;
      onUpdate(item.id, name as keyof Omit<ServiceItem, 'id'>, parsedValue);
  };
  
  return (
    <tr className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50">
      <td className="p-2 align-top">
        <input
            name="description"
            value={item.description}
            onChange={handleUpdate}
            placeholder="תיאור השירות"
            className="w-full bg-transparent border-none focus:ring-0 p-1"
        />
      </td>
      <td className="p-2 align-top w-24">
        <input
            name="quantity"
            type="number"
            value={item.quantity}
            onChange={handleUpdate}
            className="w-full bg-transparent border-none focus:ring-0 p-1 text-center"
        />
      </td>
      <td className="p-2 align-top w-32">
        <input
            name="unitPrice"
            type="number"
            value={item.unitPrice}
            onChange={handleUpdate}
            className="w-full bg-transparent border-none focus:ring-0 p-1 text-center"
        />
      </td>
      <td className="p-2 align-top w-32 text-center font-medium text-slate-700">
        ₪{total.toFixed(2)}
      </td>
      <td className="p-2 align-top w-12 text-center">
        <button
          onClick={() => item.id && onRemove(item.id)}
          className="text-red-500 hover:text-red-700 p-1"
          title="הסר פריט"
          disabled={!item.id}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </td>
    </tr>
  );
};

export default ServiceItemRow;