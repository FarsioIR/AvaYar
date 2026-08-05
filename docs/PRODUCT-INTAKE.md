# M0 Product Intake

## تصمیم

```text
PORTFOLIO-INTAKE: APPROVED
PARENT-BRAND: FarsiSmart.ir
PRODUCT: آوا | Ava — FarsiSmart Listen
PRODUCT-STATUS: DISCOVERY / PRE-MVP
CODE-STATUS: NOT BUILDABLE AS PROVIDED
REPOSITORY: PRIVATE
PUBLICATION: BLOCKED
PRODUCTION: BLOCKED
```

## مسئله

کاربران فارسی‌زبان برای مصرف حجم زیاد محتوای وب با محدودیت زمان، زبان و کیفیت ابزارهای صوتی روبه‌رو هستند.

## فرضیه ارزش

یک افزونه مرورگر می‌تواند محتوای اصلی صفحه را استخراج کند، در صورت نیاز ترجمه یا خلاصه کند و خروجی فارسی را به صوت تبدیل کند.

## MVP پیشنهادی

- استخراج محتوای اصلی صفحه
- ترجمه مفهومی به فارسی
- خلاصه‌سازی در چند قالب محدود و آزمایش‌پذیر
- پخش صوت فارسی
- رابط Side Panel
- کنترل Play، Pause، Stop و Speed
- تنظیم شفاف Provider
- رضایت کاربر پیش از ارسال محتوای صفحه به سرویس ثالث

## خارج از محدوده M0

- پرداخت
- entitlement تجاری
- Chrome Web Store
- انتشار عمومی
- DNS
- Production
- API عمومی
- اپ موبایل
- Voice cloning

## معیار خروج از M0

- معماری Manifest V3 و bundling تصویب شده باشد.
- Provider رسمی TTS و شرایط استفاده آن مشخص باشد.
- Threat model ثبت شده باشد.
- Permissionها حداقل‌سازی شده باشند.
- Privacy flow و پردازشگرهای ثالث مشخص باشند.
- Inventory فایل‌های لازم برای M1 کامل باشد.
