import { Button } from 'primereact/button';
import { classNames } from 'primereact/utils';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'link';
type ButtonSize = 'sm' | 'md' | 'lg';

interface FormButtonProps {
    label: string;
    variant?: ButtonVariant;
    size?: ButtonSize;
    fullWidth?: boolean;
    loading?: boolean;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
    onClick?: () => void;
    className?: string;
    iconLeft?: string;
    iconRight?: string;
    ariaLabel?: string;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
    primary:   'bg-blue-600 hover:bg-blue-700 border-blue-600 text-white',
    secondary: 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-800',
    danger:    'bg-red-600 hover:bg-red-700 border-red-600 text-white',
    success:   'bg-green-600 hover:bg-green-700 border-green-600 text-white',
    ghost:     'bg-transparent hover:bg-gray-100 border border-gray-300 text-gray-700',
    link:      'bg-transparent border-none text-blue-600 hover:underline shadow-none p-0',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
    sm: 'text-sm px-3 py-1.5',
    md: 'text-base px-4 py-2.5',
    lg: 'text-lg px-5 py-3',
};

export const FormButton = ({
    label,
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    loading = false,
    disabled = false,
    type = 'button',
    onClick,
    className = '',
    iconLeft,
    iconRight,
    ariaLabel,
}: FormButtonProps) => {
    const icon = iconLeft ?? iconRight;
    const iconPos = iconRight && !iconLeft ? 'right' : 'left';

    return (
        <Button
            type={type}
            label={label}
            icon={icon}
            iconPos={iconPos}
            loading={loading}
            disabled={disabled || loading}
            onClick={onClick}
            aria-label={ariaLabel ?? label}
            className={classNames(
                VARIANT_CLASSES[variant],
                SIZE_CLASSES[size],
                {
                    'w-full': fullWidth,
                    'opacity-60 cursor-not-allowed': disabled || loading,
                },
                className
            )}
        />
    );
};