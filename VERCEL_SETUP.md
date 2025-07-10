# 🚀 הגדרת Vercel - QuoteMaster Pro

## 📋 משתני סביבה ליבוא ב-Vercel

### שלב 1: כניסה ל-Vercel Dashboard
1. לך ל-https://vercel.com/dashboard
2. בחר את הפרויקט **QuoteMaster**
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

#### 🌐 Backend API URL (Production)
```
Name: VITE_API_URL
Value: https://your-backend-url.com
Environments: ✅ Production ✅ Preview
```

#### 🛠️ Backend API URL (Development)
```
Name: VITE_API_URL
Value: http://localhost:3001
Environments: ✅ Development
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
