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
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '../../languages/index';
import { useState } from 'react';

import IncidentChatbot from "./IncidentChatbot";
import { FaRobot } from "react-icons/fa";

export const LoginForm = () => {
    const { t, i18n } = useTranslation("auth");
    const { control, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: '', password: '' }
    });

    const navigate = useNavigate();
    const setAuth = useAuthStore((s) => s.setAuth);

    const { mutate: loginMutation, isPending } = useMutation({
        mutationFn: authService.login,
        onSuccess: (response) => {
            setAuth(response.data.token, response.data.user);
            navigate('/dashboard');
        },
        onError: (error: any) => {
            console.error("Login Error", error.response?.data?.message);
        }
    });

    const onSubmit = (data: LoginFormValues) => loginMutation(data);
    const [showBot, setShowBot] = useState(false);
    const currentLang = i18n.language as SupportedLanguage;

    return (
        <>
            {/* Login Form */}
            <form
                onSubmit={handleSubmit(onSubmit)}
                className="max-w-md mx-auto p-6 bg-white shadow-lg rounded-xl"
            >
                <h3 className="text-2xl font-bold mb-6">{t("login.title")}</h3>

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
                    loading={isPending}
                    disabled={showBot}
                    label="Sign In"
                    className="w-full mt-4 p-3 bg-blue-600 hover:bg-blue-700 border-none"
                />

                <div className="mt-4 text-center text-sm text-gray-500">
                    Don't have an account?{' '}
                    <button
                        type="button"
                        onClick={() => navigate('/signup')}
                        className="text-blue-600 hover:underline font-medium"
                    >
                        Create one
                    </button>
                </div>

                <div className="mt-4 flex gap-2 flex-wrap">
                    {SUPPORTED_LANGUAGES.map((l) => (
                        <button
                            key={l.code}
                            type="button"
                            className={`vx-lang-btn ${currentLang === l.code ? "active" : ""}`}
                            onClick={() => i18n.changeLanguage(l.code)}
                            aria-pressed={currentLang === l.code}
                            title={l.label}
                        >
                            {l.flag} {l.code.toUpperCase()}
                        </button>
                    ))}
                </div>
            </form>

            {/* Floating Chatbot Button */}
            {!showBot && (
                <button
                    onClick={() => setShowBot(true)}
                    title="Report an Incident"
                    aria-label="Open incident chatbot"
                    style={{
                        position: 'fixed',
                        bottom: '22px',
                        right: '22px',
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        zIndex: 50,
                        boxShadow: '0 4px 20px rgba(79,70,229,0.5)',
                        animation: 'vx-pulse 2s ease-in-out infinite',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                    }}
                    onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)';
                        (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 28px rgba(79,70,229,0.65)';
                    }}
                    onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                        (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(79,70,229,0.5)';
                    }}
                >
                    <FaRobot size={22} />
                </button>
            )}

            {/* Chatbot */}
            <IncidentChatbot
                visible={showBot}
                onHide={() => setShowBot(false)}
            />

            {/* Pulse keyframe — add to global CSS if preferred */}
            <style>{`
                @keyframes vx-pulse {
                    0%, 100% { box-shadow: 0 4px 20px rgba(79,70,229,0.5), 0 0 0 0 rgba(79,70,229,0.3); }
                    50%       { box-shadow: 0 4px 20px rgba(79,70,229,0.5), 0 0 0 12px rgba(79,70,229,0); }
                }
            `}</style>
        </>
    );
};