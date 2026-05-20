import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import type { SupportedLanguage, AppNamespace } from '../languages/index';

export const useNsTranslation = (ns: AppNamespace) => {
    const { t: rawT, i18n } = useTranslation(ns);
    const queryClient = useQueryClient();

    const t = rawT as (key: string, options?: Record<string, any>) => string;

    const resolvedLang = i18n.language?.slice(0, 2) as SupportedLanguage;
    const currentLang: SupportedLanguage =
        ['en', 'es'].includes(resolvedLang) ? resolvedLang : 'en';

    const changeLanguage = async (lang: SupportedLanguage) => {
        await i18n.changeLanguage(lang);
        await queryClient.invalidateQueries();
    };

    return { t, i18n, currentLang, changeLanguage };
};