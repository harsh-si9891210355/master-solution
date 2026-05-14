import { useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { userService } from "./api/UserService";
import { roleService } from "./api/RoleService";
import type { AddUserValues } from "./types";
import { FormInput } from "../../components/ui/FormInput";
import { FormButton } from "../../components/ui/FormButton";
import { useNsTranslation } from "../../hooks/Usetranslation";

export const UserForm = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useNsTranslation("user_management");

  const { data: rolesData, isLoading: isLoadingRoles } = useQuery({
    queryKey: ["roles"],
    queryFn: () => roleService.getRoles().then(res => res.data.roles),
    staleTime: Infinity,
  });

  const ROLE_OPTIONS = (rolesData ?? []).map(role => ({
    label: role.name,
    value: role.code,
  }));

  const STATUS_OPTIONS = [
    { label: t("form.options.active"),   value: true  },
    { label: t("form.options.inactive"), value: false },
  ];

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddUserValues>({
    defaultValues: {
      email:         "",
      password:      "",
      first_name:    "",
      last_name:     "",
      mobile_number: "",
      role_code:     "",
      is_active:     true,
    },
  });

  const { data: userData, isLoading: isFetching } = useQuery({
    queryKey: ["user", id],
    queryFn: () => userService.getUserById(Number(id)).then(r => r.data),
    enabled: isEdit,
  });

  useEffect(() => {
    if (userData) {
      reset({
        email:         userData.email,       
        first_name:    userData.first_name,
        last_name:     userData.last_name,
        mobile_number: userData.mobile_number,
        role_code:     userData.role_code,
        is_active:     userData.is_active,  
      });
    }
  }, [userData, reset]);

  // ── Mutations ────────────────────────────────────────────────────────────
  const { mutate: createUser, isPending: isCreating } = useMutation({
    mutationFn: (data: AddUserValues) => userService.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      navigate("/users");
    },
    onError: (err: any) => console.error("Create failed:", err.response?.data),
  });

  const { mutate: updateUser, isPending: isUpdating } = useMutation({
    mutationFn: ({ profileData, newIsActive }: {
      profileData: any;
      newIsActive: boolean;
    }) =>
      userService.updateUser(Number(id), profileData).then(async () => {
        if (newIsActive !== userData?.is_active) {
          await userService.updateUserStatus(Number(id), newIsActive);
        }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      navigate("/users");
    },
    onError: (err: any) => console.error("Update failed:", err.response?.data),
  });

  const onSubmit = (data: AddUserValues) => {
    if (isEdit) {
      const { password, is_active, ...profileData } = data;
      updateUser({ profileData, newIsActive: is_active ?? userData?.is_active });
    } else {
      createUser(data);
    }
  };

  if (isEdit && isFetching) {
    return (
      <div className="form-loading">
        <i className="pi pi-spin pi-spinner" style={{ fontSize: "22px" }} />
        {t("form.loading")}
      </div>
    );
  }

  return (
    <div className="page-container">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="page-header-row">
        <div className="page-header-row__titles">
          <h1>{isEdit ? t("form.edit_title") : t("form.add_title")}</h1>
          <p>{isEdit ? t("form.edit_subtitle") : t("form.add_subtitle")}</p>
        </div>
        <FormButton
          label={t("form.back")}
          variant="primary"
          size="sm"
          iconLeft="pi pi-arrow-left"
          ariaLabel={t("form.back")}
          onClick={() => navigate("/users")}
        />
      </div>

      {/* ── Form card ────────────────────────────────────────────────────── */}
      <div className="form-card-outer">
        <div className="form-card-outer__accent" />

        <form onSubmit={handleSubmit(onSubmit)}>

          {/* Account credentials — create only */}
          {!isEdit && (
            <div className="form-section">
              <div className="form-section__label-row">
                <span>Account Credentials</span>
                <div className="form-section__divider" />
              </div>
              <div className="form-grid-2">
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
            </div>
          )}

          {/* Personal Info */}
          <div className="form-section">
            <div className="form-section__label-row">
              <span>Personal Info</span>
              <div className="form-section__divider" />
            </div>
            <div className="form-grid-2">
              <FormInput<AddUserValues>
                name="first_name"
                control={control}
                label={t("form.section_first_name")}
                placeholder={t("form.placeholders.first_name")}
                rules={{ required: t("form.validation.first_name_required") }}
                error={errors.first_name?.message}
              />
              <FormInput<AddUserValues>
                name="last_name"
                control={control}
                label={t("form.section_last_name")}
                placeholder={t("form.placeholders.last_name")}
                rules={{ required: t("form.validation.last_name_required") }}
                error={errors.last_name?.message}
              />
            </div>
          </div>

          {/* Contact & Role */}
          <div className="form-section">
            <div className="form-section__label-row">
              <span>Contact & Role</span>
              <div className="form-section__divider" />
            </div>
            <div className="form-grid-2">
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
          </div>

          {/* Account Status — shown in both create and edit */}
          <div className="form-section">
            <div className="form-section__label-row">
              <span>Account Status</span>
              <div className="form-section__divider" />
            </div>
            <div className="form-grid-2">
              <FormInput<AddUserValues>
                name="is_active"
                control={control}
                label={t("form.fields.is_active")}
                type="dropdown"
                placeholder={t("form.placeholders.is_active")}
                options={STATUS_OPTIONS}
                error={errors.is_active?.message}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="form-actions">
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