import { useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { userService } from "./api/UserService";
import { roleService } from "./api/RoleService";
import type { AddUserValues } from "./types";
import { FormInput } from "../../components/ui/FormInput";
import { FormButton } from "../../components/ui/FormButton";
import { useNsTranslation } from "../../hooks/Usetranslation";
import { useToast } from "../../components/ui/ToastProvider";

export const UserForm = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useNsTranslation("user_management");
  const toast = useToast();
  const { i18n } = useTranslation();


  const {
    control,
    handleSubmit,
    reset,
    trigger,
    formState: { errors, isSubmitted },
  } = useForm<AddUserValues>({
    defaultValues: {
      email: "",
      password: "",
      first_name: "",
      last_name: "",
      mobile_number: "",
      role_code: "",
    },
  });

  useEffect(() => {
    if (isSubmitted || Object.keys(errors).length > 0) {
      trigger();
    }
  }, [i18n.language, trigger, isSubmitted]);

  const { data: rolesData, isLoading: isLoadingRoles } = useQuery({
    queryKey: ["roles"],
    queryFn: () => roleService.getRoles().then((res) => res.data.roles),
    staleTime: Infinity,
  });

  const ROLE_OPTIONS = (rolesData ?? []).map((role) => ({
    label: role.name,
    value: role.code,
  }));

  const { data: userData, isLoading: isFetching } = useQuery({
    queryKey: ["user", id],
    queryFn: () => userService.getUserById(Number(id)).then((r) => r.data),
    enabled: isEdit,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (userData) {
      reset({
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        mobile_number: userData.mobile_number,
        role_code: userData.role_code,
      });
    }
  }, [userData, reset]);

  // ── Create ───────────────────────────────────────────────────────────────
  const { mutate: createUser, isPending: isCreating } = useMutation({
    mutationFn: (data: AddUserValues) => userService.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(
        t("toast.user_created_title"),
        t("toast.user_created_detail"),
      );
      navigate("/users");
    },
    onError: (err: any) => {
      const detail =
        err?.response?.data?.detail || t("toast.user_create_error_detail");
      toast.error(t("toast.user_create_error_title"), detail);
    },
  });

  // ── Update ───────────────────────────────────────────────────────────────
  const { mutate: updateUser, isPending: isUpdating } = useMutation({
    mutationFn: (profileData: any) =>
      userService.updateUser(Number(id), profileData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(
        t("toast.user_updated_title"),
        t("toast.user_updated_detail"),
      );
      navigate("/users");
    },
    onError: (err: any) => {
      const detail =
        err?.response?.data?.detail || t("toast.user_update_error_detail");
      toast.error(t("toast.user_update_error_title"), detail);
    },
  });

  const onSubmit = (data: AddUserValues) => {
    if (isEdit) {
      const { password, ...profileData } = data;
      updateUser(profileData);
    } else {
      // Auth0-based onboarding: the admin only supplies the email. The user
      // sets their password and remaining profile details during first login.
      createUser({ email: data.email } as AddUserValues);
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

      <div className="form-card-outer">
        <div className="form-card-outer__accent" />

        <form onSubmit={handleSubmit(onSubmit)}>
          {!isEdit && (
            <div className="form-section">
              <div className="form-section__label-row">
                <span>{t("form.sections.account_credentials")}</span>
                <div className="form-section__divider" />
              </div>
              <FormInput<AddUserValues>
                name="email"
                control={control}
                label={t("form.fields.email")}
                placeholder={t("form.placeholders.email")}
                rules={{
                  validate: {
                    required: (v: string) =>
                      !!v || t("form.validation.email_required"),
                    pattern: (v: string) =>
                      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ||
                      t("form.validation.email_invalid"),
                  },
                }}
                error={errors.email?.message}
              />
            </div>
          )}

          {isEdit && (
          <>
          <div className="form-section">
            <div className="form-section__label-row">
              <span>{t("form.sections.personal_info")}</span>
              <div className="form-section__divider" />
            </div>
            <div className="form-grid-2">
              <FormInput<AddUserValues>
                name="first_name"
                control={control}
                label={t("form.section_first_name")}
                placeholder={t("form.placeholders.first_name")}
                rules={{
                  validate: {
                    required: (v: string) =>
                      !!v || t("form.validation.first_name_required"),
                    minLength: (v: string) =>
                      v.length >= 2 || t("form.validation.first_name_min"),
                  },
                }}
                error={errors.first_name?.message}
              />
              <FormInput<AddUserValues>
                name="last_name"
                control={control}
                label={t("form.section_last_name")}
                placeholder={t("form.placeholders.last_name")}
                rules={{
                  validate: {
                    required: (v: string) =>
                      !!v || t("form.validation.last_name_required"),
                    minLength: (v: string) =>
                      v.length >= 2 || t("form.validation.last_name_min"),
                  },
                }}
                error={errors.last_name?.message}
              />
            </div>
          </div>

          <div className="form-section">
            <div className="form-section__label-row">
              <span>{t("form.sections.contact_role")}</span>
              <div className="form-section__divider" />
            </div>
            <div className="form-grid-2">
              <FormInput<AddUserValues>
                name="mobile_number"
                control={control}
                label={t("form.fields.mobile_number")}
                placeholder={t("form.placeholders.mobile_number")}
                rules={{
                  validate: {
                    required: (v: string) =>
                      !!v || t("form.validation.mobile_required"),
                    numeric: (v: string) =>
                      /^[0-9]+$/.test(v) || t("form.validation.mobile_numeric"),
                    length: (v: string) =>
                      v.length === 10 || t("form.validation.mobile_length"),
                  },
                }}
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
                rules={{
                  validate: {
                    required: (v: string) => !!v || t("form.validation.role_required"),
                  },
                }}
                error={errors.role_code?.message}
              />
            </div>
          </div>
          </>
          )}

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
