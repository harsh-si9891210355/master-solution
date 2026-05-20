
export interface Usecase {
    id:             number;
    name_en:        string;
    name_es:        string;
    // name_fr:        string;
    name:           string;
    description_en: string;
    description_es: string;
    // description_fr: string;
    description:    string;
    status:         boolean;
}


export interface UsecaseFormValues {
    name_en:        string;
    name_es:        string;
    // name_fr:        string;
    description_en: string;
    description_es: string;
    // description_fr: string;
    status:         boolean;
}