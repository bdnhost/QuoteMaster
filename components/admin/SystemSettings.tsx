import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { PermissionManager } from '../../lib/permissions';

interface SystemSetting {
  id: string;
  key: string;
  value: any;
  description: string;
  category: string;
  is_public: boolean;
}

export default function SystemSettings() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      await PermissionManager.requireAdmin();
      
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;
      setSettings(data || []);
    } catch (error) {
      console.error('Error loading settings:', error);
      setError('Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (setting: SystemSetting) => {
    setEditingKey(setting.key);
    setEditValue(typeof setting.value === 'string' ? setting.value : JSON.stringify(setting.value));
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditValue('');
  };

  const saveEdit = async (key: string) => {
    try {
      let parsedValue;
      try {
        // Try to parse as JSON first
        parsedValue = JSON.parse(editValue);
      } catch {
        // If JSON parsing fails, treat as string
        parsedValue = editValue;
      }

      const { error } = await supabase
        .from('system_settings')
        .update({ value: parsedValue })
        .eq('key', key);

      if (error) throw error;
      
      await loadSettings();
      setEditingKey(null);
      setEditValue('');
      alert('Setting updated successfully');
    } catch (error) {
      console.error('Error updating setting:', error);
      alert('Failed to update setting');
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      general: 'bg-blue-100 text-blue-800',
      payments: 'bg-green-100 text-green-800',
      email: 'bg-purple-100 text-purple-800',
      auth: 'bg-orange-100 text-orange-800',
      system: 'bg-red-100 text-red-800',
      financial: 'bg-yellow-100 text-yellow-800',
      uploads: 'bg-indigo-100 text-indigo-800',
      quotes: 'bg-pink-100 text-pink-800',
      limits: 'bg-gray-100 text-gray-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const formatValue = (value: any) => {
    if (typeof value === 'string') {
      return value;
    }
    return JSON.stringify(value);
  };

  const groupedSettings = settings.reduce((groups, setting) => {
    const category = setting.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(setting);
    return groups;
  }, {} as { [key: string]: SystemSetting[] });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading settings...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">{error}</p>
        <button 
          onClick={loadSettings}
          className="mt-2 text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">System Settings</h2>
        <button
          onClick={loadSettings}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-yellow-900 mb-2">⚠️ Important:</h4>
        <p className="text-sm text-yellow-800">
          Be careful when editing system settings. Incorrect values may cause the application to malfunction.
          Always backup your settings before making changes.
        </p>
      </div>

      {Object.entries(groupedSettings).map(([category, categorySettings]) => (
        <div key={category} className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-medium text-gray-900 capitalize">
                {category} Settings
              </h3>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(category)}`}>
                {categorySettings.length} settings
              </span>
            </div>
          </div>
          
          <div className="divide-y divide-gray-200">
            {categorySettings.map((setting) => (
              <div key={setting.key} className="px-6 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium text-gray-900">
                        {setting.key}
                      </h4>
                      {setting.is_public && (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Public
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {setting.description}
                    </p>
                    <div className="mt-2">
                      {editingKey === setting.key ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                            placeholder="Enter new value..."
                          />
                          <button
                            onClick={() => saveEdit(setting.key)}
                            className="bg-green-600 text-white px-3 py-2 rounded-md text-sm hover:bg-green-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="bg-gray-600 text-white px-3 py-2 rounded-md text-sm hover:bg-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                            {formatValue(setting.value)}
                          </code>
                          <button
                            onClick={() => startEdit(setting)}
                            className="text-blue-600 hover:text-blue-900 text-sm"
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {Object.keys(groupedSettings).length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No system settings found.</p>
        </div>
      )}
    </div>
  );
}
