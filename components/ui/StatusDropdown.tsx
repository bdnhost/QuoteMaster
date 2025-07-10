import React, { useState } from 'react';

interface StatusDropdownProps {
  currentStatus: 'draft' | 'sent' | 'approved' | 'rejected';
  onStatusChange: (status: 'draft' | 'sent' | 'approved' | 'rejected') => void;
  disabled?: boolean;
}

const StatusDropdown: React.FC<StatusDropdownProps> = ({ currentStatus, onStatusChange, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);

  const statusOptions = [
    { value: 'draft', label: 'טיוטה', color: 'bg-gray-100 text-gray-800' },
    { value: 'sent', label: 'נשלח', color: 'bg-blue-100 text-blue-800' },
    { value: 'approved', label: 'אושר', color: 'bg-green-100 text-green-800' },
    { value: 'rejected', label: 'נדחה', color: 'bg-red-100 text-red-800' }
  ] as const;

  const currentOption = statusOptions.find(option => option.value === currentStatus);

  const handleStatusSelect = (status: 'draft' | 'sent' | 'approved' | 'rejected') => {
    onStatusChange(status);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`px-2 py-1 text-xs font-semibold rounded-full ${currentOption?.color} ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80 cursor-pointer'
        } transition-opacity`}
      >
        {currentOption?.label}
        {!disabled && (
          <svg className="inline-block w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        )}
      </button>

      {isOpen && !disabled && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-32 bg-white border border-gray-200 rounded-md shadow-lg">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleStatusSelect(option.value)}
                className={`block w-full px-3 py-2 text-xs text-right hover:bg-gray-50 ${
                  option.value === currentStatus ? 'bg-gray-50' : ''
                }`}
              >
                <span className={`px-2 py-1 rounded-full ${option.color}`}>
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default StatusDropdown;
