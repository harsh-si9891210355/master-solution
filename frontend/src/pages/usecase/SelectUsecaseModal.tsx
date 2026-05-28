import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Checkbox } from 'primereact/checkbox';
import { cameraService } from '../camera/api/cameraService';
import type { Camera, UpdateCameraUseCaseRequest } from '../camera/types/index';
import { usecaseService } from './api/usecaseService';
import { BaseModal } from '../../components/ui/Basemodal';
import { useToast } from '../../components/ui/ToastProvider';
import { useNsTranslation } from '../../hooks/Usetranslation';

interface SelectUsecaseModalProps {
    camera:  Camera | null;
    visible: boolean;
    onHide:  () => void;
}

export const SelectUsecaseModal = ({ camera, visible, onHide }: SelectUsecaseModalProps) => {
    const { t }       = useNsTranslation('usecase');
    const queryClient = useQueryClient();
    const toast       = useToast();

    const [selectedUsecaseIds, setSelectedUsecaseIds] = useState<number[]>([]);

    const { data: usecases = [], isLoading, isError } = useQuery({
        queryKey: ['usecases'],
        queryFn:  () => usecaseService.getUsecases().then(res => res.data.usecases),
        enabled:  visible,
    });

    useEffect(() => {
        if (!visible || !camera) { setSelectedUsecaseIds([]); return; }
        setSelectedUsecaseIds(
            camera.usecases.filter(u => u.is_active).map(u => u.usecase_id)
        );
    }, [camera, visible]);

    const activeUsecases = useMemo(() => usecases.filter(u => u.status), [usecases]);

    const { mutate: saveUsecases, isPending } = useMutation({
        mutationFn: (payload: { id: number; data: UpdateCameraUseCaseRequest }) =>
            cameraService.updateCameraUseCase(payload.id, payload.data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cameras'] });
            toast.success(t('modal.success_title'), t('modal.success_message'));
            onHide();
        },
        onError: (err: any) => {
            toast.error(t('modal.error_title'), err.response?.data?.detail ?? t('modal.error_message'));
        },
    });

    const toggleUsecase = (usecaseId: number, checked: boolean) => {
        setSelectedUsecaseIds(curr =>
            checked
                ? curr.includes(usecaseId) ? curr : [...curr, usecaseId]
                : curr.filter(id => id !== usecaseId)
        );
    };

    const handleSave = () => {
        if (!camera) return;
        saveUsecases({
            id: camera.id,
            data: {
                usecases: selectedUsecaseIds.map(usecaseId => ({
                    usecase_id: usecaseId,
                    is_active:  true,
                })),
            },
        });
    };

    return (
        <BaseModal
            visible={visible}
            onHide={onHide}
            header={t('modal.title')}
            closable={!isPending}
            className="select-usecase-dialog"
            actions={[
                {
                    label:    t('modal.cancel'),
                    variant:  'secondary',
                    onClick:  onHide,
                    disabled: isPending,
                },
                {
                    label:    t('modal.save'),
                    variant:  'primary',
                    iconLeft: 'pi pi-check',
                    onClick:  handleSave,
                    loading:  isPending,
                    disabled: !camera || isLoading || isError,
                },
            ]}
        >
            {/* Subtitle */}
            <p className="text-sm text-slate-500">
                {camera ? t('modal.subtitle', { name: camera.name }) : t('modal.subtitle_empty')}
            </p>

            {/* Loading */}
            {isLoading && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <i className="pi pi-spin pi-spinner" />
                    <span>{t('modal.loading')}</span>
                </div>
            )}

            {/* Error */}
            {isError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {t('modal.load_error')}
                </div>
            )}

            {/* Usecase list */}
            {!isLoading && !isError && (
                <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
                    {activeUsecases.length === 0 ? (
                        <p className="text-sm text-slate-500">{t('modal.empty')}</p>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {activeUsecases.map(usecase => {
                                const checked = selectedUsecaseIds.includes(usecase.id);
                                return (
                                    <label
                                        key={usecase.id}
                                        className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 transition hover:border-blue-300 hover:bg-blue-50"
                                    >
                                        <Checkbox
                                            inputId={`usecase-${usecase.id}`}
                                            checked={checked}
                                            onChange={e => toggleUsecase(usecase.id, !!e.checked)}
                                        />
                                        <div className="flex-1">
                                            <div className="font-medium text-slate-800">{usecase.name}</div>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </BaseModal>
    );
};