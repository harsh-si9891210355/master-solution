import { Button } from 'primereact/button';
import { classNames } from 'primereact/utils';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'link';
type ButtonSize = 'sm' | 'md' | 'lg';

interface FormButtonProps {
    title?: string;
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
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
    success: 'btn-success',
    ghost: 'btn-ghost',
    link: 'btn-link',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
    sm: 'btn-sm',
    md: 'btn-md',
    lg: 'btn-lg',
};

export const FormButton = ({
    title,
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
            title={title}
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
                { 'w-full': fullWidth, 'btn-disabled': disabled || loading },
                className
            )}
        />
    );
};