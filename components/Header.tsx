import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Button from './ui/Button';

const Header: React.FC = () => {
  const { isAuthenticated, logout, user } = useAuth();

  const handleLogout = () => {
    try {
      if (logout) {
        logout();
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
    // Always redirect to landing page regardless of logout success/failure
    window.location.hash = '#/landing';
  }

  const handleNavigation = (route: string) => {
    window.location.hash = `#/${route}`;
  };

  return (
    <header className="bg-white shadow-md no-print">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <button 
            onClick={() => handleNavigation('')}
            className="flex items-center text-decoration-none hover:opacity-80 transition-opacity"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h1 className="text-xl font-bold text-slate-800 ms-3">QuoteMaster Pro</h1>
          </button>
          
          <div className="flex items-center gap-4">
            {isAuthenticated && user ? (
              <>
                <button 
                  onClick={() => handleNavigation('dashboard')}
                  className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
                >
                  לוח בקרה
                </button>
                
                <button 
                  onClick={() => handleNavigation('payments')}
                  className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
                >
                  תשלומים
                </button>
                
                <button 
                  onClick={() => handleNavigation('profile')}
                  className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
                >
                  הפרופיל שלי
                </button>

                {user.role === 'admin' && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    אדמין
                  </span>
                )}
                
                <Button onClick={handleLogout} variant="secondary" size="sm">
                  יציאה
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleNavigation('login')}
                  className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
                >
                  התחברות
                </button>
                <button 
                  onClick={() => handleNavigation('register')}
                  className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded transition-colors"
                >
                  הרשמה
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
