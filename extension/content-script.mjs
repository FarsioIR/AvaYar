const MAX_TEXT_LENGTH = 60000;


const REMOVE_SELECTORS = [
  "nav",
  "header",
  "footer",
  "aside",
  "script",
  "style",
  "noscript",
  "iframe",
  ".advert",
  ".ads",
  ".banner",
  ".popup",
  ".newsletter",
  ".related",
  ".recommended",
  ".social"
];


const REMOVE_TEXT = [
  "ثبت نام",
  "وارد حساب",
  "اشتراک",
  "مطالب مرتبط",
  "پیشنهاد ویژه",
  "خبرنامه",
  "تبلیغات",
  "خرید",
  "تخفیف",
  "وبینار",

  "subscribe",
  "login",
  "sign up",
  "advertisement",
  "related"
];



function normalize(text) {

  return String(text || "")
    .replace(/\s+/gu, " ")
    .trim();

}



function isNoise(text) {

  const value =
    normalize(text)
      .toLowerCase();


  return REMOVE_TEXT.some(
    item =>
      value.includes(
        item.toLowerCase()
      )
  );

}
function removeNoiseElements() {

  for (
    const selector of REMOVE_SELECTORS
  ) {

    document
      .querySelectorAll(selector)
      .forEach(
        element =>
          element.remove()
      );

  }

}





function extractTitle() {

  return normalize(

    document.querySelector("h1")
      ?.innerText

    ||

    document.querySelector(
      "meta[property='og:title']"
    )
      ?.content

    ||

    document.title

  );

}





function extractMainText() {


  removeNoiseElements();



  let text = "";



  const candidates = [

    "article",

    "main",

    "[role='main']",

    ".article-body",

    ".article-content",

    ".post-content",

    ".entry-content"

  ];



  for (
    const selector of candidates
  ) {


    const element =
      document.querySelector(
        selector
      );



    if (
      element &&
      element.innerText.length > text.length
    ) {

      text =
        element.innerText;

    }

  }



  if (
    text.length < 500
  ) {

    text =
      document.body.innerText;

  }



  return text;

}





function cleanArticleText(text) {

  const removeExact = [

    "نقد و بررسی",
    "بررسی موبایل",
    "دیجیاتو را در گوگل بیشتر ببینید",
    "در دیجیاتو ثبت‌نام کنید",
    "ویدئوی مرتبط",
    "فهرست مطالب",

    "Previous",

    "مطالب پیشنهادی",
    "پیشنهادهای دیجیاتو",
    "مشاهده کلیه مقالات منتشر شده",
    "دیدگاه‌ها و نظرات خود را بنویسید",

    "subscribe",
    "login",
    "advertisement",
    "related articles"

  ];



  const removeContains = [

    "عضو ویژه دیجیاتو",
    "وبینار",
    "تخفیف",
    "ارسال رایگان",
    "خرید کنید",

    "Geekbench",
    "3DMark",
    "AnTuTu",
    "PC Mark",

    "مطالب مرتبط",
    "خبرنامه"

  ];



  const lines =
    String(text)

      .split(/\n+/u)

      .map(
        line =>
          normalize(line)
      )

      .filter(Boolean);



  const result = [];



  for (
    const line of lines
  ) {


    if (
      removeExact.includes(line)
    ) {

      continue;

    }



    if (
      removeContains.some(
        item =>
          line.includes(item)
      )
    ) {

      continue;

    }



    // حذف بخش کامنت و فوتر

    if (
      line === "سامسونگ"
    ) {

      break;

    }



    result.push(line);

  }



  return result.join(
    "\n\n"
  );

}
function extractArticle() {


  const title =
    extractTitle();



  const rawText =
    extractMainText();



  let text =
    cleanArticleText(
      rawText
    );



  if (
    text.length >
    MAX_TEXT_LENGTH
  ) {

    text =
      text.slice(
        0,
        MAX_TEXT_LENGTH
      );

  }



  return {

    title,

    url:
      location.href,

    text

  };

}





chrome.runtime.onMessage.addListener(

  (
    message,
    sender,
    sendResponse
  ) => {


    if (
      message?.type !==
      "AVAYAR_EXTRACT"
    ) {

      return false;

    }



    try {


      const result =
        extractArticle();



      if (
        !result.text ||
        result.text.length < 100
      ) {

        throw new Error(
          "متن اصلی صفحه پیدا نشد."
        );

      }



      sendResponse({

        ok:
          true,

        result

      });



    } catch(error) {


      console.error(
        "AvaYar extraction error:",
        error
      );



      sendResponse({

        ok:
          false,

        error:
          error instanceof Error
            ? error.message
            : String(error)

      });


    }



    return true;

  }

);