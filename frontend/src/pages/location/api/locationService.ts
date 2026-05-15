import api from '@/lib/api';

export interface Location {
    id: number;
    name: string;
}

export const locationService = {
    getLocations: () => api.get<{ locations: Location[] }>('/location'),
};
