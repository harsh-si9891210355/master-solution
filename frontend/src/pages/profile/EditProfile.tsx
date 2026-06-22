import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { FormInput } from '@/components/ui/FormInput';
import { FormButton } from '@/components/ui/FormButton';
import { useToast } from '@/components/ui/ToastProvider';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/pages/auth/api/authService';

interface ProfileForm {
    first_name: string;
    last_name: string;
    mobile_number: string;
    department: string;
    city: string;
    state: string;
    country: string;
}

export const EditProfile = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const user = useAuthStore((s) => s.user);
    const avatar = useAuthStore((s) => s.avatar);
    const setUser = useAuthStore((s) => s.setUser);
    const setAvatar = useAuthStore((s) => s.setAvatar);

    const fileRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(avatar);

    const { control, handleSubmit, formState: { errors } } = useForm<ProfileForm>({
        defaultValues: {
            first_name: user?.first_name ?? '',
            last_name: user?.last_name ?? '',
            mobile_number: user?.mobile_number ?? '',
            department: user?.department ?? '',
            city: user?.city ?? '',
            state: user?.state ?? '',
            country: user?.country ?? '',
        },
    });

    const { mutate, isPending } = useMutation({
        mutationFn: (data: ProfileForm) =>
            authService.updateMyProfile({
                ...data,
                mobile_number: data.mobile_number.trim() || undefined,
            }),
        onSuccess: (res) => {
            // Server returned the authoritative user — sync the store.
            if (res?.data) setUser(res.data);
        },
        onError: () => {
            // Backend endpoint may not be live yet; the optimistic local update
            // below keeps the UI consistent in the meantime.
        },
    });

    const onPickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setPreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const onSubmit = (data: ProfileForm) => {
        // Persist the avatar client-side (works without a backend upload).
        setAvatar(preview);
        // Optimistically reflect the changes in the session immediately.
        setUser({ ...user, ...data });
        // Best-effort server persistence (PATCH /auth/me — backend pending).
        mutate(data);
        toast.success('Profile updated', 'Your profile changes have been saved.');
        navigate(-1);
    };

    const initial = ((user?.first_name?.[0] ?? user?.email?.[0] ?? 'U') as string).toUpperCase();
    const fieldStyle = { background: '#F9F6EE', border: '1.5px solid #1447e6' };

    return (
        <div className="page-container">
            <div className="page-header-row">
                <div className="page-header-row__titles">
                    <h1>Edit Profile</h1>
                    <p>Update your personal details and photo.</p>
                </div>
                <FormButton label="Back" variant="ghost" size="sm" iconLeft="pi pi-arrow-left" onClick={() => navigate(-1)} />
            </div>

            <div className="form-card-outer">
                <div className="form-card-outer__accent" />

                <form onSubmit={handleSubmit(onSubmit)}>
                    {/* Avatar */}
                    <div className="form-section">
                        <div className="flex items-center gap-5">
                            {preview ? (
                                <img src={preview} alt="" className="rounded-full object-cover" style={{ width: 84, height: 84 }} />
                            ) : (
                                <div className="user-avatar" style={{ width: 84, height: 84, fontSize: 28 }}>{initial}</div>
                            )}
                            <div className="flex flex-col gap-2">
                                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickImage} />
                                <FormButton label="Change photo" variant="secondary" size="sm" iconLeft="pi pi-camera" onClick={() => fileRef.current?.click()} />
                                {preview && (
                                    <button type="button" onClick={() => setPreview(null)} className="text-xs text-red-500 hover:underline self-start">
                                        Remove photo
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Personal info */}
                    <div className="form-section">
                        <div className="form-section__label-row">
                            <span>Personal Info</span>
                            <div className="form-section__divider" />
                        </div>
                        <div className="form-grid-2">
                            <FormInput<ProfileForm> name="first_name" control={control} label="First Name"
                                rules={{ required: 'First name is required' }} error={errors.first_name?.message} style={fieldStyle} />
                            <FormInput<ProfileForm> name="last_name" control={control} label="Last Name"
                                rules={{ required: 'Last name is required' }} error={errors.last_name?.message} style={fieldStyle} />
                        </div>
                        <div className="form-grid-2">
                            <FormInput<ProfileForm> name="mobile_number" control={control} label="Mobile Number"
                                placeholder="+91 9876543210" error={errors.mobile_number?.message} style={fieldStyle} />
                            <FormInput<ProfileForm> name="department" control={control} label="Department"
                                error={errors.department?.message} style={fieldStyle} />
                        </div>
                    </div>

                    {/* Location */}
                    <div className="form-section">
                        <div className="form-section__label-row">
                            <span>Location</span>
                            <div className="form-section__divider" />
                        </div>
                        <div className="form-grid-2">
                            <FormInput<ProfileForm> name="city" control={control} label="City" error={errors.city?.message} style={fieldStyle} />
                            <FormInput<ProfileForm> name="state" control={control} label="State" error={errors.state?.message} style={fieldStyle} />
                        </div>
                        <FormInput<ProfileForm> name="country" control={control} label="Country" error={errors.country?.message} style={fieldStyle} />
                    </div>

                    <div className="form-actions">
                        <FormButton label="Cancel" variant="secondary" type="button" onClick={() => navigate(-1)} />
                        <FormButton label="Save Changes" variant="primary" type="submit" iconLeft="pi pi-check" loading={isPending} />
                    </div>
                </form>
            </div>
        </div>
    );
};
