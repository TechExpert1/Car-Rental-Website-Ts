import { stripe } from "../config/stripe";

export const refundPayment = async (paymentIntentId: string, amount?: number) => {
  try {
    const refundParams: any = {
      payment_intent: paymentIntentId,
    };

    // If amount is specified, do partial refund (amount should be in dollars)
    if (amount !== undefined && amount > 0) {
      refundParams.amount = Math.round(amount * 100); // Convert to cents
    }

    const refund = await stripe.refunds.create(refundParams);
    console.log("Refund successful:", refund);
    return refund;
  } catch (error) {
    console.error("Refund failed:", error);
    throw error;
  }
};
