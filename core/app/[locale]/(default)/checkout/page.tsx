import { Metadata } from 'next';
import { getFormatter, setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';

import { isLoggedIn } from '~/auth';
import { getCartId } from '~/lib/cart';
import { getPreferredCurrencyCode } from '~/lib/currency';

import { CheckoutPage } from './_components/checkout-page';
import { getCheckoutPageData, getCheckoutShippingCountries } from './page-data';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ locale: string }>;
}

const blacklistedUSStates = new Set([
  'Armed Forces Africa',
  'Armed Forces Canada',
  'Armed Forces Middle East',
]);

// eslint-disable-next-line complexity
export default async function Checkout({ params }: Props) {
  const { locale } = await params;

  setRequestLocale(locale);

  const cartId = await getCartId();

  if (!cartId) redirect('/cart');

  const currencyCode = await getPreferredCurrencyCode();
  const [data, shippingCountriesData, loggedIn] = await Promise.all([
    getCheckoutPageData({ cartId, currencyCode }),
    getCheckoutShippingCountries(),
    isLoggedIn(),
  ]);

  const cart = data.site.cart;
  const checkout = data.site.checkout;
  const customer = data.customer;

  const customerAddresses = (customer?.addresses?.edges ?? [])
    .map((e) => e.node)
    .filter(Boolean)
    .map((node) => ({
      entityId: node.entityId,
      firstName: node.firstName,
      lastName: node.lastName,
      address1: node.address1,
      address2: node.address2 ?? undefined,
      city: node.city,
      stateOrProvince: node.stateOrProvince ?? undefined,
      postalCode: node.postalCode ?? undefined,
      countryCode: node.countryCode,
      phone: node.phone ?? undefined,
    }));

  if (!cart) redirect('/cart');

  const format = await getFormatter();

  // Format line items for order summary
  const physicalAndDigital = [...cart.lineItems.physicalItems, ...cart.lineItems.digitalItems]
    .filter((item) => !item.parentEntityId)
    .map((item) => ({
      id: item.entityId,
      title: item.name,
      quantity: item.quantity,
      price: format.number(item.listPrice.value, {
        style: 'currency',
        currency: item.listPrice.currencyCode,
      }),
      image: item.image?.url ? { src: item.image.url, alt: item.name } : undefined,
    }));

  const giftCertificateItems = cart.lineItems.giftCertificates.map((item) => ({
    id: item.entityId,
    title: item.name,
    quantity: 1,
    price: format.number(item.amount.value, {
      style: 'currency',
      currency: item.amount.currencyCode,
    }),
    image: undefined,
  }));

  const lineItems = [...physicalAndDigital, ...giftCertificateItems];

  // Format summary items (subtotal, discounts, tax)
  const totalCouponDiscount =
    checkout?.coupons.reduce((sum, c) => sum + c.discountedAmount.value, 0) ?? 0;

  const summaryItems = [
    {
      label: 'Subtotal',
      value: format.number(checkout?.subtotal?.value ?? 0, {
        style: 'currency',
        currency: cart.currencyCode,
      }),
    },
    cart.discountedAmount.value > 0
      ? {
          label: 'Discounts',
          value: `-${format.number(cart.discountedAmount.value, { style: 'currency', currency: cart.currencyCode })}`,
        }
      : null,
    totalCouponDiscount > 0
      ? {
          label: 'Coupon',
          value: `-${format.number(totalCouponDiscount, { style: 'currency', currency: cart.currencyCode })}`,
        }
      : null,
    ...(checkout?.giftCertificates.map((gc) => ({
      label: `Gift certificate (${gc.code})`,
      value: `-${format.number(gc.used.value, { style: 'currency', currency: cart.currencyCode })}`,
    })) ?? []),
    checkout?.taxTotal
      ? {
          label: 'Tax',
          value: format.number(checkout.taxTotal.value, {
            style: 'currency',
            currency: cart.currencyCode,
          }),
        }
      : null,
  ].filter((item): item is { label: string; value: string } => item !== null);

  const grandTotal = format.number(checkout?.grandTotal?.value ?? 0, {
    style: 'currency',
    currency: cart.currencyCode,
  });

  const countries = shippingCountriesData.map((c) => ({ value: c.code, label: c.name }));
  const statesOrProvinces = shippingCountriesData.map((c) => ({
    country: c.code,
    states: c.statesOrProvinces
      .filter((s) => c.code !== 'US' || !blacklistedUSStates.has(s.name))
      .map((s) => ({ value: s.abbreviation, label: s.name })),
  }));

  // Build existing shipping data if already set
  const shippingConsignment = checkout?.shippingConsignments?.[0];
  const existingShipping = shippingConsignment
    ? {
        consignmentId: shippingConsignment.entityId,
        address: {
          firstName: shippingConsignment.address.firstName ?? undefined,
          lastName: shippingConsignment.address.lastName ?? undefined,
          address1: shippingConsignment.address.address1 ?? undefined,
          address2: shippingConsignment.address.address2 ?? undefined,
          city: shippingConsignment.address.city ?? undefined,
          stateOrProvince: shippingConsignment.address.stateOrProvince ?? undefined,
          postalCode: shippingConsignment.address.postalCode ?? undefined,
          countryCode: shippingConsignment.address.countryCode,
          phone: shippingConsignment.address.phone ?? undefined,
        },
        shippingOptions: (shippingConsignment.availableShippingOptions ?? []).map((o) => ({
          entityId: o.entityId,
          description: o.description,
          cost: { value: o.cost.value, currencyCode: o.cost.currencyCode ?? cart.currencyCode },
          isRecommended: o.isRecommended,
        })),
        selectedOptionId: shippingConsignment.selectedShippingOption?.entityId,
      }
    : undefined;

  return (
    <CheckoutPage
      checkoutEntityId={checkout?.entityId ?? cartId}
      countries={countries}
      currencyCode={cart.currencyCode}
      customer={{
        email: customer?.email ?? null,
        firstName: customer?.firstName ?? null,
        lastName: customer?.lastName ?? null,
        isLoggedIn: loggedIn,
      }}
      customerAddresses={customerAddresses}
      existingShipping={existingShipping}
      grandTotal={grandTotal}
      lineItems={lineItems}
      statesOrProvinces={statesOrProvinces}
      summaryItems={summaryItems}
    />
  );
}
