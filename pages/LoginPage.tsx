
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/SupabaseAuthContext';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { useHashRouter } from '../hooks/useHashRouter';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('demo@quotemaster.pro');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { navigate } = useHashRouter();

  console.log('LoginPage rendered', { email, password, error, isLoading });

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      console.log('Global click event:', e.target);
    };

    document.addEventListener('click', handleGlobalClick);

    return () => {
      document.removeEventListener('click', handleGlobalClick);
    };
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    console.log('handleSubmit function called');
    e.preventDefault();
    console.log('Default form submission prevented');
    setError('');
    setIsLoading(true);
    console.log('isLoading set to true');
    try {
      console.log('Attempting login with:', { email, password });
      await login(email, password);
      console.log('Login successful, redirecting to dashboard');
      navigate('dashboard');
    } catch (err) {
      console.error('Login error:', err);
      if (err instanceof Error) {
        if (err.message.includes('Invalid credentials')) {
          setError('אימייל או סיסמה שגויים. אנא נסה שוב.');
        } else if (err.message.includes('Network')) {
          setError('שגיאת רשת. אנא בדוק את החיבור לאינטרנט ונסה שוב.');
        } else {
          setError('שגיאה בהתחברות. אנא נסה שוב מאוחר יותר.');
        }
      } else {
        setError('פרטי התחברות שגויים. נסה שוב.');
      }
      console.log('Error set:', error);
    } finally {
      setIsLoading(false);
      console.log('isLoading set to false');
      console.log('Login process completed');
    }
  }, [email, password, login, navigate]);

  console.log('Rendering LoginPage component');

  console.log('Rendering LoginPage component', { email, password, error, isLoading });

  return (
    <div className="flex justify-center items-center pt-16">
      <div className="w-full max-w-md">
        <Card title="התחברות למערכת">
          <form onSubmit={(e) => {
            console.log('Form onSubmit triggered');
            handleSubmit(e);
          }} className="space-y-6">
            <p className="text-sm text-slate-600">
              לצורך הדגמה, ניתן להשתמש בפרטים המוכנים מראש:
              <br />
              אימייל: <strong>demo@quotemaster.pro</strong>
              <br/>
              סיסמה: <strong>123456</strong>
            </p>
            <Input
              label="כתובת אימייל"
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              disabled={isLoading}
              autoComplete="email"
            />
            <Input
              label="סיסמה"
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              disabled={isLoading}
              autoComplete="current-password"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              onClick={() => console.log('Login button clicked')}
            >
              {isLoading ? 'מתחבר...' : 'התחברות'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-600">
            אין לך חשבון עדיין?{' '}
            <button
              onClick={() => {
                console.log('Register button clicked');
                navigate('register');
              }}
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              הירשם כאן
            </button>
          </p>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
