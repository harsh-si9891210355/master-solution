import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tag } from 'primereact/tag';
import { useNavigate } from 'react-router';
import { userService } from './api/UserService';
import type { UserList } from './types';
import { PrimeTable, type TableColumn } from '../../components/ui/Primetable';
import { useNsTranslation } from '../../hooks/Usetranslation';
import { SUPPORTED_LANGUAGES } from '../../languages/index';
import { FormButton } from '../../components/ui/FormButton';
import { DeleteModalPopup } from '../../components/ui/DeleteModalPopup';

export const UsersList = () => {
    const { t, currentLang, changeLanguage } = useNsTranslation('user_management');
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    // ── Mutations ────────────────────────────────────────────────────────────
    const { mutate: deleteUser } = useMutation({
        mutationFn: (id: number) => userService.deleteUser(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
        onError: (err: any) => console.error('Delete failed:', err.response?.data),
    });

    // ── Data ─────────────────────────────────────────────────────────────────
    const { data, isLoading, isError } = useQuery({
        queryKey: ['users'],
        queryFn: () => userService.getUsers().then(res => res.data.users),
    });

    // ── Localised name helpers ───────────────────────────────────────────────
    const getLocalizedFirstName = (row: UserList): string => {
        if (currentLang === 'es') return row.first_name ?? row.first_name;
        return row.first_name ?? row.first_name;
    };

    const getLocalizedLastName = (row: UserList): string => {
        if (currentLang === 'es') return row.last_name ?? row.last_name;
        return row.last_name ?? row.last_name;
    };

    // ── Delete handler ───────────────────────────────────────────────────────
    const handleDelete = (row: UserList) => {
        const firstName = getLocalizedFirstName(row);
        const lastName  = getLocalizedLastName(row);
        DeleteModalPopup.show({
            message: t('delete_dialog.message', {
                firstName,
                lastName,
                defaultValue: `Are you sure you want to delete ${firstName} ${lastName}?`,
            }),
            header:    t('delete_dialog.header'),
            onConfirm: () => deleteUser(row.id),
        });
    };

    // ── Column templates ─────────────────────────────────────────────────────
    const nameTemplate = (row: UserList) => {
        const firstName = getLocalizedFirstName(row);
        const lastName  = getLocalizedLastName(row);
        return (
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-sm">
                    {firstName[0]}{lastName[0]}
                </div>
                <div>
                    <div className="font-medium text-gray-800">{firstName} {lastName}</div>
                    <div className="text-xs text-gray-400">{row.email}</div>
                </div>
            </div>
        );
    };

    const roleTemplate = (row: UserList) => (
        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">
            {row.role_name}
        </span>
    );

    const statusTemplate = (row: UserList) => (
        <Tag
            value={row.is_active ? t('status.active') : t('status.inactive')}
            severity={row.is_active ? 'success' : 'danger'}
        />
    );

    const actionsTemplate = (row: UserList) => (
        <div className="flex items-center gap-2">
            <FormButton
                label={t('actions.edit')}
                variant="ghost"
                size="sm"
                iconLeft="pi pi-pencil"
                ariaLabel={t('actions.edit')}
                onClick={() => navigate(`/users/edit/${row.id}`)}
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

    // ── Column definitions ───────────────────────────────────────────────────
    const columns: TableColumn<UserList>[] = [
        { header: t('columns.name'),    body: nameTemplate,    sortable: true, sortField: 'first_name' },
        { header: t('columns.mobile'),  field: 'mobile_number' },
        { header: t('columns.role'),    body: roleTemplate,    sortable: true, sortField: 'role_name' },
        { header: t('columns.status'),  body: statusTemplate,  sortable: true, sortField: 'is_active' },
        { header: t('columns.actions'), body: actionsTemplate, style: { width: '10rem' } },
    ];

    // ── Table header slot ────────────────────────────────────────────────────
    const tableHeader = (
        <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">{t('title')}</h2>
            <div className="flex items-center gap-3">

                <FormButton
                    label={t('add_user')}
                    variant="primary"
                    iconLeft="pi pi-plus"
                    onClick={() => navigate('/users/add')}
                />
            </div>
        </div>
    );

    // ── Error state ──────────────────────────────────────────────────────────
    if (isError) return (
        <div className="flex items-center justify-center h-64 text-red-500">
            <i className="pi pi-exclamation-triangle mr-2" /> {t('error_message')}
        </div>
    );

    return (
        <>
            {/* Renders the ConfirmDialog portal — required once per page */}
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