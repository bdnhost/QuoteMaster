import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await register(email, password, businessName, businessPhone, businessAddress);
      window.location.hash = '#/dashboard';
    } catch (err) {
      setError('שגיאה בהרשמה. נסה שוב.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center pt-16">
      <div className="w-full max-w-md">
        <Card title="הרשמה למערכת">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="כתובת אימייל"
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
            <Input
              label="סיסמה"
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
            <Input
              label="שם העסק"
              id="businessName"
              type="text"
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
              required
              disabled={isLoading}
            />
            <Input
              label="טלפון העסק"
              id="businessPhone"
              type="tel"
              value={businessPhone}
              onChange={e => setBusinessPhone(e.target.value)}
              required
              disabled={isLoading}
            />
            <Input
              label="כתובת העסק"
              id="businessAddress"
              type="text"
              value={businessAddress}
              onChange={e => setBusinessAddress(e.target.value)}
              required
              disabled={isLoading}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'מבצע הרשמה...' : 'הרשמה'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-600">
            כבר יש לך חשבון?{' '}
            <a href="#/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              התחבר כאן
            </a>
          </p>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;
