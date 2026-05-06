import { z } from 'zod';

export const loginSchema = z.object({
    email: z.string().min(1, "Email is required").email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
    email: z.string().min(1, "Email is required").email("Invalid email address"),
    first_name_en: z.string().min(1, "First name is required"),
    first_name_es: z.string().optional().default("string"),
    first_name_fr: z.string().optional().default("string"),
    last_name_en: z.string().min(1, "Last name is required"),
    last_name_es: z.string().optional().default("string"),
    last_name_fr: z.string().optional().default("string"),
    mobile_number: z.string().min(10, "Enter a valid mobile number"),
    role_code: z.string().default("user"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});
export type SignupFormValues = z.infer<typeof signupSchema>;