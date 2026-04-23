'use server';

import { BigCommerceGQLError } from '@bigcommerce/catalyst-client';
import { AuthError } from 'next-auth';

import { signIn } from '~/auth';
import { getCartId } from '~/lib/cart';

export interface CheckoutLoginResult {
  success: boolean;
  error?: string;
}

export async function checkoutLogin(
  email: string,
  password: string,
): Promise<CheckoutLoginResult> {
  const cartId = await getCartId();

  try {
    await signIn('password', { email, password, cartId, redirect: false });

    return { success: true };
  } catch (error) {
    if (error instanceof BigCommerceGQLError) {
      return { success: false, error: error.errors[0]?.message ?? 'Login failed' };
    }

    if (error instanceof AuthError && error.type === 'CallbackRouteError' && error.cause?.err) {
      const cause = error.cause.err;

      if (cause instanceof BigCommerceGQLError) {
        if (cause.message.includes('Invalid credentials')) {
          return { success: false, error: 'Invalid email or password' };
        }

        if (cause.message.includes('Reset password')) {
          return { success: false, error: 'A password reset is required before signing in' };
        }

        return { success: false, error: cause.errors[0]?.message ?? 'Login failed' };
      }
    }

    return { success: false, error: 'Something went wrong. Please try again.' };
  }
}
