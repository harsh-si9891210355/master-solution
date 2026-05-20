import api from '@/lib/api';

export interface TranslationRequest {
    text: string;
    source_language: string;
    target_languages: string[];
}

export interface TranslationResponse {
    translations: Record<string, string>;
}

export const translationService = {
    translateText: (data: TranslationRequest) =>
        api.post<TranslationResponse>('/translate', data),
};
