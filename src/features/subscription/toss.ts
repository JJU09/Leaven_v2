import { TossBillingKeyResponse, TossPaymentResponse } from './types';

const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY || '';
const TOSS_API_URL = 'https://api.tosspayments.com/v1';

const getAuthHeader = () => {
  const encodedKey = Buffer.from(`${TOSS_SECRET_KEY}:`).toString('base64');
  return `Basic ${encodedKey}`;
};

export const issueBillingKey = async (authKey: string, customerKey: string): Promise<TossBillingKeyResponse> => {
  const response = await fetch(`${TOSS_API_URL}/billing/authorizations/issue`, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      authKey,
      customerKey,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to issue billing key');
  }

  return response.json();
};

export const requestBillingPayment = async (
  billingKey: string,
  customerKey: string,
  amount: number,
  orderId: string,
  orderName: string
): Promise<TossPaymentResponse> => {
  const response = await fetch(`${TOSS_API_URL}/billing/${billingKey}`, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customerKey,
      amount,
      orderId,
      orderName,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to process payment');
  }

  return response.json();
};