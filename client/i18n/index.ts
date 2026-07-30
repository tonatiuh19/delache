import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import {
  DEFAULT_LOCALE,
  getLocaleStorageKey,
  LOCALE_HTML_LANG,
  normalizeLocale,
  setStoredLocale,
  SUPPORTED_LOCALES,
} from "@shared/i18n";
import es from "@/locales/es/translation.json";
import en from "@/locales/en/translation.json";

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      es: { translation: es },
      en: { translation: en },
    },
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: SUPPORTED_LOCALES,
    interpolation: { escapeValue: false },
    // Spanish by default — ignore browser language until the user changes it.
    detection: {
      order: ["localStorage"],
      lookupLocalStorage: getLocaleStorageKey(),
      caches: ["localStorage"],
      convertDetectedLanguage: (lng) => normalizeLocale(lng),
    },
  });

i18n.on("languageChanged", (lng) => {
  const locale = normalizeLocale(lng);
  setStoredLocale(locale);
  document.documentElement.lang = LOCALE_HTML_LANG[locale];
});

document.documentElement.lang =
  LOCALE_HTML_LANG[normalizeLocale(i18n.language)];

export default i18n;
