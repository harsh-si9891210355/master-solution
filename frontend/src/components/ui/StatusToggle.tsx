import { useState } from 'react';

interface StatusToggleProps {
    active: boolean;
    /** Called with the new value; may be async (optimistic update upstream). */
    onToggle: () => void | Promise<void>;
    labelActive?: string;
    labelInactive?: string;
    /** Externally disable the toggle (e.g. can't deactivate your own account). */
    disabled?: boolean;
    /** Tooltip shown when disabled externally. */
    disabledTitle?: string;
}

/**
 * Sliding on/off status switch with a label — blue when active, grey when
 * inactive. Shared by the Users, Cameras and Usecases tables.
 */
export const StatusToggle = ({
    active,
    onToggle,
    labelActive,
    labelInactive,
    disabled,
    disabledTitle,
}: StatusToggleProps) => {
    const [busy, setBusy] = useState(false);
    const isDisabled = busy || !!disabled;

    const handleClick = async () => {
        if (isDisabled) return;
        setBusy(true);
        try {
            await onToggle();
        } finally {
            setBusy(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={isDisabled}
            title={disabled ? disabledTitle : active ? labelActive : labelInactive}
            aria-label={active ? labelActive : labelInactive}
            className="inline-flex items-center gap-2 disabled:opacity-60"
            style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
            }}
        >
            {/* Track */}
            <span
                style={{
                    position: 'relative',
                    display: 'inline-block',
                    width: 38,
                    height: 20,
                    borderRadius: 99,
                    background: active ? '#1447e6' : '#cbd5e1',
                    transition: 'background 0.2s',
                    flexShrink: 0,
                }}
            >
                {/* Thumb */}
                <span
                    style={{
                        position: 'absolute',
                        top: 2,
                        left: 2,
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: '#fff',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                        transform: active ? 'translateX(18px)' : 'translateX(0)',
                        transition: 'transform 0.2s',
                    }}
                />
            </span>
            <span
                style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: active ? '#1447e6' : '#94a3b8',
                }}
            >
                {active ? labelActive : labelInactive}
            </span>
        </button>
    );
};
