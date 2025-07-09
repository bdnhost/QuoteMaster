import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Button from './ui/Button';

const Header: React.FC = () => {
  const { isAuthenticated, logout } = useAuth();

  const handleLogout = () => {
    if(logout) {
      logout();
    }
    window.location.hash = '#/landing';
  }

  return (
    <header className="bg-white shadow-md no-print">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <a href="#/" className="flex items-center text-decoration-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h1 className="text-xl font-bold text-slate-800 ms-3">QuoteMaster Pro</h1>
          </a>
          <div className="flex items-center gap-4">
            {isAuthenticated && (
              <>
                 <a href="#/dashboard" className="text-sm font-medium text-slate-600 hover:text-blue-600">
                    לוח בקרה
                </a>
                 <a href="#/profile" className="text-sm font-medium text-slate-600 hover:text-blue-600">
                    הפרופיל שלי
                </a>
                <Button onClick={handleLogout} variant="secondary" size="sm">
                  יציאה
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;