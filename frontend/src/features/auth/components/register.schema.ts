import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters")
  .regex(/[A-Z]/, "Must contain at least one uppercase letter (A–Z)")
  .regex(/[a-z]/, "Must contain at least one lowercase letter (a–z)")
  .regex(/[0-9]/, "Must contain at least one digit (0–9)")
  .regex(/[^a-zA-Z0-9]/, "Must contain at least one non-alphanumeric character");

export const registerSchema = z
  .object({
    email: z.string().email("Enter a valid email"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
