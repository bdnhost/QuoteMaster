
import React from 'react';

const Feature = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
    <div className="text-center">
        <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white mx-auto">
            {icon}
        </div>
        <h3 className="mt-5 text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-base text-slate-600">{description}</p>
    </div>
);

const PricingTier = ({ name, price, features, isFeatured = false }: {name: string, price: string, features: string[], isFeatured?: boolean}) => (
    <div className={`border rounded-lg p-8 flex flex-col ${isFeatured ? 'border-blue-500 ring-2 ring-blue-500' : 'border-slate-200'}`}>
        <h3 className="text-lg font-semibold text-slate-900">{name}</h3>
        <p className="mt-4 text-4xl font-bold text-slate-900">₪{price}<span className="text-lg font-medium text-slate-500">/חודש</span></p>
        <p className="mt-1 text-sm text-slate-500"> {isFeatured ? 'החבילה המומלצת' : <span>&nbsp;</span>} </p>
        <ul className="mt-6 space-y-4 text-slate-600 flex-grow">
            {features.map(feature => (
                <li key={feature} className="flex items-center">
                    <svg className="h-5 w-5 text-green-500 me-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    {feature}
                </li>
            ))}
        </ul>
        <a href="#/login" className={`mt-8 block w-full text-center px-6 py-3 rounded-md font-semibold ${isFeatured ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'}`}>
            התחל עכשיו
        </a>
    </div>
)

const LandingPage: React.FC = () => {
    return (
        <div className="bg-white text-slate-800">
            {/* Header */}
            <header className="absolute top-0 left-0 right-0 z-10">
                 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20">
                         <a href="#/" className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <h1 className="text-xl font-bold text-slate-800 ms-3">QuoteMaster Pro</h1>
                        </a>
                        <a href="#/login" className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors">
                            התחברות
                        </a>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <main className="pt-20">
                <section className="relative bg-slate-50 overflow-hidden">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
                        <div className="text-center">
                            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight">
                                צור הצעות מחיר מקצועיות
                                <span className="block text-blue-600">בפחות מ-3 דקות.</span>
                            </h2>
                            <p className="mt-6 max-w-2xl mx-auto text-lg text-slate-600">
                                תפסיק לבזבז זמן על Word ו-Excel. עם QuoteMaster Pro, תוכל ליצור, לשלוח ולעקוב אחר הצעות מחיר מדהימות שיסגרו לך יותר עסקאות.
                            </p>
                            <div className="mt-10">
                                <a href="#/login" className="px-8 py-4 text-lg font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-lg transition-transform transform hover:scale-105">
                                    התחל עכשיו (זה בחינם!)
                                </a>
                                <p className="mt-4 text-sm text-slate-500">ללא צורך בכרטיס אשראי.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section className="py-20 sm:py-24">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center">
                            <p className="font-semibold text-blue-600">כל מה שהעסק שלך צריך</p>
                            <h3 className="mt-2 text-3xl font-extrabold text-slate-900">פלטפורמה אחת לכל הצעות המחיר</h3>
                        </div>
                        <div className="mt-16 grid gap-12 md:grid-cols-3">
                            <Feature 
                                icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.572L16.5 21.75l-.398-1.178a3.375 3.375 0 00-2.455-2.456L12.75 18l1.178-.398a3.375 3.375 0 002.455-2.456L16.5 14.25l.398 1.178a3.375 3.375 0 002.456 2.456L20.25 18l-1.178.398a3.375 3.375 0 00-2.456 2.456z" /></svg>}
                                title="יצירה חכמה עם AI" 
                                description="תאר את העבודה במילים, והבינה המלאכותית שלנו תייצר עבורך את רשימת הפריטים והמחירים." 
                            />
                            <Feature 
                                icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" /></svg>}
                                title="תבניות מקצועיות" 
                                description="בחר מתוך מגוון תבניות מעוצבות שמותאמות לעברית וכוללות את הלוגו והפרטים שלך." 
                            />
                            <Feature 
                                icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" /></svg>}
                                title="מעקב וניהול קל" 
                                description="דע בכל רגע מה הסטטוס של כל הצעה: טיוטה, נשלחה, אושרה או נדחתה. הכל במקום אחד." 
                            />
                        </div>
                    </div>
                </section>
                
                 {/* Pricing Section */}
                <section className="bg-slate-50 py-20 sm:py-24">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                         <div className="text-center">
                            <h3 className="text-3xl font-extrabold text-slate-900">תמחור פשוט ושקוף</h3>
                            <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-600">
                                בחר את החבילה המתאימה לעסק שלך. תמיד תוכל לשדרג או לשנמך.
                            </p>
                        </div>
                        <div className="mt-16 grid gap-8 md:grid-cols-3">
                            <PricingTier 
                                name="Basic"
                                price="29"
                                features={["עד 25 הצעות בחודש", "3 תבניות בסיסיות", "תמיכה במייל"]}
                            />
                             <PricingTier 
                                name="Pro"
                                price="49"
                                features={["עד 100 הצעות בחודש", "כל התבניות + עיצוב מותאם", "ניהול לקוחות מתקדם", "תמיכה טלפונית"]}
                                isFeatured={true}
                            />
                             <PricingTier 
                                name="Business"
                                price="79"
                                features={["הצעות ללא הגבלה", "API לאינטגרציות", "דוחות מתקדמים", "תמיכת VIP"]}
                            />
                        </div>
                    </div>
                </section>
            </main>

             {/* Footer */}
            <footer className="bg-slate-800 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                     <div className="flex justify-between items-center">
                        <p className="text-slate-400">&copy; {new Date().getFullYear()} QuoteMaster Pro. כל הזכויות שמורות.</p>
                        <div className="flex gap-6">
                            <a href="#/" className="text-slate-400 hover:text-white">תנאי שימוש</a>
                             <a href="#/" className="text-slate-400 hover:text-white">פרטיות</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
