import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';
import type { Event } from './types/index';
import { eventService } from './api/eventService';
import { FormButton } from '../../components/ui/FormButton';
import { useNsTranslation } from '../../hooks/Usetranslation';

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatDateTime = (value: string | null) => {
    if (!value) return '—';
    const d = new Date(value);
    return isNaN(d.getTime()) ? '—' : d.toLocaleString();
};

const formatDuration = (start: string, end: string) => {
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    if (isNaN(s) || isNaN(e) || e < s) return '—';
    const total = Math.round((e - s) / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const sec = total % 60;
    return [h ? `${h}h` : '', m ? `${m}m` : '', `${sec}s`].filter(Boolean).join(' ');
};

// ── Field row ─────────────────────────────────────────────────────────────────
const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex flex-col gap-1 py-3 border-b border-gray-100 last:border-0">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</span>
        <span className="text-sm text-gray-800">{value || '—'}</span>
    </div>
);

// ── Component ─────────────────────────────────────────────────────────────────
export const EventDetail = () => {
    const { t }    = useNsTranslation('events');
    const navigate = useNavigate();
    const { id }   = useParams<{ id: string }>();
    const eventId  = Number(id);

    const { data: event, isLoading, isError } = useQuery({
        queryKey: ['event', eventId],
        queryFn:  () => eventService.getEventById(eventId).then(res => res.data),
        enabled:  !Number.isNaN(eventId),
    });

    // ── Header (back + title) ───────────────────────────────────────────────────
    const header = (
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
                <FormButton
                    label={t('detail.back')}
                    variant="ghost"
                    size="sm"
                    iconLeft="pi pi-arrow-left"
                    onClick={() => navigate('/events')}
                />
                <div>
                    <h2 className="text-xl font-bold text-gray-800">{t('detail.title')}</h2>
                    <p className="text-sm text-gray-500">{t('detail.subtitle')}</p>
                </div>
            </div>
        </div>
    );

    if (isLoading) return (
        <div className="p-4">
            {header}
            <div className="flex items-center justify-center h-64 text-gray-500">
                <i className="pi pi-spin pi-spinner mr-2" /> {t('detail.loading')}
            </div>
        </div>
    );

    if (isError || !event) return (
        <div className="p-4">
            {header}
            <div className="flex items-center justify-center h-64 text-red-500">
                <i className="pi pi-exclamation-triangle mr-2" /> {t('detail.error')}
            </div>
        </div>
    );

    const ev: Event = event;

    return (
        <div className="p-4">
            {header}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ── Video evidence ─────────────────────────────────────────── */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl shadow-sm p-4">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">{t('detail.evidence')}</h3>
                        {ev.evidence_url ? (
                            <video
                                key={ev.evidence_url}
                                src={ev.evidence_url}
                                controls
                                playsInline
                                className="w-full rounded-lg bg-black aspect-video"
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-gray-400 bg-gray-50 rounded-lg">
                                <i className="pi pi-video text-3xl mb-2" />
                                <span className="text-sm">{t('detail.no_evidence')}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Event information ──────────────────────────────────────── */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl shadow-sm p-4">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">{t('detail.information')}</h3>
                        <InfoRow label={t('detail.event_id')}   value={ev.id} />
                        <InfoRow label={t('detail.camera')}     value={ev.camera_name} />
                        <InfoRow label={t('detail.location')}   value={ev.location_name} />
                        <InfoRow label={t('detail.usecase')}    value={ev.usecase_name} />
                        <InfoRow label={t('detail.description')} value={ev.event_description} />
                        <InfoRow label={t('detail.start_time')} value={formatDateTime(ev.event_start_time)} />
                        <InfoRow label={t('detail.end_time')}   value={formatDateTime(ev.event_end_time)} />
                        <InfoRow label={t('detail.duration')}   value={formatDuration(ev.event_start_time, ev.event_end_time)} />
                        <InfoRow label={t('detail.created')}    value={formatDateTime(ev.created_date_time)} />
                    </div>
                </div>
            </div>
        </div>
    );
};
