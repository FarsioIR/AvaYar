# Technical Gaps

## نتیجه ارزیابی ورودی

Blueprint اولیه شامل ایده، معماری پیشنهادی و بخش‌هایی از نمونه‌کد است، اما یک پروژه قابل Build کامل نیست.

## فایل‌ها و زیرساخت‌های مورد نیاز M1

- Manifest معتبر Manifest V3
- Build configuration واقعی برای افزونه
- Service Worker module یا bundle سازگار
- Content Script bundle بدون import مستقیم نامعتبر
- Side Panel bundle سازگار
- Popup کامل
- Icons و Assets
- Locale فارسی
- ESLint configuration
- Vitest configuration و Test fixtures
- GitHub Actions
- Package script
- Product test PowerShell
- Privacy و Security documentation

## شکاف‌های رفتاری

- Shortcut خلاصه سریع باید handler واقعی داشته باشد.
- Context Menu باید جریان اصلی محصول را واقعاً اجرا کند.
- Update نباید تنظیمات و داده کاربر را reset کند.
- Quota باید پس از موفقیت عملیات مصرف شود یا rollback داشته باشد.
- محدودیت تعداد Summary باید enforce شود.
- قابلیت Podcast دوصدایی نباید پیش از پیاده‌سازی ادعا شود.
- تعداد Voiceها باید با Implementation منطبق باشد.
- Provider fallback باید واقعاً پیاده‌سازی و تست شود.

## گیت M1

M1 زمانی PASS است که:

```text
npm ci: PASS
npm run lint: PASS
npm test: PASS
npm run build: PASS
Load Unpacked smoke: PASS
scripts/Test-Product.ps1: PASS
Secret scan: PASS
```
