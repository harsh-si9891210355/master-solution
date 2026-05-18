import { useState } from 'react';
import { useNavigate } from 'react-router';
import type { Usecase } from './types/index';
import { PrimeTable, type TableColumn } from '../../components/ui/Primetable';
import { FormButton } from '../../components/ui/FormButton';
import { DeleteModalPopup } from '../../components/ui/DeleteModalPopup';
import { useNsTranslation } from '../../hooks/Usetranslation';

// ── Demo data ─────────────────────────────────────────────────────────────────
const DEMO_USECASES: Usecase[] = [
    { id: 1, name: 'Face Detection',      description: 'Detect and identify faces in the camera feed in real time.',       status: true  },
    { id: 2, name: 'Intrusion Detection', description: 'Trigger alerts when unauthorized entry into a restricted zone.',   status: true  },
    { id: 3, name: 'Crowd Counting',      description: 'Count the number of people present in a defined area.',            status: false },
    { id: 4, name: 'Vehicle Tracking',    description: 'Track and log vehicle movement across multiple camera frames.',    status: true  },
    { id: 5, name: 'Loitering Detection', description: 'Alert when a person stays in a zone longer than a set duration.', status: false },
];

// ── Status toggle cell (same pattern as UsersList) ────────────────────────────
interface StatusToggleCellProps {
    row:           Usecase;
    onToggle:      (id: number, status: boolean) => void;
    labelActive:   string;
    labelInactive: string;
}

const StatusToggleCell = ({ row, onToggle, labelActive, labelInactive }: StatusToggleCellProps) => (
    <span title={row.status ? labelActive : labelInactive} className="inline-block">
        <FormButton
            type="button"
            variant="ghost"
            label=""
            className={`status-toggle ${row.status ? 'status-toggle--on' : 'status-toggle--off'}`}
            onClick={() => onToggle(row.id, !row.status)}
            ariaLabel={`Toggle status for ${row.name}`}
        />
    </span>
);

// ── Component ─────────────────────────────────────────────────────────────────
export const UsecaseList = () => {
    const { t }    = useNsTranslation('usecase');
    const navigate = useNavigate();

    const [usecases, setUsecases] = useState<Usecase[]>(DEMO_USECASES);

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleToggle = (id: number, status: boolean) => {
        setUsecases(prev => prev.map(u => u.id === id ? { ...u, status } : u));
    };

    const handleDelete = (row: Usecase) => {
        DeleteModalPopup.show({
            message:   t('delete_dialog.message', { name: row.name }),
            header:    t('delete_dialog.header'),
            onConfirm: () => setUsecases(prev => prev.filter(u => u.id !== row.id)),
        });
    };

    // ── Column templates ──────────────────────────────────────────────────────
    const nameTemplate = (row: Usecase) => (
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                <i className="pi pi-tag text-sm" />
            </div>
            <div className="font-medium text-gray-800">{row.name}</div>
        </div>
    );

    const descriptionTemplate = (row: Usecase) => (
        <span className="text-sm text-gray-500">{row.description}</span>
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
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
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

    // ── Column definitions ────────────────────────────────────────────────────
    const columns: TableColumn<Usecase>[] = [
        { header: t('columns.name'),        body: nameTemplate,        sortable: true, sortField: 'name'        },
        { header: t('columns.description'), body: descriptionTemplate, sortable: true, sortField: 'description' },
        { header: t('columns.status'),      body: statusTemplate,      sortable: true, sortField: 'status'      },
        { header: t('columns.actions'),     body: actionsTemplate,     style: { width: '10rem' }                },
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

    return (
        <>
            <DeleteModalPopup.Host />
            <div className="p-4">
                <PrimeTable<Usecase>
                    data={usecases}
                    loading={false}
                    columns={columns}
                    header={tableHeader}
                    emptyMessage={t('empty_message')}
                />
            </div>
        </>
    );
};