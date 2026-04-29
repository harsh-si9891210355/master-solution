import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Button } from 'primereact/button';
import { useNavigate } from 'react-router';
import { signupSchema, type SignupFormValues } from './types/index';
import { FormInput } from '@/components/ui/FormInput';
import { authService } from './api/authService';

export const SignupForm = () => {
    const navigate = useNavigate();

    const { control, handleSubmit, formState: { errors } } = useForm<SignupFormValues>({
        resolver: zodResolver(signupSchema),
        defaultValues: {
            email: '',
            first_name_en: '',
            first_name_es: 'string',
            first_name_fr: 'string',
            last_name_en: '',
            last_name_es: 'string',
            last_name_fr: 'string',
            mobile_number: '',
            role_code: 'user',
            password: '',
            confirmPassword: '',
        }
    });

    const { mutate: signupMutation, isPending } = useMutation({
        mutationFn: authService.signup,
        onSuccess: () => {
            navigate('/'); // ✅ Redirect to login after success
        },
        onError: (error: any) => {
            console.error("Signup Error:", error.response?.data?.message);
        }
    });

    const onSubmit = (data: SignupFormValues) => {
        const { confirmPassword, ...payload } = data; // ✅ Strip confirmPassword
        signupMutation(payload);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-md mx-auto p-6 bg-white shadow-lg rounded-xl">
            <h2 className="text-2xl font-bold mb-6">Create Account</h2>

            <FormInput name="first_name_en" label="First Name" control={control} error={errors.first_name_en?.message} />
            <FormInput name="last_name_en" label="Last Name" control={control} error={errors.last_name_en?.message} />
            <FormInput name="email" label="Email" control={control} error={errors.email?.message} />
            <FormInput name="mobile_number" label="Mobile Number" control={control} error={errors.mobile_number?.message} />
            <FormInput name="password" label="Password" type="password" control={control} error={errors.password?.message} />
            <FormInput name="confirmPassword" label="Confirm Password" type="password" control={control} error={errors.confirmPassword?.message} />

            <Button
                type="submit"
                label="Register"
                loading={isPending}
                className="w-full mt-4 p-3 bg-green-600 border-none"
            />

            {/* ✅ Route back to Login */}
            <div className="mt-4 text-center text-sm text-gray-500">
                Already have an account?{' '}
                <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="text-blue-600 hover:underline font-medium"
                >
                    Sign in
                </button>
            </div>
        </form>
    );
};