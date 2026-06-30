// ─────────────────────────────────────────────────────────────────────────────
// Visual mapping: derive an icon + colour for a detection from its use-case name.
// PrimeIcons keep us consistent with the rest of the app (no extra icon font).
// ─────────────────────────────────────────────────────────────────────────────
export interface EventVisual {
    icon: string;  // PrimeIcons class without the leading "pi ", e.g. 'pi-car'
    color: string; // Tailwind bg-* class for markers
    text: string;  // Tailwind text-* class for inline icons
}

export const visualForUsecase = (usecase: string | null | undefined): EventVisual => {
    const u = (usecase ?? '').toLowerCase();

    if (/(car|vehicle|truck|parking|traffic)/.test(u)) {
        return { icon: 'pi-car', color: 'bg-blue-500', text: 'text-blue-500' };
    }
    if (/(walk|person|pedestrian|people|intrusion|loiter)/.test(u)) {
        return { icon: 'pi-user', color: 'bg-purple-500', text: 'text-purple-500' };
    }
    if (/(fire|smoke|weapon|gun|violence|fight)/.test(u)) {
        return { icon: 'pi-exclamation-triangle', color: 'bg-red-500', text: 'text-red-500' };
    }
    return { icon: 'pi-bell', color: 'bg-amber-500', text: 'text-amber-500' };
};

// Minutes-since-midnight (local time) for an ISO timestamp.
export const minuteOfDay = (iso: string): number => {
    const d = new Date(iso);
    return d.getHours() * 60 + d.getMinutes();
};

// True when both ISO timestamps fall on the same local calendar day.
export const isSameLocalDay = (iso: string, day: Date): boolean => {
    const d = new Date(iso);
    return (
        d.getFullYear() === day.getFullYear() &&
        d.getMonth() === day.getMonth() &&
        d.getDate() === day.getDate()
    );
};

// Wall-clock ms for a given minute-of-day on a specific calendar day.
export const dayMinuteToMs = (day: Date, minute: number): number => {
    const d = new Date(day);
    d.setHours(0, 0, 0, 0);
    return d.getTime() + minute * 60_000;
};
