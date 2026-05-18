export interface Usecase {
    id:          number;
    name:        string;
    description: string;
    status:      boolean;
}

export interface UsecaseFormValues {
    name:        string;
    description: string;
    status:      boolean;
}