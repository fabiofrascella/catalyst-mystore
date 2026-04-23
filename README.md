## Branch: `headless-checkout`

> **⚠️ This branch is a Proof of Concept — Not for Production Use**
>
> [Catalyst (`main`)](https://github.com/bigcommerce/catalyst) is a production-ready storefront framework. This disclaimer applies **only to the `headless-checkout` branch** and the custom code introduced here.
>
> This branch is an architectural exploration, not a hardened implementation. It demonstrates that a fully native checkout experience can be built inside a Catalyst storefront without redirecting to BigCommerce's hosted checkout. The code is intentionally kept simple to keep the concept legible.
>
> Before considering any of this branch's custom code for a production storefront, a thorough review covering (at minimum) security, accessibility, error handling, edge cases, localisation, and PCI compliance obligations must be completed. Treat it as a starting point and a reference, not a finished solution.



This branch replaces Catalyst's default behaviour of redirecting to BigCommerce's hosted checkout with a fully native, one-page checkout built inside the Catalyst storefront.

### What it does

- **Customer step** — guest email capture or inline sign-in (email + password, no redirect to `/login`). After login, saved addresses are loaded automatically via `router.refresh()`.
- **Shipping step** — logged-in customers can pick from their saved BC addresses or enter a new one. After an address is submitted, available shipping methods are displayed in the same step. Guests go straight to the address form.
- **Payment step** — billing address (defaults to "same as shipping"; logged-in customers can also pick a saved address). Payment method is **Bank Transfer** (offline), which creates the BC order in *Awaiting Payment* status. A stub with clear instructions is provided for dropping in a PSP (Stripe, Adyen, etc.) without using the BigCommerce Payments API.
- **Order confirmation** — after a successful order, the cart is cleared and the user is redirected to `/order-confirmation?orderId=…` (a dedicated page that avoids the cart-empty redirect that would occur if the confirmation were shown inline on `/checkout`).

### How it works

| Concern | Approach |
|---|---|
| BC order creation | `completeCheckout` Storefront GraphQL mutation |
| Order status | `PUT /v2/orders/{id}` (BC Management API) sets status to *Awaiting Payment* (id `7`) |
| Shipping address | `addCheckoutShippingConsignments` / `updateCheckoutShippingConsignment` mutations |
| Shipping method | `selectCheckoutShippingOption` mutation |
| Billing address | `addCheckoutBillingAddress` mutation (called inside `submitOrder`) |
| Inline login | Custom `checkoutLogin` server action — calls NextAuth `signIn` with `redirect: false`, then `router.refresh()` to sync the session and saved addresses |
| Saved addresses | Fetched via `customer.addresses` in `CheckoutPageQuery`; picker updates reactively after inline login |
| Cart clearing | `clearCartId()` called only after both order creation and status update succeed |

---

<a href="https://catalyst.dev" target="_blank" rel="noopener norerrer">
  <img src="https://storage.googleapis.com/bigcommerce-developers/images/catalyst_readme_banner.png" alt="Catalyst for Composable Commerce Image Banner" title="Catalyst">
</a>

<br />
<br />

<div align="center">

[![MIT License](https://img.shields.io/github/license/bigcommerce/catalyst)](LICENSE.md)
[![Lighthouse Report](https://github.com/bigcommerce/catalyst/actions/workflows/lighthouse.yml/badge.svg)](https://github.com/bigcommerce/catalyst/actions/workflows/lighthouse.yml) [![Lint, Typecheck, gql.tada](https://github.com/bigcommerce/catalyst/actions/workflows/basic.yml/badge.svg)](https://github.com/bigcommerce/catalyst/actions/workflows/basic.yml)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/bigcommerce/catalyst)

</div>

**Catalyst** is the composable, fully customizable headless commerce framework for
[BigCommerce](https://www.bigcommerce.com/). Catalyst is built with [Next.js](https://nextjs.org/), uses
our [React](https://react.dev/) storefront components, and is backed by the
[GraphQL Storefront API](https://developer.bigcommerce.com/docs/storefront/graphql).

By choosing Catalyst, you'll have a fully-functional storefront within a few seconds, and spend zero time on wiring
up APIs or building SEO, Accessibility, and Performance-optimized ecommerce components you've probably written many
times before. You can instead go straight to work building your brand and making this your own.

## Demo

- [Catalyst Demo](https://catalyst-demo.site)

![-----------------------------------------------------](https://storage.googleapis.com/bigcommerce-developers/images/catalyst_readme_hr.png)

<p align="center">
 <a href="https://www.catalyst.dev">🚀 catalyst.dev</a> •
 <a href="https://developer.bigcommerce.com/community">🤗 BigCommerce Developer Community</a> •
 <a href="https://github.com/bigcommerce/catalyst/discussions">💬 GitHub Discussions</a> •
 <a href="/docs">💡 Docs in this repo</a>
</p>

![-----------------------------------------------------](https://storage.googleapis.com/bigcommerce-developers/images/catalyst_readme_hr.png)

## Deploy via One-Click Catalyst App

The easiest way to deploy your Catalyst Storefront is to use the [One-Click Catalyst App](http://login.bigcommerce.com/deep-links/app/53284) available in the BigCommerce App Marketplace.

Check out the [Catalyst.dev One-Click Catalyst Documentation](https://www.catalyst.dev/docs/getting-started) for more details.

## Getting Started

**Requirements:**

- A [BigCommerce account](https://www.bigcommerce.com/start-your-trial)
- Node.js version 24
- Corepack-enabled `pnpm`

  ```bash
  corepack enable pnpm
  ```

1. Install the latest version of Catalyst:

   ```bash
   pnpm create @bigcommerce/catalyst@latest
   ```

2. Run the local development server:

   ```bash
   pnpm run dev
   ```

Learn more about Catalyst at [catalyst.dev](https://catalyst.dev).

## Resources

- [Catalyst Documentation](https://catalyst.dev/docs/)
- [GraphQL Storefront API Playground](https://developer.bigcommerce.com/graphql-storefront/playground)
- [GraphQL Storefront API Explorer](https://developer.bigcommerce.com/graphql-storefront/explorer)
- [BigCommerce DevDocs](https://developer.bigcommerce.com/docs/build)
