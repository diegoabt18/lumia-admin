import { z } from 'zod'

/**
 * Validación de entrada del login. Refleja server/src/modules/identity/schemas/auth.schema.ts
 * (email válido, contraseña de al menos 6 caracteres). El Server vuelve a validar.
 */
export const loginInputSchema = z.object({
  email: z
    .string({ required_error: 'Ingresa tu correo electrónico.' })
    .trim()
    .min(1, 'Ingresa tu correo electrónico.')
    .max(254, 'El correo es demasiado largo.')
    .email('Ingresa un correo electrónico válido.'),
  password: z
    .string({ required_error: 'Ingresa tu contraseña.' })
    .min(1, 'Ingresa tu contraseña.')
    .min(6, 'La contraseña debe tener al menos 6 caracteres.')
    .max(256, 'La contraseña es demasiado larga.'),
  rememberMe: z.boolean().optional().default(false),
})

export type LoginInput = z.infer<typeof loginInputSchema>

/**
 * Código 2FA. Refleja twoFactorVerifyLoginSchema del Server (6 a 8 caracteres):
 * 6 dígitos TOTP o un código de respaldo.
 */
export const twoFactorInputSchema = z.object({
  code: z
    .string({ required_error: 'Ingresa el código de verificación.' })
    .trim()
    .min(1, 'Ingresa el código de verificación.')
    .min(6, 'El código debe tener entre 6 y 8 caracteres.')
    .max(8, 'El código debe tener entre 6 y 8 caracteres.')
    .regex(/^[A-Za-z0-9-]+$/, 'El código solo puede contener letras, números y guiones.'),
})

export type TwoFactorInput = z.infer<typeof twoFactorInputSchema>
