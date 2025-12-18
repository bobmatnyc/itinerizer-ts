/**
 * Money Zod schemas
 * @module domain/schemas/money
 */

import { z } from 'zod';

/**
 * Currency code schema - validates ISO 4217 3-letter codes
 */
export const currencyCodeSchema = z
  .string()
  .length(3, 'Currency code must be 3 letters')
  .regex(/^[A-Z]{3}$/i, 'Currency code must be 3 letters')
  .transform((val) => val.toUpperCase());

/**
 * Money schema - validates monetary amount with currency
 * Amount is stored in smallest currency unit (cents)
 */
export const moneySchema = z.object({
  /** Amount in smallest currency unit (e.g., cents for USD) */
  amount: z.number().int('Amount must be an integer').nonnegative('Amount must be non-negative'),
  /** ISO 4217 currency code */
  currency: currencyCodeSchema,
});

/**
 * Money input schema - accepts decimal amounts and converts to cents
 * Use this for user input that comes as decimal (e.g., 10.50)
 */
export const moneyInputSchema = z.object({
  /** Amount in major currency unit (e.g., dollars) */
  amount: z
    .number()
    .nonnegative('Amount must be non-negative')
    .transform((val) => Math.round(val * 100)),
  /** ISO 4217 currency code */
  currency: currencyCodeSchema,
});
