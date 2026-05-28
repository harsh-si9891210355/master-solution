import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usecaseService } from './api/usecaseService';
import type { Usecase, LinkedCamera } from './types/index';
import type { Camera } from '../camera/types/index';
import { BaseModal } from '../../components/ui/Basemodal';
import { useNsTranslation } from '../../hooks/Usetranslation';

interface LinkedCamerasModalProps {
    usecase: Usecase | null;
    visible: boolean;
    onHide:  () => void;
}

export const LinkedCamerasModal = ({ usecase, visible, onHide }: LinkedCamerasModalProps) => {
    const { t, currentLang } = useNsTranslation('usecase');
    const queryClient        = useQueryClient();

    const { data, isLoading, isError } = useQuery({
        queryKey: ['usecase-linked-cameras', usecase?.id],
        queryFn:  () => usecaseService.getLinkedCameras(usecase!.id).then(res => res.data.cameras),
        enabled:  visible && !!usecase,
    });

    // ── Resolve camera name from cache (API returns name: null) ──────────────
    const getCameraName = (linkedCamera: LinkedCamera): string => {
        if (linkedCamera.name) return linkedCamera.name;
        const cachedCameras = queryClient.getQueryData<Camera[]>(['cameras']);
        const match = cachedCameras?.find(c => c.id === linkedCamera.id);
        if (match) return currentLang === 'es' ? (match.name_es || match.name_en) : match.name_en;
        return t('linked_cameras_modal.unnamed');
    };

    const usecaseName = usecase
        ? (currentLang === 'es' ? (usecase.name_es || usecase.name_en) : usecase.name_en)
        : '';

    return (
        <BaseModal
            visible={visible}
            onHide={onHide}
            header={t('linked_cameras_modal.title')}
            width="min(92vw, 42rem)"
            className="linked-cameras-dialog"
            actions={[
                { label: t('linked_cameras_modal.close'), variant: 'secondary', onClick: onHide },
            ]}
        >
            {/* Subtitle */}
            <p className="text-sm text-slate-500">
                {t('linked_cameras_modal.subtitle', { name: usecaseName })}
            </p>

            {/* Loading */}
            {isLoading && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <i className="pi pi-spin pi-spinner" />
                    <span>{t('linked_cameras_modal.loading')}</span>
                </div>
            )}

            {/* Error */}
            {isError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {t('linked_cameras_modal.load_error')}
                </div>
            )}

            {/* Camera list — same card style as SelectUsecaseModal */}
            {!isLoading && !isError && (
                <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
                    {!data || data.length === 0 ? (
                        <p className="text-sm text-slate-500">{t('linked_cameras_modal.empty')}</p>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {data.map(camera => (
                                <div
                                    key={camera.id}
                                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-3"
                                >
                                    {/* Camera name */}
                                    <div className="flex items-center gap-3">
                                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                                            <i className="pi pi-video text-xs" />
                                        </div>
                                        <span className="font-medium text-slate-800">
                                            {getCameraName(camera)}
                                        </span>
                                    </div>

                                    {/* Status badge */}
                                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                                        camera.status
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-red-100 text-red-600'
                                    }`}>
                                        {camera.status
                                            ? t('linked_cameras_modal.status_active')
                                            : t('linked_cameras_modal.status_inactive')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Count */}
            {!isLoading && !isError && data && data.length > 0 && (
                <p className="text-xs text-slate-400">
                    {t('linked_cameras_modal.count', { count: data.length })}
                </p>
            )}
        </BaseModal>
    );
};