import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useForm, useWatch } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cameraService } from './api/cameraService';
import { locationService } from '../location/api/locationService';
import { translationService } from '../../utils/translationService';
import type { CameraFormValues, CameraUsecase } from './types/index';
import type { Camera } from './types/index';
import { FormInput } from '../../components/ui/FormInput';
import { FormButton } from '../../components/ui/FormButton';
import { useNsTranslation } from '../../hooks/Usetranslation';
import { useToast } from '../../components/ui/ToastProvider';
import { useAuthStore } from '@/store/authStore';

// ── Payload builder ───────────────────────────────────────────────────────────
const buildCameraPayload = (data: CameraFormValues, userId: number): Partial<Camera> => {
    const normalize = (v: string | null | undefined) => v?.trim() || null;

    return {
        identity: {
            id: 0,
            code: null,
            displayName: data.name_en.trim(),
            en: data.name_en.trim(),
            es: normalize(data.name_es) ?? data.name_en.trim(),
            fr: normalize(data.name_fr) ?? data.name_en.trim(),
            tags: null,
        },
        location: {
            siteId: null,
            locationId: data.location_id!,
            zoneId: null,
            zoneType: null,
            locationName: '',
        },
        connectivity: {
            protocol: normalize(data.protocol),
            ipAddress: normalize(data.ip_address),
            port: data.port ?? null,
            credentials: null,
            isOnline: null,
            lastHeartbeatAt: null,
            rtspUrl: normalize(data.rtsp_url) ?? '',
            substreamRtspUrl: normalize(data.substream_rtsp_url),
        },
        video: {
            codec: data.codec,
            nativeResolution: data.resolution,
            nativeFps: Number(data.fps),
            height: Number(data.height),
            streams: null,
        },
        ai: {
            enabled: data.ai_enabled,
            processingMode: data.processing_mode,
            useCases: data.usecases ?? [],
            regionsOfInterest: null,
            schedules: null,
        },
        recording: {
            enabled: data.recording_enabled,
            retentionDays: data.retention_days ?? null,
            storageTier: data.storage_tier,
        },
        alerts: {
            enabled: data.alerts_enabled,
            rules: null,
        },
        capabilities: {
            isPTZ: data.is_ptz,
            supportsEdgeAI: data.supports_edge_ai,
            supportsAudio: data.supports_audio,
        },
        status: {
            active: data.status,
            createdAt: new Date().toISOString(),
            createdBy: userId,
            updatedAt: new Date().toISOString(),
            updatedBy: userId,
        },
    };
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

const PROTOCOL_OPTIONS = [
    { label: 'RTSP', value: 'RTSP' },
    { label: 'HTTP', value: 'HTTP' },
    { label: 'ONVIF', value: 'ONVIF' },
];

const PROCESSING_MODE_OPTIONS = [
    { label: 'Edge', value: 'edge' },
    { label: 'Cloud', value: 'cloud' },
    { label: 'Hybrid', value: 'hybrid' },
];

const STORAGE_TIER_OPTIONS = [
    { label: 'Hot', value: 'hot' },
    { label: 'Cold', value: 'cold' },
    { label: 'Archive', value: 'archive' },
];

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
            rtsp_url: '', substream_rtsp_url: '',
            protocol: null, ip_address: null, port: null,
            codec: '', resolution: '', fps: '', height: 0,
            ai_enabled: false, processing_mode: null,
            recording_enabled: false, retention_days: null, storage_tier: null,
            is_ptz: false, supports_edge_ai: false, supports_audio: false,
            alerts_enabled: false,
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
        queryFn: () => cameraService.getCameraById(Number(id)).then(r => r.data),
        enabled: isEdit,
    });

    const { data: locationsData, isLoading: isLoadingLocations } = useQuery({
        queryKey: ['locations'],
        queryFn: () => locationService.getLocations().then(r => r.data.locations),
    });

    // ── Populate form on edit ─────────────────────────────────────────────────
    useEffect(() => {
        if (!cameraData) return;
        shouldSkipTranslateRef.current = true;
        reset({
            name_en: cameraData.identity.en,
            name_es: cameraData.identity.es ?? '',
            name_fr: cameraData.identity.fr ?? '',
            location_id: cameraData.location.locationId,
            rtsp_url: cameraData.connectivity.rtspUrl ?? '',
            substream_rtsp_url: cameraData.connectivity.substreamRtspUrl ?? '',
            protocol: cameraData.connectivity.protocol,
            ip_address: cameraData.connectivity.ipAddress,
            port: cameraData.connectivity.port,
            codec: cameraData.video.codec,
            resolution: cameraData.video.nativeResolution,
            fps: String(cameraData.video.nativeFps),
            height: cameraData.video.height,
            ai_enabled: cameraData.ai.enabled ?? false,
            processing_mode: cameraData.ai.processingMode,
            recording_enabled: cameraData.recording.enabled ?? false,
            retention_days: cameraData.recording.retentionDays,
            storage_tier: cameraData.recording.storageTier,
            is_ptz: cameraData.capabilities.isPTZ ?? false,
            supports_edge_ai: cameraData.capabilities.supportsEdgeAI ?? false,
            supports_audio: cameraData.capabilities.supportsAudio ?? false,
            alerts_enabled: cameraData.alerts.enabled ?? false,
            status: cameraData.status.active,
            status_modified_by: cameraData.status.updatedBy ?? undefined,
            usecases: (cameraData.ai.useCases as CameraUsecase[]) ?? [],
        });
    }, [cameraData, reset]);

    // ── Auto-translate EN → ES + FR ───────────────────────────────────────────
    useEffect(() => {
        if (shouldSkipTranslateRef.current || translationSourceRef.current === 'name_es') {
            shouldSkipTranslateRef.current = false;
            translationSourceRef.current = null;
            return;
        }
        const trimmed = watchedNameEn?.trim() ?? '';
        if (!trimmed) {
            translationSourceRef.current = 'name_en';
            setValue('name_es', '', { shouldDirty: true });
            setValue('name_fr', '', { shouldDirty: true });
            return;
        }
        const requestId = ++translationRequestIdRef.current;
        const tid = window.setTimeout(async () => {
            try {
                const res = await translationService.translateText({
                    text: trimmed,
                    source_language: 'en',
                    target_languages: ['es', 'fr'],
                });
                if (translationRequestIdRef.current !== requestId) return;
                translationSourceRef.current = 'name_en';
                setValue('name_es', res.data.translations.es ?? '', { shouldDirty: true, shouldValidate: true });
                setValue('name_fr', res.data.translations.fr ?? '', { shouldDirty: true, shouldValidate: true });
            } catch (e) { console.error('Translation failed:', e); }
        }, 400);
        return () => window.clearTimeout(tid);
    }, [setValue, watchedNameEn]);

    // ── Auto-translate ES → EN + FR ───────────────────────────────────────────
    useEffect(() => {
        if (shouldSkipTranslateRef.current || translationSourceRef.current === 'name_en') {
            shouldSkipTranslateRef.current = false;
            translationSourceRef.current = null;
            return;
        }
        const trimmed = watchedNameEs?.trim() ?? '';
        if (!trimmed) {
            translationSourceRef.current = 'name_es';
            setValue('name_en', '', { shouldDirty: true });
            setValue('name_fr', '', { shouldDirty: true });
            return;
        }
        const requestId = ++translationRequestIdRef.current;
        const tid = window.setTimeout(async () => {
            try {
                const res = await translationService.translateText({
                    text: trimmed,
                    source_language: 'es',
                    target_languages: ['en', 'fr'],
                });
                if (translationRequestIdRef.current !== requestId) return;
                translationSourceRef.current = 'name_es';
                setValue('name_en', res.data.translations.en ?? '', { shouldDirty: true, shouldValidate: true });
                setValue('name_fr', res.data.translations.fr ?? '', { shouldDirty: true, shouldValidate: true });
            } catch (e) { console.error('Translation failed:', e); }
        }, 400);
        return () => window.clearTimeout(tid);
    }, [setValue, watchedNameEs]);

    // ── Mutations ─────────────────────────────────────────────────────────────
    const { mutate: createCamera, isPending: isCreating } = useMutation({
        mutationFn: (payload: Partial<Camera>) => cameraService.createCamera(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cameras'] });
            toast.success(i18n.t('camera:toast_actions.camera_created_title'), i18n.t('camera:toast_actions.camera_created_detail'));
            navigate('/cameras');
        },
        onError: (err: any) => {
            const detail = err?.response?.data?.detail || i18n.t('camera:toast_actions.camera_create_error_detail');
            toast.error(i18n.t('camera:toast_actions.camera_create_error_title'), detail);
        },
    });

    const { mutate: updateCamera, isPending: isUpdating } = useMutation({
        mutationFn: (payload: Partial<Camera>) => cameraService.updateCamera(Number(id), payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cameras'] });
            toast.success(i18n.t('camera:toast_actions.camera_updated_title'), i18n.t('camera:toast_actions.camera_updated_detail'));
            navigate('/cameras');
        },
        onError: (err: any) => {
            const detail = err?.response?.data?.detail || i18n.t('camera:toast_actions.camera_update_error_detail');
            toast.error(i18n.t('camera:toast_actions.camera_update_error_title'), detail);
        },
    });

    const onSubmit = (data: CameraFormValues) => {
        const payload = buildCameraPayload(data, user?.id ?? 1);
        isEdit ? updateCamera(payload) : createCamera(payload);
    };

    const LOCATION_OPTIONS = (locationsData ?? []).map(l => ({ label: l.name, value: l.id }));

    if (isEdit && isFetching) return (
        <div className="form-loading">
            <i className="pi pi-spin pi-spinner" style={{ fontSize: '22px' }} />
            {t('form.loading')}
        </div>
    );

    return (
        <div className="page-container">

            <div className="page-header-row">
                <div className="page-header-row__titles">
                    <h1>{isEdit ? t('form.edit_title') : t('form.add_title')}</h1>
                    <p>{isEdit ? t('form.edit_subtitle') : t('form.add_subtitle')}</p>
                </div>
                <FormButton
                    label={t('form.back')} variant="primary" size="sm"
                    iconLeft="pi pi-arrow-left" ariaLabel={t('form.back')}
                    onClick={() => navigate('/cameras')}
                />
            </div>

            <div className="form-card-outer">
                <div className="form-card-outer__accent" />

                <form onSubmit={handleSubmit(onSubmit)}>

                    {/* ── Camera Names ─────────────────────────────────── */}
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
                            <FormInput<CameraFormValues>
                                name="name_fr" control={control}
                                label={t('form.fields.name_fr')}
                                placeholder={t('form.placeholders.name_fr')}
                                error={errors.name_fr?.message}
                            />
                        </div>
                    </div>

                    {/* ── Location & Connectivity ───────────────────────── */}
                    <div className="form-section">
                        <div className="form-section__label-row">
                            <span>{t('form.section_location')}</span>
                            <div className="form-section__divider" />
                        </div>
                        <div className="form-grid-2">
                            <FormInput<CameraFormValues>
                                name="location_id" control={control}
                                label={t('form.fields.location_id')}
                                placeholder={isLoadingLocations ? t('form.placeholders.location_id_loading') : t('form.placeholders.location_id')}
                                type="dropdown" options={LOCATION_OPTIONS}
                                rules={{ required: t('form.validation.location_required') }}
                                error={errors.location_id?.message}
                            />
                            <FormInput<CameraFormValues>
                                name="protocol" control={control}
                                label={t('form.fields.protocol', { defaultValue: 'Protocol' })}
                                placeholder={t('form.placeholders.protocol', { defaultValue: 'Select protocol' })}
                                type="dropdown" options={PROTOCOL_OPTIONS}
                                error={errors.protocol?.message}
                            />
                            <FormInput<CameraFormValues>
                                name="ip_address" control={control}
                                label={t('form.fields.ip_address', { defaultValue: 'IP Address' })}
                                placeholder={t('form.placeholders.ip_address', { defaultValue: '192.168.1.100' })}
                                error={errors.ip_address?.message}
                            />
                            <FormInput<CameraFormValues>
                                name="port" control={control}
                                label={t('form.fields.port', { defaultValue: 'Port' })}
                                placeholder={t('form.placeholders.port', { defaultValue: '554' })}
                                error={errors.port?.message}
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

                    {/* ── Video / Technical ─────────────────────────────── */}
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
                                type="dropdown" options={CODEC_OPTIONS}
                                rules={{ required: t('form.validation.codec_required') }}
                                error={errors.codec?.message}
                            />
                            <FormInput<CameraFormValues>
                                name="resolution" control={control}
                                label={t('form.fields.resolution')}
                                placeholder={t('form.placeholders.resolution')}
                                type="dropdown" options={RESOLUTION_OPTIONS}
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

                    {/* ── AI & Processing ───────────────────────────────── */}
                    <div className="form-section">
                        <div className="form-section__label-row">
                            <span>{t('form.section_ai', { defaultValue: 'AI & Processing' })}</span>
                            <div className="form-section__divider" />
                        </div>
                        <div className="form-grid-2">
                            <FormInput<CameraFormValues>
                                name="ai_enabled" control={control}
                                label={t('form.fields.ai_enabled', { defaultValue: 'Enable AI Processing' })}
                                type="switch"
                                error={errors.ai_enabled?.message}
                            />
                            <FormInput<CameraFormValues>
                                name="processing_mode" control={control}
                                label={t('form.fields.processing_mode', { defaultValue: 'Processing Mode' })}
                                placeholder={t('form.placeholders.processing_mode', { defaultValue: 'Select mode' })}
                                type="dropdown" options={PROCESSING_MODE_OPTIONS}
                                error={errors.processing_mode?.message}
                            />
                        </div>
                    </div>

                    {/* ── Recording ─────────────────────────────────────── */}
                    <div className="form-section">
                        <div className="form-section__label-row">
                            <span>{t('form.section_recording', { defaultValue: 'Recording' })}</span>
                            <div className="form-section__divider" />
                        </div>
                        <div className="form-grid-2">
                            <FormInput<CameraFormValues>
                                name="recording_enabled" control={control}
                                label={t('form.fields.recording_enabled', { defaultValue: 'Enable Recording' })}
                                type="switch"
                                error={errors.recording_enabled?.message}
                            />
                            <FormInput<CameraFormValues>
                                name="retention_days" control={control}
                                label={t('form.fields.retention_days', { defaultValue: 'Retention Days' })}
                                placeholder={t('form.placeholders.retention_days', { defaultValue: '30' })}
                                error={errors.retention_days?.message}
                            />
                            <FormInput<CameraFormValues>
                                name="storage_tier" control={control}
                                label={t('form.fields.storage_tier', { defaultValue: 'Storage Tier' })}
                                placeholder={t('form.placeholders.storage_tier', { defaultValue: 'Select tier' })}
                                type="dropdown" options={STORAGE_TIER_OPTIONS}
                                error={errors.storage_tier?.message}
                            />
                        </div>
                    </div>

                    {/* ── Capabilities & Alerts ─────────────────────────── */}
                    <div className="form-section">
                        <div className="form-section__label-row">
                            <span>{t('form.section_capabilities', { defaultValue: 'Capabilities & Alerts' })}</span>
                            <div className="form-section__divider" />
                        </div>
                        <div className="form-grid-2">
                            <FormInput<CameraFormValues>
                                name="is_ptz" control={control}
                                label={t('form.fields.is_ptz', { defaultValue: 'PTZ Camera' })}
                                type="switch"
                                error={errors.is_ptz?.message}
                            />
                            <FormInput<CameraFormValues>
                                name="supports_edge_ai" control={control}
                                label={t('form.fields.supports_edge_ai', { defaultValue: 'Supports Edge AI' })}
                                type="switch"
                                error={errors.supports_edge_ai?.message}
                            />
                            <FormInput<CameraFormValues>
                                name="supports_audio" control={control}
                                label={t('form.fields.supports_audio', { defaultValue: 'Supports Audio' })}
                                type="switch"
                                error={errors.supports_audio?.message}
                            />
                            <FormInput<CameraFormValues>
                                name="alerts_enabled" control={control}
                                label={t('form.fields.alerts_enabled', { defaultValue: 'Enable Alerts' })}
                                type="switch"
                                error={errors.alerts_enabled?.message}
                            />
                        </div>
                    </div>

                    {/* ── Actions ───────────────────────────────────────── */}
                    <div className="form-actions">
                        <FormButton
                            label={t('form.cancel')} variant="secondary" type="button"
                            onClick={() => navigate('/cameras')}
                        />
                        <FormButton
                            label={isEdit ? t('form.edit_submit') : t('form.add_submit')}
                            variant="primary" type="submit"
                            iconLeft={isEdit ? 'pi pi-check' : 'pi pi-plus'}
                            loading={isCreating || isUpdating}
                        />
                    </div>

                </form>
            </div>
        </div>
    );
};