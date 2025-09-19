import { stripe } from "../config/stripe";

export const refundPayment = async (paymentIntentId: string) => {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
    });
    console.log("Refund successful:", refund);
    return refund;
  } catch (error) {
    console.error("Refund failed:", error);
    throw error;
  }
};
