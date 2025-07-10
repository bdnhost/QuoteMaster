# QuoteMaster Pro 🚀

מערכת ניהול הצעות מחיר מקצועית ומתקדמת עם תכונות אדמין מלאות ומערכת תשלומים.

🔄 **עדכון אבטחה**: המאגר נוצר מחדש עם הגנה מלאה על קבצי ENV

🚀 **מעבר ל-Supabase**: המערכת עברה למסד נתונים Supabase מנוהל עם API אוטומטי

## ✨ תכונות עיקריות

### 💼 ניהול הצעות מחיר

- יצירת הצעות מחיר מקצועיות
- יצירת PDF אוטומטית
- ניהול סטטוסים (טיוטה, נשלח, אושר, נדחה)
- מעקב אחר לקוחות ופרויקטים

### 💰 מערכת תשלומים מתקדמת

- ניהול שיטות תשלום מרובות
- יצירת חשבוניות מהצעות מחיר
- דוחות כספיים ומעקב הכנסות
- ניהול תאריכי פירעון

### 👑 תכונות אדמין מתקדמות

- דשבורד ניהול מקיף
- ניהול הרשאות משתמשים
- הגדרות מערכת כלליות
- לוג פעילות מלא
- ניהול תבניות הצעות מחיר

### 🔐 אבטחה מתקדמת

- Rate limiting למניעת התקפות
- Input validation מקיף
- הצפנת סיסמאות מתקדמת
- הגנה מפני XSS ו-SQL injection
- CORS מוגדר נכון

## 🛠️ התקנה

### דרישות מערכת

- Node.js 16+
- MySQL 8.0+
- npm או yarn

### שלבי התקנה

1. **שכפול המאגר**

```bash
git clone https://github.com/bdnhost/QuoteMaster.git
cd QuoteMaster
```

2. **התקנת תלויות - Frontend**

```bash
npm install
```

3. **התקנת תלויות - Backend**

```bash
cd backend
npm install
```

4. **הגדרת משתני סביבה**

```bash
# העתק את קובץ הדוגמה
cp backend/.env.example backend/.env

# ערוך את הקובץ עם הנתונים שלך
nano backend/.env
```

5. **הגדרת מסד נתונים**

```bash
# צור מסד נתונים חדש ב-MySQL
mysql -u root -p
CREATE DATABASE quotemaster_db;
exit
```

6. **הפעלת השרתים**

```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
npm run dev
```

## 🔒 אבטחה והגדרות

### משתני סביבה חשובים

⚠️ **אזהרת אבטחה**: אל תחשוף את קובץ ה-.env!

```env
# JWT - השתמש במפתח חזק של לפחות 32 תווים
JWT_SECRET=your_super_secret_jwt_key_here_minimum_32_characters_long

# Database - השתמש בסיסמה חזקה
DB_PASSWORD=your_strong_database_password

# CORS - הגדר רק דומיינים מורשים
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

## 🚀 פריסה לפרודקשן

### Vercel (Frontend)

1. חבר את המאגר ל-Vercel
2. הגדר משתני סביבה ב-Vercel Dashboard
3. פרוס אוטומטית מ-main branch

### Backend (Railway/Heroku/VPS)

1. הגדר משתני סביבה בפלטפורמה
2. הגדר מסד נתונים MySQL
3. הרץ מיגרציות
4. פרוס את הקוד

## 👤 משתמש ברירת מחדל

המשתמש הראשון שנרשם למערכת מקבל אוטומטית הרשאות אדמין.

## 📱 תמיכה במובייל

המערכת מותאמת לחלוטין למובייל עם:

- עיצוב responsive
- ניווט מותאם למסכים קטנים
- טבלאות נגללות
- ממשק מגע ידידותי

## 🛡️ אבטחת מידע

- הצפנת סיסמאות עם bcrypt (12 rounds)
- JWT tokens מאובטחים
- Input validation עם Joi
- XSS protection
- SQL injection prevention
- Rate limiting
- CORS מוגדר נכון
- Security headers עם Helmet

## 🤝 תרומה

1. Fork את המאגר
2. צור branch חדש (`git checkout -b feature/amazing-feature`)
3. Commit השינויים (`git commit -m 'Add amazing feature'`)
4. Push ל-branch (`git push origin feature/amazing-feature`)
5. פתח Pull Request

## 📄 רישיון

MIT License - ראה קובץ LICENSE לפרטים.

---

**QuoteMaster Pro** - מערכת ניהול הצעות מחיר מקצועית ומאובטחת 🚀
