import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { cameraService } from './api/cameraService';
import type { Camera } from './types/index';
import { useToast } from '../../components/ui/ToastProvider';
import { SelectUsecaseModal } from '../usecase/SelectUsecaseModal';
import { PrimeTable, type TableColumn } from '../../components/ui/Primetable';
import { useNsTranslation } from '../../hooks/Usetranslation';
import { FormButton } from '../../components/ui/FormButton';
import { DeleteModalPopup } from '../../components/ui/DeleteModalPopup';

export const CameraList = () => {
    const { t, i18n, currentLang } = useNsTranslation('camera');
    const toast = useToast();
    const queryClient = useQueryClient();
    const navigate    = useNavigate();
    const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
    const [isUsecaseModalVisible, setIsUsecaseModalVisible] = useState(false);

    // ── Data ─────────────────────────────────────────────────────────────────
    const { data, isLoading, isError } = useQuery({
        queryKey: ['cameras'],
        queryFn:  () => cameraService.getCameras().then(res => res.data.cameras),
    });

    // ── Delete mutation ───────────────────────────────────────────────────────
    const { mutate: deleteCamera } = useMutation({
        mutationFn: (id: number) => cameraService.deleteCamera(id),
        onSuccess:  () => {
            queryClient.invalidateQueries({ queryKey: ['cameras'] });
            toast.success(i18n.t('camera:toast_actions.camera_deleted_title'), i18n.t('camera:toast_actions.camera_deleted_detail'));
        },
        onError:    (err: any) => {
            const detail = err?.response?.data?.detail || i18n.t('camera:toast_actions.camera_delete_error_detail');
            toast.error(i18n.t('camera:toast_actions.camera_delete_error_title'), detail);
        },
    });

    // ── Toggle mutation (mutateAsync so StatusToggleCell can await it) ───────
    const { mutateAsync: toggleStatusAsync } = useMutation({
        mutationFn: ({ id, status }: { id: number; status: boolean }) =>
            cameraService.updateStatus(id, status),

        onMutate: async ({ id, status }) => {
            await queryClient.cancelQueries({ queryKey: ['cameras'] });
            const previous = queryClient.getQueryData(['cameras']);
            queryClient.setQueryData(['cameras'], (old: Camera[] | undefined) =>
                old?.map(c => c.id === id ? { ...c, status } : c)
            );
            return { previous };
        },

        onSuccess: (_data, { status }) => {
            toast.success(
                status
                    ? i18n.t('camera:toast.status_activated_title')
                    : i18n.t('camera:toast.status_deactivated_title'),
                status
                    ? i18n.t('camera:toast.status_activated_detail')
                    : i18n.t('camera:toast.status_deactivated_detail')
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
        if (currentLang === 'es') return row.name_es || row.name_en;
        return row.name_en;
    };

    // ── Delete handler ────────────────────────────────────────────────────────
    const handleDelete = (row: Camera) => {
        const name = getLocalizedName(row);
        DeleteModalPopup.show({
            message:   t('delete_dialog.message', {
                name,
                defaultValue: `Are you sure you want to delete camera "${name}"?`,
            }),
            header:    t('delete_dialog.header'),
            onConfirm: () => deleteCamera(row.id),
        });
    };

    const handleOpenUsecaseModal = (row: Camera) => {
        setSelectedCamera(row);
        setIsUsecaseModalVisible(true);
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
                    <div className="text-xs text-gray-400 font-mono">{row.rtsp_url}</div>
                </div>
            </div>
        );
    };

    const statusTemplate = (row: Camera) => (
        <StatusToggleCell
            row={row}
            onToggle={handleToggle}
            labelActive={t('status.active')}
            labelInactive={t('status.inactive')}
        />
    );


    // Status toggle cell component
    interface StatusToggleCellProps {
        row: Camera;
        onToggle: (id: number, status: boolean) => Promise<void>;
        labelActive: string;
        labelInactive: string;
    }

    const StatusToggleCell = ({ row, onToggle, labelActive, labelInactive }: StatusToggleCellProps) => {
        const [isToggling, setIsToggling] = useState(false);

        const handleClick = async () => {
            if (isToggling) return;
            setIsToggling(true);
            try {
                await onToggle(row.id, !row.status);
            } finally {
                setIsToggling(false);
            }
        };

        return (
            <span title={row.status ? labelActive : labelInactive} className="inline-block">
                <FormButton
                    type="button"
                    variant="ghost"
                    label=""
                    className={`status-toggle ${row.status ? 'status-toggle--on' : 'status-toggle--off'}`}
                    onClick={handleClick}
                    disabled={isToggling}
                    ariaLabel={`Toggle status for ${row.name_en}`}
                />
            </span>
        );
    };

    const actionsTemplate = (row: Camera) => (
        <div className="flex items-center gap-2">
            <FormButton
                label=""
                variant="ghost"
                size="sm"
                iconLeft="pi pi-pencil"
                ariaLabel={t('actions.edit')}
                onClick={() => navigate(`/cameras/edit/${row.id}`)}
            />
            <FormButton
                label=""
                variant="secondary"
                size="sm"
                iconLeft="pi pi-sitemap"
                ariaLabel={t('actions.usecases')}
                onClick={() => handleOpenUsecaseModal(row)}
            />
            <FormButton
                label=""
                variant="danger"
                size="sm"
                iconLeft="pi pi-trash"
                ariaLabel={t('actions.delete')}
                onClick={() => handleDelete(row)}
            />
        </div>
    );

    // ── Column definitions ────────────────────────────────────────────────────
    const columns: TableColumn<Camera>[] = [
        { header: t('columns.name'),       body: nameTemplate,                  sortable: true, sortField: 'name_en' },
        { header: t('columns.location'),   field: 'location_name',              sortable: true, sortField: 'location_name' },
        { header: t('columns.codec'),      field: 'codec'                       },
        { header: t('columns.resolution'), field: 'resolution'                  },
        { header: t('columns.fps'),        field: 'fps'                         },
        { header: t('columns.status'),     body: statusTemplate,                sortable: true, sortField: 'status' },
        { header: t('columns.actions'),    body: actionsTemplate, style: { width: '8rem' } },
    ];

    // ── Table header slot ─────────────────────────────────────────────────────
    const tableHeader = (
        <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">{t('title')}</h2>
            <FormButton
                label={t('add_camera')}
                variant="primary"
                iconLeft="pi pi-plus"
                onClick={() => navigate('/cameras/add')}
            />
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
                onHide={() => {
                    setIsUsecaseModalVisible(false);
                    setSelectedCamera(null);
                }}
            />
            <div className="p-4">
                <PrimeTable<Camera>
                    data={data}
                    loading={isLoading}
                    columns={columns}
                    header={tableHeader}
                    emptyMessage={t('empty_message')}
                />
            </div>
        </>
    );
};
