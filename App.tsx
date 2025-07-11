import React from 'react';
import Header from './components/Header';
import { useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import QuoteEditorPage from './pages/QuoteEditorPage';
import ProfilePage from './pages/ProfilePage';
import PaymentSettingsPage from './pages/PaymentSettingsPage';
import { useHashRouter } from './hooks/useHashRouter';
import LandingPage from './pages/LandingPage';

const App: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { route, params } = useHashRouter();

  console.log('App render:', { route, params, isAuthenticated, isLoading, user: user?.email });

  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-screen">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
        </div>
    );
  }

  const renderAuthenticatedApp = () => {
    return (
      <div className="min-h-screen bg-slate-100">
        <Header />
        <main className="max-w-screen-2xl mx-auto p-4 sm:p-6 lg:p-8">
          {(() => {
            switch (route) {
              case 'quotes':
                const quoteId = params[0];
                if (!quoteId) {
                  // Redirect to dashboard if no quote ID provided
                  window.location.hash = '#/dashboard';
                  return <div>מפנה לדשבורד...</div>;
                }
                return <QuoteEditorPage quoteId={quoteId} />;
              case 'profile':
                return <ProfilePage />;
              case 'payments':
                return <PaymentSettingsPage />;
              case 'dashboard':
              default:
                // Show admin dashboard for admin users, regular dashboard for others
                return user?.role === 'admin' ? <AdminDashboardPage /> : <DashboardPage />;
            }
          })()}
        </main>
      </div>
    );
  };

  const renderUnauthenticatedApp = () => {
    switch(route) {
      case 'login':
        return <LoginPage />;
      case 'register':
        return <RegisterPage />;
      case 'landing':
      default:
        return <LandingPage />;
    }
  };

  return (
    <ToastProvider>
      {isAuthenticated ? renderAuthenticatedApp() : renderUnauthenticatedApp()}
    </ToastProvider>
  );
};

export default App;
