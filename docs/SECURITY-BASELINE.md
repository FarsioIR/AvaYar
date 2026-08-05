# Security Baseline

## وضعیت

این سند گیت‌های امنیتی پیش از ورود کد محصول را تعریف می‌کند.

## الزامات

1. هیچ secret، API key، token یا credential در Source، Documentation، Test fixture یا Git history قرار نگیرد.
2. API keyهای کاربر نباید با ادعای «رمزنگاری‌شده» ذخیره شوند مگر سازوکار واقعی و Threat model آن مستند باشد.
3. ارسال متن صفحات به Providerهای AI باید با رضایت شفاف کاربر و Privacy disclosure انجام شود.
4. Permissionهای Manifest باید حداقلی باشند؛ استفاده از دسترسی سراسری فقط با دلیل و گیت Store policy مجاز است.
5. UI باید از Safe DOM استفاده کند و ورودی یا خروجی مدل با HTML خام تزریق نشود.
6. Providerهای TTS و AI باید رسمی، پایدار و از نظر شرایط استفاده تجاری بررسی شوند.
7. Quota یا Premium entitlement قابل اعتماد نباید فقط در Local Storage نگهداری شود.
8. Logging نباید محتوای صفحه، API key یا داده حساس کاربر را ثبت کند.
9. تمام مسیرهای شبکه باید HTTPS، timeout، cancellation و خطای کنترل‌شده داشته باشند.
10. هر Pull Request باید Product Test و Secret Scan را عبور دهد.

## موارد مسدود

- credential-like ثابت در کد
- دسترسی بدون توجیه به همه سایت‌ها
- ذخیره مستقیم داده حساس با ادعای رمزنگاری
- innerHTML برای داده پویا
- پرداخت یا ارتقای plan فقط در Client
- انتشار Store بدون Privacy و Permission review
