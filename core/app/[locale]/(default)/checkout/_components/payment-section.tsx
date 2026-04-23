'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/vibes/soul/primitives/button';
import { Input } from '@/vibes/soul/form/input';
import { Select } from '@/vibes/soul/form/select';

import { BillingAddressInput, submitOrder } from '../_actions/submit-order';
import { ShippingAddressInput } from '../_actions/submit-shipping-address';
import { StepIndicator } from './customer-section';
import { CustomerAddress } from './shipping-section';

const NEW_ADDRESS_ID = -1;

interface Country {
  value: string;
  label: string;
}

interface States {
  country: string;
  states: Array<{ value: string; label: string }>;
}

interface Props {
  isActive: boolean;
  isCompleted: boolean;
  customerEmail: string;
  shippingAddress: ShippingAddressInput | null;
  customerAddresses: CustomerAddress[];
  countries: Country[];
  statesOrProvinces: States[];
  onComplete: (orderId: number) => void;
  onEdit: () => void;
}

export function PaymentSection({
  isActive,
  isCompleted,
  customerEmail,
  shippingAddress,
  customerAddresses,
  countries,
  statesOrProvinces,
  onComplete,
}: Props) {
  const hasSavedAddresses = customerAddresses.length > 0;

  const [sameAsShipping, setSameAsShipping] = useState(true);

  // true only when the user explicitly clicked "Enter a new address" in the billing picker.
  // Derived from hasSavedAddresses at render time so it always reflects the current prop.
  const [useCustomBillingForm, setUseCustomBillingForm] = useState(false);
  const [selectedBillingAddressId, setSelectedBillingAddressId] = useState<number>(
    customerAddresses[0]?.entityId ?? NEW_ADDRESS_ID,
  );

  // Billing form fields
  const [firstName, setFirstName] = useState(shippingAddress?.firstName ?? '');
  const [lastName, setLastName] = useState(shippingAddress?.lastName ?? '');
  const [address1, setAddress1] = useState(shippingAddress?.address1 ?? '');
  const [address2, setAddress2] = useState(shippingAddress?.address2 ?? '');
  const [city, setCity] = useState(shippingAddress?.city ?? '');
  const [countryCode, setCountryCode] = useState(shippingAddress?.countryCode ?? '');
  const [stateOrProvince, setStateOrProvince] = useState(shippingAddress?.stateOrProvince ?? '');
  const [postalCode, setPostalCode] = useState(shippingAddress?.postalCode ?? '');
  const [phone, setPhone] = useState(shippingAddress?.phone ?? '');
  const [billingErrors, setBillingErrors] = useState<Partial<Record<string, string>>>({});

  const [formError, setFormError] = useState('');
  const [isPending, startTransition] = useTransition();

  const availableStates = statesOrProvinces.find((s) => s.country === countryCode)?.states ?? [];

  const validateForm = () => {
    const next: Partial<Record<string, string>> = {};
    if (!firstName) next.firstName = 'Required';
    if (!lastName) next.lastName = 'Required';
    if (!address1) next.address1 = 'Required';
    if (!city) next.city = 'Required';
    if (!postalCode) next.postalCode = 'Required';
    if (!countryCode) next.countryCode = 'Required';
    return next;
  };

  const resolveBillingAddress = (): BillingAddressInput | null => {
    if (sameAsShipping && shippingAddress) {
      return { ...shippingAddress, email: customerEmail };
    }

    if (!sameAsShipping && hasSavedAddresses && !useCustomBillingForm && selectedBillingAddressId !== NEW_ADDRESS_ID) {
      const chosen = customerAddresses.find((a) => a.entityId === selectedBillingAddressId);

      if (chosen) {
        return {
          firstName: chosen.firstName,
          lastName: chosen.lastName,
          email: customerEmail,
          address1: chosen.address1,
          address2: chosen.address2,
          city: chosen.city,
          stateOrProvince: chosen.stateOrProvince,
          postalCode: chosen.postalCode ?? '',
          countryCode: chosen.countryCode,
          phone: chosen.phone,
        };
      }
    }

    // Manual form
    const errors = validateForm();

    if (Object.keys(errors).length > 0) {
      setBillingErrors(errors);
      return null;
    }

    setBillingErrors({});

    return {
      firstName,
      lastName,
      email: customerEmail,
      address1,
      address2: address2 || undefined,
      city,
      stateOrProvince: stateOrProvince || undefined,
      postalCode,
      countryCode,
      phone: phone || undefined,
    };
  };

  const handlePlaceOrder = () => {
    const billing = resolveBillingAddress();

    if (!billing) return;

    setFormError('');

    startTransition(async () => {
      const result = await submitOrder(billing);

      if (result.success && result.orderId) {
        onComplete(result.orderId);
      } else {
        setFormError(result.error ?? 'Failed to place order');
      }
    });
  };

  return (
    <div className="border-b border-contrast-100 pb-6">
      <div className="flex items-center gap-4 py-4">
        <StepIndicator isActive={isActive} isCompleted={isCompleted} step={3} />
        <h2
          className={`flex-1 font-semibold text-lg ${isActive || isCompleted ? 'text-foreground' : 'text-contrast-300'}`}
        >
          Payment
        </h2>
      </div>

      {isCompleted && !isActive && (
        <p className="ml-12 text-sm text-contrast-400">Bank Transfer</p>
      )}

      {isActive && (
        <div className="ml-12 space-y-6">
          {/* ── Billing address ─────────────────────────────────────────── */}
          <div className="space-y-4">
            <h3 className="font-medium">Billing address</h3>

            <label className="flex cursor-pointer items-center gap-3">
              <input
                checked={sameAsShipping}
                className="accent-foreground"
                onChange={(e) => setSameAsShipping(e.target.checked)}
                type="checkbox"
              />
              <span className="text-sm">Same as shipping address</span>
            </label>

            {!sameAsShipping && (
              <div className="space-y-4">
                {/* ── Picker ─────────────────────────────────────────────── */}
                {hasSavedAddresses && !useCustomBillingForm && (
                  <>
                    <fieldset className="space-y-2">
                      <legend className="sr-only">Saved billing addresses</legend>

                      {customerAddresses.map((addr) => (
                        <label
                          key={addr.entityId}
                          className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-colors ${
                            selectedBillingAddressId === addr.entityId
                              ? 'border-foreground bg-contrast-100'
                              : 'border-contrast-200 hover:border-contrast-400'
                          }`}
                        >
                          <input
                            checked={selectedBillingAddressId === addr.entityId}
                            className="mt-0.5 accent-foreground"
                            name="billingAddress"
                            onChange={() => setSelectedBillingAddressId(addr.entityId)}
                            type="radio"
                            value={addr.entityId}
                          />
                          <div className="text-sm">
                            <p className="font-medium">
                              {addr.firstName} {addr.lastName}
                            </p>
                            <p className="text-contrast-500">
                              {[
                                addr.address1,
                                addr.address2,
                                `${addr.city}${addr.stateOrProvince ? `, ${addr.stateOrProvince}` : ''} ${addr.postalCode ?? ''}`,
                                countries.find((c) => c.value === addr.countryCode)?.label ??
                                  addr.countryCode,
                              ]
                                .filter(Boolean)
                                .join(', ')}
                            </p>
                          </div>
                        </label>
                      ))}

                      <label
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                          selectedBillingAddressId === NEW_ADDRESS_ID
                            ? 'border-foreground bg-contrast-100'
                            : 'border-contrast-200 hover:border-contrast-400'
                        }`}
                      >
                        <input
                          checked={selectedBillingAddressId === NEW_ADDRESS_ID}
                          className="accent-foreground"
                          name="billingAddress"
                          onChange={() => setSelectedBillingAddressId(NEW_ADDRESS_ID)}
                          type="radio"
                          value={NEW_ADDRESS_ID}
                        />
                        <span className="text-sm font-medium">Use a different address</span>
                      </label>
                    </fieldset>

                    {selectedBillingAddressId === NEW_ADDRESS_ID && (
                      <Button
                        onClick={() => setUseCustomBillingForm(true)}
                        size="small"
                        variant="secondary"
                      >
                        Enter a new address
                      </Button>
                    )}
                  </>
                )}

                {/* ── Manual form ────────────────────────────────────────── */}
                {(useCustomBillingForm || !hasSavedAddresses) && (
                  <div className="space-y-4">
                    {hasSavedAddresses && (
                      <button
                        className="text-sm font-medium text-foreground underline underline-offset-2 hover:no-underline"
                        onClick={() => {
                          setUseCustomBillingForm(false);
                          setSelectedBillingAddressId(
                            customerAddresses[0]?.entityId ?? NEW_ADDRESS_ID,
                          );
                        }}
                      >
                        ← Back to saved addresses
                      </button>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        errors={billingErrors.firstName ? [billingErrors.firstName] : undefined}
                        label="First name"
                        name="billingFirstName"
                        onChange={(e) => {
                          setFirstName(e.target.value);
                          setBillingErrors((p) => ({ ...p, firstName: undefined }));
                        }}
                        required
                        value={firstName}
                      />
                      <Input
                        errors={billingErrors.lastName ? [billingErrors.lastName] : undefined}
                        label="Last name"
                        name="billingLastName"
                        onChange={(e) => {
                          setLastName(e.target.value);
                          setBillingErrors((p) => ({ ...p, lastName: undefined }));
                        }}
                        required
                        value={lastName}
                      />
                    </div>

                    <Input
                      errors={billingErrors.address1 ? [billingErrors.address1] : undefined}
                      label="Address"
                      name="billingAddress1"
                      onChange={(e) => {
                        setAddress1(e.target.value);
                        setBillingErrors((p) => ({ ...p, address1: undefined }));
                      }}
                      required
                      value={address1}
                    />

                    <Input
                      label="Apartment, suite, etc. (optional)"
                      name="billingAddress2"
                      onChange={(e) => setAddress2(e.target.value)}
                      value={address2}
                    />

                    <Input
                      errors={billingErrors.city ? [billingErrors.city] : undefined}
                      label="City"
                      name="billingCity"
                      onChange={(e) => {
                        setCity(e.target.value);
                        setBillingErrors((p) => ({ ...p, city: undefined }));
                      }}
                      required
                      value={city}
                    />

                    <Select
                      errors={billingErrors.countryCode ? [billingErrors.countryCode] : undefined}
                      label="Country"
                      name="billingCountryCode"
                      onValueChange={(val) => {
                        setCountryCode(val);
                        setStateOrProvince('');
                        setBillingErrors((p) => ({ ...p, countryCode: undefined }));
                      }}
                      options={countries}
                      placeholder="Select a country"
                      required
                      value={countryCode}
                    />

                    <div className="grid grid-cols-2 gap-3">
                      {availableStates.length > 0 ? (
                        <Select
                          label="State / Province"
                          name="billingStateOrProvince"
                          onValueChange={(val) => setStateOrProvince(val)}
                          options={availableStates}
                          placeholder="Select a state"
                          value={stateOrProvince}
                        />
                      ) : (
                        <Input
                          label="State / Province"
                          name="billingStateOrProvince"
                          onChange={(e) => setStateOrProvince(e.target.value)}
                          value={stateOrProvince}
                        />
                      )}
                      <Input
                        errors={billingErrors.postalCode ? [billingErrors.postalCode] : undefined}
                        label="Postal code"
                        name="billingPostalCode"
                        onChange={(e) => {
                          setPostalCode(e.target.value);
                          setBillingErrors((p) => ({ ...p, postalCode: undefined }));
                        }}
                        required
                        value={postalCode}
                      />
                    </div>

                    <Input
                      label="Phone (optional)"
                      name="billingPhone"
                      onChange={(e) => setPhone(e.target.value)}
                      type="tel"
                      value={phone}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Payment method ───────────────────────────────────────────── */}
          <div className="space-y-3">
            <h3 className="font-medium">Payment method</h3>
            <div className="rounded-lg border border-foreground bg-contrast-100 px-4 py-3">
              <div className="flex items-center gap-3">
                <input
                  checked
                  className="accent-foreground"
                  name="paymentMethod"
                  readOnly
                  type="radio"
                  value="bank_transfer"
                />
                <span className="text-sm font-medium">Bank Transfer</span>
              </div>
              <p className="mt-2 text-sm text-contrast-500">
                Pay via bank transfer. Our account details will be provided after placing your
                order. Your order will be held until payment is received.
              </p>
            </div>
          </div>

          {formError && (
            <p className="rounded-md bg-error/10 px-3 py-2 text-sm text-error">{formError}</p>
          )}

          <Button loading={isPending} onClick={handlePlaceOrder} size="medium" variant="primary">
            Place Order
          </Button>
        </div>
      )}
    </div>
  );
}
