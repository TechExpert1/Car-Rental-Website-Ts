/**
 * Payout Configuration
 * 
 * PAYOUT_DELAY_DAYS: Number of days to wait before transferring payment to host after booking confirmation
 * 
 * Default: 5 days
 * For testing: You can change this to a smaller value (e.g., 0.001 for ~1.5 minutes)
 * 
 * Examples:
 * - 5 days = 5
 * - 1 day = 1
 * - 1 hour = 1/24 = 0.042
 * - 10 minutes = 10/(24*60) = 0.007
 * - 1 minute = 1/(24*60) = 0.0007
 */
export const PAYOUT_DELAY_DAYS = 5;

/**
 * Platform fee percentage (deducted from total amount before host payout)
 * Default: 10%
 */
export const PLATFORM_FEE_PERCENTAGE = 10;

