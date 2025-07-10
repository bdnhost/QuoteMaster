import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/SupabaseAuthContext';
import * as api from '../services/apiService';
import type { PaymentMethod, Invoice, SystemSettings } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const PaymentSettingsPage: React.FC = () => {
    const { user } = useAuth();
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [settings, setSettings] = useState<SystemSettings>({});
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'methods' | 'invoices' | 'settings'>('methods');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [methodsData, invoicesData, settingsData] = await Promise.all([
                    api.getPaymentMethods(),
                    api.getInvoices(),
                    user?.role === 'admin' ? api.getSystemSettings() : Promise.resolve({})
                ]);
                
                setPaymentMethods(methodsData);
                setInvoices(invoicesData);
                setSettings(settingsData);
            } catch (error) {
                console.error('Failed to fetch payment data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [user]);

    const handleSettingsChange = (key: string, value: any) => {
        setSettings(prev => ({
            ...prev,
            [key]: {
                ...prev[key],
                value
            }
        }));
    };

    const handleSaveSettings = async () => {
        setIsSaving(true);
        try {
            await api.updateSystemSettings(settings);
            alert('הגדרות נשמרו בהצלחה!');
        } catch (error) {
            console.error('Failed to save settings:', error);
            alert('שגיאה בשמירת ההגדרות');
        } finally {
            setIsSaving(false);
        }
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

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid': return 'bg-green-100 text-green-800';
            case 'sent': return 'bg-blue-100 text-blue-800';
            case 'overdue': return 'bg-red-100 text-red-800';
            case 'draft': return 'bg-gray-100 text-gray-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'paid': return 'שולם';
            case 'sent': return 'נשלח';
            case 'overdue': return 'באיחור';
            case 'draft': return 'טיוטה';
            case 'cancelled': return 'בוטל';
            default: return status;
        }
    };

    if (!user) {
        return <div className="p-6">נדרשת התחברות</div>;
    }

    if (isLoading) {
        return <div className="p-6">טוען נתוני תשלומים...</div>;
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800">ניהול תשלומים</h1>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        type="button"
                        onClick={() => setActiveTab('methods')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'methods'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        שיטות תשלום
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('invoices')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'invoices'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        חשבוניות
                    </button>
                    {user.role === 'admin' && (
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
                    )}
                </nav>
            </div>

            {/* Payment Methods Tab */}
            {activeTab === 'methods' && (
                <Card title="שיטות תשלום זמינות">
                    {paymentMethods.length === 0 ? (
                        <div className="text-center py-12">
                            <h3 className="text-lg font-medium text-slate-800">אין שיטות תשלום זמינות</h3>
                            <p className="text-slate-500 mt-2">פנה למנהל המערכת להוספת שיטות תשלום.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {paymentMethods.map((method) => (
                                <div key={method.id} className="border border-gray-200 rounded-lg p-4">
                                    <h3 className="font-semibold text-slate-800">{method.name}</h3>
                                    <p className="text-sm text-slate-600 mt-1">{method.description}</p>
                                    <span className={`inline-block mt-2 px-2 py-1 text-xs rounded-full ${
                                        method.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                    }`}>
                                        {method.isActive ? 'פעיל' : 'לא פעיל'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            )}

            {/* Invoices Tab */}
            {activeTab === 'invoices' && (
                <Card title="חשבוניות">
                    {invoices.length === 0 ? (
                        <div className="text-center py-12">
                            <h3 className="text-lg font-medium text-slate-800">אין חשבוניות</h3>
                            <p className="text-slate-500 mt-2">חשבוניות יופיעו כאן לאחר יצירתן מהצעות מחיר.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-right">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="p-3 font-semibold text-slate-600">מספר חשבונית</th>
                                        <th className="p-3 font-semibold text-slate-600">לקוח</th>
                                        <th className="p-3 font-semibold text-slate-600">תאריך הנפקה</th>
                                        <th className="p-3 font-semibold text-slate-600">תאריך פירעון</th>
                                        <th className="p-3 font-semibold text-slate-600">סכום</th>
                                        <th className="p-3 font-semibold text-slate-600">סטטוס</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoices.map((invoice) => (
                                        <tr key={invoice.id} className="border-b border-slate-100 hover:bg-slate-50">
                                            <td className="p-3 font-medium text-slate-900">{invoice.invoiceNumber}</td>
                                            <td className="p-3">{invoice.customerName}</td>
                                            <td className="p-3">{formatDate(invoice.issueDate)}</td>
                                            <td className="p-3">{invoice.dueDate ? formatDate(invoice.dueDate) : '-'}</td>
                                            <td className="p-3 font-medium">{formatCurrency(invoice.totalAmount)}</td>
                                            <td className="p-3">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                                                    {getStatusText(invoice.status)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && user.role === 'admin' && (
                <Card title="הגדרות מערכת" actions={
                    <Button onClick={handleSaveSettings} disabled={isSaving}>
                        {isSaving ? 'שומר...' : 'שמור הגדרות'}
                    </Button>
                }>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {Object.entries(settings).map(([key, setting]) => (
                            <div key={key}>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    {setting.description || key}
                                </label>
                                {setting.type === 'boolean' ? (
                                    <select
                                        value={setting.value ? 'true' : 'false'}
                                        onChange={(e) => handleSettingsChange(key, e.target.value === 'true')}
                                        className="w-full p-2 border border-gray-300 rounded-md"
                                    >
                                        <option value="true">כן</option>
                                        <option value="false">לא</option>
                                    </select>
                                ) : setting.type === 'number' ? (
                                    <Input
                                        type="number"
                                        value={setting.value}
                                        onChange={(e) => handleSettingsChange(key, parseFloat(e.target.value))}
                                    />
                                ) : (
                                    <Input
                                        type="text"
                                        value={setting.value}
                                        onChange={(e) => handleSettingsChange(key, e.target.value)}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
};

export default PaymentSettingsPage;
