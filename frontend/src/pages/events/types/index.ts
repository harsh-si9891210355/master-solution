
export interface Event {
    id:                number;
    camera_id:         number;
    camera_name:       string;
    location_id:       number;
    location_name:     string;
    usecase_id:        number;
    usecase_name:      string;
    event_description: string | null;
    evidence_url:      string | null;
    created_date_time: string;
    event_start_time:  string;
    event_end_time:    string;
}

export interface EventsResponse {
    events: Event[];
}
