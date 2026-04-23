'use server';

import { revalidateTag } from 'next/cache';

import { getSessionCustomerAccessToken } from '~/auth';
import { client } from '~/client';
import { graphql } from '~/client/graphql';
import { TAGS } from '~/client/tags';
import { getCartId } from '~/lib/cart';

import { getCheckoutPageData } from '../page-data';

const AddCheckoutShippingAddressMutation = graphql(`
  mutation AddCheckoutShippingAddress($input: AddCheckoutShippingConsignmentsInput!) {
    checkout {
      addCheckoutShippingConsignments(input: $input) {
        checkout {
          entityId
          shippingConsignments {
            entityId
            availableShippingOptions {
              entityId
              description
              cost {
                value
                currencyCode
              }
              isRecommended
            }
          }
        }
      }
    }
  }
`);

const UpdateCheckoutShippingAddressMutation = graphql(`
  mutation UpdateCheckoutShippingAddress($input: UpdateCheckoutShippingConsignmentInput!) {
    checkout {
      updateCheckoutShippingConsignment(input: $input) {
        checkout {
          entityId
          shippingConsignments {
            entityId
            availableShippingOptions {
              entityId
              description
              cost {
                value
                currencyCode
              }
              isRecommended
            }
          }
        }
      }
    }
  }
`);

export interface ShippingAddressInput {
  firstName: string;
  lastName: string;
  address1: string;
  address2?: string;
  city: string;
  stateOrProvince?: string;
  postalCode: string;
  countryCode: string;
  phone?: string;
}

export interface ShippingOption {
  entityId: string;
  description: string;
  cost: { value: number; currencyCode: string };
  isRecommended: boolean;
}

export interface SubmitShippingAddressResult {
  success: boolean;
  consignmentId?: string;
  shippingOptions?: ShippingOption[];
  error?: string;
}

export async function submitShippingAddress(
  address: ShippingAddressInput,
): Promise<SubmitShippingAddressResult> {
  const cartId = await getCartId();

  if (!cartId) return { success: false, error: 'Cart not found' };

  const customerAccessToken = await getSessionCustomerAccessToken();
  const checkoutData = await getCheckoutPageData({ cartId });

  const cart = checkoutData.site.cart;
  const checkout = checkoutData.site.checkout;

  if (!cart || !checkout) return { success: false, error: 'Checkout not found' };

  const checkoutEntityId = checkout.entityId;

  if (!checkoutEntityId) return { success: false, error: 'Checkout ID not found' };

  const lineItems = [...cart.lineItems.physicalItems, ...cart.lineItems.digitalItems].map(
    (item) => ({ lineItemEntityId: item.entityId, quantity: item.quantity }),
  );

  const existingConsignment = checkout.shippingConsignments?.[0];

  try {
    let shippingConsignments;

    if (existingConsignment?.entityId) {
      const response = await client.fetch({
        document: UpdateCheckoutShippingAddressMutation,
        variables: {
          input: {
            checkoutEntityId,
            consignmentEntityId: existingConsignment.entityId,
            data: {
              consignment: {
                address: { ...address, shouldSaveAddress: false },
                lineItems,
              },
            },
          },
        },
        customerAccessToken,
        fetchOptions: { cache: 'no-store' },
      });

      shippingConsignments =
        response.data.checkout.updateCheckoutShippingConsignment?.checkout?.shippingConsignments;
    } else {
      const response = await client.fetch({
        document: AddCheckoutShippingAddressMutation,
        variables: {
          input: {
            checkoutEntityId,
            data: {
              consignments: [
                {
                  address: { ...address, shouldSaveAddress: false },
                  lineItems,
                },
              ],
            },
          },
        },
        customerAccessToken,
        fetchOptions: { cache: 'no-store' },
      });

      shippingConsignments =
        response.data.checkout.addCheckoutShippingConsignments?.checkout?.shippingConsignments;
    }

    revalidateTag(TAGS.checkout, { expire: 0 });

    const consignment = shippingConsignments?.[0];

    if (!consignment) return { success: false, error: 'Failed to set shipping address' };

    return {
      success: true,
      consignmentId: consignment.entityId,
      shippingOptions: consignment.availableShippingOptions ?? [],
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
