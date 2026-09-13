# Technical Gaps — Historical M0/M1 Assessment

> **Historical document.** This file records early M0/M1 engineering gaps. It is not the current AvaYar product-status or capability matrix.
>
> Current product authority: **AvaYar 0.6.0 Stable**, source SHA `20d9da845c32e9873d332fb12192b38521d21232`. See [`README.md`](../README.md) and the [Stable release](https://github.com/FarsioIR/AvaYar/releases/tag/avayar-v0.6.0).

## نتیجه ارزیابی ورودی اولیه

Blueprint اولیه شامل ایده، معماری پیشنهادی و بخش‌هایی از نمونه‌کد بود، اما در آن مرحله یک پروژه قابل Build کامل نبود.

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

## شکاف‌های رفتاری ثبت‌شده در آن مرحله

- Shortcut خلاصه سریع باید handler واقعی داشته باشد.
- Context Menu باید جریان اصلی محصول را واقعاً اجرا کند.
- Update نباید تنظیمات و داده کاربر را reset کند.
- Quota باید پس از موفقیت عملیات مصرف شود یا rollback داشته باشد.
- محدودیت تعداد Summary باید enforce شود.
- قابلیت Podcast دوصدایی نباید پیش از پیاده‌سازی ادعا شود.
- تعداد Voiceها باید با Implementation منطبق باشد.
- Provider fallback باید واقعاً پیاده‌سازی و تست شود.

این موارد، snapshot شکاف‌های تاریخی M0/M1 هستند و نباید به‌عنوان وضعیت فعلی Stable 0.6.0 خوانده شوند.

## گیت تاریخی M1

M1 زمانی PASS تعریف شده بود که:

```text
npm ci: PASS
npm run lint: PASS
npm test: PASS
npm run build: PASS
Load Unpacked smoke: PASS
scripts/Test-Product.ps1: PASS
Secret scan: PASS
```

برای وضعیت فعلی، release evidence و repository checks جاری ملاک هستند.
