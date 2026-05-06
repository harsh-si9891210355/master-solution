import { useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { userService } from "./api/UserService";
import { roleService } from "./api/RoleService";
import type { AddUserValues } from "./types";
import { FormInput } from "../../components/ui/FormInput";
import { FormButton } from "../../components/ui/FormButton";
import { useNsTranslation } from "../../hooks/Usenstranslation";
import { SUPPORTED_LANGUAGES } from "../../languages/index";

export const UserForm = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, currentLang, changeLanguage } = useNsTranslation("user_management");

  // ── Fetch roles from API ──────────────────────────────────────────────────
  const { data: rolesData, isLoading: isLoadingRoles } = useQuery({
    queryKey: ["roles"],
    queryFn: () => roleService.getRoles().then(res => res.data.roles),
    staleTime: Infinity,
  });

  const ROLE_OPTIONS = (rolesData ?? []).map(role => ({
    label: role.name,
    value: role.code,
  }));

  // ── Dropdown options from translations ────────────────────────────────────
  const STATUS_OPTIONS = [
    { label: t("form.options.active"),   value: true  },
    { label: t("form.options.inactive"), value: false },
  ];

  const ENABLED_OPTIONS = [
    { label: t("form.options.enabled"),  value: true  },
    { label: t("form.options.disabled"), value: false },
  ];

  // ── Form ──────────────────────────────────────────────────────────────────
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
      role_code:     "",
      is_active:     true,
      status:        true,
    },
  });

  // ── Fetch user for edit ───────────────────────────────────────────────────
  const { data: userData, isLoading: isFetching } = useQuery({
    queryKey: ["user", id],
    queryFn: () => userService.getUserById(Number(id)).then(r => r.data),
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

  // ── Mutations ─────────────────────────────────────────────────────────────
  const { mutate: createUser, isPending: isCreating } = useMutation({
    mutationFn: (data: AddUserValues) => userService.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      navigate("/users");
    },
    onError: (err: any) => console.error("Create failed:", err.response?.data),
  });

  const { mutate: updateUser, isPending: isUpdating } = useMutation({
    mutationFn: (data: AddUserValues) => userService.updateUser(Number(id), data),
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
        <i className="pi pi-spin pi-spinner mr-2 text-xl" />
        {t("form.loading")}
      </div>
    );

  return (
    <div className="p-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FormButton
            label={t("form.back")}
            variant="ghost"
            size="sm"
            iconLeft="pi pi-arrow-left"
            ariaLabel={t("form.back")}
            onClick={() => navigate("/users")}
          />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {isEdit ? t("form.edit_title") : t("form.add_title")}
            </h1>
            <p className="text-sm text-gray-400">
              {isEdit ? t("form.edit_subtitle") : t("form.add_subtitle")}
            </p>
          </div>
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
                label={t("form.fields.email")}
                placeholder={t("form.placeholders.email")}
                rules={{ required: t("form.validation.email_required") }}
                error={errors.email?.message}
              />
              <FormInput<AddUserValues>
                name="password"
                control={control}
                label={t("form.fields.password")}
                type="password"
                placeholder={t("form.placeholders.password")}
                rules={{ required: t("form.validation.password_required") }}
                error={errors.password?.message}
              />
            </div>
          )}

          {/* First Name — EN / ES / FR */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              {t("form.section_first_name")}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4">
              <FormInput<AddUserValues>
                name="first_name_en"
                control={control}
                label={t("form.fields.first_name_en")}
                placeholder={t("form.placeholders.first_name_en")}
                rules={{ required: t("form.validation.first_name_en_required") }}
                error={errors.first_name_en?.message}
              />
              <FormInput<AddUserValues>
                name="first_name_es"
                control={control}
                label={t("form.fields.first_name_es")}
                placeholder={t("form.placeholders.first_name_es")}
                error={errors.first_name_es?.message}
              />
            </div>
          </div>

          {/* Last Name — EN / ES / FR */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              {t("form.section_last_name")}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4">
              <FormInput<AddUserValues>
                name="last_name_en"
                control={control}
                label={t("form.fields.last_name_en")}
                placeholder={t("form.placeholders.last_name_en")}
                rules={{ required: t("form.validation.last_name_en_required") }}
                error={errors.last_name_en?.message}
              />
              <FormInput<AddUserValues>
                name="last_name_es"
                control={control}
                label={t("form.fields.last_name_es")}
                placeholder={t("form.placeholders.last_name_es")}
                error={errors.last_name_es?.message}
              />
            </div>
          </div>

          {/* Mobile & Role */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
            <FormInput<AddUserValues>
              name="mobile_number"
              control={control}
              label={t("form.fields.mobile_number")}
              placeholder={t("form.placeholders.mobile_number")}
              rules={{ required: t("form.validation.mobile_required") }}
              error={errors.mobile_number?.message}
            />
            <FormInput<AddUserValues>
              name="role_code"
              control={control}
              label={t("form.fields.role_code")}
              type="dropdown"
              placeholder={
                isLoadingRoles
                  ? t("form.placeholders.role_code_loading")
                  : t("form.placeholders.role_code")
              }
              options={ROLE_OPTIONS}
              rules={{ required: t("form.validation.role_required") }}
              error={errors.role_code?.message}
            />
          </div>

          {/* Active & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
            <FormInput<AddUserValues>
              name="is_active"
              control={control}
              label={t("form.fields.is_active")}
              type="dropdown"
              placeholder={t("form.placeholders.is_active")}
              options={STATUS_OPTIONS}
              error={errors.is_active?.message}
            />
            <FormInput<AddUserValues>
              name="status"
              control={control}
              label={t("form.fields.status")}
              type="dropdown"
              placeholder={t("form.placeholders.status")}
              options={ENABLED_OPTIONS}
              error={errors.status?.message}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t mt-2">
            <FormButton
              label={t("form.cancel")}
              variant="secondary"
              type="button"
              onClick={() => navigate("/users")}
            />
            <FormButton
              label={isEdit ? t("form.edit_submit") : t("form.add_submit")}
              variant="primary"
              type="submit"
              iconLeft={isEdit ? "pi pi-check" : "pi pi-plus"}
              loading={isCreating || isUpdating}
            />
          </div>
        </form>
      </div>
    </div>
  );
};