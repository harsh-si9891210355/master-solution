import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tag } from 'primereact/tag';
import { useNavigate } from 'react-router';
import { cameraService } from './api/cameraService';
import type { Camera } from './types/index';
import { PrimeTable, type TableColumn } from '../../components/ui/Primetable';
import { useNsTranslation } from '../../hooks/Usetranslation';
import { FormButton } from '../../components/ui/FormButton';
import { DeleteModalPopup } from '../../components/ui/DeleteModalPopup';

export const CameraList = () => {
    const { t, currentLang } = useNsTranslation('camera');
    const queryClient = useQueryClient();
    const navigate    = useNavigate();

    // ── Data ─────────────────────────────────────────────────────────────────
    const { data, isLoading, isError } = useQuery({
        queryKey: ['cameras'],
        queryFn:  () => cameraService.getCameras().then(res => res.data.cameras),
    });

    // ── Delete mutation ───────────────────────────────────────────────────────
    const { mutate: deleteCamera } = useMutation({
        mutationFn: (id: number) => cameraService.deleteCamera(id),
        onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['cameras'] }),
        onError:    (err: any) => console.error('Delete failed:', err.response?.data),
    });

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
        <Tag
            value={row.status ? t('status.active') : t('status.inactive')}
            severity={row.status ? 'success' : 'danger'}
        />
    );

    const actionsTemplate = (row: Camera) => (
        <div className="flex items-center gap-2">
            <FormButton
                label={t('actions.edit')}
                variant="ghost"
                size="sm"
                iconLeft="pi pi-pencil"
                ariaLabel={t('actions.edit')}
                onClick={() => navigate(`/cameras/edit/${row.id}`)}
            />
            <FormButton
                label={t('actions.delete')}
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
        { header: t('columns.actions'),    body: actionsTemplate, style: { width: '10rem' } },
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