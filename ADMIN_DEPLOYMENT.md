# 🔐 QuoteMaster Pro - Admin System Deployment Guide

## 📋 סקירה כללית

מדריך זה מסביר כיצד לפרוס את מערכת האדמין המלאה של QuoteMaster Pro עם:
- Row Level Security (RLS) מקיף
- מערכת תשלומים עם Stripe
- דשבורד אדמין מתקדם
- ניהול הרשאות מבוסס תפקידים

## 🗄️ שלב 1: הגדרת מסד הנתונים

### 1.1 הרצת Schema הבסיסי
```sql
-- בצע ב-Supabase SQL Editor
-- קובץ: supabase-schema.sql
```

### 1.2 הוספת טבלאות אדמין
```sql
-- בצע ב-Supabase SQL Editor
-- קובץ: supabase-admin-schema.sql
```

### 1.3 הפעלת RLS Policies
```sql
-- בצע ב-Supabase SQL Editor
-- קובץ: supabase-rls-policies.sql
```

## 🔑 שלב 2: הגדרת Stripe

### 2.1 יצירת חשבון Stripe
1. לך ל-https://dashboard.stripe.com/register
2. צור חשבון חדש או התחבר לקיים
3. עבור ל-Developers → API keys
4. העתק את המפתחות:
   - **Publishable key** (מתחיל ב-pk_)
   - **Secret key** (מתחיל ב-sk_)

### 2.2 הגדרת Webhooks
1. ב-Stripe Dashboard: Developers → Webhooks
2. לחץ "Add endpoint"
3. URL: `https://your-project.supabase.co/functions/v1/stripe-webhook`
4. בחר Events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `invoice.payment_succeeded`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. העתק את ה-Webhook signing secret

### 2.3 עדכון הגדרות במערכת
```sql
-- בצע ב-Supabase SQL Editor
UPDATE system_settings 
SET value = '"pk_test_your_publishable_key"' 
WHERE key = 'stripe_publishable_key';

UPDATE system_settings 
SET value = '"sk_test_your_secret_key"' 
WHERE key = 'stripe_secret_key';

UPDATE system_settings 
SET value = '"whsec_your_webhook_secret"' 
WHERE key = 'stripe_webhook_secret';
```

## ⚡ שלב 3: פריסת Edge Functions

### 3.1 התקנת Supabase CLI
```bash
npm install -g supabase
```

### 3.2 התחברות לפרויקט
```bash
supabase login
supabase link --project-ref your-project-ref
```

### 3.3 פריסת Functions
```bash
# פריסת כל ה-Functions
supabase functions deploy

# או פריסה ספציפית
supabase functions deploy create-payment-intent
supabase functions deploy stripe-webhook
supabase functions deploy create-subscription
```

### 3.4 הגדרת Environment Variables
```bash
# ב-Supabase Dashboard: Settings → Edge Functions
STRIPE_SECRET_KEY=sk_test_your_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

## 👤 שלב 4: יצירת משתמש אדמין ראשון

### 4.1 רישום המשתמש הראשון
1. לך לאתר: https://your-app.vercel.app/register
2. הירשם עם האימייל שלך
3. המשתמש הראשון יהפוך אוטומטית לאדמין

### 4.2 אימות סטטוס אדמין
```sql
-- בדוק ב-Supabase SQL Editor
SELECT id, email, role, is_super_admin 
FROM users 
WHERE role = 'admin';
```

### 4.3 הגדרה ידנית של אדמין (אם נדרש)
```sql
-- אם המשתמש הראשון לא הפך לאדמין אוטומטית
UPDATE users 
SET role = 'admin', is_super_admin = true 
WHERE email = 'your-email@example.com';
```

## 🔐 שלב 5: בדיקת RLS

### 5.1 בדיקת הפרדת נתונים
```sql
-- התחבר כמשתמש רגיל ובדוק שאתה רואה רק את הנתונים שלך
SELECT * FROM quotes; -- אמור להחזיר רק הצעות של המשתמש הנוכחי

-- התחבר כאדמין ובדוק שאתה רואה הכל
SELECT * FROM quotes; -- אמור להחזיר את כל ההצעות
```

### 5.2 בדיקת הרשאות אדמין
1. התחבר כאדמין
2. לך ל-`/admin` - אמור לעבוד
3. התחבר כמשתמש רגיל
4. נסה לגשת ל-`/admin` - אמור להיחסם

## 💳 שלב 6: בדיקת מערכת התשלומים

### 6.1 בדיקת יצירת Payment Intent
```javascript
// בקונסול הדפדפן
const response = await fetch('/api/create-payment-intent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    invoice_id: 'test-invoice-id',
    amount: 100.00,
    currency: 'USD'
  })
});
const data = await response.json();
console.log(data);
```

### 6.2 בדיקת Webhooks
1. ב-Stripe Dashboard: Developers → Webhooks
2. לחץ על ה-endpoint שיצרת
3. לחץ "Send test webhook"
4. בדוק שהאירוע התקבל בלוגים

## 📊 שלב 7: בדיקת דשבורד אדמין

### 7.1 גישה לדשבורד
1. התחבר כאדמין
2. לך ל-`/admin`
3. בדוק שכל הטאבים עובדים:
   - Overview - סטטיסטיקות כלליות
   - Users - ניהול משתמשים
   - Quotes - ניהול הצעות מחיר
   - Payments - ניהול תשלומים
   - Settings - הגדרות מערכת

### 7.2 בדיקת פונקציונליות
- [ ] צפייה בסטטיסטיקות
- [ ] ניהול משתמשים (שינוי תפקידים)
- [ ] צפייה בכל ההצעות
- [ ] ניהול תשלומים
- [ ] עדכון הגדרות מערכת

## 🚀 שלב 8: פריסה לפרודקשן

### 8.1 עדכון משתני סביבה ב-Vercel
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_key
```

### 8.2 עדכון Stripe ל-Live Mode
1. ב-Stripe Dashboard עבור ל-Live mode
2. צור מפתחות חדשים ל-production
3. עדכן את ההגדרות במערכת
4. עדכן את ה-Webhook URL ל-production

### 8.3 בדיקה סופית
- [ ] כל הפונקציות עובדות
- [ ] RLS מגן על הנתונים
- [ ] תשלומים עובדים
- [ ] Webhooks מתקבלים
- [ ] דשבורד אדמין נגיש

## 🔧 פתרון בעיות נפוצות

### בעיה: אדמין לא יכול לראות נתונים של משתמשים אחרים
**פתרון:**
```sql
-- בדוק שה-RLS policies נוצרו
SELECT * FROM pg_policies WHERE tablename = 'quotes';

-- אם לא, הרץ שוב את supabase-rls-policies.sql
```

### בעיה: תשלומים לא עובדים
**פתרון:**
1. בדוק שמפתחות Stripe נכונים
2. בדוק שה-Edge Functions פרוסות
3. בדוק לוגים ב-Supabase Functions

### בעיה: Webhooks לא מתקבלים
**פתרון:**
1. בדוק שה-URL נכון
2. בדוק שה-webhook secret נכון
3. בדוק לוגים ב-Stripe Dashboard

## 📞 תמיכה

אם נתקלת בבעיות:
1. בדוק את הלוגים ב-Supabase Dashboard
2. בדוק את הלוגים ב-Vercel
3. בדוק את הלוגים ב-Stripe Dashboard
4. פנה לתמיכה עם פרטי השגיאה המלאים

---

**🎉 מזל טוב! המערכת מוכנה לשימוש בפרודקשן!**
