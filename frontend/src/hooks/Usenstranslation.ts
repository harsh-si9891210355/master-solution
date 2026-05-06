import { useTranslation } from 'react-i18next';
import type { SupportedLanguage, AppNamespace } from '../languages/index';

/**
 * Wrapper around useTranslation that casts `t` to a simple
 * (key: string, opts?: any) => string signature.
 *
 * WHY: When multiple namespaces are registered in i18next, its strict types
 * require fully-qualified "namespace:key" strings everywhere — even when the
 * hook is already scoped to a namespace via useTranslation('ns'). This causes
 * '"status.active" is not assignable' errors throughout every component.
 * The cast here keeps full runtime correctness while silencing the TS conflict.
 */
export const useNsTranslation = (ns: AppNamespace) => {
    const { t: rawT, i18n } = useTranslation(ns);
 
    const t = rawT as (key: string, options?: Record<string, any>) => string;
    const currentLang = i18n.language as SupportedLanguage;
    const changeLanguage = (lang: SupportedLanguage) => i18n.changeLanguage(lang);
 
    return { t, i18n, currentLang, changeLanguage };
};