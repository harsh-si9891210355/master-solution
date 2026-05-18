import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';           // ← same as UserForm
import type { UsecaseFormValues } from './types/index';
import { FormInput } from '../../components/ui/FormInput';
import { FormButton } from '../../components/ui/FormButton';
import { useNsTranslation } from '../../hooks/Usetranslation';

// ── Demo data — same seed used to pre-fill edit form ─────────────────────────
const DEMO_USECASES = [
    { id: 1, name: 'Face Detection',      description: 'Detect and identify faces in the camera feed in real time.',       status: true  },
    { id: 2, name: 'Intrusion Detection', description: 'Trigger alerts when unauthorized entry into a restricted zone.',   status: true  },
    { id: 3, name: 'Crowd Counting',      description: 'Count the number of people present in a defined area.',            status: false },
    { id: 4, name: 'Vehicle Tracking',    description: 'Track and log vehicle movement across multiple camera frames.',    status: true  },
    { id: 5, name: 'Loitering Detection', description: 'Alert when a person stays in a zone longer than a set duration.', status: false },
];

export const UsecaseForm = () => {
    const { id }   = useParams();
    const isEdit   = !!id;
    const navigate = useNavigate();
    const { t }    = useNsTranslation('usecase');
    const { i18n } = useTranslation();              // ← same as UserForm

    const {
        control,
        handleSubmit,
        reset,
        trigger,                                    // ← same as UserForm
        formState: { errors, isSubmitted },         // ← same as UserForm
    } = useForm<UsecaseFormValues>({
        defaultValues: { name: '', description: '', status: true },
    });

    // ── Re-run validation when language changes so messages update ────────────
    // Same fix as UserForm — trigger() re-evaluates all active validation rules
    // which causes react-hook-form to re-read the now-updated t() strings.
    useEffect(() => {
        if (isSubmitted || Object.keys(errors).length > 0) {
            trigger();
        }
    }, [i18n.language, trigger, isSubmitted]);      // ← exact same deps as UserForm

    // ── Pre-fill form on edit using demo data ─────────────────────────────────
    useEffect(() => {
        if (isEdit) {
            const found = DEMO_USECASES.find(u => u.id === Number(id));
            if (found) {
                reset({
                    name:        found.name,
                    description: found.description,
                    status:      found.status,
                });
            }
        }
    }, [id, isEdit, reset]);

    // ── Submit — navigates back; wire API call here later ─────────────────────
    const onSubmit = (_data: UsecaseFormValues) => {
        // TODO: replace with usecaseService.createUsecase(data) / updateUsecase(id, data)
        navigate('/usecases');
    };

    const STATUS_OPTIONS = [
        { label: t('form.options.active'),   value: true  },
        { label: t('form.options.inactive'), value: false },
    ];

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

                    {/* Usecase Details */}
                    <div className="form-section">
                        <div className="form-section__label-row">
                            <span>{t('form.section_details')}</span>
                            <div className="form-section__divider" />
                        </div>
                        <div className="form-grid-2">
                            <FormInput<UsecaseFormValues>
                                name="name"
                                control={control}
                                label={t('form.fields.name')}
                                placeholder={t('form.placeholders.name')}
                                rules={{
                                    validate: {
                                        required: (v) => !!v || t('form.validation.name_required'),
                                    },
                                }}
                                error={errors.name?.message}
                            />
                            <FormInput<UsecaseFormValues>
                                name="status"
                                control={control}
                                label={t('form.fields.status')}
                                type="dropdown"
                                placeholder={t('form.placeholders.status')}
                                options={STATUS_OPTIONS}
                                error={errors.status?.message}
                            />
                        </div>
                        <div className="form-grid-2">
                            <FormInput<UsecaseFormValues>
                                name="description"
                                control={control}
                                label={t('form.fields.description')}
                                placeholder={t('form.placeholders.description')}
                                rules={{
                                    validate: {
                                        required: (v) => !!v || t('form.validation.description_required'),
                                    },
                                }}
                                error={errors.description?.message}
                            />
                        </div>
                    </div>

                    {/* Actions */}
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
                        />
                    </div>

                </form>
            </div>
        </div>
    );
};