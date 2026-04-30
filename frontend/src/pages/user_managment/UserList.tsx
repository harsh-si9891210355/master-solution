import { useQuery } from '@tanstack/react-query';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { useState } from 'react';
import { userService } from './api/userService';
import type { User } from './types';
import { useNavigate } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { confirmDialog, ConfirmDialog } from 'primereact/confirmdialog';

export const UserList = () => {

    const queryClient = useQueryClient();

const { mutate: deleteUser } = useMutation({
    mutationFn: (id: number) => userService.deleteUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
    onError: (err: any) => console.error('Delete failed:', err.response?.data),
});

const confirmDelete = (row: User) => {
    confirmDialog({
        message: `Are you sure you want to delete ${row.first_name} ${row.last_name}?`,
        header: 'Delete Confirmation',
        icon: 'pi pi-exclamation-triangle',
        acceptClassName: 'p-button-danger',
        accept: () => deleteUser(row.id),
    });
};
    const [globalFilter, setGlobalFilter] = useState('');
    const navigate = useNavigate();

    const { data, isLoading, isError } = useQuery({
        queryKey: ['users'],
        queryFn: () => userService.getUsers().then(res => res.data.users),
    });

    const statusTemplate = (row: User) => (
        <Tag
            value={row.is_active ? 'Active' : 'Inactive'}
            severity={row.is_active ? 'success' : 'danger'}
        />
    );

    const roleTemplate = (row: User) => (
        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">
            {row.role_name}
        </span>
    );

    const nameTemplate = (row: User) => (
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-sm">
                {row.first_name[0]}{row.last_name[0]}
            </div>
            <div>
                <div className="font-medium text-gray-800">{row.first_name} {row.last_name}</div>
                <div className="text-xs text-gray-400">{row.email}</div>
            </div>
        </div>
    );

    const actionsTemplate = (row: User) => (
    <div className="flex items-center gap-2">
        <Button
            icon="pi pi-pencil"
            rounded text severity="info"
            tooltip="Edit" tooltipOptions={{ position: 'top' }}
            onClick={() => navigate(`/users/edit/${row.id}`)}
        />
        <Button
            icon="pi pi-trash"
            rounded text severity="danger"
            tooltip="Delete" tooltipOptions={{ position: 'top' }}
            onClick={() => confirmDelete(row)}
        />
    </div>
);

    const header = (
        <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">User Management</h2>
            <div className="flex items-center gap-3">
                <Button
                    label="Add User"
                    icon="pi pi-plus"
                    className="bg-blue-600 border-none"
                    onClick={() => navigate('/users/add')} 
                />
            </div>
        </div>
    );

    if (isError) return (
        <div className="flex items-center justify-center h-64 text-red-500">
            <i className="pi pi-exclamation-triangle mr-2" /> Failed to load users.
        </div>
    );

    return (
    <>
        <ConfirmDialog />
        <div className="p-4">
            <DataTable
                value={data}
                loading={isLoading}
                header={header}
                globalFilter={globalFilter}
                paginator
                rows={10}
                rowsPerPageOptions={[5, 10, 25]}
                emptyMessage="No users found."
                className="shadow-sm rounded-xl overflow-hidden"
                stripedRows
            >
                <Column header="Name" body={nameTemplate} sortable sortField="first_name" />
                <Column field="mobile_number" header="Mobile" />
                <Column header="Role" body={roleTemplate} sortable sortField="role_name" />
                <Column header="Status" body={statusTemplate} sortable sortField="is_active" />
                <Column header="Actions" body={actionsTemplate} style={{ width: '8rem' }} />
            </DataTable>
        </div>
    </>
);
};