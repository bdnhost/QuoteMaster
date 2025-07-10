# 🚀 הגדרת Vercel - QuoteMaster Pro

## 📋 פרטי הפרויקט

- **Project ID**: `prj_3kmmGAkrdy6bKGb6RjkGzchPIrRQ`
- **Dashboard**: https://vercel.com/dashboard
- **Project URL**: https://quote-master-eight.vercel.app/

## 📋 משתני סביבה ליבוא ב-Vercel

### שלב 1: כניסה ל-Vercel Dashboard

1. לך ל-https://vercel.com/dashboard
2. בחר את הפרויקט **QuoteMaster** (ID: prj_3kmmGAkrdy6bKGb6RjkGzchPIrRQ)
3. לחץ על **Settings**
4. לחץ על **Environment Variables**

### שלב 2: הוספת משתני סביבה

הוסף את המשתנים הבאים **אחד אחד**:

#### 🔑 Gemini AI API Key

```
Name: VITE_GEMINI_API_KEY
Value: AIzaXXXXXXXXXXXX
Environments: ✅ Production ✅ Preview ✅ Development
```

#### 🗄️ Supabase URL

```
Name: VITE_SUPABASE_URL
Value: https://ejlvzkwoawxdkwfupmxx.supabase.co
Environments: ✅ Production ✅ Preview ✅ Development
```

#### 🔑 Supabase Anon Key

```
Name: VITE_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqbHZ6a3dvYXd4ZGt3ZnVwbXh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxMjc4ODUsImV4cCI6MjA2NzcwMzg4NX0.CdzMhNYVfGrKoTFOgz7JOKnMlSOtynXL2yEB9lDP78M
Environments: ✅ Production ✅ Preview ✅ Development
```

#### 📱 App Environment

```
Name: VITE_APP_ENV
Value: production
Environments: ✅ Production ✅ Preview
```

#### 🏷️ App Name

```
Name: VITE_APP_NAME
Value: QuoteMaster Pro
Environments: ✅ Production ✅ Preview ✅ Development
```

#### 📊 Feature Flags

```
Name: VITE_ENABLE_AI_FEATURES
Value: true
Environments: ✅ Production ✅ Preview ✅ Development
```

```
Name: VITE_ENABLE_DEBUG
Value: false
Environments: ✅ Production ✅ Preview
```

```
Name: VITE_ENABLE_DEBUG
Value: true
Environments: ✅ Development
```

### שלב 3: פריסה מחדש

1. לחץ על **Deployments**
2. בחר את הפריסה האחרונה
3. לחץ על **⋯** (שלוש נקודות)
4. לחץ על **Redeploy**
5. בחר **Use existing Build Cache** = לא מסומן
6. לחץ על **Redeploy**

### שלב 4: פריסה ישירה מהטרמינל (אופציונלי)

אם יש לך Vercel CLI מותקן, תוכל לפרוס ישירות מהטרמינל:

```bash
# התקנת Vercel CLI (אם לא מותקן)
npm i -g vercel

# פריסה עם Project ID ספציפי
vercel --prod --scope bdnhost --yes --token YOUR_VERCEL_TOKEN --cwd . --project prj_3kmmGAkrdy6bKGb6RjkGzchPIrRQ
```

## 🔍 בדיקה

אחרי הפריסה, בדוק:

- ✅ האתר נטען ללא דף לבן
- ✅ אין אזהרות Tailwind CSS בקונסול
- ✅ תכונת AI עובדת (אם הגדרת את המפתח)
- ✅ כל הסטיילים נטענים כראוי

## 🚨 חשוב!

- **אל תשתף את מפתח ה-API בפומבי**
- **המפתח כבר מוגדר בקובץ .env.local למפתח מקומי**
- **קובץ .env.local לא נשמר ב-Git (מוגן ב-.gitignore)**

## 📞 תמיכה

אם יש בעיות:

1. בדוק שכל משתני הסביבה הוגדרו נכון
2. וודא שהפריסה בוצעה מחדש
3. בדוק את הלוגים ב-Vercel Dashboard

---

**QuoteMaster Pro** מוכן לפרודקשן! 🎉
