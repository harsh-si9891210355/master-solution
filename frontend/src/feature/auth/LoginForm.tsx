import { useAuthStore } from '@/store/authStore';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Button } from 'primereact/button';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { FormInput } from '../../components/ui/FormInput';
import { loginSchema, type LoginFormValues } from '../auth/types/index';
import { authService } from './api/authService';

export const LoginForm = () => {
    const { control, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: '', password: '' }
    });

    const login = useAuthStore((state) => state.setAuth);
    const navigate = useNavigate();
    const setAuth = useAuthStore((s) => s.setAuth);

    const { mutate: loginMutation, isPending } = useMutation({
        mutationFn: authService.login,
        onSuccess: (response) => {
            // Save to Zustand (persists to localStorage)
            setAuth(response.data.token, response.data.user);
            navigate('/dashboard');
        },
        onError: (error: any) => {
            // Show error via PrimeReact Toast (optional)
            console.error("Login Error", error.response?.data?.message);
        }
    });

    const onSubmit = (data: LoginFormValues) => {
        loginMutation(data);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-md mx-auto p-6 bg-white shadow-lg rounded-xl">
            <h2 className="text-2xl font-bold mb-6">Login</h2>

            <FormInput
                name="email"
                label="Email Address"
                control={control}
                error={errors.email?.message}
                placeholder="you@example.com"
            />

            <FormInput
                name="password"
                label="Password"
                type="password"
                control={control}
                error={errors.password?.message}
            />

            <Button
                type="submit"
                label="Sign In"
                className="w-full mt-4 p-3 bg-blue-600 hover:bg-blue-700 border-none"
            />
        </form>
    );
};