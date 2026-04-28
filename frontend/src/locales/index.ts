import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enAuth from "./Auth/en.json";
// import esAuth from "./Auth/es.json";
import frAuth from "./Auth/fr.json";

// import enCommon from "./Layout/en.json";
// import esCommon from "./Layout/es.json";
// import frCommon from "./Layout/fr.json";

export const SUPPORTED_LANGUAGES = [
    { code: "en", label: "English", flag: "🇺🇸" },
    { code: "es", label: "Español", flag: "🇪🇸" },
    { code: "fr", label: "Français", flag: "🇫🇷" },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]["code"];

const resources = {
    en: { auth: enAuth.auth },
    // es: { auth: esAuth.auth, common: esCommon.common },
    fr: { auth: frAuth.auth },
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: "en",
        defaultNS: "auth",
        ns: ["auth", "common"],
        detection: {
            order: ["localStorage", "navigator", "htmlTag"],
            caches: ["localStorage"],
            lookupLocalStorage: "visionx_language",
        },
        interpolation: { escapeValue: false },
        react: { useSuspense: false },
    });

export default i18n;