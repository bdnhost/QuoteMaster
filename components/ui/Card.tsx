
import React from 'react';

interface CardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ title, children, className, actions }) => {
  return (
    <div className={`bg-white border border-slate-200 rounded-lg shadow-sm ${className}`}>
      <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};

export default Card;
