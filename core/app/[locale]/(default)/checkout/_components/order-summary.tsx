'use client';

import { useState } from 'react';

import { Image } from '~/components/image';

interface LineItem {
  id: string;
  title: string;
  quantity: number;
  price: string;
  image?: { src: string; alt: string };
}

interface SummaryItem {
  label: string;
  value: string;
}

interface Props {
  lineItems: LineItem[];
  summaryItems: SummaryItem[];
  grandTotal: string;
  shippingCost?: string;
}

export function OrderSummary({ lineItems, summaryItems, grandTotal, shippingCost }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const displayItems = [...summaryItems];
  if (shippingCost) {
    const shippingIndex = displayItems.findIndex((i) => i.label === 'Shipping');
    if (shippingIndex >= 0) {
      displayItems[shippingIndex] = { label: 'Shipping', value: shippingCost };
    } else {
      const taxIndex = displayItems.findIndex((i) => i.label === 'Tax');
      const insertAt = taxIndex >= 0 ? taxIndex : displayItems.length;
      displayItems.splice(insertAt, 0, { label: 'Shipping', value: shippingCost });
    }
  }

  return (
    <>
      {/* Mobile toggle */}
      <div className="lg:hidden border-b border-contrast-100">
        <button
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="flex items-center gap-2">
            <svg fill="none" height="16" viewBox="0 0 16 16" width="16">
              <path
                d="M1 1h2l2 9h7l2-7H4"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
              />
            </svg>
            {isOpen ? 'Hide' : 'Show'} order summary
          </span>
          <span className="font-semibold">{grandTotal}</span>
        </button>
        {isOpen && <SummaryContent lineItems={lineItems} summaryItems={displayItems} grandTotal={grandTotal} />}
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <div className="sticky top-8 rounded-xl border border-contrast-100 p-6">
          <SummaryContent lineItems={lineItems} summaryItems={displayItems} grandTotal={grandTotal} />
        </div>
      </div>
    </>
  );
}

function SummaryContent({
  lineItems,
  summaryItems,
  grandTotal,
}: {
  lineItems: LineItem[];
  summaryItems: SummaryItem[];
  grandTotal: string;
}) {
  return (
    <div className="space-y-6 px-4 py-4 lg:px-0 lg:py-0">
      <ul className="space-y-4">
        {lineItems.map((item) => (
          <li key={item.id} className="flex items-start gap-3">
            {item.image ? (
              <div className="relative shrink-0">
                <Image
                  alt={item.image.alt}
                  className="h-14 w-14 rounded-md border border-contrast-100 object-cover"
                  height={56}
                  src={item.image.src}
                  width={56}
                />
                <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-contrast-400 text-xs text-background">
                  {item.quantity}
                </span>
              </div>
            ) : (
              <div className="relative shrink-0 flex h-14 w-14 items-center justify-center rounded-md border border-contrast-100 bg-contrast-100">
                <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-contrast-400 text-xs text-background">
                  {item.quantity}
                </span>
              </div>
            )}
            <div className="flex flex-1 items-start justify-between gap-2">
              <span className="text-sm font-medium leading-tight">{item.title}</span>
              <span className="shrink-0 text-sm font-semibold">{item.price}</span>
            </div>
          </li>
        ))}
      </ul>

      <div className="border-t border-contrast-100 pt-4 space-y-2">
        {summaryItems.map((item) => (
          <div key={item.label} className="flex justify-between text-sm">
            <span className="text-contrast-500">{item.label}</span>
            <span className="font-medium">{item.value}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-contrast-100 pt-4 flex justify-between">
        <span className="font-semibold">Total</span>
        <span className="font-semibold text-lg">{grandTotal}</span>
      </div>
    </div>
  );
}
