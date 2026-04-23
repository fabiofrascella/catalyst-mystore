'use client';

import { useEffect, useState, useTransition } from 'react';

import { Button } from '@/vibes/soul/primitives/button';
import { Input } from '@/vibes/soul/form/input';
import { Select } from '@/vibes/soul/form/select';

import { addShippingCost } from '../../cart/_actions/add-shipping-cost';
import {
  submitShippingAddress,
  ShippingAddressInput,
  ShippingOption,
} from '../_actions/submit-shipping-address';
import { StepIndicator } from './customer-section';

// 'picker' is shown first when the customer has saved addresses.
// 'address' shows the manual entry form.
// 'method' shows the shipping method list after an address is confirmed.
type Phase = 'picker' | 'address' | 'method';

interface Country {
  value: string;
  label: string;
}

interface States {
  country: string;
  states: Array<{ value: string; label: string }>;
}

export interface CustomerAddress {
  entityId: number;
  firstName: string;
  lastName: string;
  address1: string;
  address2?: string;
  city: string;
  stateOrProvince?: string;
  postalCode?: string;
  countryCode: string;
  phone?: string;
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

export interface CompletedShippingData {
  address: ShippingAddressInput;
  consignmentId: string;
  shippingOptions: ShippingOption[];
  selectedOptionId: string;
  selectedOptionLabel: string;
  selectedOptionPrice: string;
}

interface Props {
  isActive: boolean;
  isCompleted: boolean;
  completedData: CompletedShippingData | null;
  checkoutEntityId: string;
  countries: Country[];
  statesOrProvinces: States[];
  currencyCode: string;
  customerAddresses: CustomerAddress[];
  existingShipping?: ExistingShipping;
  onComplete: (data: CompletedShippingData) => void;
  onEdit: () => void;
}

// Sentinel value used as the selectedPickerAddressId to indicate "enter a new address"
const NEW_ADDRESS_ID = -1;

function addressToShippingInput(addr: CustomerAddress): ShippingAddressInput {
  return {
    firstName: addr.firstName,
    lastName: addr.lastName,
    address1: addr.address1,
    address2: addr.address2,
    city: addr.city,
    stateOrProvince: addr.stateOrProvince,
    postalCode: addr.postalCode ?? '',
    countryCode: addr.countryCode,
    phone: addr.phone,
  };
}

function formatAddressSummary(addr: ShippingAddressInput, countries: Country[]): string {
  return [
    `${addr.firstName} ${addr.lastName}`,
    addr.address1,
    addr.address2,
    `${addr.city}${addr.stateOrProvince ? `, ${addr.stateOrProvince}` : ''} ${addr.postalCode}`,
    countries.find((c) => c.value === addr.countryCode)?.label ?? addr.countryCode,
  ]
    .filter(Boolean)
    .join(', ');
}

export function ShippingSection({
  isActive,
  isCompleted,
  completedData,
  checkoutEntityId,
  countries,
  statesOrProvinces,
  currencyCode,
  customerAddresses,
  existingShipping,
  onComplete,
  onEdit,
}: Props) {
  const hasSavedAddresses = customerAddresses.length > 0;
  const existing = completedData?.address ?? existingShipping?.address;

  const initialPhase: Phase = hasSavedAddresses ? 'picker' : 'address';

  const [phase, setPhase] = useState<Phase>(
    existingShipping?.shippingOptions.length ? 'method' : initialPhase,
  );

  // ── Picker state ──────────────────────────────────────────────────────────
  const [selectedPickerAddressId, setSelectedPickerAddressId] = useState<number>(
    customerAddresses[0]?.entityId ?? NEW_ADDRESS_ID,
  );

  // When the user logs in inline (customer step) and router.refresh() populates
  // customerAddresses, phase is already 'address' from the initial mount.
  // Transition to 'picker' if no address has been committed yet.
  useEffect(() => {
    if (customerAddresses.length > 0 && phase === 'address' && savedAddress === null) {
      setPhase('picker');
      setSelectedPickerAddressId(customerAddresses[0]?.entityId ?? NEW_ADDRESS_ID);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerAddresses.length]);
  const [pickerError, setPickerError] = useState('');
  const [isPickerPending, startPickerTransition] = useTransition();

  // ── Address form state ────────────────────────────────────────────────────
  const [savedAddress, setSavedAddress] = useState<ShippingAddressInput | null>(
    completedData?.address ??
      (existing
        ? {
            firstName: existing.firstName ?? '',
            lastName: existing.lastName ?? '',
            address1: existing.address1 ?? '',
            address2: existing.address2,
            city: existing.city ?? '',
            stateOrProvince: existing.stateOrProvince,
            postalCode: existing.postalCode ?? '',
            countryCode: existing.countryCode,
            phone: existing.phone,
          }
        : null),
  );

  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>(
    completedData?.shippingOptions ?? existingShipping?.shippingOptions ?? [],
  );
  const [consignmentId, setConsignmentId] = useState(
    completedData?.consignmentId ?? existingShipping?.consignmentId ?? '',
  );

  const [firstName, setFirstName] = useState(existing?.firstName ?? '');
  const [lastName, setLastName] = useState(existing?.lastName ?? '');
  const [address1, setAddress1] = useState(existing?.address1 ?? '');
  const [address2, setAddress2] = useState(existing?.address2 ?? '');
  const [city, setCity] = useState(existing?.city ?? '');
  const [countryCode, setCountryCode] = useState(existing?.countryCode ?? '');
  const [stateOrProvince, setStateOrProvince] = useState(existing?.stateOrProvince ?? '');
  const [postalCode, setPostalCode] = useState(existing?.postalCode ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [addressErrors, setAddressErrors] = useState<Partial<Record<string, string>>>({});
  const [addressFormError, setAddressFormError] = useState('');
  const [isAddressPending, startAddressTransition] = useTransition();

  // ── Method state ──────────────────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState(
    completedData?.selectedOptionId ??
      existingShipping?.selectedOptionId ??
      shippingOptions.find((o) => o.isRecommended)?.entityId ??
      shippingOptions[0]?.entityId ??
      '',
  );
  const [methodError, setMethodError] = useState('');
  const [isMethodPending, startMethodTransition] = useTransition();

  const availableStates = statesOrProvinces.find((s) => s.country === countryCode)?.states ?? [];

  const formatPrice = (value: number, code: string) =>
    new Intl.NumberFormat('en', { style: 'currency', currency: code }).format(value);

  // ── Shared: submit an address input and transition to method phase ─────────
  async function submitAndShowMethods(addressInput: ShippingAddressInput) {
    const result = await submitShippingAddress(addressInput);

    if (result.success && result.consignmentId) {
      setSavedAddress(addressInput);
      setConsignmentId(result.consignmentId);
      const options = result.shippingOptions ?? [];
      setShippingOptions(options);
      setSelectedId(
        options.find((o) => o.isRecommended)?.entityId ?? options[0]?.entityId ?? '',
      );
      setPhase('method');
    }

    return result;
  }

  // ── Picker submit ─────────────────────────────────────────────────────────
  const handlePickerSubmit = () => {
    if (selectedPickerAddressId === NEW_ADDRESS_ID) {
      setPhase('address');
      return;
    }

    const chosen = customerAddresses.find((a) => a.entityId === selectedPickerAddressId);

    if (!chosen) {
      setPickerError('Please select an address');
      return;
    }

    setPickerError('');

    startPickerTransition(async () => {
      const result = await submitAndShowMethods(addressToShippingInput(chosen));

      if (!result.success) {
        setPickerError(result.error ?? 'Failed to set shipping address');
      }
    });
  };

  // ── Address form submit ───────────────────────────────────────────────────
  const validateAddress = () => {
    const next: Partial<Record<string, string>> = {};
    if (!firstName) next.firstName = 'Required';
    if (!lastName) next.lastName = 'Required';
    if (!address1) next.address1 = 'Required';
    if (!city) next.city = 'Required';
    if (!postalCode) next.postalCode = 'Required';
    if (!countryCode) next.countryCode = 'Required';
    return next;
  };

  const handleAddressSubmit = () => {
    const errors = validateAddress();

    if (Object.keys(errors).length > 0) {
      setAddressErrors(errors);
      return;
    }

    setAddressErrors({});
    setAddressFormError('');

    const addressInput: ShippingAddressInput = {
      firstName,
      lastName,
      address1,
      address2: address2 || undefined,
      city,
      stateOrProvince: stateOrProvince || undefined,
      postalCode,
      countryCode,
      phone: phone || undefined,
    };

    startAddressTransition(async () => {
      const result = await submitAndShowMethods(addressInput);

      if (!result.success) {
        setAddressFormError(result.error ?? 'Failed to save shipping address');
      }
    });
  };

  // ── Method submit ─────────────────────────────────────────────────────────
  const handleMethodSubmit = () => {
    if (!selectedId) {
      setMethodError('Please select a shipping method');
      return;
    }

    setMethodError('');

    const selected = shippingOptions.find((o) => o.entityId === selectedId);

    if (!selected) return;

    startMethodTransition(async () => {
      const result = await addShippingCost({
        checkoutEntityId,
        consignmentEntityId: consignmentId,
        shippingOptionEntityId: selectedId,
      });

      if (result) {
        onComplete({
          address: savedAddress!,
          consignmentId,
          shippingOptions,
          selectedOptionId: selectedId,
          selectedOptionLabel: selected.description,
          selectedOptionPrice: formatPrice(
            selected.cost.value,
            selected.cost.currencyCode || currencyCode,
          ),
        });
      } else {
        setMethodError('Failed to select shipping method');
      }
    });
  };

  // ── Completed summary text ────────────────────────────────────────────────
  const completedAddressSummary = completedData?.address
    ? formatAddressSummary(completedData.address, countries)
    : '';

  const savedAddressSummaryText = savedAddress
    ? formatAddressSummary(savedAddress, countries)
    : '';

  return (
    <div className="border-b border-contrast-100 pb-6">
      <div className="flex items-center gap-4 py-4">
        <StepIndicator isActive={isActive} isCompleted={isCompleted} step={2} />
        <h2
          className={`flex-1 font-semibold text-lg ${isActive || isCompleted ? 'text-foreground' : 'text-contrast-300'}`}
        >
          Shipping
        </h2>
        {isCompleted && !isActive && (
          <button
            className="text-sm font-medium text-foreground underline underline-offset-2 hover:no-underline"
            onClick={onEdit}
          >
            Edit
          </button>
        )}
      </div>

      {isCompleted && !isActive && (
        <div className="ml-12 space-y-1 text-sm text-contrast-400">
          {completedAddressSummary && <p>{completedAddressSummary}</p>}
          {completedData && (
            <p>
              {completedData.selectedOptionLabel} — {completedData.selectedOptionPrice}
            </p>
          )}
        </div>
      )}

      {isActive && (
        <div className="ml-12 space-y-6">
          {/* ── Picker phase ───────────────────────────────────────────── */}
          {phase === 'picker' && (
            <div className="space-y-4">
              {pickerError && (
                <p className="rounded-md bg-error/10 px-3 py-2 text-sm text-error">{pickerError}</p>
              )}

              <fieldset className="space-y-2">
                <legend className="sr-only">Saved addresses</legend>

                {customerAddresses.map((addr) => (
                  <label
                    key={addr.entityId}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-colors ${
                      selectedPickerAddressId === addr.entityId
                        ? 'border-foreground bg-contrast-100'
                        : 'border-contrast-200 hover:border-contrast-400'
                    }`}
                  >
                    <input
                      checked={selectedPickerAddressId === addr.entityId}
                      className="mt-0.5 accent-foreground"
                      name="savedAddress"
                      onChange={() => setSelectedPickerAddressId(addr.entityId)}
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

                {/* "Use a different address" option */}
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                    selectedPickerAddressId === NEW_ADDRESS_ID
                      ? 'border-foreground bg-contrast-100'
                      : 'border-contrast-200 hover:border-contrast-400'
                  }`}
                >
                  <input
                    checked={selectedPickerAddressId === NEW_ADDRESS_ID}
                    className="accent-foreground"
                    name="savedAddress"
                    onChange={() => setSelectedPickerAddressId(NEW_ADDRESS_ID)}
                    type="radio"
                    value={NEW_ADDRESS_ID}
                  />
                  <span className="text-sm font-medium">Use a different address</span>
                </label>
              </fieldset>

              <Button
                loading={isPickerPending}
                onClick={handlePickerSubmit}
                size="small"
                variant="secondary"
              >
                {selectedPickerAddressId === NEW_ADDRESS_ID
                  ? 'Enter a new address'
                  : 'Continue to Shipping Method'}
              </Button>
            </div>
          )}

          {/* ── Address form phase ─────────────────────────────────────── */}
          {phase === 'address' && (
            <div className="space-y-4">
              {hasSavedAddresses && (
                <button
                  className="text-sm font-medium text-foreground underline underline-offset-2 hover:no-underline"
                  onClick={() => setPhase('picker')}
                >
                  ← Back to saved addresses
                </button>
              )}

              {addressFormError && (
                <p className="rounded-md bg-error/10 px-3 py-2 text-sm text-error">
                  {addressFormError}
                </p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Input
                  errors={addressErrors.firstName ? [addressErrors.firstName] : undefined}
                  label="First name"
                  name="firstName"
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    setAddressErrors((p) => ({ ...p, firstName: undefined }));
                  }}
                  required
                  value={firstName}
                />
                <Input
                  errors={addressErrors.lastName ? [addressErrors.lastName] : undefined}
                  label="Last name"
                  name="lastName"
                  onChange={(e) => {
                    setLastName(e.target.value);
                    setAddressErrors((p) => ({ ...p, lastName: undefined }));
                  }}
                  required
                  value={lastName}
                />
              </div>

              <Input
                errors={addressErrors.address1 ? [addressErrors.address1] : undefined}
                label="Address"
                name="address1"
                onChange={(e) => {
                  setAddress1(e.target.value);
                  setAddressErrors((p) => ({ ...p, address1: undefined }));
                }}
                required
                value={address1}
              />

              <Input
                label="Apartment, suite, etc. (optional)"
                name="address2"
                onChange={(e) => setAddress2(e.target.value)}
                value={address2}
              />

              <Input
                errors={addressErrors.city ? [addressErrors.city] : undefined}
                label="City"
                name="city"
                onChange={(e) => {
                  setCity(e.target.value);
                  setAddressErrors((p) => ({ ...p, city: undefined }));
                }}
                required
                value={city}
              />

              <Select
                errors={addressErrors.countryCode ? [addressErrors.countryCode] : undefined}
                label="Country"
                name="countryCode"
                onValueChange={(val) => {
                  setCountryCode(val);
                  setStateOrProvince('');
                  setAddressErrors((p) => ({ ...p, countryCode: undefined }));
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
                    name="stateOrProvince"
                    onValueChange={(val) => setStateOrProvince(val)}
                    options={availableStates}
                    placeholder="Select a state"
                    value={stateOrProvince}
                  />
                ) : (
                  <Input
                    label="State / Province"
                    name="stateOrProvince"
                    onChange={(e) => setStateOrProvince(e.target.value)}
                    value={stateOrProvince}
                  />
                )}
                <Input
                  errors={addressErrors.postalCode ? [addressErrors.postalCode] : undefined}
                  label="Postal code"
                  name="postalCode"
                  onChange={(e) => {
                    setPostalCode(e.target.value);
                    setAddressErrors((p) => ({ ...p, postalCode: undefined }));
                  }}
                  required
                  value={postalCode}
                />
              </div>

              <Input
                label="Phone (optional)"
                name="phone"
                onChange={(e) => setPhone(e.target.value)}
                type="tel"
                value={phone}
              />

              <Button
                loading={isAddressPending}
                onClick={handleAddressSubmit}
                size="small"
                variant="secondary"
              >
                Continue to Shipping Method
              </Button>
            </div>
          )}

          {/* ── Method phase ───────────────────────────────────────────── */}
          {phase === 'method' && (
            <div className="space-y-4">
              {/* Confirmed address summary with inline edit */}
              <div className="flex items-start justify-between rounded-lg border border-contrast-200 px-4 py-3">
                <p className="text-sm text-contrast-500">{savedAddressSummaryText}</p>
                <button
                  className="ml-4 shrink-0 text-sm font-medium text-foreground underline underline-offset-2 hover:no-underline"
                  onClick={() => setPhase(hasSavedAddresses ? 'picker' : 'address')}
                >
                  Edit
                </button>
              </div>

              {methodError && (
                <p className="rounded-md bg-error/10 px-3 py-2 text-sm text-error">{methodError}</p>
              )}

              {shippingOptions.length === 0 ? (
                <p className="text-sm text-contrast-400">
                  No shipping options available for your address.
                </p>
              ) : (
                <fieldset className="space-y-2">
                  <legend className="mb-2 text-sm font-medium">Shipping method</legend>
                  {shippingOptions.map((option) => {
                    const price = formatPrice(
                      option.cost.value,
                      option.cost.currencyCode || currencyCode,
                    );

                    return (
                      <label
                        key={option.entityId}
                        className={`flex cursor-pointer items-center justify-between rounded-lg border px-4 py-3 transition-colors ${
                          selectedId === option.entityId
                            ? 'border-foreground bg-contrast-100'
                            : 'border-contrast-200 hover:border-contrast-400'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            checked={selectedId === option.entityId}
                            className="accent-foreground"
                            name="shippingOption"
                            onChange={() => setSelectedId(option.entityId)}
                            type="radio"
                            value={option.entityId}
                          />
                          <span className="text-sm font-medium">{option.description}</span>
                          {option.isRecommended && (
                            <span className="rounded-full bg-foreground px-2 py-0.5 text-xs text-background">
                              Recommended
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-semibold">{price}</span>
                      </label>
                    );
                  })}
                </fieldset>
              )}

              {shippingOptions.length > 0 && (
                <Button
                  loading={isMethodPending}
                  onClick={handleMethodSubmit}
                  size="small"
                  variant="secondary"
                >
                  Continue to Payment
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
