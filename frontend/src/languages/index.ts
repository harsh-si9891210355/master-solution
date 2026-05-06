import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enAuth from "../languages/auth/en.json";
import frAuth from "../languages/auth/fr.json";

import enUserManagement from "./UserManagment/en.json";
import frUserManagement from "./UserManagment/fr.json";
import esUserManagement from "./UserManagment/es.json";

export const SUPPORTED_LANGUAGES = [
    { code: "en", label: "English", flag: "🇺🇸" },
    { code: "es", label: "Español", flag: "🇪🇸" },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]["code"];

// Extend this union whenever you add a new namespace JSON file.
export type AppNamespace = "auth" | "user_management";

const resources = {
    en: {
        auth: enAuth.auth,
        user_management: enUserManagement.user_management,
    },
    fr: {
        auth: frAuth.auth,
        user_management: frUserManagement.user_management,
    },
    es: {
        user_management: esUserManagement.user_management,
    },
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: "en",
        defaultNS: "auth",
        ns: ["auth", "user_management"] satisfies AppNamespace[],
        detection: {
            order: ["localStorage", "navigator", "htmlTag"],
            caches: ["localStorage"],
            lookupLocalStorage: "visionx_language",
        },
        interpolation: { escapeValue: false },
        react: { useSuspense: false },
    });

export default i18n;