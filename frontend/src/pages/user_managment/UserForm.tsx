import { useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { useForm, Controller } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { userService } from "./api/userService";
import type { UserFormValues } from "./types";

const STATUS_OPTIONS = [
  { label: "Active", value: true },
  { label: "Inactive", value: false },
];

const ENABLED_OPTIONS = [
  { label: "Enabled", value: true },
  { label: "Disabled", value: false },
];

const ROLE_OPTIONS = [
  { label: "User", value: "user" },
  { label: "Manager", value: "manager" },
  { label: "Administrator", value: "admin" },
];

const Field = ({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-1">
    <label className="text-sm font-medium text-gray-700">{label}</label>
    {children}
    {error && <span className="text-xs text-red-500">{error}</span>}
  </div>
);

export const UserForm = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserFormValues>({
    defaultValues: {
      email: "",
      password: "",
      first_name_en: "",
      first_name_es: "",
      first_name_fr: "",
      last_name_en: "",
      last_name_es: "",
      last_name_fr: "",
      mobile_number: "",
      role_code: "user",
      is_active: true,
      status: true,
    },
  });

  // Fetch user data when editing
  const { data: userData, isLoading: isFetching } = useQuery({
    queryKey: ["user", id],
    queryFn: () => userService.getUserById(Number(id)).then((r) => r.data),
    enabled: isEdit,
  });

  // Pre-fill form when user data loads
  useEffect(() => {
    if (userData) {
      reset({
        first_name_en: userData.first_name,
        first_name_es: userData.first_name,
        first_name_fr: userData.first_name,
        last_name_en: userData.last_name,
        last_name_es: userData.last_name,
        last_name_fr: userData.last_name,
        mobile_number: userData.mobile_number,
        role_code: userData.role_code,
        is_active: userData.is_active,
        status: userData.status,
      });
    }
  }, [userData, reset]);

  // Create mutation
  const { mutate: createUser, isPending: isCreating } = useMutation({
    mutationFn: (data: UserFormValues) => userService.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      navigate("/users");
    },
    onError: (err: any) => console.error("Create failed:", err.response?.data),
  });

  // Update mutation
  const { mutate: updateUser, isPending: isUpdating } = useMutation({
    mutationFn: (data: UserFormValues) =>
      userService.updateUser(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      navigate("/users");
    },
    onError: (err: any) => console.error("Update failed:", err.response?.data),
  });

  const onSubmit = (data: UserFormValues) => {
    if (isEdit) {
      const { email, password, ...updatePayload } = data;
      updateUser(updatePayload);
    } else {
      createUser(data);
    }
  };

  if (isEdit && isFetching)
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <i className="pi pi-spin pi-spinner mr-2 text-xl" /> Loading user...
      </div>
    );

  return (
    <div className="p-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          icon="pi pi-arrow-left"
          text
          rounded
          onClick={() => navigate("/users")}
        />
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {isEdit ? "Edit User" : "Add User"}
          </h1>
          <p className="text-sm text-gray-400">
            {isEdit
              ? "Update existing user details"
              : "Fill in details to create a new user"}
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          {/* Email & Password */}
          {!isEdit && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Email *" error={errors.email?.message}>
                <Controller
                  name="email"
                  control={control}
                  rules={{ required: "Email is required" }}
                  render={({ field }) => (
                    <InputText
                      {...field}
                      placeholder="you@example.com"
                      className={errors.email ? "p-invalid" : ""}
                    />
                  )}
                />
              </Field>
              <Field label="Password *" error={errors.password?.message}>
                <Controller
                  name="password"
                  control={control}
                  rules={{ required: "Password is required" }}
                  render={({ field }) => (
                    <InputText
                      {...field}
                      type="password"
                      placeholder="••••••••"
                      className={errors.password ? "p-invalid" : ""}
                    />
                  )}
                />
              </Field>
            </div>
          )}

          {/* First Name — EN / ES / FR */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              First Name
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="English *" error={errors.first_name_en?.message}>
                <Controller
                  name="first_name_en"
                  control={control}
                  rules={{ required: "Required" }}
                  render={({ field }) => (
                    <InputText {...field} placeholder="John" />
                  )}
                />
              </Field>
              <Field label="Spanish" error={errors.first_name_es?.message}>
                <Controller
                  name="first_name_es"
                  control={control}
                  render={({ field }) => (
                    <InputText {...field} placeholder="Juan" />
                  )}
                />
              </Field>
              <Field label="French" error={errors.first_name_fr?.message}>
                <Controller
                  name="first_name_fr"
                  control={control}
                  render={({ field }) => (
                    <InputText {...field} placeholder="Jean" />
                  )}
                />
              </Field>
            </div>
          </div>

          {/* Last Name — EN / ES / FR */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Last Name
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="English *" error={errors.last_name_en?.message}>
                <Controller
                  name="last_name_en"
                  control={control}
                  rules={{ required: "Required" }}
                  render={({ field }) => (
                    <InputText {...field} placeholder="Doe" />
                  )}
                />
              </Field>
              <Field label="Spanish" error={errors.last_name_es?.message}>
                <Controller
                  name="last_name_es"
                  control={control}
                  render={({ field }) => (
                    <InputText {...field} placeholder="García" />
                  )}
                />
              </Field>
              <Field label="French" error={errors.last_name_fr?.message}>
                <Controller
                  name="last_name_fr"
                  control={control}
                  render={({ field }) => (
                    <InputText {...field} placeholder="Dupont" />
                  )}
                />
              </Field>
            </div>
          </div>

          {/* Mobile & Role */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Mobile Number *"
              error={errors.mobile_number?.message}
            >
              <Controller
                name="mobile_number"
                control={control}
                rules={{ required: "Mobile is required" }}
                render={({ field }) => (
                  <InputText {...field} placeholder="Mobile number" />
                )}
              />
            </Field>
            <Field label="Role *" error={errors.role_code?.message}>
              <Controller
                name="role_code"
                control={control}
                rules={{ required: "Role is required" }}
                render={({ field }) => (
                  <Dropdown
                    {...field}
                    options={ROLE_OPTIONS}
                    placeholder="Select role"
                    className={errors.role_code ? "p-invalid" : ""}
                  />
                )}
              />
            </Field>
          </div>

          {/* Status & Active — shown for both add and edit */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Active" error={errors.is_active?.message}>
              <Controller
                name="is_active"
                control={control}
                render={({ field }) => (
                  <Dropdown
                    {...field}
                    options={STATUS_OPTIONS}
                    placeholder="Select status"
                  />
                )}
              />
            </Field>
            <Field label="Status" error={errors.status?.message}>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Dropdown
                    {...field}
                    options={ENABLED_OPTIONS}
                    placeholder="Select status"
                  />
                )}
              />
            </Field>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t mt-2">
            <Button
              type="button"
              label="Cancel"
              severity="secondary"
              text
              onClick={() => navigate("/users")}
            />
            <Button
              type="submit"
              label={isEdit ? "Update User" : "Add User"}
              icon={isEdit ? "pi pi-check" : "pi pi-plus"}
              loading={isCreating || isUpdating}
              className="bg-blue-600 border-none"
            />
          </div>
        </form>
      </div>
    </div>
  );
};
