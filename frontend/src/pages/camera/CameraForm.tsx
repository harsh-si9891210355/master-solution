import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useForm, useWatch } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cameraService } from './api/cameraService';
import { locationService } from '../location/api/locationService';
import { translationService } from '../../utils/translationService';
import type { CameraFormValues } from './types/index';
import { FormInput } from '../../components/ui/FormInput';
import { FormButton } from '../../components/ui/FormButton';
import { useNsTranslation } from '../../hooks/Usetranslation';
import { useToast } from '../../components/ui/ToastProvider';
import { useAuthStore } from '@/store/authStore';

export const AddCameraForm = () => {
    const { id } = useParams();
    const isEdit = !!id;
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { t, i18n } = useNsTranslation('camera');
    const toast = useToast();
    const user = useAuthStore((s) => s.user);

    const {
        control,
        handleSubmit,
        reset,
        setValue,
        formState: { errors },
    } = useForm<CameraFormValues>({
        defaultValues: {
            name_en: '', name_es: '', name_fr: '',
            location_id: null,
            codec: '', resolution: '',
            height: 0, fps: '',
            rtsp_url: '',
            substream_rtsp_url: '',
            status: true,
            status_modified_by: user?.id ?? 1,
            usecases: [],
        },
    });
    const shouldSkipTranslateRef = useRef(false);
    const translationRequestIdRef = useRef(0);
    const translationSourceRef = useRef<'name_en' | 'name_es' | null>(null);
    const watchedNameEn = useWatch({ control, name: 'name_en' });
    const watchedNameEs = useWatch({ control, name: 'name_es' });

    const { data: cameraData, isLoading: isFetching } = useQuery({
        queryKey: ['camera', id],
        queryFn:  () => cameraService.getCameraById(Number(id)).then(r => r.data),
        enabled: isEdit,
    });

    const { data: locationsData, isLoading: isLoadingLocations } = useQuery({
        queryKey: ['locations'],
        queryFn: () => locationService.getLocations().then((r) => r.data.locations),
    });

    useEffect(() => {
        if (cameraData) {
            shouldSkipTranslateRef.current = true;
            reset({
                name_en:             cameraData.name_en,
                name_es:             cameraData.name_es ?? '',
                name_fr:             cameraData.name_fr ?? '',
                location_id:         cameraData.location_id,
                codec:               cameraData.codec,
                resolution:          cameraData.resolution,
                height:              cameraData.height,
                fps:                 cameraData.fps,
                rtsp_url:            cameraData.rtsp_url ?? '',
                substream_rtsp_url:  cameraData.substream_rtsp_url ?? '',
                status:              cameraData.status,
                status_modified_by:  cameraData.status_modified_by,
                usecases:            cameraData.usecases,
            });
        }
    }, [cameraData, reset]);

    useEffect(() => {
        if (shouldSkipTranslateRef.current || translationSourceRef.current === 'name_es') {
            shouldSkipTranslateRef.current = false;
            translationSourceRef.current = null;
            return;
        }

        const trimmedNameEn = watchedNameEn?.trim() ?? '';

        if (!trimmedNameEn) {
            translationSourceRef.current = 'name_en';
            setValue('name_es', '', { shouldDirty: true });
            return;
        }

        const requestId = ++translationRequestIdRef.current;
        const timeoutId = window.setTimeout(async () => {
            try {
                const response = await translationService.translateText({
                    text: trimmedNameEn,
                    source_language: 'en',
                    target_languages: ['es'],
                });

                if (translationRequestIdRef.current !== requestId) return;

                translationSourceRef.current = 'name_en';
                setValue('name_es', response.data.translations.es ?? '', {
                    shouldDirty: true,
                    shouldValidate: true,
                });
            } catch (error) {
                console.error('Translation failed:', error);
            }
        }, 400);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [setValue, watchedNameEn]);

    useEffect(() => {
        if (shouldSkipTranslateRef.current || translationSourceRef.current === 'name_en') {
            shouldSkipTranslateRef.current = false;
            translationSourceRef.current = null;
            return;
        }

        const trimmedNameEs = watchedNameEs?.trim() ?? '';

        if (!trimmedNameEs) {
            translationSourceRef.current = 'name_es';
            setValue('name_en', '', { shouldDirty: true });
            return;
        }

        const requestId = ++translationRequestIdRef.current;
        const timeoutId = window.setTimeout(async () => {
            try {
                const response = await translationService.translateText({
                    text: trimmedNameEs,
                    source_language: 'es',
                    target_languages: ['en'],
                });

                if (translationRequestIdRef.current !== requestId) return;

                translationSourceRef.current = 'name_es';
                setValue('name_en', response.data.translations.en ?? '', {
                    shouldDirty: true,
                    shouldValidate: true,
                });
            } catch (error) {
                console.error('Translation failed:', error);
            }
        }, 400);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [setValue, watchedNameEs]);

    const { mutate: createCamera, isPending: isCreating } = useMutation({
        mutationFn: (data: CameraFormValues) => cameraService.createCamera(data),
        onSuccess:  () => {
            queryClient.invalidateQueries({ queryKey: ['cameras'] });
            toast.success(i18n.t('camera:toast_actions.camera_created_title'), i18n.t('camera:toast_actions.camera_created_detail'));
            navigate('/cameras');
        },
        onError:    (err: any) => {
            const detail = err?.response?.data?.detail || i18n.t('camera:toast_actions.camera_create_error_detail');
            toast.error(i18n.t('camera:toast_actions.camera_create_error_title'), detail);
        },
    });

    const { mutate: updateCamera, isPending: isUpdating } = useMutation({
        mutationFn: (data: CameraFormValues) => cameraService.updateCamera(Number(id), data),
        onSuccess:  () => {
            queryClient.invalidateQueries({ queryKey: ['cameras'] });
            toast.success(i18n.t('camera:toast_actions.camera_updated_title'), i18n.t('camera:toast_actions.camera_updated_detail'));
            navigate('/cameras');
        },
        onError:    (err: any) => {
            const detail = err?.response?.data?.detail || i18n.t('camera:toast_actions.camera_update_error_detail');
            toast.error(i18n.t('camera:toast_actions.camera_update_error_title'), detail);
        },
    });

    const onSubmit = (data: CameraFormValues) => {
        const normalizeOptionalText = (value: string | null) => {
            const trimmed = value?.trim();
            return trimmed ? trimmed : null;
        };

        const payload: CameraFormValues = {
            ...data,
            name_es:            normalizeOptionalText(data.name_es),
            name_fr:            normalizeOptionalText(data.name_fr),
            location_id:        data.location_id,
            rtsp_url:           normalizeOptionalText(data.rtsp_url),
            substream_rtsp_url: normalizeOptionalText(data.substream_rtsp_url),
            status_modified_by: user?.id ?? 1,
            usecases:           data.usecases ?? [],
        };
        isEdit ? updateCamera(payload) : createCamera(payload);
    };

    const CODEC_OPTIONS = [
        { label: 'H.264', value: 'H.264' },
        { label: 'H.265', value: 'H.265' },
        { label: 'MJPEG', value: 'MJPEG' },
        { label: 'MPEG-4', value: 'MPEG-4' },
    ];

    const RESOLUTION_OPTIONS = [
        { label: '1280x720', value: '1280x720' },
        { label: '1920x1080', value: '1920x1080' },
        { label: '2560x1440', value: '2560x1440' },
        { label: '3840x2160', value: '3840x2160' },
    ];

    const LOCATION_OPTIONS = (locationsData ?? []).map((location) => ({
        label: location.name,
        value: location.id,
    }));

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
                        <div className="form-grid-2">
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
                                placeholder={
                                    isLoadingLocations
                                        ? t('form.placeholders.location_id_loading')
                                        : t('form.placeholders.location_id')
                                }
                                type="dropdown"
                                options={LOCATION_OPTIONS}
                                rules={{
                                    required: t('form.validation.location_required'),
                                }}
                                error={errors.location_id?.message}
                            />
                            <FormInput<CameraFormValues>
                                name="rtsp_url" control={control}
                                label={t('form.fields.rtsp_url')}
                                placeholder={t('form.placeholders.rtsp_url')}
                                rules={{ required: t('form.validation.rtsp_required') }}
                                error={errors.rtsp_url?.message}
                            />
                            <FormInput<CameraFormValues>
                                name="substream_rtsp_url" control={control}
                                label={t('form.fields.substream_rtsp_url')}
                                placeholder={t('form.placeholders.substream_rtsp_url')}
                                error={errors.substream_rtsp_url?.message}
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
                                type="dropdown"
                                options={CODEC_OPTIONS}
                                rules={{ required: t('form.validation.codec_required') }}
                                error={errors.codec?.message}
                            />
                            <FormInput<CameraFormValues>
                                name="resolution" control={control}
                                label={t('form.fields.resolution')}
                                placeholder={t('form.placeholders.resolution')}
                                type="dropdown"
                                options={RESOLUTION_OPTIONS}
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
