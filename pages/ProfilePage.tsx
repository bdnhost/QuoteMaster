
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../services/apiService';
import type { BusinessInfo } from '../types';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import LogoUploader from '../components/ui/LogoUploader';

const ProfilePage: React.FC = () => {
    const { user, updateUserBusinessInfo, isLoading: isAuthLoading } = useAuth();
    const [formData, setFormData] = useState<BusinessInfo | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState<{type: 'success' | 'error', message: string} | null>(null);

    useEffect(() => {
        if (user) {
            setFormData(user.businessInfo);
        }
    }, [user]);

    const handleChange = (field: keyof BusinessInfo, value: any) => {
        setFormData(prev => prev ? { ...prev, [field]: value } : null);
    };

    const handleLogoChange = async (file: File | null) => {
        if (file && user) {
            try {
                setIsSaving(true);
                setFeedback(null);
                const logoUrl = await api.uploadLogo(user.id, file);
                handleChange('logoUrl', `${api.API_BASE_URL}${logoUrl}`);
                setFeedback({ type: 'success', message: 'הלוגו הועלה בהצלחה!' });
            } catch (error) {
                console.error('Logo upload error:', error);
                setFeedback({ type: 'error', message: 'שגיאה בהעלאת הלוגו. נסה שוב.' });
            } finally {
                setIsSaving(false);
            }
        } else {
            handleChange('logoUrl', null);
        }
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData) return;
        
        setIsSaving(true);
        setFeedback(null);
        try {
            await updateUserBusinessInfo(formData);
            setFeedback({ type: 'success', message: 'הפרופיל עודכן בהצלחה!'});
        } catch (error) {
            setFeedback({ type: 'error', message: 'שגיאה בעדכון הפרופיל. נסה שוב.'});
        } finally {
            setIsSaving(false);
        }
    }
    
    if (isAuthLoading || !formData) {
        return <div className="text-center p-8">טוען פרופיל...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto">
            <Card title="הגדרות פרופיל עסקי">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <LogoUploader logoUrl={formData.logoUrl} onLogoChange={handleLogoChange} />

                    <Input 
                        label="שם העסק" 
                        value={formData.name} 
                        onChange={e => handleChange('name', e.target.value)} 
                        required
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input 
                            label="טלפון" 
                            type="tel"
                            value={formData.phone} 
                            onChange={e => handleChange('phone', e.target.value)} 
                            required
                        />
                        <Input 
                            label="כתובת" 
                            value={formData.address} 
                            onChange={e => handleChange('address', e.target.value)} 
                            required
                        />
                    </div>
                    
                    <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-200">
                        {feedback && (
                            <p className={`text-sm ${feedback.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                {feedback.message}
                            </p>
                        )}
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? 'שומר...' : 'שמור שינויים'}
                        </Button>
                    </div>

                </form>
            </Card>
        </div>
    )
}

export default ProfilePage;