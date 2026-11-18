# منصة الرائد - تعليم الرياضيات والإحصاء

## النشر على Google Cloud Run

### المتطلبات
1. Google Cloud SDK مثبت
2. Docker مثبت
3. حساب Google Cloud مع مشروع فعال

### خطوات النشر

```bash
# 1. تسجيل الدخول إلى Google Cloud
gcloud auth login

# 2. تعيين المشروع
gcloud projects set-your-project-id

# 3. تفعيل الخدمات المطلوبة
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable artifactregistry.googleapis.com

# 4. بناء الصورة ونشرها على Cloud Run
gcloud run deploy foo-platform \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1
```

### أو باستخدام Cloud Build:
```bash
gcloud builds submit --config cloudbuild.yaml
```

### إعدادات بيئة الإنتاج
يجب تحديث ملف `.env` بـ:
- `DATABASE_URL` - رابط قاعدة بيانات Cloud SQL
- `ADMIN_SECRET_KEY` - مفتاح سري
- `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` - إذا كنت تستخدم المساعد الذكي
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - إذا كنت تستخدم تسجيل الدخول عبر Google

### هيكل المشروع
- `app/` - صفحات Next.js (App Router)
- `components/` - مكونات React
- `lib/` - مكتبات مساعدة
- `prisma/` - ملفات Prisma (schema, migrations)
- `api/` - نقاط النهاية API (Next.js route handlers)
