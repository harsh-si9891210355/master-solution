import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';

interface DeleteModalPopupProps {
    message: string;
    header?: string;
    onConfirm: () => void;
}

export const DeleteModalPopup = {
    Host: () => <ConfirmDialog />,
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
};