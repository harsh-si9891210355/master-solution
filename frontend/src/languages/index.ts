import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enAuth           from "../languages/auth/en.json";
import esAuth           from "../languages/auth/es.json"; 
import enUserManagement from "./UserManagment/en.json";
import esUserManagement from "./UserManagment/es.json";
import enLayout         from "./Layout/en.json";
import esLayout         from "./Layout/es.json";
import enCamera         from "./camera/en.json";
import esCamera         from "./camera/es.json";
import enUsecase        from "./usecase/en.json";
import esUsecase        from "./usecase/es.json";

export const SUPPORTED_LANGUAGES = [
    { code: "en", label: "English", flag: "🇺🇸" },
    { code: "es", label: "Español", flag: "🇪🇸" },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]["code"];


export type AppNamespace = "auth" | "user_management" | "layout" | "camera" | "usecase";

const resources = {
    en: {
        auth:            enAuth.auth,
        user_management: enUserManagement.user_management,
        layout:          enLayout.layout,
        camera:          enCamera.camera,
        usecase:         enUsecase.usecase,
    },
    es: {
        auth:            esAuth.auth, 
        user_management: esUserManagement.user_management,
        layout:          esLayout.layout,
        camera:          esCamera.camera,
        usecase:         esUsecase.usecase,
    },
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: "en",
        defaultNS: "auth",
        ns: ["auth", "user_management", "layout", "camera", "usecase"] satisfies AppNamespace[],
        detection: {
            order: ["localStorage"],
            caches: ["localStorage"],
            lookupLocalStorage: "visionx_language",
        },
        interpolation: { escapeValue: false },
        react: { useSuspense: false },
    });

export default i18n;
