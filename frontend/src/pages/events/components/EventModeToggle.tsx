import { useNavigate } from 'react-router';

interface EventModeToggleProps {
    mode: 'table' | 'timeline';
}

/**
 * Switches the Events area between the table listing (/events) and the
 * NVR-style "Event Information" timeline (/events/timeline).
 */
export const EventModeToggle = ({ mode }: EventModeToggleProps) => {
    const navigate = useNavigate();

    const base =
        'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition';
    const active = 'bg-white text-blue-600 shadow-sm';
    const idle = 'text-gray-500 hover:text-gray-700';

    return (
        <div className="inline-flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
            <button
                className={`${base} ${mode === 'table' ? active : idle}`}
                onClick={() => navigate('/events')}
            >
                <i className="pi pi-table text-[11px]" />
                Table
            </button>
            <button
                className={`${base} ${mode === 'timeline' ? active : idle}`}
                onClick={() => navigate('/events/timeline')}
            >
                <i className="pi pi-clock text-[11px]" />
                Timeline
            </button>
        </div>
    );
};
