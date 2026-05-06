import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import type { ColumnProps } from 'primereact/column';

export interface TableColumn<T> extends Omit<ColumnProps, 'header' | 'body'> {
    header: string;
    field?: keyof T & string;
    body?: (row: T) => React.ReactNode;
}

interface PrimeTableProps<T> {
    data:          T[] | undefined;
    loading:       boolean;
    columns:       TableColumn<T>[];
    header?:       React.ReactNode;
    globalFilter?: string;
    emptyMessage?: string;
    rows?:         number;
}

export const PrimeTable = <T extends object>({
    data,
    loading,
    columns,
    header,
    globalFilter,
    emptyMessage = 'No records found.',
    rows = 10,
}: PrimeTableProps<T>) => {
    return (
        <DataTable
            value={data}
            loading={loading}
            header={header}
            globalFilter={globalFilter}
            paginator
            rows={rows}
            rowsPerPageOptions={[5, 10, 25]}
            emptyMessage={emptyMessage}
            className="shadow-sm rounded-xl overflow-hidden"
            stripedRows
        >
            {columns.map(({ header: colHeader, body, field, ...rest }, index) => (
                <Column
                    key={index}
                    header={colHeader}
                    field={field}
                    body={body}
                    {...rest}
                />
            ))}
        </DataTable>
    );
};