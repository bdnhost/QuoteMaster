import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/SupabaseAuthContext';

export default function AuthDebugPage() {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [testResults, setTestResults] = useState<any>({});
  const { user, session, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    runDebugTests();
  }, []);

  const runDebugTests = async () => {
    const results: any = {};
    
    try {
      // Test 1: Check Supabase connection
      results.supabaseConnection = 'Connected';
      
      // Test 2: Check current session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      results.currentSession = sessionError ? `Error: ${sessionError.message}` : sessionData.session ? 'Active' : 'None';
      
      // Test 3: Check current user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      results.currentUser = userError ? `Error: ${userError.message}` : userData.user ? userData.user.email : 'None';
      
      // Test 4: Check users table access
      try {
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('count')
          .limit(1);
        results.usersTableAccess = usersError ? `Error: ${usersError.message}` : 'Accessible';
      } catch (error) {
        results.usersTableAccess = `Error: ${error}`;
      }
      
      // Test 5: Check quotes table access
      try {
        const { data: quotesData, error: quotesError } = await supabase
          .from('quotes')
          .select('count')
          .limit(1);
        results.quotesTableAccess = quotesError ? `Error: ${quotesError.message}` : 'Accessible';
      } catch (error) {
        results.quotesTableAccess = `Error: ${error}`;
      }
      
      // Test 6: Check environment variables
      results.supabaseUrl = import.meta.env.VITE_SUPABASE_URL ? 'Set' : 'Missing';
      results.supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'Missing';
      
    } catch (error) {
      results.generalError = `${error}`;
    }
    
    setTestResults(results);
    
    // Set debug info
    setDebugInfo({
      contextUser: user,
      contextSession: session,
      contextIsAuthenticated: isAuthenticated,
      contextIsLoading: isLoading,
      envVars: {
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL?.substring(0, 30) + '...',
        supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 30) + '...'
      }
    });
  };

  const testLogin = async () => {
    try {
      const email = prompt('Enter email:');
      const password = prompt('Enter password:');
      
      if (email && password) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (error) {
          alert(`Login error: ${error.message}`);
        } else {
          alert('Login successful!');
          runDebugTests();
        }
      }
    } catch (error) {
      alert(`Login error: ${error}`);
    }
  };

  const testLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        alert(`Logout error: ${error.message}`);
      } else {
        alert('Logout successful!');
        runDebugTests();
      }
    } catch (error) {
      alert(`Logout error: ${error}`);
    }
  };

  const testQuoteCreation = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Not authenticated');
        return;
      }

      const { data, error } = await supabase
        .from('quotes')
        .insert({
          user_id: user.id,
          quote_number: 'TEST-001',
          client_name: 'Test Client',
          status: 'draft',
          total_amount: 100
        })
        .select()
        .single();

      if (error) {
        alert(`Quote creation error: ${error.message}`);
      } else {
        alert('Quote created successfully!');
        console.log('Created quote:', data);
      }
    } catch (error) {
      alert(`Quote creation error: ${error}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Authentication Debug Page</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Test Results */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">System Tests</h2>
          <div className="space-y-2">
            {Object.entries(testResults).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="font-medium">{key}:</span>
                <span className={`${
                  typeof value === 'string' && value.includes('Error') 
                    ? 'text-red-600' 
                    : 'text-green-600'
                }`}>
                  {String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Context Info */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Auth Context</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">Is Authenticated:</span>
              <span className={isAuthenticated ? 'text-green-600' : 'text-red-600'}>
                {String(isAuthenticated)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Is Loading:</span>
              <span>{String(isLoading)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">User Email:</span>
              <span>{user?.email || 'None'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">User Role:</span>
              <span>{user?.role || 'None'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Session:</span>
              <span className={session ? 'text-green-600' : 'text-red-600'}>
                {session ? 'Active' : 'None'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Test Actions</h2>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={runDebugTests}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Refresh Tests
          </button>
          <button
            onClick={testLogin}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Test Login
          </button>
          <button
            onClick={testLogout}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Test Logout
          </button>
          <button
            onClick={testQuoteCreation}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
          >
            Test Quote Creation
          </button>
        </div>
      </div>

      {/* Raw Debug Data */}
      <div className="bg-gray-100 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Raw Debug Data</h2>
        <pre className="text-sm overflow-auto">
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </div>
    </div>
  );
}
