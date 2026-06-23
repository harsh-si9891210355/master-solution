import api from '@/lib/api';
import type { Event, EventsResponse } from '../types/index';

export const eventService = {
    getEvents:    ()           => api.get<EventsResponse>('/event'),
    getEventById: (id: number) => api.get<Event>(`/event/${id}`),
    deleteEvent:  (id: number) => api.delete<{ message: string }>(`/event/${id}`),
};
