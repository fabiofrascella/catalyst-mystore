import { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ orderId?: string; email?: string }>;
}

export default async function OrderConfirmation({ params, searchParams }: Props) {
  const { locale } = await params;

  setRequestLocale(locale);

  const { orderId, email } = await searchParams;

  if (!orderId) redirect('/');

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="mx-auto max-w-lg rounded-lg border border-contrast-200 p-8 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-foreground text-background">
          <svg fill="none" height="28" viewBox="0 0 28 28" width="28">
            <path
              d="M4 14l7 7L24 6"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
            />
          </svg>
        </div>

        <h1 className="mb-2 text-2xl font-semibold">Order placed!</h1>

        <p className="mb-1 text-contrast-500">
          Your order <span className="font-medium text-foreground">#{orderId}</span> has been
          received.
        </p>

        {email && (
          <p className="mb-8 text-contrast-500">
            We&apos;ll send bank transfer instructions to{' '}
            <span className="font-medium text-foreground">{email}</span>.
          </p>
        )}

        <a
          className="inline-flex items-center gap-2 rounded-lg bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-80"
          href="/"
        >
          Continue Shopping
        </a>
      </div>
    </div>
  );
}
