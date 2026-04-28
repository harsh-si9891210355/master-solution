import { useAuthStore } from '@/store/authStore';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Button } from 'primereact/button';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { FormInput } from '../../components/ui/FormInput';
import { loginSchema, type LoginFormValues } from './types/index';
import { authService } from './api/authService';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '../../languages/index'

export const LoginForm = () => {
    const { t, i18n } = useTranslation("auth");
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

    const currentLang = i18n.language as SupportedLanguage;
    return (
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-md mx-auto p-6 bg-white shadow-lg rounded-xl">

            <h3 className="text-2xl font-bold mb-6">{t("login.title")}</h3>
            {/* <h4 className="text-2xl font-bold mb-6">{t("login.subtitle")}</h4> */}
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
            {SUPPORTED_LANGUAGES.map((l) => (
                <button
                    key={l.code}
                    //className="w-full mt-4 p-3 bg-blue-600 hover:bg-blue-700 border-none"
                    className={`vx-lang-btn ${currentLang === l.code ? "active" : ""}`}
                    onClick={() => i18n.changeLanguage(l.code)}
                    aria-pressed={currentLang === l.code}
                    title={l.label}
                >
                    {l.flag} {l.code.toUpperCase()}
                </button>
            ))}
        </form>
    );
};