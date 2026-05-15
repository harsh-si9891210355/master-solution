import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cameraService } from './api/cameraService';
import { locationService } from '../location/api/locationService';
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
                                rules={{ required: t('form.validation.name_es_required') }}
                                error={errors.name_es?.message}
                            />
                            <FormInput<CameraFormValues>
                                name="name_fr" control={control}
                                label={t('form.fields.name_fr')}
                                placeholder={t('form.placeholders.name_fr')}
                                rules={{ required: t('form.validation.name_fr_required') }}
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
