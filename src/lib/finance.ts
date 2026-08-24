import type { Appointment, Booking, Business } from '@/types';

export const PLATFORM_FEE_RATE = 0.05;

export type PaymentSummary = {
  servicePrice: number;
  customerPaid: number;
  serviceCharge: number;
  vendorNet: number;
  feePayer: Business['feeHandling'];
};

export const calculateServiceCharge = (servicePrice: number) =>
  Math.round(Number(servicePrice || 0) * PLATFORM_FEE_RATE);

export const getPaymentSummary = (
  booking: Booking,
  appointment: Appointment | undefined,
  feeHandling: Business['feeHandling'] = 'customer',
): PaymentSummary => {
  const servicePrice = Number(appointment?.price ?? 0);

  if (booking.payment) {
    return {
      servicePrice,
      customerPaid: Number(booking.payment.amountPaid || 0),
      serviceCharge: Number(booking.payment.platformFeeAmount || 0),
      vendorNet: Number(booking.payment.vendorNetAmount || 0),
      feePayer: booking.payment.feePayer,
    };
  }

  const serviceCharge = calculateServiceCharge(servicePrice);
  const vendorNet =
    feeHandling === 'business'
      ? Math.max(servicePrice - serviceCharge, 0)
      : servicePrice;
  const customerPaid =
    feeHandling === 'customer'
      ? servicePrice + serviceCharge
      : servicePrice;

  return {
    servicePrice,
    customerPaid,
    serviceCharge,
    vendorNet,
    feePayer: feeHandling,
  };
};

export const formatCurrency = (value: number) =>
  `\u20A6${Number(value || 0).toLocaleString('en-NG')}`;
