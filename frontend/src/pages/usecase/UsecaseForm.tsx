import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UsecaseFormValues } from './types/index';
import { usecaseService } from './api/usecaseService';
import { FormInput } from '../../components/ui/FormInput';
import { FormButton } from '../../components/ui/FormButton';
import { useNsTranslation } from '../../hooks/Usetranslation';
import { useToast } from '../../components/ui/ToastProvider';
import { translationService } from './utils/translationService';

export const UsecaseForm = () => {
    const { id }        = useParams();
    const isEdit        = !!id;
    const navigate      = useNavigate();
    const queryClient   = useQueryClient();
    const { t }         = useNsTranslation('usecase');
    const { i18n }      = useTranslation();
    const toast         = useToast();

    const {
        control,
        handleSubmit,
        reset,
        setValue,
        trigger,
        formState: { errors, isSubmitted },
    } = useForm<UsecaseFormValues>({
        defaultValues: {
            name_en:        '',
            name_es:        '',
            // name_fr:        '',
            description_en: '',
            description_es: '',
            // description_fr: '',
            status:         true,
        },
    });

    // ── Re-trigger validation on language change ───────────────────────────────
    useEffect(() => {
        if (isSubmitted || Object.keys(errors).length > 0) {
            trigger();
        }
    }, [i18n.language, trigger, isSubmitted]);

    // ── Translation loop-prevention refs ──────────────────────────────────────
    const shouldSkipTranslateRef      = useRef(false);
    const nameTranslationRequestIdRef = useRef(0);
    const nameTranslationSourceRef    = useRef<'name_en' | 'name_es' | null>(null);
    const descTranslationRequestIdRef = useRef(0);
    const descTranslationSourceRef    = useRef<'description_en' | 'description_es' | null>(null);

    // ── Watch fields ──────────────────────────────────────────────────────────
    const watchedNameEn        = useWatch({ control, name: 'name_en' });
    const watchedNameEs        = useWatch({ control, name: 'name_es' });
    const watchedDescriptionEn = useWatch({ control, name: 'description_en' });
    const watchedDescriptionEs = useWatch({ control, name: 'description_es' });

    // ── Fetch existing usecase for edit ───────────────────────────────────────
    const { data: usecaseData, isLoading: isFetching } = useQuery({
        queryKey: ['usecase', id],
        queryFn:  () => usecaseService.getUsecaseById(Number(id)).then(r => r.data),
        enabled:  isEdit,
        staleTime: Infinity,
    });

    useEffect(() => {
        if (usecaseData) {
            shouldSkipTranslateRef.current = true;
            reset({
                name_en:        usecaseData.name_en,
                name_es:        usecaseData.name_es,
                // name_fr:        usecaseData.name_fr,
                description_en: usecaseData.description_en,
                description_es: usecaseData.description_es,
                // description_fr: usecaseData.description_fr,
                status:         usecaseData.status,
            });
        }
    }, [usecaseData, reset]);

    // ═════════════════════════════════════════════════════════════════════════
    //  NAME EN → ES
    // ═════════════════════════════════════════════════════════════════════════
    useEffect(() => {
        if (shouldSkipTranslateRef.current || nameTranslationSourceRef.current === 'name_es') {
            shouldSkipTranslateRef.current   = false;
            nameTranslationSourceRef.current = null;
            return;
        }
        const trimmed = watchedNameEn?.trim() ?? '';
        if (!trimmed) {
            nameTranslationSourceRef.current = 'name_en';
            setValue('name_es', '', { shouldDirty: true });
            return;
        }
        const requestId = ++nameTranslationRequestIdRef.current;
        const timeoutId = window.setTimeout(async () => {
            try {
                const res = await translationService.translateText({ text: trimmed, source_language: 'en', target_languages: ['es'] });
                if (nameTranslationRequestIdRef.current !== requestId) return;
                nameTranslationSourceRef.current = 'name_en';
                setValue('name_es', res.data.translations.es ?? '', { shouldDirty: true, shouldValidate: true });
            } catch (err) { console.error('Name EN→ES failed:', err); }
        }, 400);
        return () => window.clearTimeout(timeoutId);
    }, [setValue, watchedNameEn]);

    // ═════════════════════════════════════════════════════════════════════════
    //  NAME ES → EN
    // ═════════════════════════════════════════════════════════════════════════
    useEffect(() => {
        if (shouldSkipTranslateRef.current || nameTranslationSourceRef.current === 'name_en') {
            shouldSkipTranslateRef.current   = false;
            nameTranslationSourceRef.current = null;
            return;
        }
        const trimmed = watchedNameEs?.trim() ?? '';
        if (!trimmed) {
            nameTranslationSourceRef.current = 'name_es';
            setValue('name_en', '', { shouldDirty: true });
            return;
        }
        const requestId = ++nameTranslationRequestIdRef.current;
        const timeoutId = window.setTimeout(async () => {
            try {
                const res = await translationService.translateText({ text: trimmed, source_language: 'es', target_languages: ['en'] });
                if (nameTranslationRequestIdRef.current !== requestId) return;
                nameTranslationSourceRef.current = 'name_es';
                setValue('name_en', res.data.translations.en ?? '', { shouldDirty: true, shouldValidate: true });
            } catch (err) { console.error('Name ES→EN failed:', err); }
        }, 400);
        return () => window.clearTimeout(timeoutId);
    }, [setValue, watchedNameEs]);

    // ═════════════════════════════════════════════════════════════════════════
    //  DESCRIPTION EN → ES
    // ═════════════════════════════════════════════════════════════════════════
    useEffect(() => {
        if (shouldSkipTranslateRef.current || descTranslationSourceRef.current === 'description_es') {
            shouldSkipTranslateRef.current   = false;
            descTranslationSourceRef.current = null;
            return;
        }
        const trimmed = watchedDescriptionEn?.trim() ?? '';
        if (!trimmed) {
            descTranslationSourceRef.current = 'description_en';
            setValue('description_es', '', { shouldDirty: true });
            return;
        }
        const requestId = ++descTranslationRequestIdRef.current;
        const timeoutId = window.setTimeout(async () => {
            try {
                const res = await translationService.translateText({ text: trimmed, source_language: 'en', target_languages: ['es'] });
                if (descTranslationRequestIdRef.current !== requestId) return;
                descTranslationSourceRef.current = 'description_en';
                setValue('description_es', res.data.translations.es ?? '', { shouldDirty: true, shouldValidate: true });
            } catch (err) { console.error('Description EN→ES failed:', err); }
        }, 400);
        return () => window.clearTimeout(timeoutId);
    }, [setValue, watchedDescriptionEn]);

    // ═════════════════════════════════════════════════════════════════════════
    //  DESCRIPTION ES → EN
    // ═════════════════════════════════════════════════════════════════════════
    useEffect(() => {
        if (shouldSkipTranslateRef.current || descTranslationSourceRef.current === 'description_en') {
            shouldSkipTranslateRef.current   = false;
            descTranslationSourceRef.current = null;
            return;
        }
        const trimmed = watchedDescriptionEs?.trim() ?? '';
        if (!trimmed) {
            descTranslationSourceRef.current = 'description_es';
            setValue('description_en', '', { shouldDirty: true });
            return;
        }
        const requestId = ++descTranslationRequestIdRef.current;
        const timeoutId = window.setTimeout(async () => {
            try {
                const res = await translationService.translateText({ text: trimmed, source_language: 'es', target_languages: ['en'] });
                if (descTranslationRequestIdRef.current !== requestId) return;
                descTranslationSourceRef.current = 'description_es';
                setValue('description_en', res.data.translations.en ?? '', { shouldDirty: true, shouldValidate: true });
            } catch (err) { console.error('Description ES→EN failed:', err); }
        }, 400);
        return () => window.clearTimeout(timeoutId);
    }, [setValue, watchedDescriptionEs]);

    // ── Save mutation — POST /usecase (create) or POST /usecase/:id (update) ──
    const { mutate: saveUsecase, isPending: isSaving } = useMutation({
        mutationFn: (data: UsecaseFormValues) =>
            usecaseService.saveUsecase(data, isEdit ? Number(id) : undefined),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['usecases'] });
            toast.success(
                isEdit ? t('toast.updated_title') : t('toast.created_title'),
                isEdit ? t('toast.updated_detail') : t('toast.created_detail'),
            );
            navigate('/usecases');
        },
        onError: (err: any) => {
            const detail = err?.response?.data?.detail ||
                (isEdit ? t('toast.update_error_detail') : t('toast.create_error_detail'));
            toast.error(
                isEdit ? t('toast.update_error_title') : t('toast.create_error_title'),
                detail,
            );
        },
    });

    const onSubmit = (data: UsecaseFormValues) => saveUsecase(data);

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
                        onClick={() => navigate('/usecases')}
                    />
                </div>
            </div>

            {/* ── Form card ─────────────────────────────────────────────── */}
            <div className="form-card-outer">
                <div className="form-card-outer__accent" />

                <form onSubmit={handleSubmit(onSubmit)}>

                    {/* ── Name ─────────────────────────────────────────── */}
                    <div className="form-section">
                        <div className="form-section__label-row">
                            <span>{t('form.section_name')}</span>
                            <div className="form-section__divider" />
                        </div>
                        <div className="form-grid-2">
                            <FormInput<UsecaseFormValues>
                                name="name_en"
                                control={control}
                                label={t('form.fields.name_en')}
                                placeholder={t('form.placeholders.name_en')}
                                rules={{ validate: { required: (v) => !!v || t('form.validation.name_en_required') } }}
                                error={errors.name_en?.message}
                            />
                            <FormInput<UsecaseFormValues>
                                name="name_es"
                                control={control}
                                label={t('form.fields.name_es')}
                                placeholder={t('form.placeholders.name_es')}
                                error={errors.name_es?.message}
                            />
                        </div>
                    </div>

                    {/* ── Description ──────────────────────────────────── */}
                    <div className="form-section">
                        <div className="form-section__label-row">
                            <span>{t('form.section_description')}</span>
                            <div className="form-section__divider" />
                        </div>
                        <div className="form-grid-2">
                            <FormInput<UsecaseFormValues>
                                name="description_en"
                                control={control}
                                label={t('form.fields.description_en')}
                                placeholder={t('form.placeholders.description_en')}
                                rules={{ validate: { required: (v) => !!v || t('form.validation.description_en_required') } }}
                                error={errors.description_en?.message}
                            />
                            <FormInput<UsecaseFormValues>
                                name="description_es"
                                control={control}
                                label={t('form.fields.description_es')}
                                placeholder={t('form.placeholders.description_es')}
                                error={errors.description_es?.message}
                            />
                        </div>
                    </div>

                    {/* ── Actions ──────────────────────────────────────── */}
                    <div className="form-actions">
                        <FormButton
                            label={t('form.cancel')}
                            variant="secondary"
                            type="button"
                            onClick={() => navigate('/usecases')}
                        />
                        <FormButton
                            label={isEdit ? t('form.edit_submit') : t('form.add_submit')}
                            variant="primary"
                            type="submit"
                            iconLeft={isEdit ? 'pi pi-check' : 'pi pi-plus'}
                            loading={isSaving}
                        />
                    </div>

                </form>
            </div>
        </div>
    );
};