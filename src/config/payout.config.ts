/**
 * Payout Configuration
 * 
 * PAYOUT_DELAY_DAYS: Number of days to wait before transferring payment to host after booking confirmation
 * 
 * Default: 8 days (Stripe makes funds available after 7 days, so 8 days ensures funds are ready)
 * For testing: You can change this to a smaller value (e.g., 0.001 for ~1.5 minutes)
 * 
 * Examples:
 * - 8 days = 8
 * - 5 days = 5
 * - 1 day = 1
 * - 1 hour = 1/24 = 0.042
 * - 10 minutes = 10/(24*60) = 0.007
 * - 1 minute = 1/(24*60) = 0.0007
 */
export const PAYOUT_DELAY_DAYS = 8;

/**
 * Platform fee percentage (deducted from total amount before host payout)
 * Default: 10%
 */
export const PLATFORM_FEE_PERCENTAGE = 10;

/**
 * Stripe Processing Fees (for domestic cards)
 * - 2.9% of the transaction amount
 * - Plus 30 cents per transaction
 * 
 * Reference: https://stripe.com/pricing
 */
export const STRIPE_FEE_PERCENTAGE = 2.9;
export const STRIPE_FIXED_FEE = 0.30; // $0.30 USD

/**
 * Calculate all fees and host payout amount
 * 
 * @param totalAmount - The total booking amount paid by customer
 * @returns Object containing all fee breakdowns and host payout
 * 
 * Example for $100 booking:
 * - Stripe Fee: ($100 * 2.9%) + $0.30 = $3.20
 * - Net after Stripe: $100 - $3.20 = $96.80
 * - Platform Fee (10%): $96.80 * 10% = $9.68
 * - Host Payout: $96.80 - $9.68 = $87.12
 */
export const calculatePayoutBreakdown = (totalAmount: number) => {
    // Step 1: Calculate Stripe's processing fee
    const stripeFee = (totalAmount * STRIPE_FEE_PERCENTAGE / 100) + STRIPE_FIXED_FEE;

    // Step 2: Amount after Stripe takes their cut
    const amountAfterStripe = totalAmount - stripeFee;

    // Step 3: Calculate platform fee (from amount after Stripe fee)
    const platformFee = amountAfterStripe * (PLATFORM_FEE_PERCENTAGE / 100);

    // Step 4: Host payout is what's left after both fees
    const hostPayout = amountAfterStripe - platformFee;

    return {
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        stripeFee: parseFloat(stripeFee.toFixed(2)),
        amountAfterStripe: parseFloat(amountAfterStripe.toFixed(2)),
        platformFee: parseFloat(platformFee.toFixed(2)),
        platformFeePercentage: PLATFORM_FEE_PERCENTAGE,
        hostPayout: parseFloat(hostPayout.toFixed(2)),
        // For backwards compatibility
        hostPayoutPercentage: parseFloat(((hostPayout / totalAmount) * 100).toFixed(2)),
    };
};
