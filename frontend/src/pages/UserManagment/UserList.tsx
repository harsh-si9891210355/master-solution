import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { userService } from './api/UserService';
import { roleService } from './api/RoleService';
import type { UserList } from './types';
import { useNsTranslation } from '../../hooks/Usetranslation';
import { FormButton } from '../../components/ui/FormButton';
import { DeleteModalPopup } from '../../components/ui/DeleteModalPopup';
import { useToast } from '../../components/ui/ToastProvider';
import { useAuthStore } from '@/store/authStore';

interface EditForm {
    first_name: string;
    last_name: string;
    mobile_number: string;
    role_code: string;
    is_active: boolean;
}

export const UsersList = () => {
    const { t } = useNsTranslation('user_management');
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const toast = useToast();
    const currentUser = useAuthStore((s) => s.user);

    const [selected, setSelected] = useState<UserList | null>(null);
    const [search, setSearch] = useState('');
    const [form, setForm] = useState<EditForm | null>(null);

    // ── Data ───────────────────────────────────────────────────────────────
    const { data, isLoading, isError } = useQuery({
        queryKey: ['users'],
        queryFn: () => userService.getUsers().then((res) => res.data.users),
        placeholderData: (prev) => prev,
    });

    const { data: rolesData } = useQuery({
        queryKey: ['roles'],
        queryFn: () => roleService.getRoles().then((res) => res.data.roles),
        staleTime: Infinity,
    });

    // Populate the edit panel whenever a row is selected.
    useEffect(() => {
        if (selected) {
            setForm({
                first_name: selected.first_name ?? '',
                last_name: selected.last_name ?? '',
                mobile_number: selected.mobile_number ?? '',
                role_code: selected.role_code ?? '',
                is_active: selected.is_active,
            });
        } else {
            setForm(null);
        }
    }, [selected]);

    // Keep the selected row in sync with refetched list data.
    useEffect(() => {
        if (selected && data) {
            const fresh = data.find((u: UserList) => u.id === selected.id);
            if (fresh && fresh !== selected) setSelected(fresh);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data]);

    // ── Mutations ──────────────────────────────────────────────────────────
    const { mutate: saveUser, isPending: isSaving } = useMutation({
        mutationFn: (payload: EditForm & { id: number }) => {
            const { id, mobile_number, ...rest } = payload;
            return userService.updateUser(id, {
                ...rest,
                // Backend requires 7–20 chars when present; omit if blank.
                mobile_number: mobile_number.trim() || undefined,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success(t('toast.user_updated_title'), t('toast.user_updated_detail'));
        },
        onError: (err: any) => {
            const detail =
                err?.response?.data?.detail ||
                err?.response?.data?.errors?.[0]?.message ||
                t('toast.user_update_error_detail');
            toast.error(t('toast.user_update_error_title'), detail);
        },
    });

    const { mutate: deleteUser } = useMutation({
        mutationFn: (id: number) => userService.deleteUser(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setSelected(null);
            toast.success(t('toast.user_deleted_title'), t('toast.user_deleted_detail'));
        },
        onError: (err: any) => {
            const detail = err?.response?.data?.detail || t('toast.user_delete_error_detail');
            toast.error(t('toast.user_delete_error_title'), detail);
        },
    });

    const handleSave = () => {
        if (!selected || !form) return;
        if (!form.first_name.trim() || !form.last_name.trim()) {
            toast.error(t('toast.user_update_error_title'), 'First and last name are required.');
            return;
        }
        saveUser({ id: selected.id, ...form });
    };

    const handleDelete = (row: UserList) => {
        DeleteModalPopup.show({
            message: t('delete_dialog.message', {
                firstName: row.first_name ?? '',
                lastName: row.last_name ?? '',
                defaultValue: `Are you sure you want to delete ${row.first_name} ${row.last_name}?`,
            }),
            header: t('delete_dialog.header'),
            onConfirm: () => deleteUser(row.id),
        });
    };

    const isSelf = !!currentUser && !!selected && selected.id === currentUser.id;

    // ── Filtered rows ──────────────────────────────────────────────────────
    const term = search.trim().toLowerCase();
    const rows = (data ?? []).filter((u: UserList) => {
        if (!term) return true;
        return [u.first_name, u.last_name, u.email, u.role_name]
            .filter(Boolean)
            .some((v) => v!.toLowerCase().includes(term));
    });

    // ── Column templates ───────────────────────────────────────────────────
    const pictureTemplate = (row: UserList) => (
        <div className="user-avatar">
            {(row.first_name?.[0] ?? '') + (row.last_name?.[0] ?? '')}
        </div>
    );

    const statusBadge = (active: boolean) => (
        <span
            className="inline-flex items-center gap-1.5 text-xs font-semibold"
            style={{ color: active ? '#16a34a' : '#94a3b8' }}
        >
            <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: active ? '#16a34a' : '#cbd5e1' }}
            />
            {active ? t('status.active') : t('status.inactive')}
        </span>
    );

    if (isError)
        return (
            <div className="flex items-center justify-center h-64 text-red-500">
                <i className="pi pi-exclamation-triangle mr-2" /> {t('error_message')}
            </div>
        );

    return (
        <>
            <DeleteModalPopup.Host />
            <div className="flex items-start gap-4 p-4">

                {/* Mobile drawer backdrop (closes the panel on tap) */}
                {selected && (
                    <div
                        className="fixed inset-0 bg-black/30 z-40 lg:hidden"
                        onClick={() => setSelected(null)}
                    />
                )}

                {/* ── Master: user list ─────────────────────────────────── */}
                <div className="flex-1 min-w-0 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                    {/* Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
                        <h2 className="text-lg font-bold text-gray-800">{t('title')}</h2>
                        <div className="flex items-center gap-3 ml-auto">
                            <div className="relative">
                                <i className="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder={t('filters.search', { defaultValue: 'Search…' })}
                                    className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 w-44 sm:w-60"
                                />
                            </div>
                            <FormButton
                                label={t('add_user')}
                                variant="primary"
                                iconLeft="pi pi-plus"
                                onClick={() => navigate('/users/add')}
                            />
                        </div>
                    </div>

                    <DataTable
                        value={rows}
                        loading={isLoading}
                        selectionMode="single"
                        selection={selected as any}
                        onSelectionChange={(e) => setSelected(e.value as UserList)}
                        dataKey="id"
                        paginator
                        rows={10}
                        rowsPerPageOptions={[10, 25, 50]}
                        emptyMessage={t('empty_message')}
                        className="text-sm users-table"
                    >
                        <Column header="" body={pictureTemplate} style={{ width: '4rem' }} />
                        <Column header={t('columns.name', { defaultValue: 'Name' })}
                            body={(r: UserList) => (
                                <div>
                                    <div className="font-medium text-gray-800">{r.first_name} {r.last_name}</div>
                                    <div className="text-xs text-gray-400">{r.email}</div>
                                </div>
                            )} />
                        <Column header={t('columns.mobile', { defaultValue: 'Mobile' })} field="mobile_number" />
                        <Column header={t('columns.role', { defaultValue: 'Role' })}
                            body={(r: UserList) => <span className="role-badge">{r.role_name}</span>} />
                        <Column header={t('columns.status', { defaultValue: 'Status' })}
                            body={(r: UserList) => statusBadge(r.is_active)} />
                    </DataTable>
                </div>

                {/* ── Detail: edit panel (sticky column on desktop, right drawer on mobile) ── */}
                {selected && form && (
                    <aside
                        className="bg-white border border-gray-200 shadow-xl flex flex-col overflow-hidden
                                   fixed inset-y-0 right-0 z-50 w-full max-w-md
                                   lg:sticky lg:inset-y-auto lg:right-auto lg:top-4 lg:z-auto
                                   lg:w-[400px] lg:max-w-none lg:flex-shrink-0 lg:self-start
                                   lg:rounded-xl lg:shadow-sm lg:max-h-[calc(100vh-96px)]"
                    >
                        {/* Panel header — title truncates, buttons stay fixed */}
                        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 flex-shrink-0">
                            <div className="min-w-0">
                                <h3 className="text-base font-bold text-gray-800 leading-tight truncate">
                                    {`${selected.first_name} ${selected.last_name}`.trim() || selected.email}
                                </h3>
                                <p className="text-xs text-gray-400 mt-0.5 truncate">{selected.email}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <FormButton label={t('form.cancel', { defaultValue: 'Cancel' })} variant="secondary" size="sm" onClick={() => setSelected(null)} />
                                <FormButton label={t('form.edit_submit', { defaultValue: 'Save' })} variant="primary" size="sm" iconLeft="pi pi-check" loading={isSaving} onClick={handleSave} />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-5 py-5">
                            {/* Avatar */}
                            <div className="flex justify-center mb-5">
                                <div className="user-avatar" style={{ width: 72, height: 72, fontSize: 24 }}>
                                    {(selected.first_name?.[0] ?? '') + (selected.last_name?.[0] ?? '')}
                                </div>
                            </div>

                            {/* Editable fields */}
                            <div className="grid grid-cols-2 gap-3">
                                <Field label={t('form.section_first_name', { defaultValue: 'First Name' })}>
                                    <input className={inputCls} value={form.first_name}
                                        onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                                </Field>
                                <Field label={t('form.section_last_name', { defaultValue: 'Last Name' })}>
                                    <input className={inputCls} value={form.last_name}
                                        onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
                                </Field>
                            </div>

                            <Field label={t('form.fields.email', { defaultValue: 'Email' })} className="mt-3">
                                <input className={`${inputCls} bg-gray-50 text-gray-500`} value={selected.email} readOnly />
                            </Field>

                            <div className="grid grid-cols-2 gap-3 mt-3">
                                <Field label={t('form.fields.mobile_number', { defaultValue: 'Mobile Number' })}>
                                    <input className={inputCls} value={form.mobile_number}
                                        onChange={(e) => setForm({ ...form, mobile_number: e.target.value })} />
                                </Field>
                                <Field label={t('form.fields.role_code', { defaultValue: 'Role' })}>
                                    <select className={inputCls} value={form.role_code}
                                        onChange={(e) => setForm({ ...form, role_code: e.target.value })}>
                                        {(rolesData ?? []).map((r) => (
                                            <option key={r.code} value={r.code}>{r.name}</option>
                                        ))}
                                    </select>
                                </Field>
                            </div>

                            <Field label={t('columns.status', { defaultValue: 'Status' })} className="mt-3">
                                <select
                                    className={inputCls}
                                    value={form.is_active ? 'active' : 'inactive'}
                                    disabled={isSelf}
                                    title={isSelf ? t('status.self_disabled', { defaultValue: 'You cannot change the status of your own account' }) : undefined}
                                    onChange={(e) => setForm({ ...form, is_active: e.target.value === 'active' })}
                                >
                                    <option value="active">{t('status.active')}</option>
                                    <option value="inactive">{t('status.inactive')}</option>
                                </select>
                            </Field>

                            {/* Read-only profile (captured at onboarding) */}
                            <div className="mt-6 mb-2 text-[11px] font-semibold tracking-wide text-gray-400 uppercase">
                                {t('form.sections.profile', { defaultValue: 'Profile' })}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <ReadOnly label={t('columns.department', { defaultValue: 'Department' })} value={selected.department} />
                                <ReadOnly label={t('columns.city', { defaultValue: 'City' })} value={selected.city} />
                                <ReadOnly label={t('columns.state', { defaultValue: 'State' })} value={selected.state} />
                                <ReadOnly label={t('columns.country', { defaultValue: 'Country' })} value={selected.country} />
                            </div>

                            {/* Danger zone */}
                            <div className="mt-8 pt-4 border-t border-gray-100">
                                <FormButton
                                    label={t('actions.delete', { defaultValue: 'Delete user' })}
                                    variant="danger"
                                    size="sm"
                                    iconLeft="pi pi-trash"
                                    onClick={() => handleDelete(selected)}
                                />
                            </div>
                        </div>
                    </aside>
                )}
            </div>
        </>
    );
};

// ── Small presentational helpers ───────────────────────────────────────────
const inputCls =
    'w-full px-3 py-2.5 text-sm text-gray-700 bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300';

const Field = ({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) => (
    <div className={`flex flex-col gap-1.5 ${className}`}>
        <label className="text-xs font-medium text-gray-600">{label}</label>
        {children}
    </div>
);

const ReadOnly = ({ label, value }: { label: string; value?: string | null }) => (
    <div className="flex flex-col gap-1">
        <span className="text-[11px] text-gray-400">{label}</span>
        <span className="text-sm text-gray-700">{value || '—'}</span>
    </div>
);
