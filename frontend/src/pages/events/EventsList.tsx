import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import type { Event } from './types/index';
import { eventService } from './api/eventService';
import { PrimeTable, type TableColumn } from '../../components/ui/Primetable';
import { FormButton } from '../../components/ui/FormButton';
import { useNsTranslation } from '../../hooks/Usetranslation';

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatDateTime = (value: string | null) => {
    if (!value) return '—';
    const d = new Date(value);
    return isNaN(d.getTime()) ? '—' : d.toLocaleString();
};

// ── Component ─────────────────────────────────────────────────────────────────
export const EventsList = () => {
    const { t }    = useNsTranslation('events');
    const navigate = useNavigate();

    // ── Fetch ─────────────────────────────────────────────────────────────────
    const { data, isLoading, isError } = useQuery({
        queryKey: ['events'],
        queryFn:  () => eventService.getEvents().then(res => res.data.events),
        placeholderData: (prev) => prev,
    });

    // ── Column templates ──────────────────────────────────────────────────────
    const cameraTemplate = (row: Event) => (
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                <i className="pi pi-video text-sm" />
            </div>
            <div className="font-medium text-gray-800">{row.camera_name}</div>
        </div>
    );

    const usecaseTemplate = (row: Event) => (
        <span className="text-sm text-gray-700">{row.usecase_name}</span>
    );

    const locationTemplate = (row: Event) => (
        <span className="text-sm text-gray-500">{row.location_name}</span>
    );

    const startTemplate   = (row: Event) => <span className="text-sm text-gray-500">{formatDateTime(row.event_start_time)}</span>;
    const endTemplate     = (row: Event) => <span className="text-sm text-gray-500">{formatDateTime(row.event_end_time)}</span>;
    const createdTemplate = (row: Event) => <span className="text-sm text-gray-500">{formatDateTime(row.created_date_time)}</span>;

    const actionsTemplate = (row: Event) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <span title={t('actions.view')}>
                <FormButton
                    label={t('actions.view')}
                    variant="ghost"
                    size="sm"
                    iconLeft="pi pi-eye"
                    ariaLabel={t('actions.view')}
                    onClick={() => navigate(`/events/${row.id}`)}
                />
            </span>
        </div>
    );

    // ── Columns ───────────────────────────────────────────────────────────────
    const columns: TableColumn<Event>[] = [
        { header: t('columns.id'),       field: 'id',            sortable: true, style: { width: '5rem' } },
        { header: t('columns.camera'),   body: cameraTemplate,   sortable: true, sortField: 'camera_name'   },
        { header: t('columns.location'), body: locationTemplate, sortable: true, sortField: 'location_name' },
        { header: t('columns.usecase'),  body: usecaseTemplate,  sortable: true, sortField: 'usecase_name'  },
        { header: t('columns.start'),    body: startTemplate,    sortable: true, sortField: 'event_start_time' },
        { header: t('columns.end'),      body: endTemplate,      sortable: true, sortField: 'event_end_time'   },
        { header: t('columns.created'),  body: createdTemplate,  sortable: true, sortField: 'created_date_time' },
        { header: t('columns.actions'),  body: actionsTemplate,  style: { width: '8rem' } },
    ];

    const tableHeader = (
        <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">{t('title')}</h2>
        </div>
    );

    if (isError) return (
        <div className="flex items-center justify-center h-64 text-red-500">
            <i className="pi pi-exclamation-triangle mr-2" /> {t('error_message')}
        </div>
    );

    return (
        <div className="p-4">
            <PrimeTable<Event>
                data={data}
                loading={isLoading}
                columns={columns}
                header={tableHeader}
                emptyMessage={t('empty_message')}
            />
        </div>
    );
};
