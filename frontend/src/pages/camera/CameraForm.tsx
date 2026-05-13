import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useForm, useFieldArray } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cameraService } from './api/cameraService';
import type { CameraFormValues } from './types/index';
import { FormInput } from '../../components/ui/FormInput';
import { FormButton } from '../../components/ui/FormButton';
import { useNsTranslation } from '../../hooks/Usetranslation';
import { useAuthStore } from '@/store/authStore';

export const AddCameraForm = () => {
    const { id } = useParams();
    const isEdit = !!id;
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { t } = useNsTranslation('camera');
    const user = useAuthStore((s) => s.user);

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<CameraFormValues>({
        defaultValues: {
            name_en: '', name_es: '', name_fr: '',
            location_id: null,
            codec: '', resolution: '',
            height: 0, fps: '',
            rtsp_url: '',
            status: true,
            status_modified_by: user?.id ?? 1,
            usecases: [],
        },
    });

    const { fields: usecaseFields, append: appendUsecase, remove: removeUsecase } =
        useFieldArray({ control, name: 'usecases' });

    const { data: cameraData, isLoading: isFetching } = useQuery({
        queryKey: ['camera', id],
        queryFn:  () => cameraService.getCameraById(Number(id)).then(r => r.data),
        enabled: isEdit,
    });

    useEffect(() => {
        if (cameraData) {
            reset({
                name_en:             cameraData.name_en,
                name_es:             cameraData.name_es,
                name_fr:             cameraData.name_fr,
                location_id:         cameraData.location_id,
                codec:               cameraData.codec,
                resolution:          cameraData.resolution,
                height:              cameraData.height,
                fps:                 cameraData.fps,
                rtsp_url:            cameraData.rtsp_url,
                status:              cameraData.status,
                status_modified_by:  cameraData.status_modified_by,
                usecases:            cameraData.usecases,
            });
        }
    }, [cameraData, reset]);

    const { mutate: createCamera, isPending: isCreating } = useMutation({
        mutationFn: (data: CameraFormValues) => cameraService.createCamera(data),
        onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['cameras'] }); navigate('/cameras'); },
        onError:    (err: any) => console.error('Create failed:', err.response?.data),
    });

    const { mutate: updateCamera, isPending: isUpdating } = useMutation({
        mutationFn: (data: CameraFormValues) => cameraService.updateCamera(Number(id), data),
        onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['cameras'] }); navigate('/cameras'); },
        onError:    (err: any) => console.error('Update failed:', err.response?.data),
    });

    const onSubmit = (data: CameraFormValues) => {
        const payload: CameraFormValues = {
            ...data,
            location_id:        data.location_id,
            status_modified_by: user?.id ?? 1,
            usecases:           data.usecases ?? [],
        };
        isEdit ? updateCamera(payload) : createCamera(payload);
    };

    const STATUS_OPTIONS = [
        { label: t('form.options.active'),   value: true  },
        { label: t('form.options.inactive'), value: false },
    ];

    if (isEdit && isFetching) {
        return (
            <div className="form-loading">
                <i className="pi pi-spin pi-spinner" style={{ fontSize: '22px' }} />
                {t('form.loading')}
            </div>
        );
    }

    return (
        <div className="page-container">

            {/* ── Page header ───────────────────────────────────────────── */}
            <div className="page-header-row">
                <div className="page-header-row__titles">
                    <h1>{isEdit ? t('form.edit_title') : t('form.add_title')}</h1>
                    <p>{isEdit ? t('form.edit_subtitle') : t('form.add_subtitle')}</p>
                </div>
                <div className="flex items-center gap-3">
                <FormButton
                    label={t('form.back')}
                    variant="primary"
                    size="sm"
                    iconLeft="pi pi-arrow-left"
                    ariaLabel={t('form.back')}
                    onClick={() => navigate('/cameras')}
                />
                </div>
            </div>

            {/* ── Form card ─────────────────────────────────────────────── */}
            <div className="form-card-outer">
                <div className="form-card-outer__accent" />

                <form onSubmit={handleSubmit(onSubmit)}>

                    {/* Camera Name */}
                    <div className="form-section">
                        <div className="form-section__label-row">
                            <span>{t('form.section_name')}</span>
                            <div className="form-section__divider" />
                        </div>
                        <div className="form-grid-3">
                            <FormInput<CameraFormValues>
                                name="name_en" control={control}
                                label={t('form.fields.name_en')}
                                placeholder={t('form.placeholders.name_en')}
                                rules={{ required: t('form.validation.name_en_required') }}
                                error={errors.name_en?.message}
                            />
                            <FormInput<CameraFormValues>
                                name="name_es" control={control}
                                label={t('form.fields.name_es')}
                                placeholder={t('form.placeholders.name_es')}
                                error={errors.name_es?.message}
                            />
                            <FormInput<CameraFormValues>
                                name="name_fr" control={control}
                                label={t('form.fields.name_fr')}
                                placeholder={t('form.placeholders.name_fr')}
                                error={errors.name_fr?.message}
                            />
                        </div>
                    </div>

                    {/* Location */}
                    <div className="form-section">
                        <div className="form-section__label-row">
                            <span>{t('form.section_location')}</span>
                            <div className="form-section__divider" />
                        </div>
                        <div className="form-grid-2">
                            <FormInput<CameraFormValues>
                                name="location_id" control={control}
                                label={t('form.fields.location_id')}
                                placeholder={t('form.placeholders.location_id')}
                                type="number"
                                rules={{
                                    required: t('form.validation.location_required'),
                                    min: { value: 1, message: t('form.validation.location_invalid') },
                                }}
                                error={errors.location_id?.message}
                            />
                        </div>
                    </div>

                    {/* Technical Details */}
                    <div className="form-section">
                        <div className="form-section__label-row">
                            <span>{t('form.section_technical')}</span>
                            <div className="form-section__divider" />
                        </div>
                        <div className="form-grid-2">
                            <FormInput<CameraFormValues>
                                name="codec" control={control}
                                label={t('form.fields.codec')}
                                placeholder={t('form.placeholders.codec')}
                                rules={{ required: t('form.validation.codec_required') }}
                                error={errors.codec?.message}
                            />
                            <FormInput<CameraFormValues>
                                name="resolution" control={control}
                                label={t('form.fields.resolution')}
                                placeholder={t('form.placeholders.resolution')}
                                rules={{ required: t('form.validation.resolution_required') }}
                                error={errors.resolution?.message}
                            />
                            <FormInput<CameraFormValues>
                                name="fps" control={control}
                                label={t('form.fields.fps')}
                                placeholder={t('form.placeholders.fps')}
                                rules={{ required: t('form.validation.fps_required') }}
                                error={errors.fps?.message}
                            />
                            <FormInput<CameraFormValues>
                                name="height" control={control}
                                label={t('form.fields.height')}
                                placeholder={t('form.placeholders.height')}
                                error={errors.height?.message}
                            />
                        </div>
                    </div>

                    {/* RTSP URL */}
                    <div className="form-section">
                        <FormInput<CameraFormValues>
                            name="rtsp_url" control={control}
                            label={t('form.fields.rtsp_url')}
                            placeholder={t('form.placeholders.rtsp_url')}
                            rules={{ required: t('form.validation.rtsp_required') }}
                            error={errors.rtsp_url?.message}
                        />
                    </div>

                    {/* Status */}
                    <div className="form-section">
                        <div className="form-grid-2">
                            <FormInput<CameraFormValues>
                                name="status" control={control}
                                label={t('form.fields.status')}
                                type="dropdown"
                                placeholder={t('form.placeholders.status')}
                                options={STATUS_OPTIONS}
                                error={errors.status?.message}
                            />
                        </div>
                    </div>

                    {/* Usecases */}
                    <div className="form-section" style={{ paddingBottom: '4px' }}>
                        <div className="usecase-header">
                            <div className="usecase-header__left">
                                <span className="form-section__label-row" style={{ margin: 0 }}>
                                    {t('form.section_usecases')}
                                </span>
                                <div className="form-section__divider" />
                            </div>
                            <FormButton
                                label={t('form.add_usecase')}
                                variant="ghost"
                                size="sm"
                                type="button"
                                iconLeft="pi pi-plus"
                                onClick={() => appendUsecase({ usecase_id: 0, is_active: true })}
                            />
                        </div>

                        {usecaseFields.length === 0 && (
                            <p className="form-empty-note">{t('form.no_usecases')}</p>
                        )}

                        {usecaseFields.map((field, index) => (
                            <div key={field.id} className="usecase-row">
                                <div className="usecase-row__field">
                                    <FormInput<CameraFormValues>
                                        name={`usecases.${index}.usecase_id`}
                                        control={control}
                                        label={t('form.fields.usecase_id')}
                                        placeholder={t('form.placeholders.usecase_id')}
                                        type="number"
                                        rules={{
                                            required: t('form.validation.usecase_id_required'),
                                            min: { value: 1, message: t('form.validation.usecase_id_invalid') },
                                        }}
                                        error={(errors.usecases?.[index] as any)?.usecase_id?.message}
                                    />
                                </div>
                                <div className="usecase-row__field">
                                    <FormInput<CameraFormValues>
                                        name={`usecases.${index}.is_active`}
                                        control={control}
                                        label={t('form.fields.usecase_is_active')}
                                        type="dropdown"
                                        placeholder={t('form.placeholders.usecase_is_active')}
                                        options={STATUS_OPTIONS}
                                        error={(errors.usecases?.[index] as any)?.is_active?.message}
                                    />
                                </div>
                                <FormButton
                                    label=""
                                    variant="ghost"
                                    size="sm"
                                    type="button"
                                    iconLeft="pi pi-trash"
                                    ariaLabel={t('form.remove_usecase')}
                                    onClick={() => removeUsecase(index)}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="form-actions">
                        <FormButton
                            label={t('form.cancel')}
                            variant="secondary"
                            type="button"
                            onClick={() => navigate('/cameras')}
                        />
                        <FormButton
                            label={isEdit ? t('form.edit_submit') : t('form.add_submit')}
                            variant="primary"
                            type="submit"
                            iconLeft={isEdit ? 'pi pi-check' : 'pi pi-plus'}
                            loading={isCreating || isUpdating}
                        />
                    </div>

                </form>
            </div>
        </div>
    );
};