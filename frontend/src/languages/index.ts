import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enAuth           from "../languages/auth/en.json";
import frAuth           from "../languages/auth/fr.json";
import enUserManagement from "./UserManagment/en.json";
import esUserManagement from "./UserManagment/es.json";
import enLayout         from "./Layout/en.json";
import esLayout         from "./Layout/es.json";

export const SUPPORTED_LANGUAGES = [
    { code: "en", label: "English", flag: "🇺🇸" },
    { code: "es", label: "Español", flag: "🇪🇸" },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]["code"];

// ✅ Add new namespaces here when you create them.
export type AppNamespace = "auth" | "user_management" | "layout";

const resources = {
    en: {
        auth:            enAuth.auth,
        user_management: enUserManagement.user_management,
        layout:          enLayout.layout,
    },
    es: {
        user_management: esUserManagement.user_management,
        layout:          esLayout.layout,
    },
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: "en",
        defaultNS: "auth",
        ns: ["auth", "user_management", "layout"] satisfies AppNamespace[],
        detection: {
            // localStorage only — prevents OS navigator locale from overriding
            // fallbackLng on first visit (e.g. Spanish OS → app boots in ES).
            order: ["localStorage"],
            caches: ["localStorage"],
            lookupLocalStorage: "visionx_language",
        },
        interpolation: { escapeValue: false },
        react: { useSuspense: false },
    });

export default i18n;