import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { SupabaseQuoteService } from '../services/supabaseQuoteService';
import { useAuth } from '../contexts/SupabaseAuthContext';
import type { Quote, ServiceItem } from '../types';

export default function QuoteDebugPage() {
  const [debugResults, setDebugResults] = useState<any>({});
  const [testQuote, setTestQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const { user, isAuthenticated } = useAuth();

  const runDatabaseTests = async () => {
    setLoading(true);
    const results: any = {};

    try {
      // Test 1: Check authentication
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      results.authentication = authError ? `Error: ${authError.message}` : authUser ? `Authenticated: ${authUser.email}` : 'Not authenticated';

      // Test 2: Check user exists in users table
      if (authUser) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();
        results.userInDatabase = userError ? `Error: ${userError.message}` : userData ? `Found: ${userData.email}` : 'User not found';
      }

      // Test 3: Test quotes table access
      const { data: quotesData, error: quotesError } = await supabase
        .from('quotes')
        .select('count')
        .limit(1);
      results.quotesTableAccess = quotesError ? `Error: ${quotesError.message}` : 'Accessible';

      // Test 4: Test quote_items table access
      const { data: itemsData, error: itemsError } = await supabase
        .from('quote_items')
        .select('count')
        .limit(1);
      results.quoteItemsTableAccess = itemsError ? `Error: ${itemsError.message}` : 'Accessible';

      // Test 5: Test manual quote creation
      if (authUser) {
        try {
          const testQuoteData = {
            user_id: authUser.id,
            quote_number: `TEST-${Date.now()}`,
            client_name: 'Test Client',
            client_email: 'test@example.com',
            status: 'draft',
            total_amount: 100
          };

          const { data: createdQuote, error: createError } = await supabase
            .from('quotes')
            .insert(testQuoteData)
            .select()
            .single();

          if (createError) {
            results.manualQuoteCreation = `Error: ${createError.message}`;
          } else {
            results.manualQuoteCreation = `Success: Created quote ${createdQuote.id}`;
            
            // Clean up test quote
            await supabase.from('quotes').delete().eq('id', createdQuote.id);
          }
        } catch (error) {
          results.manualQuoteCreation = `Error: ${error}`;
        }
      }

      // Test 6: Test SupabaseQuoteService.createNewQuote
      try {
        const newQuoteTemplate = await SupabaseQuoteService.createNewQuote();
        results.createNewQuoteService = `Success: Generated template with number ${newQuoteTemplate.quoteNumber}`;
      } catch (error) {
        results.createNewQuoteService = `Error: ${error}`;
      }

    } catch (error) {
      results.generalError = `${error}`;
    }

    setDebugResults(results);
    setLoading(false);
  };

  const testQuoteCreation = async () => {
    setLoading(true);
    try {
      // Create a test quote using the service
      const testQuoteData: Partial<Quote> = {
        customer: {
          name: 'Test Customer',
          email: 'test@customer.com',
          phone: '123-456-7890',
          address: '123 Test Street'
        },
        items: [
          {
            id: '1',
            description: 'Test Service',
            quantity: 2,
            unitPrice: 50
          } as ServiceItem
        ],
        notes: 'This is a test quote',
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };

      const createdQuote = await SupabaseQuoteService.createQuote(testQuoteData);
      setTestQuote(createdQuote);
      alert(`Quote created successfully! ID: ${createdQuote.id}`);
    } catch (error) {
      alert(`Error creating quote: ${error}`);
      console.error('Quote creation error:', error);
    }
    setLoading(false);
  };

  const testQuoteUpdate = async () => {
    if (!testQuote) {
      alert('No test quote to update. Create one first.');
      return;
    }

    setLoading(true);
    try {
      const updatedQuoteData: Partial<Quote> = {
        ...testQuote,
        customer: {
          ...testQuote.customer,
          name: 'Updated Customer Name'
        },
        notes: 'Updated notes - ' + new Date().toISOString()
      };

      const updatedQuote = await SupabaseQuoteService.updateQuote(testQuote.id!, updatedQuoteData);
      setTestQuote(updatedQuote);
      alert('Quote updated successfully!');
    } catch (error) {
      alert(`Error updating quote: ${error}`);
      console.error('Quote update error:', error);
    }
    setLoading(false);
  };

  const deleteTestQuote = async () => {
    if (!testQuote) {
      alert('No test quote to delete.');
      return;
    }

    setLoading(true);
    try {
      await SupabaseQuoteService.deleteQuote(testQuote.id!);
      setTestQuote(null);
      alert('Quote deleted successfully!');
    } catch (error) {
      alert(`Error deleting quote: ${error}`);
      console.error('Quote deletion error:', error);
    }
    setLoading(false);
  };

  const loadAllQuotes = async () => {
    setLoading(true);
    try {
      const quotes = await SupabaseQuoteService.getQuotes();
      alert(`Loaded ${quotes.length} quotes successfully!`);
      console.log('All quotes:', quotes);
    } catch (error) {
      alert(`Error loading quotes: ${error}`);
      console.error('Quote loading error:', error);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Quote System Debug Page</h1>
      
      {/* Auth Status */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="font-medium">Is Authenticated:</span>
            <span className={`ml-2 ${isAuthenticated ? 'text-green-600' : 'text-red-600'}`}>
              {String(isAuthenticated)}
            </span>
          </div>
          <div>
            <span className="font-medium">User Email:</span>
            <span className="ml-2">{user?.email || 'None'}</span>
          </div>
          <div>
            <span className="font-medium">User Role:</span>
            <span className="ml-2">{user?.role || 'None'}</span>
          </div>
          <div>
            <span className="font-medium">Business Name:</span>
            <span className="ml-2">{user?.businessName || 'None'}</span>
          </div>
        </div>
      </div>

      {/* Database Tests */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Database Tests</h2>
        <button
          onClick={runDatabaseTests}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 mb-4"
        >
          {loading ? 'Running Tests...' : 'Run Database Tests'}
        </button>
        
        <div className="space-y-2">
          {Object.entries(debugResults).map(([key, value]) => (
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

      {/* Quote Operations */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Quote Operations</h2>
        <div className="flex flex-wrap gap-4 mb-4">
          <button
            onClick={testQuoteCreation}
            disabled={loading || !isAuthenticated}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            Create Test Quote
          </button>
          <button
            onClick={testQuoteUpdate}
            disabled={loading || !testQuote}
            className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 disabled:opacity-50"
          >
            Update Test Quote
          </button>
          <button
            onClick={deleteTestQuote}
            disabled={loading || !testQuote}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
          >
            Delete Test Quote
          </button>
          <button
            onClick={loadAllQuotes}
            disabled={loading || !isAuthenticated}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
          >
            Load All Quotes
          </button>
        </div>

        {testQuote && (
          <div className="bg-gray-100 p-4 rounded">
            <h3 className="font-semibold mb-2">Current Test Quote:</h3>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(testQuote, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Debug Instructions:</h3>
        <ol className="text-blue-800 space-y-1 list-decimal list-inside">
          <li>First, run the database tests to check connectivity and permissions</li>
          <li>If authenticated, try creating a test quote</li>
          <li>Test updating and deleting the quote</li>
          <li>Check the browser console for detailed error messages</li>
          <li>If tests fail, run the SQL debug script in Supabase</li>
        </ol>
      </div>
    </div>
  );
}
