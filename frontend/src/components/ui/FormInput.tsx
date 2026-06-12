import { CSSProperties } from "react";
import { Controller, Control, FieldValues, Path } from "react-hook-form";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { Dropdown } from "primereact/dropdown";
import { classNames } from "primereact/utils";

interface SelectOption {
  label: string;
  value: any;
}

interface FormInputProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label?: string;
  type?: "text" | "password" | "dropdown" | "number";
  error?: string;
  placeholder?: string;
  rules?: object;
  options?: SelectOption[];
  className?: string;
  style?: CSSProperties;
}

export const FormInput = <T extends FieldValues>({
  name,
  control,
  label,
  type = "text",
  error,
  placeholder,
  rules,
  options = [],
  className,
  style,
}: FormInputProps<T>) => {
  // Unified field look — beige fill with a blue border, matching the
  // login / sign-up design (border turns red when the field has an error).
  const fieldStyle: CSSProperties = {
    background: "#F9F6EE",
    border: `1.5px solid ${error ? "#e24c4c" : "#1447e6"}`,
    ...style,
  };
  const fieldClass = classNames("w-full px-4 py-3 text-sm", className);

  return (
    <div className="flex flex-col gap-1.5 mb-4">
      {label && (
        <label
          htmlFor={name}
          className={classNames("font-medium text-sm text-gray-700", {
            "text-red-500": !!error,
          })}
        >
          {label}
          {rules && "required" in rules && (
            <span className="text-red-500 ml-1">*</span>
          )}
        </label>
      )}

      <Controller
        name={name}
        control={control}
        rules={rules}
        render={({ field }) => {
          if (type === "password") {
            return (
              <Password
                {...field}
                id={name}
                placeholder={placeholder}
                toggleMask
                feedback={false}
                className="w-full"
                inputClassName={fieldClass}
                inputStyle={fieldStyle}
              />
            );
          }

          if (type === "dropdown") {
            return (
              <Dropdown
                {...field}
                id={name}
                options={options}
                placeholder={placeholder}
                style={fieldStyle}
                className={classNames("w-full", { "p-invalid": !!error })}
              />
            );
          }

          // Default: text
          return (
            <InputText
              {...field}
              id={name}
              placeholder={placeholder}
              style={fieldStyle}
              className={fieldClass}
            />
          );
        }}
      />

      {error && <small className="text-red-500">{error}</small>}
    </div>
  );
};
