import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { PermissionManager } from '../../lib/permissions';

interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
  is_super_admin: boolean;
  business_name?: string;
  created_at: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      await PermissionManager.requireAdmin();
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'admin' | 'user') => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          role: newRole,
          is_super_admin: newRole === 'admin' ? true : false
        })
        .eq('id', userId);

      if (error) throw error;
      
      await loadUsers();
      alert('User role updated successfully');
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('Failed to update user role');
    }
  };

  const getRoleColor = (role: string, isSuperAdmin: boolean) => {
    if (role === 'admin') {
      return isSuperAdmin ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  const getRoleDisplay = (role: string, isSuperAdmin: boolean) => {
    if (role === 'admin') {
      return isSuperAdmin ? 'Super Admin' : 'Admin';
    }
    return 'User';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading users...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">{error}</p>
        <button 
          onClick={loadUsers}
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
        <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
        <button
          onClick={loadUsers}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            All Users ({users.length})
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {user.email}
                      </div>
                      {user.business_name && (
                        <div className="text-sm text-gray-500">
                          {user.business_name}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role, user.is_super_admin)}`}>
                      {getRoleDisplay(user.role, user.is_super_admin)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {user.email !== 'system@quotemaster.pro' && (
                      <div className="flex space-x-2">
                        {user.role === 'user' ? (
                          <button
                            onClick={() => updateUserRole(user.id, 'admin')}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Make Admin
                          </button>
                        ) : (
                          <button
                            onClick={() => updateUserRole(user.id, 'user')}
                            className="text-red-600 hover:text-red-900"
                          >
                            Remove Admin
                          </button>
                        )}
                      </div>
                    )}
                    {user.email === 'system@quotemaster.pro' && (
                      <span className="text-gray-400">System User</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">User Management Notes:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• The first registered user automatically becomes a Super Admin</li>
          <li>• System user is used for internal operations and cannot be modified</li>
          <li>• Admins have access to all system features and data</li>
          <li>• Regular users can only access their own data</li>
        </ul>
      </div>
    </div>
  );
}
