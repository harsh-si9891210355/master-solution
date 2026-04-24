import { Controller, Control, FieldValues, Path } from 'react-hook-form';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { classNames } from 'primereact/utils';

interface FormInputProps<T extends FieldValues> {
    name: Path<T>;
    control: Control<T>;
    label: string;
    type?: 'text' | 'password';
    error?: string;
    placeholder?: string;
}

export const FormInput = <T extends FieldValues>({
    name,
    control,
    label,
    type = 'text',
    error,
    placeholder,
}: FormInputProps<T>) => {
    return (
        <div className="flex flex-col gap-2 mb-4">
            <label htmlFor={name} className={classNames('font-medium', { 'text-red-500': error })}>
                {label}
            </label>
            <Controller
                name={name}
                control={control}
                render={({ field }) => (
                    type === 'password' ? (
                        <Password
                            {...field}
                            id={name}
                            placeholder={placeholder}
                            toggleMask
                            feedback={false}
                            className={classNames({ 'p-invalid': error })}
                            pt={{
                                input: { className: 'w-full p-3' } // Tailwind utility via PassThrough
                            }}
                        />
                    ) : (
                        <InputText
                            {...field}
                            id={name}
                            placeholder={placeholder}
                            className={classNames('p-3', { 'p-invalid': error })}
                        />
                    )
                )}
            />
            {error && <small className="text-red-500">{error}</small>}
        </div>

    );
};