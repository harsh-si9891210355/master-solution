import { useTranslation } from 'react-i18next';
import type { SupportedLanguage, AppNamespace } from '../languages/index';

export const useNsTranslation = (ns: AppNamespace) => {
    const { t: rawT, i18n } = useTranslation(ns);

    const t = rawT as (key: string, options?: Record<string, any>) => string;
    const currentLang = i18n.language as SupportedLanguage;
    const changeLanguage = (lang: SupportedLanguage) => i18n.changeLanguage(lang);

    return { t, i18n, currentLang, changeLanguage };
};