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
  label: string;
  type?: "text" | "password" | "dropdown" | "number";
  error?: string;
  placeholder?: string;
  rules?: object;
  options?: SelectOption[];
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
}: FormInputProps<T>) => {
  return (
    <div className="flex flex-col gap-2 mb-4">
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
                className={classNames({ "p-invalid": !!error })}
                pt={{ input: { className: "w-full p-3" } }}
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
              className={classNames("p-3", { "p-invalid": !!error })}
            />
          );
        }}
      />

      {error && <small className="text-red-500">{error}</small>}
    </div>
  );
};
