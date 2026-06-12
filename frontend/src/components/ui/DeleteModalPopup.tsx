import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';

interface DeleteModalPopupProps {
    message: string;
    header?: string;
    onConfirm: () => void;
}

interface LogoutModalPopupProps {
    message: string;
    header?: string;
    acceptLabel?: string;
    rejectLabel?: string;
    onConfirm: () => void;
}

export const DeleteModalPopup = {
    Host: () => <ConfirmDialog />,
    LogoutHost: () => <ConfirmDialog group="logout" />,
    show: ({ message, header = 'Confirm Delete', onConfirm }: DeleteModalPopupProps) => {
        confirmDialog({
            message,
            header,
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            acceptLabel: 'Delete',
            rejectLabel: 'Cancel',
            accept: onConfirm,
        });
    },
    showLogout: ({ message, header = 'Confirm Logout', acceptLabel = 'Ok', rejectLabel = 'Cancel', onConfirm }: LogoutModalPopupProps) => {
        confirmDialog({
            group: 'logout',
            message,
            header,
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'btn-primary.p-button',
            acceptLabel,
            rejectLabel,
            accept: onConfirm,
        });
    },
};