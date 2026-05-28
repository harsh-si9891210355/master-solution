import { Dialog } from 'primereact/dialog';
import { FormButton } from '../ui/FormButton';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface ModalAction {
    label:     string;
    variant:   'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
    iconLeft?: string;
    onClick:   () => void;
    loading?:  boolean;
    disabled?: boolean;
}

interface BaseModalProps {
    visible:    boolean;
    onHide:     () => void;
    header:     string;
    children:   React.ReactNode;
    actions?:   ModalAction[];
    width?:     string;
    closable?:  boolean;
    className?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────
export const BaseModal = ({
    visible,
    onHide,
    header,
    children,
    actions    = [],
    width      = 'min(92vw, 42rem)',
    closable   = true,
    className  = '',
}: BaseModalProps) => {
    return (
        <Dialog
            visible={visible}
            onHide={onHide}
            header={header}
            style={{ width }}
            modal
            closable={closable}
            className={className}
        >
            <div className="flex flex-col gap-4">

                {/* ── Content slot ───────────────────────────────────── */}
                {children}

                {/* ── Footer actions (only rendered if actions passed) ─ */}
                {actions.length > 0 && (
                    <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                        {actions.map((action, i) => (
                            <FormButton
                                key={i}
                                label={action.label}
                                variant={action.variant}
                                iconLeft={action.iconLeft}
                                onClick={action.onClick}
                                loading={action.loading}
                                disabled={action.disabled}
                            />
                        ))}
                    </div>
                )}

            </div>
        </Dialog>
    );
};