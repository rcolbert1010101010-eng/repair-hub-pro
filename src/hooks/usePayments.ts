import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Payment, PaymentMethod, PaymentOrderType } from '@/types';
import { computePaymentSummary, fetchPayments, PAYMENT_EPSILON, recordPayment, voidPayment } from '@/integrations/supabase/payments';

const toNumber = (value: number | string | null | undefined) => {
  const numeric = typeof value === 'number' ? value : value != null ? Number(value) : NaN;
  return Number.isFinite(numeric) ? numeric : 0;
};

const usePaymentsInternal = (
  orderType?: PaymentOrderType,
  orderId?: string,
  orderTotal: number = 0
) => {
  const hasOrder = Boolean(orderType && orderId);
  const queryClient = useQueryClient();

  const paymentsQuery = useQuery({
    queryKey: ['payments', orderType ?? 'none', orderId ?? 'none'],
    queryFn: () => fetchPayments(orderType as PaymentOrderType, orderId as string),
    enabled: hasOrder,
    staleTime: 1000 * 30,
  });

  const addPayment = useMutation({
    mutationFn: (input: { amount: number; method: PaymentMethod; reference?: string | null; notes?: string | null }) => {
      if (!hasOrder) {
        return Promise.reject(new Error('Order required to record payment'));
      }
      const currentSummary = computePaymentSummary(paymentsQuery.data, orderTotal);
      const projectedPaid = currentSummary.totalPaid + toNumber(input.amount);
      const allowedTotal = toNumber(orderTotal);
      if (projectedPaid - allowedTotal > PAYMENT_EPSILON) {
        return Promise.reject(
          new Error('Payment too large: Amount exceeds the remaining balance. Adjust the amount or use a credit workflow.')
        );
      }
      return recordPayment({
        order_type: orderType as PaymentOrderType,
        order_id: orderId as string,
        amount: input.amount,
        method: input.method,
        reference: input.reference ?? null,
        notes: input.notes ?? null,
      });
    },
    onSuccess: (_data, _variables) => {
      if (hasOrder) {
        queryClient.invalidateQueries({ queryKey: ['payments', orderType ?? 'none', orderId ?? 'none'] });
      }
    },
  });

  const voidPaymentMutation = useMutation({
    mutationFn: (input: { paymentId: string; reason?: string | null }) => voidPayment(input.paymentId, input.reason),
    onSuccess: (_data, _variables) => {
      if (hasOrder) {
        queryClient.invalidateQueries({ queryKey: ['payments', orderType ?? 'none', orderId ?? 'none'] });
      }
    },
  });

  const summary = useMemo(
    () => computePaymentSummary(paymentsQuery.data, orderTotal),
    [paymentsQuery.data, orderTotal]
  );

  return {
    paymentsQuery,
    summary,
    addPaymentMutation: addPayment,
    voidPaymentMutation,
  };
};

export const usePayments = (
  orderType?: PaymentOrderType,
  orderId?: string,
  orderTotal: number = 0
) => {
  const { paymentsQuery, summary, addPaymentMutation, voidPaymentMutation } = usePaymentsInternal(
    orderType,
    orderId,
    orderTotal
  );

  return {
    payments: paymentsQuery.data ?? ([] as Payment[]),
    summary,
    isLoading: paymentsQuery.isLoading,
    isError: paymentsQuery.isError,
    addPayment: addPaymentMutation,
    voidPayment: voidPaymentMutation,
  };
};

export const useOrderPayments = (
  orderType?: PaymentOrderType,
  orderId?: string,
  orderTotal: number = 0
) => {
  const { paymentsQuery, summary, addPaymentMutation, voidPaymentMutation } = usePaymentsInternal(
    orderType,
    orderId,
    orderTotal
  );

  const addPayment = (
    args: {
      orderType: PaymentOrderType;
      orderId: string;
      amount: number;
      method: PaymentMethod | string;
      reference?: string | null;
      notes?: string | null;
    },
    options?: { onSuccess?: () => void; onError?: (error: unknown) => void }
  ) => {
    return addPaymentMutation.mutateAsync(
      {
        amount: args.amount,
        method: args.method as PaymentMethod,
        reference: args.reference ?? null,
        notes: args.notes ?? null,
      },
      {
        onSuccess: () => {
          options?.onSuccess?.();
        },
        onError: (error) => {
          options?.onError?.(error);
        },
      }
    );
  };

  return {
    payments: paymentsQuery.data ?? ([] as Payment[]),
    summary,
    isLoading: paymentsQuery.isLoading,
    isError: paymentsQuery.isError,
    addPayment,
    addPaymentMutation,
    voidPayment: voidPaymentMutation,
  };
};
