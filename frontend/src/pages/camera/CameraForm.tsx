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

// ── Codec / resolution presets ────────────────────────────────────────────────

export const AddCameraForm = () => {
    const { id }      = useParams();
    const isEdit      = !!id;
    const navigate    = useNavigate();
    const queryClient = useQueryClient();
    const { t }       = useNsTranslation('camera');

    // Get logged-in user id for status_modified_by
    const user = useAuthStore((s) => s.user);

    // ── Form ──────────────────────────────────────────────────────────────────
    const {
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<CameraFormValues>({
        defaultValues: {
            name_en:            '',
            name_es:            '',
            name_fr:            '',
            location_id:        null,   
            codec:              '',
            resolution:         '',
            height:             0,
            fps:                '',
            rtsp_url:           '',
            status:             true,
            status_modified_by: user?.id ?? 1,
            usecases:           [],    
        },
    });

    // ── useFieldArray for dynamic usecases list ───────────────────────────────
    const { fields: usecaseFields, append: appendUsecase, remove: removeUsecase } =
        useFieldArray({ control, name: 'usecases' });

    // ── Fetch camera for edit ─────────────────────────────────────────────────
    const { data: cameraData, isLoading: isFetching } = useQuery({
        queryKey: ['camera', id],
        queryFn:  () => cameraService.getCameraById(Number(id)).then(r => r.data),
        enabled:  isEdit,
    });

    useEffect(() => {
        if (cameraData) {
            reset({
                name_en:            cameraData.name_en,
                name_es:            cameraData.name_es,
                name_fr:            cameraData.name_fr,
                location_id:        cameraData.location_id,        
                codec:              cameraData.codec,
                resolution:         cameraData.resolution,
                height:             cameraData.height,
                fps:                cameraData.fps,
                rtsp_url:           cameraData.rtsp_url,
                status:             cameraData.status,
                status_modified_by: cameraData.status_modified_by,
                usecases:           cameraData.usecases,          
            });
        }
    }, [cameraData, reset]);

    // ── Mutations ─────────────────────────────────────────────────────────────
    const { mutate: createCamera, isPending: isCreating } = useMutation({
        mutationFn: (data: CameraFormValues) => cameraService.createCamera(data),
        onSuccess:  () => {
            queryClient.invalidateQueries({ queryKey: ['cameras'] });
            navigate('/cameras');
        },
        onError: (err: any) => console.error('Create failed:', err.response?.data),
    });

    const { mutate: updateCamera, isPending: isUpdating } = useMutation({
        mutationFn: (data: CameraFormValues) => cameraService.updateCamera(Number(id), data),
        onSuccess:  () => {
            queryClient.invalidateQueries({ queryKey: ['cameras'] });
            navigate('/cameras');
        },
        onError: (err: any) => console.error('Update failed:', err.response?.data),
    });

    const onSubmit = (data: CameraFormValues) => {
        const payload: CameraFormValues = {
            ...data,
            location_id:        data.location_id,          
            status_modified_by: user?.id ?? 1,            
            usecases:           data.usecases ?? [],       
        };

        if (isEdit) {
            updateCamera(payload);
        } else {
            createCamera(payload);
        }
    };

    // ── Status options ────────────────────────────────────────────────────────
    const STATUS_OPTIONS = [
        { label: t('form.options.active'),   value: true  },
        { label: t('form.options.inactive'), value: false },
    ];

    if (isEdit && isFetching) return (
        <div className="flex items-center justify-center h-64 text-gray-400">
            <i className="pi pi-spin pi-spinner mr-2 text-xl" /> {t('form.loading')}
        </div>
    );

    return (
        <div className="p-4 max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <FormButton
                    label={t('form.back')}
                    variant="ghost"
                    size="sm"
                    iconLeft="pi pi-arrow-left"
                    ariaLabel={t('form.back')}
                    onClick={() => navigate('/cameras')}
                />
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">
                        {isEdit ? t('form.edit_title') : t('form.add_title')}
                    </h1>
                    <p className="text-sm text-gray-400">
                        {isEdit ? t('form.edit_subtitle') : t('form.add_subtitle')}
                    </p>
                </div>
            </div>

            {/* Form Card */}
            <div className="bg-white rounded-xl shadow-sm p-6">
                <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2">

                    {/* Camera Name — EN / ES / FR */}
                    <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                            {t('form.section_name')}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4">
                            <FormInput<CameraFormValues>
                                name="name_en"
                                control={control}
                                label={t('form.fields.name_en')}
                                placeholder={t('form.placeholders.name_en')}
                                rules={{ required: t('form.validation.name_en_required') }}
                                error={errors.name_en?.message}
                            />
                            <FormInput<CameraFormValues>
                                name="name_es"
                                control={control}
                                label={t('form.fields.name_es')}
                                placeholder={t('form.placeholders.name_es')}
                                error={errors.name_es?.message}
                            />
                            <FormInput<CameraFormValues>
                                name="name_fr"
                                control={control}
                                label={t('form.fields.name_fr')}
                                placeholder={t('form.placeholders.name_fr')}
                                error={errors.name_fr?.message}
                            />
                        </div>
                    </div>

                    
                    <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                            {t('form.section_location')}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                            <FormInput<CameraFormValues>
                                name="location_id"
                                control={control}
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
                    <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                            {t('form.section_technical')}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                            <FormInput<CameraFormValues>
                                name="codec"
                                control={control}
                                label={t('form.fields.codec')}
                                placeholder={t('form.placeholders.codec')}
                                rules={{ required: t('form.validation.codec_required') }}
                                error={errors.codec?.message}
                            />
                            <FormInput<CameraFormValues>
                                name="resolution"
                                control={control}
                                label={t('form.fields.resolution')}
                                placeholder={t('form.placeholders.resolution')}
                                rules={{ required: t('form.validation.resolution_required') }}
                                error={errors.resolution?.message}
                            />
                            <FormInput<CameraFormValues>
                                name="fps"
                                control={control}
                                label={t('form.fields.fps')}
                                placeholder={t('form.placeholders.fps')}
                                rules={{ required: t('form.validation.fps_required') }}
                                error={errors.fps?.message}
                            />
                            <FormInput<CameraFormValues>
                                name="height"
                                control={control}
                                label={t('form.fields.height')}
                                placeholder={t('form.placeholders.height')}
                                error={errors.height?.message}
                            />
                        </div>
                    </div>

                    {/* RTSP URL */}
                    <FormInput<CameraFormValues>
                        name="rtsp_url"
                        control={control}
                        label={t('form.fields.rtsp_url')}
                        placeholder={t('form.placeholders.rtsp_url')}
                        rules={{ required: t('form.validation.rtsp_required') }}
                        error={errors.rtsp_url?.message}
                    />

                    {/* Status */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                        <FormInput<CameraFormValues>
                            name="status"
                            control={control}
                            label={t('form.fields.status')}
                            type="dropdown"
                            placeholder={t('form.placeholders.status')}
                            options={STATUS_OPTIONS}
                            error={errors.status?.message}
                        />
                    </div>

                   
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                {t('form.section_usecases')}
                            </p>
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
                            <p className="text-sm text-gray-400 italic py-2">
                                {t('form.no_usecases')}
                            </p>
                        )}

                        {usecaseFields.map((field, index) => (
                            <div
                                key={field.id}
                                className="flex items-end gap-3 mb-3 p-3 bg-gray-50 rounded-lg border border-gray-100"
                            >
                                {/* usecase_id */}
                                <div className="flex-1">
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

                                {/* is_active */}
                                <div className="flex-1">
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

                                {/* Remove button */}
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
                    <div className="flex items-center justify-end gap-3 pt-4 border-t mt-2">
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