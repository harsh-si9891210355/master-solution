import { useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "primereact/button";
import { userService } from "./api/userService";
import type { AddUserValues } from "./types";
import { FormInput } from "../../components/ui/FormInput";

const STATUS_OPTIONS = [
  { label: "Active",   value: true  },
  { label: "Inactive", value: false },
];

const ENABLED_OPTIONS = [
  { label: "Enabled",  value: true  },
  { label: "Disabled", value: false },
];

const ROLE_OPTIONS = [
  { label: "User",          value: "user"    },
  { label: "Manager",       value: "manager" },
  { label: "Administrator", value: "admin"   },
];

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
  } = useForm<AddUserValues>({
    defaultValues: {
      email:         "",
      password:      "",
      first_name_en: "",
      first_name_es: "",
      first_name_fr: "",
      last_name_en:  "",
      last_name_es:  "",
      last_name_fr:  "",
      mobile_number: "",
      role_code:     "user",
      is_active:     true,
      status:        true,
    },
  });

  const { data: userData, isLoading: isFetching } = useQuery({
    queryKey: ["user", id],
    queryFn: () => userService.getUserById(Number(id)).then((r) => r.data),
    enabled: isEdit,
  });

  useEffect(() => {
    if (userData) {
      reset({
        first_name_en: userData.first_name_en ?? userData.first_name,
        first_name_es: userData.first_name_es ?? userData.first_name,
        first_name_fr: userData.first_name_fr ?? userData.first_name,
        last_name_en:  userData.last_name_en  ?? userData.last_name,
        last_name_es:  userData.last_name_es  ?? userData.last_name,
        last_name_fr:  userData.last_name_fr  ?? userData.last_name,
        mobile_number: userData.mobile_number,
        role_code:     userData.role_code,
        is_active:     userData.is_active,
        status:        userData.status,
      });
    }
  }, [userData, reset]);

  const { mutate: createUser, isPending: isCreating } = useMutation({
    mutationFn: (data: AddUserValues) => userService.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      navigate("/users");
    },
    onError: (err: any) => console.error("Create failed:", err.response?.data),
  });

  const { mutate: updateUser, isPending: isUpdating } = useMutation({
    mutationFn: (data: AddUserValues) =>
      userService.updateUser(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      navigate("/users");
    },
    onError: (err: any) => console.error("Update failed:", err.response?.data),
  });

  const onSubmit = (data: AddUserValues) => {
    if (isEdit) {
      const { email, password, ...updatePayload } = data;
      updateUser(updatePayload as AddUserValues);
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
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2">

          {/* Email & Password — create only */}
          {!isEdit && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
              <FormInput<AddUserValues>
                name="email"
                control={control}
                label="Email *"
                placeholder="you@example.com"
                rules={{ required: "Email is required" }}
                error={errors.email?.message}
              />
              <FormInput<AddUserValues>
                name="password"
                control={control}
                label="Password *"
                type="password"
                placeholder="••••••••"
                rules={{ required: "Password is required" }}
                error={errors.password?.message}
              />
            </div>
          )}

          {/* First Name — EN / ES / FR */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              First Name
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4">
              <FormInput<AddUserValues>
                name="first_name_en"
                control={control}
                label="English *"
                placeholder="John"
                rules={{ required: "Required" }}
                error={errors.first_name_en?.message}
              />
              <FormInput<AddUserValues>
                name="first_name_es"
                control={control}
                label="Spanish"
                placeholder="Juan"
                error={errors.first_name_es?.message}
              />
              <FormInput<AddUserValues>
                name="first_name_fr"
                control={control}
                label="French"
                placeholder="Jean"
                error={errors.first_name_fr?.message}
              />
            </div>
          </div>

          {/* Last Name — EN / ES / FR */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Last Name
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4">
              <FormInput<AddUserValues>
                name="last_name_en"
                control={control}
                label="English *"
                placeholder="Doe"
                rules={{ required: "Required" }}
                error={errors.last_name_en?.message}
              />
              <FormInput<AddUserValues>
                name="last_name_es"
                control={control}
                label="Spanish"
                placeholder="García"
                error={errors.last_name_es?.message}
              />
              <FormInput<AddUserValues>
                name="last_name_fr"
                control={control}
                label="French"
                placeholder="Dupont"
                error={errors.last_name_fr?.message}
              />
            </div>
          </div>

          {/* Mobile & Role */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
            <FormInput<AddUserValues>
              name="mobile_number"
              control={control}
              label="Mobile Number *"
              placeholder="Mobile number"
              rules={{ required: "Mobile is required" }}
              error={errors.mobile_number?.message}
            />
            <FormInput<AddUserValues>
              name="role_code"
              control={control}
              label="Role *"
              type="dropdown"
              placeholder="Select role"
              options={ROLE_OPTIONS}
              rules={{ required: "Role is required" }}
              error={errors.role_code?.message}
            />
          </div>

          {/* Active & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
            <FormInput<AddUserValues>
              name="is_active"
              control={control}
              label="Active"
              type="dropdown"
              placeholder="Select status"
              options={STATUS_OPTIONS}
              error={errors.is_active?.message}
            />
            <FormInput<AddUserValues>
              name="status"
              control={control}
              label="Status"
              type="dropdown"
              placeholder="Select status"
              options={ENABLED_OPTIONS}
              error={errors.status?.message}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t mt-2">
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