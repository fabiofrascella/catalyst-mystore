import { getSessionCustomerAccessToken } from '~/auth';
import { client } from '~/client';
import { graphql, VariablesOf } from '~/client/graphql';
import { TAGS } from '~/client/tags';
import {
  CartGiftCertificateFragment,
  DigitalItemFragment,
  PhysicalItemFragment,
} from '../cart/page-data';

const ShippingCountriesQuery = graphql(`
  query CheckoutShippingCountriesQuery {
    site {
      settings {
        shipping {
          supportedShippingDestinations {
            countries {
              entityId
              code
              name
              statesOrProvinces {
                entityId
                name
                abbreviation
              }
            }
          }
        }
      }
    }
  }
`);

export const getCheckoutShippingCountries = async () => {
  const { data } = await client.fetch({
    document: ShippingCountriesQuery,
    fetchOptions: { cache: 'no-store' },
  });

  return data.site.settings?.shipping?.supportedShippingDestinations?.countries ?? [];
};

const MoneyFieldsFragment = graphql(`
  fragment CheckoutMoneyFieldsFragment on Money {
    currencyCode
    value
  }
`);

const CheckoutShippingFragment = graphql(`
  fragment CheckoutShippingFragment on Checkout {
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
      selectedShippingOption {
        entityId
        description
        cost {
          value
          currencyCode
        }
      }
      address {
        firstName
        lastName
        address1
        address2
        city
        stateOrProvince
        postalCode
        countryCode
        phone
      }
    }
    shippingCostTotal {
      currencyCode
      value
    }
  }
`);

const CheckoutPageQuery = graphql(
  `
    query CheckoutPageQuery($cartId: String, $currencyCode: currencyCode) {
      customer {
        email
        firstName
        lastName
        addresses(first: 20) {
          edges {
            node {
              entityId
              firstName
              lastName
              address1
              address2
              city
              stateOrProvince
              postalCode
              countryCode
              phone
            }
          }
        }
      }
      site {
        cart(entityId: $cartId) {
          entityId
          version
          currencyCode
          discountedAmount {
            ...CheckoutMoneyFieldsFragment
          }
          lineItems {
            physicalItems {
              ...PhysicalItemFragment
            }
            digitalItems {
              ...DigitalItemFragment
            }
            giftCertificates {
              ...CartGiftCertificateFragment
            }
            totalQuantity
          }
        }
        checkout(entityId: $cartId) {
          entityId
          subtotal {
            ...CheckoutMoneyFieldsFragment
          }
          grandTotal {
            ...CheckoutMoneyFieldsFragment
          }
          taxTotal {
            ...CheckoutMoneyFieldsFragment
          }
          cart {
            currencyCode
          }
          coupons {
            code
            discountedAmount {
              ...CheckoutMoneyFieldsFragment
            }
          }
          giftCertificates {
            code
            used {
              ...CheckoutMoneyFieldsFragment
            }
          }
          ...CheckoutShippingFragment
        }
        settings {
          giftCertificates(currencyCode: $currencyCode) {
            isEnabled
          }
        }
      }
    }
  `,
  [
    PhysicalItemFragment,
    DigitalItemFragment,
    CartGiftCertificateFragment,
    MoneyFieldsFragment,
    CheckoutShippingFragment,
  ],
);

type Variables = VariablesOf<typeof CheckoutPageQuery>;

export const getCheckoutPageData = async (variables: Variables) => {
  const customerAccessToken = await getSessionCustomerAccessToken();

  const { data } = await client.fetch({
    document: CheckoutPageQuery,
    variables,
    customerAccessToken,
    fetchOptions: {
      cache: 'no-store',
      next: { tags: [TAGS.cart, TAGS.checkout] },
    },
  });

  return data;
};
