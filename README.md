# آوا — FarsiSmart Listen

**آوا** یک محصول در مرحله Discovery از خانواده محصولات **FarsiSmart.ir** است.

هدف محصول، کمک به فارسی‌زبانان برای استخراج محتوای اصلی صفحات وب، ترجمه یا خلاصه‌سازی آن و مصرف صوتی خروجی فارسی است.

## وضعیت فعلی

```text
Product status: Discovery / Pre-MVP
Code status: Bootstrap only
Repository visibility: Private
Public release: Blocked
Production: Blocked
Chrome Web Store: Blocked
```

این مخزن در حال حاضر فقط چارچوب پاک‌سازی‌شده M0، تصمیم‌های امنیتی و گیت‌های محصول را نگهداری می‌کند. کد نمونه موجود در Blueprint اولیه هنوز به‌عنوان کد قابل ساخت یا Production تأیید نشده است.

## برند و مسیر محصول

- برند مادر: `FarsiSmart.ir`
- نام کامل: `Ava — FarsiSmart Listen`
- نام فارسی: `آوا`
- مسیر آینده وب: `farsismart.ir/ava`

## مسیر اجرا

1. M0 — Sanitization و تصمیم‌های معماری
2. M1 — Buildable Manifest V3 Skeleton
3. M2 — Secure Core MVP
4. M3 — Private Beta
5. M4 — Public Release Gate

## گیت محلی

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\Test-Product.ps1
```

## قواعد فعلی

- هیچ API key یا credential در مخزن قرار نمی‌گیرد.
- Blueprint اصلی بدون پاک‌سازی وارد GitHub نمی‌شود.
- دسترسی‌های افزونه باید حداقلی و مستند باشند.
- پردازش محتوای صفحه توسط سرویس ثالث نیازمند رضایت و Privacy disclosure است.
- هیچ ادعای بازار، عملکرد یا درآمد تا زمان داشتن شواهد به‌عنوان واقعیت منتشر نمی‌شود.
