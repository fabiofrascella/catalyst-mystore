'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ShippingOption } from '../_actions/submit-shipping-address';
import { CustomerSection } from './customer-section';
import { OrderSummary } from './order-summary';
import { PaymentSection } from './payment-section';
import { CompletedShippingData, CustomerAddress, ShippingSection } from './shipping-section';

type Step = 'customer' | 'shipping' | 'payment';

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

interface Country {
  value: string;
  label: string;
}

interface States {
  country: string;
  states: Array<{ value: string; label: string }>;
}

interface ExistingShipping {
  consignmentId: string;
  address: {
    firstName?: string;
    lastName?: string;
    address1?: string;
    address2?: string;
    city?: string;
    stateOrProvince?: string;
    postalCode?: string;
    countryCode: string;
    phone?: string;
  };
  shippingOptions: ShippingOption[];
  selectedOptionId?: string;
}

interface Props {
  checkoutEntityId: string;
  customer: {
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    isLoggedIn: boolean;
  };
  lineItems: LineItem[];
  summaryItems: SummaryItem[];
  grandTotal: string;
  currencyCode: string;
  countries: Country[];
  statesOrProvinces: States[];
  customerAddresses: CustomerAddress[];
  existingShipping?: ExistingShipping;
}

export function CheckoutPage({
  checkoutEntityId,
  customer,
  lineItems,
  summaryItems,
  grandTotal,
  currencyCode,
  countries,
  statesOrProvinces,
  customerAddresses,
  existingShipping,
}: Props) {
  const [activeStep, setActiveStep] = useState<Step>(
    customer.isLoggedIn ? 'shipping' : 'customer',
  );

  const [completedCustomer, setCompletedCustomer] = useState<{ email: string } | null>(
    customer.isLoggedIn ? { email: customer.email ?? '' } : null,
  );

  const [completedShipping, setCompletedShipping] = useState<CompletedShippingData | null>(null);

  const router = useRouter();

  const handleCustomerComplete = (email: string) => {
    setCompletedCustomer({ email });
    setActiveStep('shipping');
  };

  const handleShippingComplete = (data: CompletedShippingData) => {
    setCompletedShipping(data);
    setActiveStep('payment');
  };

  const customerEmail = completedCustomer?.email ?? customer.email ?? '';

  const handleOrderComplete = (id: number) => {
    router.push(
      `/order-confirmation?orderId=${id}&email=${encodeURIComponent(customerEmail)}`,
    );
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">
        {/* Main checkout column */}
        <div>
          <CustomerSection
            completedEmail={completedCustomer?.email ?? null}
            customer={customer}
            isActive={activeStep === 'customer'}
            isCompleted={completedCustomer !== null}
            onComplete={handleCustomerComplete}
            onEdit={() => setActiveStep('customer')}
          />

          <ShippingSection
            checkoutEntityId={checkoutEntityId}
            completedData={completedShipping}
            countries={countries}
            currencyCode={currencyCode}
            customerAddresses={customerAddresses}
            existingShipping={existingShipping}
            isActive={activeStep === 'shipping'}
            isCompleted={completedShipping !== null}
            onComplete={handleShippingComplete}
            onEdit={() => setActiveStep('shipping')}
            statesOrProvinces={statesOrProvinces}
          />

          <PaymentSection
            countries={countries}
            customerAddresses={customerAddresses}
            customerEmail={customerEmail}
            isActive={activeStep === 'payment'}
            isCompleted={false}
            onComplete={handleOrderComplete}
            onEdit={() => setActiveStep('payment')}
            shippingAddress={completedShipping?.address ?? null}
            statesOrProvinces={statesOrProvinces}
          />
        </div>

        {/* Order summary sidebar */}
        <div>
          <OrderSummary
            grandTotal={grandTotal}
            lineItems={lineItems}
            shippingCost={completedShipping?.selectedOptionPrice}
            summaryItems={summaryItems}
          />
        </div>
      </div>
    </div>
  );
}
