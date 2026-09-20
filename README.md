# أنوثتي — أساس المشروع

المكدس المعتمد: **NestJS + MySQL (Laragon)**. Angular والفرونت بعد ما الأساس يشتغل.

## المجلدات

- `backend/` — API NestJS

## التشغيل

1. شغّلي Laragon (MySQL لازم يكون Running)
2. من فولدر `backend`:

```bash
npm install
npm run db:setup
npm run start:dev
```

3. افتحي:
- API: http://localhost:3000/api/health
- Swagger: http://localhost:3000/docs
- phpMyAdmin: http://localhost/phpmyadmin → قاعدة `OnothitiDB`

رمز OTP في التطوير ثابت: `123456`

## الأساس الموجود الآن

- جداول MySQL للنسخة الأولى (حسابات، OTP، مدن، خدمات، باقات، تشغيل)
- تسجيل ودخول وOTP
- قواعد ظهور الملف: الحساب النشط + `PUBLIC` فقط
- بيانات أولية: أدوار، مدن الرياض/جدة/الدمام/الخبر، خدمات MS-01 إلى MS-14، الباقات
