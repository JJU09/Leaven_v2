export type SubscriptionPlan = 'free' | 'basic' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled';

export interface StoreSubscription {
  id: string;
  store_id: string;
  plan_id: SubscriptionPlan;
  status: SubscriptionStatus;
  billing_key: string | null;
  customer_key: string;
  current_period_start: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  past_due_since: string | null;
  created_at: string;
  updated_at: string;
}

export interface TossBillingKeyResponse {
  mId: string;
  customerKey: string;
  authenticatedAt: string;
  method: string;
  billingKey: string;
  cardCompany: string;
  cardNumber: string;
}

export interface TossPaymentResponse {
  mId: string;
  version: string;
  paymentKey: string;
  orderId: string;
  orderName: string;
  currency: string;
  method: string;
  totalAmount: number;
  balanceAmount: number;
  suppliedAmount: number;
  vat: number;
  status: string;
  requestedAt: string;
  approvedAt: string;
  useEscrow: boolean;
  cultureExpense: boolean;
  card: {
    company: string;
    number: string;
    installmentPlanMonths: number;
    isInterestFree: boolean;
    approveNo: string;
    useCardPoint: boolean;
    cardType: string;
    ownerType: string;
    acquireStatus: string;
    receiptUrl: string;
  };
}