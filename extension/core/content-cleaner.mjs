const EXACT_NOISE_LINES = new Set([
  "خانه",
  "تبلیغ",
  "تبلیغات",
  "آگهی",
  "آگهی تبلیغاتی",
  "فهرست مطالب",
  "ویدئوی مرتبط",
  "مطالب مرتبط",
  "مطالب پیشنهادی",
  "پیشنهادهای دیجیاتو",
  "مشاهده کلیه مقالات منتشر شده",
  "دیدگاه‌ها و نظرات خود را بنویسید",
  "در دیجیاتو ثبت‌نام کنید",
  "دیجیاتو را در گوگل بیشتر ببینید",
  "عضویت در دیجیاتو",
  "previous",
  "next",
  "قبلی",
  "بعدی",
  "share",
  "subscribe",
  "sign up",
  "login",
  "comments",
  "advertisement",
  "advertisements",
  "sponsored",
  "related articles",
  "recommended"
]);


const TERMINAL_BOUNDARY_PATTERNS = [
  /^مطالب پیشنهادی$/iu,
  /^پیشنهادهای .+$/iu,
  /^دیدگاه‌ها(?: و نظرات.*)?$/iu,
  /^نظرات کاربران$/iu,
  /^برای گفتگو با کاربران/iu,
  /^مشاهده کلیه مقالات منتشر شده$/iu,
  /^related articles$/iu,
  /^recommended(?: for you)?$/iu,
  /^comments$/iu,
  /^leave a comment$/iu
];


const SHORT_UI_PATTERNS = [
  /^منتشر شده در\s+/iu,
  /^به‌روزرسانی شده در\s+/iu,
  /^published\s+(on|at)\b/iu,
  /^updated\s+(on|at)\b/iu,

  /ثبت[\s‌-]*نام/iu,
  /وارد حساب کاربری/iu,
  /عضو ویژه/iu,
  /اشتراک ویژه/iu,

  /در گوگل بیشتر ببینید/iu,
  /خبرنامه/iu,

  /^تک[\s‌-]*تاک/iu,
  /\|\s*تک[\s‌-]*تاک/iu,

  /وبینار رایگان/iu,
  /تحلیل طلا.*بورس/iu,
  /درآمد.*فروش بیمه/iu,
  /ارسال رایگان/iu,
  /کد تخفیف/iu
];


const COMMERCIAL_DISCLOSURE_PATTERNS = [
  /برای تست و بررسی در اختیار .* قرار داده/iu,
  /برای بررسی در اختیار .* قرار داده/iu,
  /می‌توانید .* را از .* تهیه کنید/iu,
  /جهت خرید .* مراجعه کنید/iu,
  /برای خرید .* مراجعه کنید/iu,
  /sponsored by/iu,
  /provided .* for review/iu
];


const MEDIA_PLACEHOLDER_PATTERNS = [
  /^نمونه تصاویر(?: .*)?$/iu,
  /^گالری تصاویر(?: .*)?$/iu,
  /^تصاویر بیشتر$/iu,
  /^مشاهده تصاویر$/iu,
  /^image gallery$/iu,
  /^photo gallery$/iu,
  /^previous$/iu,
  /^next$/iu
];


const BENCHMARK_PATTERNS = [
  /geekbench/iu,
  /3dmark/iu,
  /antutu/iu,
  /pc\s*mark/iu,
  /pcmark/iu
];


function normalizeLine(value) {

  return String(value || "")
    .replace(/\u00a0/gu, " ")
    .replace(/[ \t]+/gu, " ")
    .trim();

}


function normalizeKey(value) {

  return normalizeLine(value)
    .toLocaleLowerCase("fa");

}


function countDigits(value) {

  return (
    String(value || "")
      .match(/[0-9۰-۹]/gu) || []
  ).length;

}


function wordCount(value) {

  return normalizeLine(value)
    .split(/\s+/u)
    .filter(Boolean)
    .length;

}


function isExactNoise(line) {

  return EXACT_NOISE_LINES.has(
    normalizeKey(line)
  );

}


function isTerminalBoundary(line) {

  if (line.length > 140) {
    return false;
  }


  return TERMINAL_BOUNDARY_PATTERNS.some(
    pattern =>
      pattern.test(line)
  );

}


function isShortUiNoise(line) {

  if (line.length > 220) {
    return false;
  }


  return SHORT_UI_PATTERNS.some(
    pattern =>
      pattern.test(line)
  );

}


function isCommercialDisclosure(line) {

  return COMMERCIAL_DISCLOSURE_PATTERNS.some(
    pattern =>
      pattern.test(line)
  );

}


function isMediaPlaceholder(line) {

  if (line.length > 120) {
    return false;
  }


  return MEDIA_PLACEHOLDER_PATTERNS.some(
    pattern =>
      pattern.test(line)
  );

}


function isBenchmarkHeader(line) {

  return BENCHMARK_PATTERNS.some(
    pattern =>
      pattern.test(line)
  );

}


function isNumericBenchmarkRow(line) {

  if (line.length > 220) {
    return false;
  }


  const digits =
    countDigits(line);


  const words =
    wordCount(line);


  if (
    digits < 8 ||
    words > 28
  ) {

    return false;

  }


  const compactLength =
    line.replace(/\s+/gu, "")
      .length;


  if (!compactLength) {
    return false;
  }


  const digitDensity =
    digits / compactLength;


  return digitDensity >= 0.22;

}


function isVeryLowValueLine(line) {

  if (line.length < 2) {
    return true;
  }


  if (
    /^[•●▪◦\-–—|]+$/u
      .test(line)
  ) {

    return true;

  }


  return false;

}


function looksLikeSubstantialProse(line) {

  if (
    line.length < 90
  ) {

    return false;

  }


  if (
    isCommercialDisclosure(line) ||
    isShortUiNoise(line) ||
    isBenchmarkHeader(line) ||
    isNumericBenchmarkRow(line)
  ) {

    return false;

  }


  const words =
    wordCount(line);


  return words >= 12;

}


function findLikelyArticleStart(lines) {

  const index =
    lines.findIndex(
      line =>
        looksLikeSubstantialProse(line)
    );


  if (index < 0) {
    return 0;
  }


  return index;

}


function shouldDropLine(line) {

  return (
    isExactNoise(line) ||
    isShortUiNoise(line) ||
    isCommercialDisclosure(line) ||
    isMediaPlaceholder(line) ||
    isBenchmarkHeader(line) ||
    isNumericBenchmarkRow(line) ||
    isVeryLowValueLine(line)
  );

}


export function cleanArticleText(input) {

  const lines =
    String(input || "")

      .split(/\n+/u)

      .map(
        line =>
          normalizeLine(line)
      )

      .filter(Boolean);


  if (!lines.length) {
    return "";
  }


  const startIndex =
    findLikelyArticleStart(
      lines
    );


  const output = [];

  const seen =
    new Set();


  for (
    let index = startIndex;
    index < lines.length;
    index += 1
  ) {

    const line =
      lines[index];


    if (
      output.length >= 3 &&
      isTerminalBoundary(line)
    ) {

      break;

    }


    if (
      shouldDropLine(line)
    ) {

      continue;

    }


    const key =
      normalizeKey(line);


    if (
      seen.has(key)
    ) {

      continue;

    }


    seen.add(key);


    output.push(
      line
    );

  }


  return output
    .join("\n\n")
    .trim();

}