// ── API response shape ────────────────────────────────────────────────────────
export interface Usecase {
    id:             number;
    name_en:        string;
    name_es:        string;
    name_fr:        string;
    name:           string;
    description_en: string;
    description_es: string;
    description_fr: string;
    description:    string;
    status:         boolean;
}

// ── Form values ───────────────────────────────────────────────────────────────
export interface UsecaseFormValues {
    name_en:        string;
    name_es:        string;
    description_en: string;
    description_es: string;
    status:         boolean;
}

// ── Linked camera (from GET /usecase/:id/linked-cameras) ─────────────────────
export interface LinkedCamera {
    id:     number;
    name:   string | null;
    status: boolean;
}