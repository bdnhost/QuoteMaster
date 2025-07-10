import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../services/apiService';
import type { Quote, User, ActivityLog, SystemSettings } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import StatusDropdown from '../components/ui/StatusDropdown';

const AdminDashboardPage: React.FC = () => {
    const { user } = useAuth();
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
    const [settings, setSettings] = useState<SystemSettings>({});
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'quotes' | 'users' | 'activity' | 'settings'>('quotes');
    const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
    const [updatingUserRole, setUpdatingUserRole] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const quotesData = await api.getQuotes();
                setQuotes(quotesData);
                
                const [usersData, activityData, settingsData] = await Promise.all([
                    api.getAllUsers(),
                    api.getActivityLog(1, 20),
                    api.getSystemSettings()
                ]);
                setUsers(usersData);
                setActivityLog(activityData.activities);
                setSettings(settingsData);
            } catch (error) {
                console.error("Failed to fetch admin data", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleStatusChange = async (quoteId: string, newStatus: 'draft' | 'sent' | 'approved' | 'rejected') => {
        setUpdatingStatus(quoteId);
        try {
            const updatedQuote = await api.updateQuoteStatus(quoteId, newStatus);
            setQuotes(prevQuotes =>
                prevQuotes.map(quote =>
                    quote.id === quoteId ? updatedQuote : quote
                )
            );
        } catch (error) {
            console.error('Failed to update quote status:', error);
            alert('שגיאה בעדכון סטטוס ההצעה. אנא נסה שוב.');
        } finally {
            setUpdatingStatus(null);
        }
    };

    const handleUserRoleChange = async (userId: string, newRole: 'admin' | 'user') => {
        if (!confirm(`האם אתה בטוח שברצונך לשנות את התפקיד ל${newRole === 'admin' ? 'אדמין' : 'משתמש רגיל'}?`)) {
            return;
        }

        setUpdatingUserRole(userId);
        try {
            await api.updateUserRole(userId, newRole);
            setUsers(prevUsers =>
                prevUsers.map(user =>
                    user.id === userId ? { ...user, role: newRole } : user
                )
            );
            alert('תפקיד המשתמש עודכן בהצלחה!');
        } catch (error) {
            console.error('Failed to update user role:', error);
            alert('שגיאה בעדכון תפקיד המשתמש. אנא נסה שוב.');
        } finally {
            setUpdatingUserRole(null);
        }
    };

    const calculateTotal = (quote: Quote) => {
        const subtotal = quote.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
        return subtotal * (1 + quote.taxRate / 100);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('he-IL', {
            style: 'currency',
            currency: 'ILS'
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('he-IL');
    };

    if (!user || user.role !== 'admin') {
        return (
            <div className="p-6">
                <Card title="גישה נדחתה">
                    <p>אין לך הרשאות לצפות בדף זה.</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800">דשבורד ניהול</h1>
                <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    אדמין: {user.email}
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card title="סה״כ הצעות מחיר">
                    <div className="text-3xl font-bold text-blue-600">{quotes.length}</div>
                </Card>
                <Card title="הצעות פעילות">
                    <div className="text-3xl font-bold text-green-600">
                        {quotes.filter(q => q.status === 'sent').length}
                    </div>
                </Card>
                <Card title="הצעות מאושרות">
                    <div className="text-3xl font-bold text-purple-600">
                        {quotes.filter(q => q.status === 'approved').length}
                    </div>
                </Card>
                <Card title="סה״כ משתמשים">
                    <div className="text-3xl font-bold text-orange-600">{users.length}</div>
                </Card>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        type="button"
                        onClick={() => setActiveTab('quotes')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'quotes'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        ניהול הצעות מחיר
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('users')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'users'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        ניהול משתמשים
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('activity')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'activity'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        לוג פעילות
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('settings')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'settings'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        הגדרות מערכת
                    </button>
                </nav>
            </div>

            {/* Content */}
            {activeTab === 'quotes' && (
                <Card title="כל הצעות המחיר במערכת" actions={
                    <Button onClick={() => window.location.hash = '#/quotes/new'}>
                        + יצירת הצעה חדשה
                    </Button>
                }>
                    {isLoading ? (
                        <p>טוען הצעות מחיר...</p>
                    ) : quotes.length === 0 ? (
                        <div className="text-center py-12">
                            <h3 className="text-lg font-medium text-slate-800">עדיין אין הצעות מחיר במערכת</h3>
                            <p className="text-slate-500 mt-2">לחץ על "יצירת הצעה חדשה" כדי להתחיל.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-right">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="p-3 font-semibold text-slate-600">מספר הצעה</th>
                                        <th className="p-3 font-semibold text-slate-600">לקוח</th>
                                        <th className="p-3 font-semibold text-slate-600">תאריך יצירה</th>
                                        <th className="p-3 font-semibold text-slate-600">תוקף עד</th>
                                        <th className="p-3 font-semibold text-slate-600">סכום</th>
                                        <th className="p-3 font-semibold text-slate-600">סטטוס</th>
                                        <th className="p-3 font-semibold text-slate-600">פעולות</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {quotes.map((quote) => (
                                        <tr key={quote.id} className="border-b border-slate-100 hover:bg-slate-50">
                                            <td className="p-3 font-medium text-slate-900">{quote.quoteNumber}</td>
                                            <td className="p-3">{quote.customer.name}</td>
                                            <td className="p-3">{formatDate(quote.issueDate)}</td>
                                            <td className="p-3">{formatDate(quote.validUntil)}</td>
                                            <td className="p-3 font-medium">{formatCurrency(calculateTotal(quote))}</td>
                                            <td className="p-3">
                                                <StatusDropdown
                                                    currentStatus={quote.status}
                                                    onStatusChange={(newStatus) => handleStatusChange(quote.id, newStatus)}
                                                    disabled={updatingStatus === quote.id}
                                                />
                                            </td>
                                            <td className="p-3">
                                                <div className="flex gap-2">
                                                    <Button
                                                        onClick={() => window.location.hash = `#/quotes/${quote.id}`}
                                                        variant="secondary"
                                                        size="sm"
                                                    >
                                                        עריכה
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            )}

            {activeTab === 'users' && (
                <Card title="ניהול משתמשים">
                    {isLoading ? (
                        <p>טוען משתמשים...</p>
                    ) : users.length === 0 ? (
                        <div className="text-center py-12">
                            <h3 className="text-lg font-medium text-slate-800">אין משתמשים במערכת</h3>
                            <p className="text-slate-500 mt-2">משתמשים יופיעו כאן לאחר הרישום.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-right">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="p-3 font-semibold text-slate-600">אימייל</th>
                                        <th className="p-3 font-semibold text-slate-600">שם עסק</th>
                                        <th className="p-3 font-semibold text-slate-600">טלפון</th>
                                        <th className="p-3 font-semibold text-slate-600">תפקיד</th>
                                        <th className="p-3 font-semibold text-slate-600">תאריך הצטרפות</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((user) => (
                                        <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                                            <td className="p-3 font-medium text-slate-900">{user.email}</td>
                                            <td className="p-3">{user.businessInfo.name}</td>
                                            <td className="p-3">{user.businessInfo.phone}</td>
                                            <td className="p-3">
                                                <select
                                                    value={user.role}
                                                    onChange={(e) => handleUserRoleChange(user.id, e.target.value as 'admin' | 'user')}
                                                    disabled={updatingUserRole === user.id}
                                                    className="text-xs px-2 py-1 border border-gray-300 rounded"
                                                >
                                                    <option value="user">משתמש</option>
                                                    <option value="admin">אדמין</option>
                                                </select>
                                            </td>
                                            <td className="p-3">{formatDate(user.createdAt || '')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            )}

            {/* Activity Log Tab */}
            {activeTab === 'activity' && (
                <Card title="לוג פעילות מערכת">
                    {activityLog.length === 0 ? (
                        <div className="text-center py-12">
                            <h3 className="text-lg font-medium text-slate-800">אין פעילות מתועדת</h3>
                            <p className="text-slate-500 mt-2">פעילות המשתמשים תופיע כאן.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-right">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="p-3 font-semibold text-slate-600">משתמש</th>
                                        <th className="p-3 font-semibold text-slate-600">פעולה</th>
                                        <th className="p-3 font-semibold text-slate-600">סוג ישות</th>
                                        <th className="p-3 font-semibold text-slate-600">תאריך</th>
                                        <th className="p-3 font-semibold text-slate-600">כתובת IP</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activityLog.map((activity) => (
                                        <tr key={activity.id} className="border-b border-slate-100 hover:bg-slate-50">
                                            <td className="p-3">
                                                {activity.userEmail || 'משתמש לא ידוע'}
                                                {activity.businessName && (
                                                    <div className="text-xs text-slate-500">{activity.businessName}</div>
                                                )}
                                            </td>
                                            <td className="p-3 font-medium">{activity.action}</td>
                                            <td className="p-3">{activity.entityType || '-'}</td>
                                            <td className="p-3">{formatDate(activity.createdAt)}</td>
                                            <td className="p-3 text-xs text-slate-500">{activity.ipAddress || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
                <Card title="הגדרות מערכת" actions={
                    <Button onClick={() => window.location.hash = '#/payments'}>
                        הגדרות תשלומים מתקדמות
                    </Button>
                }>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Object.entries(settings).map(([key, setting]) => (
                            <div key={key} className="bg-slate-50 p-4 rounded-lg">
                                <h3 className="font-semibold text-slate-800 mb-2">
                                    {setting.description || key}
                                </h3>
                                <p className="text-sm text-slate-600 mb-2">
                                    סוג: {setting.type}
                                </p>
                                <div className="text-lg font-medium text-blue-600">
                                    {typeof setting.value === 'boolean'
                                        ? (setting.value ? 'כן' : 'לא')
                                        : String(setting.value)
                                    }
                                </div>
                            </div>
                        ))}
                    </div>
                    {Object.keys(settings).length === 0 && (
                        <div className="text-center py-12">
                            <h3 className="text-lg font-medium text-slate-800">אין הגדרות זמינות</h3>
                            <p className="text-slate-500 mt-2">הגדרות המערכת יופיעו כאן.</p>
                        </div>
                    )}
                </Card>
            )}
        </div>
    );
};

export default AdminDashboardPage;
