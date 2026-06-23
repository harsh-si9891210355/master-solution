import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router';
import { cameraService } from './api/cameraService';
import type { Camera } from './types/index';
import { useToast } from '../../components/ui/ToastProvider';
import { SelectUsecaseModal } from '../usecase/SelectUsecaseModal';
import { LiveViewModal } from './LiveViewModal';
import { PrimeTable, type TableColumn } from '../../components/ui/Primetable';
import { useNsTranslation } from '../../hooks/Usetranslation';
import { FormButton } from '../../components/ui/FormButton';
import { StatusToggle } from '../../components/ui/StatusToggle';
import { DeleteModalPopup } from '../../components/ui/DeleteModalPopup';

export const CameraList = () => {
    const { t, i18n, currentLang } = useNsTranslation('camera');
    const toast = useToast();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const location = useLocation();

    const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
    const [isUsecaseModalVisible, setIsUsecaseModalVisible] = useState(false);
    const [liveViewCamera, setLiveViewCamera] = useState<Camera | null>(null);
    const [isLiveViewVisible, setIsLiveViewVisible] = useState(false);

    const [filterName, setFilterName] = useState('');
    const [filterLocation, setFilterLocation] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
    const [canGoBack, setCanGoBack] = useState(false);

    useEffect(() => {
        const navState = location.state as { statusFilter?: 'active' | 'inactive'; from?: string } | null;
        if (navState?.statusFilter) {
            setFilterStatus(navState.statusFilter);
            window.history.replaceState({}, document.title);
        }
        setCanGoBack(window.history.length > 2 || Boolean(navState?.from));
    }, [location.state]);

    const { data, isLoading, isError } = useQuery({
        queryKey: ['cameras'],
        queryFn: () => cameraService.getCameras().then(res => res.data.cameras),
    });

    // ── Delete mutation ───────────────────────────────────────────────────────
    const { mutate: deleteCamera } = useMutation({
        mutationFn: (id: number) => cameraService.deleteCamera(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cameras'] });
            toast.success(i18n.t('camera:toast_actions.camera_deleted_title'), i18n.t('camera:toast_actions.camera_deleted_detail'));
        },
        onError: (err: any) => {
            const detail = err?.response?.data?.detail || i18n.t('camera:toast_actions.camera_delete_error_detail');
            toast.error(i18n.t('camera:toast_actions.camera_delete_error_title'), detail);
        },
    });

    // ── Toggle mutation ───────────────────────────────────────────────────────
    const { mutateAsync: toggleStatusAsync } = useMutation({
        mutationFn: ({ id, status }: { id: number; status: boolean }) =>
            cameraService.updateStatus(id, status),

        onMutate: async ({ id, status }) => {
            await queryClient.cancelQueries({ queryKey: ['cameras'] });
            const previous = queryClient.getQueryData(['cameras']);
            queryClient.setQueryData(['cameras'], (old: Camera[] | undefined) =>
                old?.map(c => c.identity.id === id ? { ...c, status: { ...c.status, active: status } } : c)
            );
            return { previous };
        },

        onSuccess: (_data, { status }) => {
            toast.success(
                status ? i18n.t('camera:toast.status_activated_title') : i18n.t('camera:toast.status_deactivated_title'),
                status ? i18n.t('camera:toast.status_activated_detail') : i18n.t('camera:toast.status_deactivated_detail')
            );
        },

        onError: (err: any, _vars, ctx) => {
            queryClient.setQueryData(['cameras'], ctx?.previous);
            const detail = err?.response?.data?.detail || i18n.t('camera:toast.status_error_detail');
            toast.error(i18n.t('camera:toast.status_error_title'), detail);
        },

        onSettled: () => {
            queryClient.refetchQueries({ queryKey: ['cameras'] });
        },
    });

    const handleToggle = async (id: number, status: boolean) => {
        await toggleStatusAsync({ id, status });
    };

    // ── Localised name helper ─────────────────────────────────────────────────
    const getLocalizedName = (row: Camera): string => {
        if (currentLang === 'es') return row.identity.es || row.identity.en || '';
        return row.identity.en || '';
    };

    // ── Filtered data ─────────────────────────────────────────────────────────
    const filteredData = useMemo(() => {
        if (!data) return [];
        return data.filter(cam => {
            const name = getLocalizedName(cam).toLowerCase();
            const loc = (cam.location.locationName ?? '').toLowerCase();

            const matchName = filterName.trim() === '' || name.includes(filterName.toLowerCase());
            const matchLocation = filterLocation === '' || loc === filterLocation.toLowerCase();
            const matchStatus =
                filterStatus === 'all' ||
                (filterStatus === 'active' && cam.status.active) ||
                (filterStatus === 'inactive' && !cam.status.active);

            return matchName && matchLocation && matchStatus;
        });
    }, [data, filterName, filterLocation, filterStatus, currentLang]);

    const locationOptions = useMemo(() =>
        Array.from(new Set((data ?? []).map(c => c.location.locationName).filter(Boolean))).sort(),
        [data]
    );

    // ── Delete handler ────────────────────────────────────────────────────────
    const handleDelete = (row: Camera) => {
        const name = getLocalizedName(row);
        DeleteModalPopup.show({
            message: t('delete_dialog.message', {
                name,
                defaultValue: `Are you sure you want to delete camera "${name}"?`,
            }),
            header: t('delete_dialog.header'),
            onConfirm: () => deleteCamera(row.identity.id),
        });
    };

    const handleOpenUsecaseModal = (row: Camera) => {
        setSelectedCamera(row);
        setIsUsecaseModalVisible(true);
    };

    const handleOpenLiveView = (row: Camera) => {
        setLiveViewCamera(row);
        setIsLiveViewVisible(true);
    };

    // ── Column templates ──────────────────────────────────────────────────────
    const nameTemplate = (row: Camera) => {
        const name = getLocalizedName(row);
        return (
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                    <i className="pi pi-video text-sm" />
                </div>
                <div>
                    <div className="font-medium text-gray-800">{name}</div>
                    <div className="text-xs text-gray-400 font-mono">{row.connectivity.rtspUrl}</div>
                </div>
            </div>
        );
    };

    const statusTemplate = (row: Camera) => (
        <StatusToggle
            active={row.status.active}
            onToggle={() => handleToggle(row.identity.id, !row.status.active)}
        />
    );

    const actionsTemplate = (row: Camera) => (
        <div className="flex items-center gap-2">
            <FormButton
                label=""
                variant="ghost"
                size="sm"
                iconLeft="pi pi-th-large"
                ariaLabel="ROI Editor"
                title="Open ROI Editor"
                onClick={() => navigate(`/roi-editor?cameraId=${row.identity.id}`)}
            />
            <FormButton
                label=""
                variant="ghost"
                size="sm"
                iconLeft="pi pi-eye"
                title={t('actions.view')}
                onClick={() => handleOpenLiveView(row)}
                disabled={!row.connectivity.rtspUrl}
            />
            <FormButton
                label=""
                variant="ghost"
                size="sm"
                iconLeft="pi pi-pencil"
                title={t('actions.edit')}
                onClick={() => navigate(`/cameras/edit/${row.identity.id}`)}
            />
            <FormButton
                label=""
                variant="secondary"
                size="sm"
                iconLeft="pi pi-sitemap"
                title={t('actions.usecases')}
                onClick={() => handleOpenUsecaseModal(row)}
            />
            <FormButton
                label=""
                variant="danger"
                size="sm"
                iconLeft="pi pi-trash"
                title={t('actions.delete')}
                onClick={() => handleDelete(row)}
            />
        </div>
    );

    // ── Column definitions ────────────────────────────────────────────────────
    const columns: TableColumn<Camera>[] = [
        { header: t('columns.name'), body: nameTemplate, sortable: true, sortField: 'identity.en' },
        { header: t('columns.location'), body: (row) => row.location.locationName, sortable: true, sortField: 'location.locationName' },
        {
            header: t('columns.protocol', { defaultValue: 'Protocol' }),
            body: (row) => row.connectivity.protocol
                ? <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">{row.connectivity.protocol}</span>
                : <span className="text-gray-400 text-xs">—</span>,
        },
        { header: t('columns.codec'), body: (row) => row.video.codec },
        { header: t('columns.resolution'), body: (row) => row.video.nativeResolution },
        { header: t('columns.fps'), body: (row) => `${row.video.nativeFps} fps` },
        {
            header: t('columns.capabilities', { defaultValue: 'Capabilities' }),
            body: (row) => (
                <div className="flex items-center gap-1.5">
                    {row.capabilities.isPTZ && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">PTZ</span>
                    )}
                    {row.capabilities.supportsEdgeAI && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">AI</span>
                    )}
                    {row.capabilities.supportsAudio && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-medium">
                            <i className="pi pi-volume-up text-xs" />
                        </span>
                    )}
                    {!row.capabilities.isPTZ && !row.capabilities.supportsEdgeAI && !row.capabilities.supportsAudio && (
                        <span className="text-gray-400 text-xs">—</span>
                    )}
                </div>
            ),
        },
        {
            header: t('columns.ai', { defaultValue: 'AI' }),
            body: (row) => row.ai.enabled
                ? <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Enabled</span>
                : <span className="text-xs text-gray-400">Off</span>,
        },
        {
            header: t('columns.recording', { defaultValue: 'Recording' }),
            body: (row) => row.recording.enabled
                ? <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1 w-fit">
                    <i className="pi pi-circle-fill text-xs" /> REC
                </span>
                : <span className="text-xs text-gray-400">Off</span>,
        },
        { header: t('columns.status'), body: statusTemplate, sortable: true, sortField: 'status.active' },
        { header: t('columns.actions'), body: actionsTemplate, style: { width: '8rem' } },
    ];

    // ── Table header slot ─────────────────────────────────────────────────────
    const tableHeader = (
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">{t('title')}</h2>
                <div className="flex items-center gap-2">
                    {/* {canGoBack && (
                        <FormButton
                            label={t('actions.back', { defaultValue: 'Back' })}
                            variant="ghost"
                            size="sm"
                            iconLeft="pi pi-arrow-left"
                            ariaLabel={t('actions.back', { defaultValue: 'Go back' })}
                            onClick={() => navigate(-1)}
                        />
                    )} */}
                    <FormButton
                        label={t('add_camera')}
                        variant="primary"
                        iconLeft="pi pi-plus"
                        onClick={() => navigate('/cameras/add')}
                    />
                </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative">
                    <i className="pi pi-search absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" />
                    <input
                        type="text"
                        value={filterName}
                        onChange={e => setFilterName(e.target.value)}
                        placeholder={t('filters.name_placeholder', { defaultValue: 'Search by name…' })}
                        className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white text-gray-700 w-44"
                    />
                </div>

                <select
                    value={filterLocation}
                    onChange={e => setFilterLocation(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white text-gray-700 w-44"
                >
                    <option value="">{t('filters.all_locations', { defaultValue: 'All Locations' })}</option>
                    {locationOptions.map(loc => (
                        <option key={loc} value={loc}>{loc}</option>
                    ))}
                </select>

                <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white text-gray-700 w-44"
                >
                    <option value="all">{t('filters.status_all', { defaultValue: 'All Statuses' })}</option>
                    <option value="active">{t('filters.status_active', { defaultValue: 'Active' })}</option>
                    <option value="inactive">{t('filters.status_inactive', { defaultValue: 'Inactive' })}</option>
                </select>

                {(filterName || filterLocation || filterStatus !== 'all') && (
                    <button
                        onClick={() => { setFilterName(''); setFilterLocation(''); setFilterStatus('all'); }}
                        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700"
                    >
                        <i className="pi pi-times-circle text-xs" />
                        {t('filters.clear', { defaultValue: 'Clear filters' })}
                    </button>
                )}
            </div>
        </div>
    );

    if (isError) return (
        <div className="flex items-center justify-center h-64 text-red-500">
            <i className="pi pi-exclamation-triangle mr-2" /> {t('error_message')}
        </div>
    );

    return (
        <>
            <DeleteModalPopup.Host />
            <SelectUsecaseModal
                camera={selectedCamera}
                visible={isUsecaseModalVisible}
                onHide={() => { setIsUsecaseModalVisible(false); setSelectedCamera(null); }}
            />
            <LiveViewModal
                camera={liveViewCamera}
                visible={isLiveViewVisible}
                onHide={() => { setIsLiveViewVisible(false); setLiveViewCamera(null); }}
            />
            <div className="p-4">
                <PrimeTable<Camera>
                    data={filteredData}
                    loading={isLoading}
                    columns={columns}
                    header={tableHeader}
                    emptyMessage={t('empty_message')}
                />
            </div>
        </>
    );
};