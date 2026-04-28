import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from 'primereact/button';
import { signupSchema, type SignupFormValues } from './types/index';
import { FormInput } from '@/components/ui/FormInput';

export const SignupForm = () => {

    const { control, handleSubmit, formState: { errors } } = useForm<SignupFormValues>({

        resolver: zodResolver(signupSchema),

        defaultValues: { username: '', email: '', password: '', confirmPassword: '' }

    });

    const onSubmit = async (data: SignupFormValues) => {

        // Logic to call your Dockerized API

        console.log("Registering user...", data);

    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-md mx-auto p-6 bg-white shadow-lg rounded-xl">
            <h2 className="text-2xl font-bold mb-6">Create Account</h2>

            <FormInput name="username" label="Username" control={control} error={errors.username?.message} />
            <FormInput name="email" label="Email" control={control} error={errors.email?.message} />
            <FormInput name="password" label="Password" type="password" control={control} error={errors.password?.message} />
            <FormInput name="confirmPassword" label="Confirm Password" type="password" control={control} error={errors.confirmPassword?.message} />

            <Button type="submit" label="Register" className="w-full mt-4 p-3 bg-green-600 border-none" />
        </form>

    );

};
