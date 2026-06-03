import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { userService } from './api/UserService';
import type { UserList } from './types';
import { PrimeTable, type TableColumn } from '../../components/ui/Primetable';
import { useNsTranslation } from '../../hooks/Usetranslation';
import { FormButton } from '../../components/ui/FormButton';
import { DeleteModalPopup } from '../../components/ui/DeleteModalPopup';
import { useToast } from '../../components/ui/ToastProvider';


interface StatusToggleCellProps {
    row: UserList;
    onToggle: (id: number, is_active: boolean) => Promise<void>;
    labelActive: string;
    labelInactive: string;
}

const StatusToggleCell = ({ row, onToggle, labelActive, labelInactive }: StatusToggleCellProps) => {
    const [isToggling, setIsToggling] = useState(false);

    const handleClick = async () => {
        if (isToggling) return;
        setIsToggling(true);
        try {
            await onToggle(row.id, !row.is_active);
        } finally {
            setIsToggling(false);
        }
    };

    return (
        <span title={row.is_active ? labelActive : labelInactive} className="inline-block">
            <FormButton
                type="button"
                variant="ghost"
                label=""
                className={`status-toggle ${row.is_active ? 'status-toggle--on' : 'status-toggle--off'}`}
                onClick={handleClick}
                disabled={isToggling}
                ariaLabel={`Toggle status for ${row.first_name}`}
            />
        </span>
    );
};

// ────────────────────────────────────────────────────────────────────────────

export const UsersList = () => {
    const { t } = useNsTranslation('user_management');
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const toast = useToast();

    // Show back button only when there is in-app history to return to
    const canGoBack = window.history.length > 2;

    // ── Data ─────────────────────────────────────────────────────────────────
    const { data, isLoading, isError } = useQuery({
        queryKey: ['users'],
        queryFn: () => userService.getUsers().then(res => res.data.users),
        placeholderData: (previousData) => previousData,
    });

    // ── Delete mutation ───────────────────────────────────────────────────────
    const { mutate: deleteUser } = useMutation({
        mutationFn: (id: number) => userService.deleteUser(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success(
                t('toast.user_deleted_title'),
                t('toast.user_deleted_detail')
            );
        },
        onError: (err: any) => {
            const detail = err?.response?.data?.detail || t('toast.user_delete_error_detail');
            toast.error(t('toast.user_delete_error_title'), detail);
        },
    });

    // ── Toggle mutation (mutateAsync so StatusToggleCell can await it) ────────
    const { mutateAsync: toggleStatusAsync } = useMutation({
        mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
            userService.updateUserStatus(id, is_active),

        onMutate: async ({ id, is_active }) => {
            await queryClient.cancelQueries({ queryKey: ['users'] });
            const previous = queryClient.getQueryData(['users']);
            queryClient.setQueryData(['users'], (old: UserList[] | undefined) =>
                old?.map(u => u.id === id ? { ...u, is_active } : u)
            );
            return { previous };
        },

        onSuccess: (_data, { is_active }) => {
            toast.success(
                is_active ? t('toast.status_activated_title')   : t('toast.status_deactivated_title'),
                is_active ? t('toast.status_activated_detail')  : t('toast.status_deactivated_detail')
            );
        },

        onError: (err: any, _vars, ctx) => {
            queryClient.setQueryData(['users'], ctx?.previous);
            const detail = err?.response?.data?.detail || t('toast.status_error_detail');
            toast.error(t('toast.status_error_title'), detail);
        },

        onSettled: () => {
            queryClient.refetchQueries({ queryKey: ['users'] });
        },
    });

    const handleToggle = async (id: number, is_active: boolean) => {
        await toggleStatusAsync({ id, is_active });
    };

    // ── Helpers ──────────────────────────────────────────────────────────────
    const getName = (row: UserList) => ({
        first: row.first_name ?? '',
        last:  row.last_name  ?? '',
    });

    const handleDelete = (row: UserList) => {
        const { first, last } = getName(row);
        DeleteModalPopup.show({
            message: t('delete_dialog.message', {
                firstName: first,
                lastName:  last,
                defaultValue: `Are you sure you want to delete ${first} ${last}?`,
            }),
            header:    t('delete_dialog.header'),
            onConfirm: () => deleteUser(row.id),
        });
    };

    // ── Column templates ─────────────────────────────────────────────────────
    const nameTemplate = (row: UserList) => {
        const { first, last } = getName(row);
        return (
            <div className="flex items-center gap-3">
                <div className="user-avatar">{first[0]}{last[0]}</div>
                <div>
                    <div className="font-medium text-gray-800">{first} {last}</div>
                    <div className="text-xs text-gray-400">{row.email}</div>
                </div>
            </div>
        );
    };

    const roleTemplate = (row: UserList) => (
        <span className="role-badge">{row.role_name}</span>
    );

    const statusTemplate = (row: UserList) => (
        <StatusToggleCell
            row={row}
            onToggle={handleToggle}
            labelActive={t('status.active')}
            labelInactive={t('status.inactive')}
        />
    );

    const actionsTemplate = (row: UserList) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <span title={t('actions.edit')}>
                <FormButton
                    label=""
                    variant="ghost"
                    size="sm"
                    iconLeft="pi pi-pencil"
                    ariaLabel={t('actions.edit')}
                    onClick={() => navigate(`/users/edit/${row.id}`)}
                />
            </span>
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

    // ── Columns ──────────────────────────────────────────────────────────────
    const columns: TableColumn<UserList>[] = [
        { header: t('columns.name'),    body: nameTemplate,    sortable: true, sortField: 'first_name' },
        { header: t('columns.mobile'),  field: 'mobile_number'                                         },
        { header: t('columns.role'),    body: roleTemplate,    sortable: true, sortField: 'role_name'  },
        { header: t('columns.status'),  body: statusTemplate,  sortable: true, sortField: 'is_active'  },
        { header: t('columns.actions'), body: actionsTemplate, style: { width: '12rem' }               },
    ];

    // ── Table header slot ─────────────────────────────────────────────────────
    const tableHeader = (
        <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">{t('title')}</h2>

            <div className="flex items-center gap-2">
                {/* Back button — only shown when in-app history exists */}
                {canGoBack && (
                    <FormButton
                        label={t('actions.back', { defaultValue: 'Back' })}
                        variant="ghost"
                        size="sm"
                        iconLeft="pi pi-arrow-left"
                        ariaLabel={t('actions.back', { defaultValue: 'Go back' })}
                        onClick={() => navigate(-1)}
                    />
                )}
                <FormButton
                    label={t('add_user')}
                    variant="primary"
                    iconLeft="pi pi-plus"
                    onClick={() => navigate('/users/add')}
                />
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
            <div className="p-4">
                <PrimeTable<UserList>
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