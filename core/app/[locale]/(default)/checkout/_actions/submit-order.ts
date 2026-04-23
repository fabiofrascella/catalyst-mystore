'use server';

import { revalidateTag } from 'next/cache';

import { getSessionCustomerAccessToken } from '~/auth';
import { client } from '~/client';
import { graphql } from '~/client/graphql';
import { TAGS } from '~/client/tags';
import { clearCartId, getCartId } from '~/lib/cart';

// ─── PAYMENT INTEGRATION STUB ────────────────────────────────────────────────
//
// Currently only Bank Transfer (offline) is implemented.
// To add an online payment method via a PSP (e.g. Stripe, Adyen, Braintree):
//
//   1. Mount the PSP's payment form (e.g. Stripe Elements, Adyen Drop-in) inside
//      payment-section.tsx. The PSP SDK renders the card fields and handles
//      tokenisation entirely on the client — no card data touches your server.
//
//   2. On "Place Order", first tokenise the payment instrument through the PSP SDK
//      (e.g. stripe.confirmCardPayment / stripe.createPaymentMethod). This gives
//      you a PSP-specific token or payment intent ID.
//
//   3. Call submitOrder() — it creates the BC order and sets its status to
//      "Awaiting Payment". submitOrder() already returns { orderId } which you
//      can pass to your PSP for metadata / order reference.
//
//   4. Charge the customer by calling your own server action (or API route) that
//      uses the PSP's server-side SDK with the token from step 2. This keeps your
//      PSP secret key server-side only.
//
//   5. On successful charge, update the BC order status to "Awaiting Fulfillment"
//      (status_id: 11) by calling setOrderStatus(orderId, 11) — the same helper
//      used below.
//
//   Note: this flow does NOT use the BigCommerce Payments API. The PSP is
//   integrated directly; BigCommerce is used only for order management.
//
// ─────────────────────────────────────────────────────────────────────────────

// BC Orders V2 status IDs
// https://developer.bigcommerce.com/docs/rest-management/orders#order-status-codes
const BC_STATUS_AWAITING_PAYMENT = 7;

async function setOrderStatus(orderId: number, statusId: number): Promise<void> {
  const storeHash = process.env.BIGCOMMERCE_STORE_HASH;
  const accessToken = process.env.BIGCOMMERCE_ACCESS_TOKEN;

  if (!storeHash || !accessToken) {
    throw new Error('BIGCOMMERCE_STORE_HASH or BIGCOMMERCE_ACCESS_TOKEN is not set');
  }

  const response = await fetch(
    `https://api.bigcommerce.com/stores/${storeHash}/v2/orders/${orderId}`,
    {
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Auth-Token': accessToken,
      },
      body: JSON.stringify({ status_id: statusId }),
    },
  );

  if (!response.ok) {
    const text = await response.text();

    throw new Error(`BC Orders API error ${response.status}: ${text}`);
  }
}

export interface BillingAddressInput {
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  stateOrProvince?: string;
  postalCode: string;
  countryCode: string;
  phone?: string;
}

export interface SubmitOrderResult {
  success: boolean;
  orderId?: number;
  error?: string;
}

const AddCheckoutBillingAddressMutation = graphql(`
  mutation AddCheckoutBillingAddress($input: AddCheckoutBillingAddressInput!) {
    checkout {
      addCheckoutBillingAddress(input: $input) {
        checkout {
          entityId
        }
      }
    }
  }
`);

const CompleteCheckoutMutation = graphql(`
  mutation CompleteCheckout($input: CompleteCheckoutInput!) {
    checkout {
      completeCheckout(input: $input) {
        orderEntityId
      }
    }
  }
`);

export async function submitOrder(billing: BillingAddressInput): Promise<SubmitOrderResult> {
  const cartId = await getCartId();

  if (!cartId) return { success: false, error: 'Cart not found' };

  const customerAccessToken = await getSessionCustomerAccessToken();

  try {
    await client.fetch({
      document: AddCheckoutBillingAddressMutation,
      variables: {
        input: {
          checkoutEntityId: cartId,
          data: {
            address: {
              firstName: billing.firstName,
              lastName: billing.lastName,
              email: billing.email,
              company: billing.company,
              address1: billing.address1,
              address2: billing.address2,
              city: billing.city,
              stateOrProvince: billing.stateOrProvince,
              postalCode: billing.postalCode,
              countryCode: billing.countryCode,
              phone: billing.phone,
              shouldSaveAddress: false,
            },
          },
        },
      },
      customerAccessToken,
      fetchOptions: { cache: 'no-store' },
    });

    const response = await client.fetch({
      document: CompleteCheckoutMutation,
      variables: { input: { checkoutEntityId: cartId } },
      customerAccessToken,
      fetchOptions: { cache: 'no-store' },
    });

    const result = response.data.checkout.completeCheckout;

    if (!result?.orderEntityId) {
      return { success: false, error: 'Order could not be created' };
    }

    await setOrderStatus(result.orderEntityId, BC_STATUS_AWAITING_PAYMENT);

    await clearCartId();
    revalidateTag(TAGS.cart, { expire: 0 });
    revalidateTag(TAGS.checkout, { expire: 0 });

    return {
      success: true,
      orderId: result.orderEntityId,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
