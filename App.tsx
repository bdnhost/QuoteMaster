
import React from 'react';
import Header from './components/Header';
import { useAuth } from './contexts/SupabaseAuthContext';
import { ToastProvider } from './contexts/ToastContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import QuoteEditorPage from './pages/QuoteEditorPage';
import ProfilePage from './pages/ProfilePage';
import PaymentSettingsPage from './pages/PaymentSettingsPage';
import AuthDebugPage from './pages/AuthDebugPage';
import QuoteDebugPage from './pages/QuoteDebugPage';
import { useHashRouter } from './hooks/useHashRouter';
import LandingPage from './pages/LandingPage';

const App: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { route, params } = useHashRouter();

  console.log('Current route:', route);
  console.log('Current params:', params);
  console.log('Is authenticated:', isAuthenticated);
  console.log('Is loading:', isLoading);

  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-600 text-lg">טוען את המערכת...</p>
                <p className="text-sm text-gray-500 mt-2">אם הטעינה נמשכת יותר מדי, רענן את הדף</p>
            </div>
        </div>
    );
  }

  if (isAuthenticated) {
     return (
        <div className="min-h-screen bg-slate-100">
          <Header />
          <main className="max-w-screen-2xl mx-auto p-4 sm:p-6 lg:p-8">
            {
              (() => {
                switch (route) {
                  case 'quotes':
                    return <QuoteEditorPage quoteId={params[0]} />;
                  case 'profile':
                    return <ProfilePage />;
                  case 'payments':
                    return <PaymentSettingsPage />;
                  case 'debug':
                    return <AuthDebugPage />;
                  case 'quote-debug':
                  case 'quotedebug':
                    return <QuoteDebugPage />;
                  case 'dashboard':
                  default:
                    // Show admin dashboard for admin users, regular dashboard for others
                    if (!user) {
                      console.warn('User is null but authenticated - redirecting to login');
                      window.location.hash = '#/login';
                      return <div className="flex justify-center items-center h-screen">
                        <div className="text-center">
                          <p className="text-gray-600">מפנה לדף התחברות...</p>
                        </div>
                      </div>;
                    }
                    return user.role === 'admin' ? <AdminDashboardPage /> : <DashboardPage />;
                }
              })()
            }
          </main>
        </div>
     )
  }

  // Unauthenticated users
  switch(route) {
    case 'login':
        return <LoginPage />;
    case 'register':
        return <RegisterPage />;
    case 'debug':
        return <AuthDebugPage />;
    case 'quote-debug':
    case 'quotedebug':
        return <QuoteDebugPage />;
    case 'landing':
    default:
        return <LandingPage />;
  }
};

export default App;
