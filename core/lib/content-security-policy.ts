import builder from 'content-security-policy-builder';

const makeswiftEnabled = !!process.env.MAKESWIFT_SITE_API_KEY;

const makeswiftBaseUrl = process.env.MAKESWIFT_BASE_URL || 'https://app.makeswift.com';

const frameAncestors = makeswiftEnabled ? makeswiftBaseUrl : 'none';

export function buildCspHeader(checkoutUrl?: string): string {
  // BC embedded checkout can be served from the store's .mybigcommerce.com or .bigcommerce.com
  // subdomain at runtime, which may differ from the build-time checkoutUrl. Allow both BC domains
  // plus the configured checkout origin for sandbox/custom-domain setups.
  const checkoutOrigin = checkoutUrl ? new URL(checkoutUrl).origin : undefined;

  const frameSrc = [
    'https://*.mybigcommerce.com',
    'https://*.bigcommerce.com',
    ...(checkoutOrigin ? [checkoutOrigin] : []),
  ];

  return builder({
    directives: {
      baseUri: ['self'],
      frameAncestors: [frameAncestors],
      frameSrc,
    },
  });
}

export const cspHeader = buildCspHeader();
