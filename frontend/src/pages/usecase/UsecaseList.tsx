import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import type { Usecase } from './types/index';
import { usecaseService } from './api/usecaseService';
import { LinkedCamerasModal } from './Linkedcamerasmodal';
import { PrimeTable, type TableColumn } from '../../components/ui/Primetable';
import { FormButton } from '../../components/ui/FormButton';
import { DeleteModalPopup } from '../../components/ui/DeleteModalPopup';
import { useNsTranslation } from '../../hooks/Usetranslation';
import { useToast } from '../../components/ui/ToastProvider';

// ── Status toggle cell ────────────────────────────────────────────────────────
interface StatusToggleCellProps {
    row:           Usecase;
    onToggle:      (id: number, status: boolean) => Promise<void>;
    labelActive:   string;
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

// ── Component ─────────────────────────────────────────────────────────────────
export const UsecaseList = () => {
    const { t, currentLang } = useNsTranslation('usecase');
    const navigate           = useNavigate();
    const queryClient        = useQueryClient();
    const toast              = useToast();

    // ── Linked cameras modal state ────────────────────────────────────────────
    const [linkedCamerasUsecase, setLinkedCamerasUsecase] = useState<Usecase | null>(null);
    const [linkedCamerasVisible, setLinkedCamerasVisible] = useState(false);

    const openLinkedCameras = (row: Usecase) => {
        setLinkedCamerasUsecase(row);
        setLinkedCamerasVisible(true);
    };

    const closeLinkedCameras = () => {
        setLinkedCamerasVisible(false);
        setLinkedCamerasUsecase(null);
    };

    // ── Fetch ─────────────────────────────────────────────────────────────────
    const { data, isLoading, isError } = useQuery({
        queryKey: ['usecases'],
        queryFn:  () => usecaseService.getUsecases().then(res => res.data.usecases),
        placeholderData: (prev) => prev,
    });

    // ── Status toggle — optimistic update via PATCH ───────────────────────────
    const { mutateAsync: toggleStatusAsync } = useMutation({
        mutationFn: ({ id, status }: { id: number; status: boolean }) =>
            usecaseService.updateStatus(id, status),

        onMutate: async ({ id, status }) => {
            await queryClient.cancelQueries({ queryKey: ['usecases'] });
            const previous = queryClient.getQueryData(['usecases']);
            queryClient.setQueryData(['usecases'], (old: Usecase[] | undefined) =>
                old?.map(u => u.id === id ? { ...u, status } : u)
            );
            return { previous };
        },

        onSuccess: (_data, { status }) => {
            toast.success(
                status ? t('toast.status_activated_title')  : t('toast.status_deactivated_title'),
                status ? t('toast.status_activated_detail') : t('toast.status_deactivated_detail'),
            );
        },

        onError: (err: any, _vars, ctx: any) => {
            queryClient.setQueryData(['usecases'], ctx?.previous);
            const detail = err?.response?.data?.detail || t('toast.status_error_detail');
            toast.error(t('toast.status_error_title'), detail);
        },

        onSettled: () => {
            queryClient.refetchQueries({ queryKey: ['usecases'] });
        },
    });

    const handleToggle = async (id: number, status: boolean) => {
        await toggleStatusAsync({ id, status });
    };

    // ── Delete ────────────────────────────────────────────────────────────────
    const { mutate: deleteUsecase } = useMutation({
        mutationFn: (id: number) => usecaseService.deleteUsecase(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['usecases'] });
            toast.success(t('toast.deleted_title'), t('toast.deleted_detail'));
        },
        onError: (err: any) => {
            const detail = err?.response?.data?.detail || t('toast.delete_error_detail');
            toast.error(t('toast.delete_error_title'), detail);
        },
    });

    const handleDelete = (row: Usecase) => {
        const name = currentLang === 'es' ? (row.name_es || row.name_en) : row.name_en;
        DeleteModalPopup.show({
            message:   t('delete_dialog.message', { name }),
            header:    t('delete_dialog.header'),
            onConfirm: () => deleteUsecase(row.id),
        });
    };

    // ── Localised helpers ─────────────────────────────────────────────────────
    const getLocalizedName = (row: Usecase) =>
        currentLang === 'es' ? (row.name_es || row.name_en) : row.name_en;

    const getLocalizedDescription = (row: Usecase) =>
        currentLang === 'es' ? (row.description_es || row.description_en) : row.description_en;

    // ── Column templates ──────────────────────────────────────────────────────
    const nameTemplate = (row: Usecase) => (
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                <i className="pi pi-tag text-sm" />
            </div>
            <div className="font-medium text-gray-800">{getLocalizedName(row)}</div>
        </div>
    );

    const descriptionTemplate = (row: Usecase) => (
        <span className="text-sm text-gray-500">{getLocalizedDescription(row)}</span>
    );

    const statusTemplate = (row: Usecase) => (
        <StatusToggleCell
            row={row}
            onToggle={handleToggle}
            labelActive={t('status.active')}
            labelInactive={t('status.inactive')}
        />
    );

    const actionsTemplate = (row: Usecase) => (
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>

            {/* ── Linked cameras button ──────────────────────────── */}
            <span title={t('actions.linked_cameras')}>
                <FormButton
                    label=""
                    variant="ghost"
                    size="sm"
                    iconLeft="pi pi-video"
                    ariaLabel={t('actions.linked_cameras')}
                    onClick={() => openLinkedCameras(row)}
                />
            </span>

            {/* ── Edit ──────────────────────────────────────────── */}
            <span title={t('actions.edit')}>
                <FormButton
                    label=""
                    variant="ghost"
                    size="sm"
                    iconLeft="pi pi-pencil"
                    ariaLabel={t('actions.edit')}
                    onClick={() => navigate(`/usecases/edit/${row.id}`)}
                />
            </span>

            {/* ── Delete ────────────────────────────────────────── */}
            <span title={t('actions.delete')}>
                <FormButton
                    label=""
                    variant="danger"
                    size="sm"
                    iconLeft="pi pi-trash"
                    ariaLabel={t('actions.delete')}
                    onClick={() => handleDelete(row)}
                />
            </span>

        </div>
    );

    // ── Columns ───────────────────────────────────────────────────────────────
    const columns: TableColumn<Usecase>[] = [
        { header: t('columns.name'),        body: nameTemplate,        sortable: true, sortField: 'name_en'        },
        { header: t('columns.description'), body: descriptionTemplate, sortable: true, sortField: 'description_en' },
        { header: t('columns.status'),      body: statusTemplate,      sortable: true, sortField: 'status'         },
        { header: t('columns.actions'),     body: actionsTemplate,     style: { width: '13rem' }                   },
    ];

    const tableHeader = (
        <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">{t('title')}</h2>
            <FormButton
                label={t('add_usecase')}
                variant="primary"
                iconLeft="pi pi-plus"
                onClick={() => navigate('/usecases/add')}
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

            {/* ── Linked cameras modal ──────────────────────────────── */}
            <LinkedCamerasModal
                usecase={linkedCamerasUsecase}
                visible={linkedCamerasVisible}
                onHide={closeLinkedCameras}
            />

            <div className="p-4">
                <PrimeTable<Usecase>
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