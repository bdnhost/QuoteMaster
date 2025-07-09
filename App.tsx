
import React from 'react';
import Header from './components/Header';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import QuoteEditorPage from './pages/QuoteEditorPage';
import ProfilePage from './pages/ProfilePage';
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
        <div className="flex justify-center items-center h-screen">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
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
                  case 'dashboard':
                  default:
                    return <DashboardPage />;
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
    case 'landing':
    default:
        return <LandingPage />;
  }
};

export default App;
