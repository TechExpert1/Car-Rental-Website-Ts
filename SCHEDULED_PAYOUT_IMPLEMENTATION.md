# Scheduled Host Payout Implementation

## Overview
This implementation adds automatic scheduled payouts to hosts after booking confirmation. When a booking is confirmed, a payout is scheduled to be transferred to the host after a configurable delay (default: 5 days). A cron job runs every hour to process pending payouts.

## Features
- ✅ Automatic payout scheduling when booking is confirmed
- ✅ Configurable delay period (default: 5 days)
- ✅ Cron job runs every hour to process pending payouts
- ✅ Transfers payment to host's Stripe connected account
- ✅ Updates host's `total_revenue` field
- ✅ Tracks payout status and processing details
- ✅ Platform fee deduction (10% by default)

## Files Modified/Created

### 1. **src/modules/booking/booking.model.ts**
Added new fields to track scheduled payouts:
- `scheduledPayoutDate?: Date` - When the payout should be processed
- `payoutStatus?: "pending" | "processing" | "completed" | "failed"` - Current payout status
- `payoutProcessedAt?: Date` - When the payout was actually processed
- `payoutTransferId?: string` - Stripe transfer ID for reference

### 2. **src/services/scheduledPayout.service.ts** (NEW)
Core payout service with the following functions:
- `calculatePayoutDate()` - Calculates when payout should occur
- `calculateHostPayoutAmount()` - Calculates host payout after platform fee
- `processScheduledPayout()` - Processes a single payout
- `processPendingPayouts()` - Processes all pending payouts (called by cron job)

### 3. **src/config/payout.config.ts** (NEW)
Configuration file for easy testing:
```typescript
export const PAYOUT_DELAY_DAYS = 5; // Change this for testing
export const PLATFORM_FEE_PERCENTAGE = 10;
```

### 4. **src/modules/booking/booking.controller.ts**
Updated `confirmBooking()` function to:
- Calculate scheduled payout date
- Set payout status to "pending"
- Save scheduled payout date to booking

### 5. **src/modules/booking/booking.routes.ts**
Added new route:
```typescript
router.post("/confirm", confirmBooking);
```

### 6. **src/server.ts**
Initialized cron job that runs every hour:
```typescript
cron.schedule("0 * * * *", async () => {
  await processPendingPayouts();
});
```

## API Usage

### Confirm Booking
```bash
POST /bookings/confirm
Content-Type: application/json

{
  "bookingId": "booking_id_here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Booking confirmed successfully. Host payout scheduled.",
  "booking": {
    "id": "booking_id",
    "bookingStatus": "completed",
    "paymentStatus": "succeeded",
    "totalAmount": 300,
    "scheduledPayoutDate": "2025-11-23T10:30:00.000Z",
    "payoutStatus": "pending"
  }
}
```

## Configuration for Testing

To test with shorter delays, modify `src/config/payout.config.ts`:

```typescript
// For 1 minute delay (testing)
export const PAYOUT_DELAY_DAYS = 1 / (24 * 60); // 0.0007 days

// For 5 minutes delay (testing)
export const PAYOUT_DELAY_DAYS = 5 / (24 * 60); // 0.0035 days

// For 1 hour delay (testing)
export const PAYOUT_DELAY_DAYS = 1 / 24; // 0.042 days

// For production (5 days)
export const PAYOUT_DELAY_DAYS = 5;
```

## How It Works

1. **Booking Confirmation**
   - User/Admin calls `/bookings/confirm` endpoint
   - System calculates `scheduledPayoutDate` = current time + PAYOUT_DELAY_DAYS
   - Booking status changes to "completed"
   - Payout status set to "pending"

2. **Cron Job Processing**
   - Runs every hour (at minute 0)
   - Queries all bookings with:
     - `bookingStatus = "completed"`
     - `payoutStatus = "pending"`
     - `scheduledPayoutDate <= current time`
   - For each booking:
     - Calculates host payout (total - platform fee)
     - Creates Stripe transfer to host's connected account
     - Updates host's `total_revenue`
     - Updates booking `payoutStatus` to "completed"
     - Records `payoutProcessedAt` timestamp

3. **Payout Calculation**
   - Platform Fee: 10% of total amount
   - Host Payout: 90% of total amount
   - Example: $300 booking → $30 platform fee, $270 to host

## Database Schema Changes

### Booking Model
```typescript
{
  // ... existing fields
  scheduledPayoutDate?: Date,
  payoutStatus?: "pending" | "processing" | "completed" | "failed",
  payoutProcessedAt?: Date,
  payoutTransferId?: string
}
```

## Error Handling

- If host doesn't have a valid Stripe account, payout status is set to "failed"
- If transfer fails, payout status is set to "failed" and error is logged
- Failed payouts can be retried manually or will be picked up in the next cron run if status is reset to "pending"

## Monitoring

Check server logs for:
- `✅ Booking confirmed. Payout scheduled for...`
- `🔄 Running scheduled payout cron job...`
- `✅ Payout processed successfully for booking...`
- `❌ Error processing payout for booking...`

## Testing Checklist

- [ ] Install dependencies: `npm install`
- [ ] Update `PAYOUT_DELAY_DAYS` in `src/config/payout.config.ts` for testing
- [ ] Start server: `npm run dev`
- [ ] Create a booking
- [ ] Confirm the booking via `/bookings/confirm`
- [ ] Wait for scheduled time
- [ ] Check logs for cron job execution
- [ ] Verify payout in Stripe dashboard
- [ ] Verify host's `total_revenue` is updated

