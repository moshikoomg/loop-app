# LOOP - לוח פעילויות יומי

אפליקציית React לניהול לוח זמנים יומי עם קטגוריות, אירועים ועיצוב מותאם אישית.

## טכנולוגיות

- **React** + **Vite**
- **Tailwind CSS**
- **lucide-react** (אייקונים)
- **GitHub Actions** + **GitHub Pages** (דיפלוי אוטומטי)

## הרצה מקומית

### 1. שכפל את ה-Repository
```bash
git clone https://github.com/moshikoomg/loop-app.git
cd loop-app
```

### 2. התקן את כל הספריות
```bash
npm install
npm install lucide-react
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 3. הגדר Tailwind CSS
בקובץ `tailwind.config.js`:
```js
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

בקובץ `src/index.css` הוסף בראש הקובץ:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 4. העתק את קוד LOOP
הדבק את קוד LOOP המלא לתוך `src/App.jsx`.

### 5. הרץ
```bash
npm run dev
```
פתח את הדפדפן בכתובת: http://localhost:5173

## דיפלוי ל-GitHub Pages

הפרויקט מוגדר לדיפלוי אוטומטי עם GitHub Actions.

כל push לענף `main` יפעיל:
1. Build אוטומטי עם Vite
2. העלאה ל-GitHub Pages

האתר יהיה זמין בכתובת:
```
https://moshikoomg.github.io/loop-app/
```

## מבנה הפרויקט

```
loop-app/
  .github/
    workflows/
      deploy.yml       # GitHub Actions - דיפלוי אוטומטי
  src/
    App.jsx            # קוד LOOP הראשי
    index.css          # Tailwind + סגנונות גלובליים
    main.jsx           # נקודת כניסה ל-React
  index.html
  vite.config.js       # הגדרות Vite + base path
  tailwind.config.js
  package.json
```

## פיצ'רים

- לוח זמנים יומי/שבועי
- ניהול קטגוריות עם צבעים ואייקונים
- יצירה ועריכה של אירועים
- תמיכה ב-Dark Mode
- ממשק מגע (Swipe gestures)
- עיצוב רספונסיבי למובייל
