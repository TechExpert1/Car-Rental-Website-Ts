# Testing Scheduled Payouts - Quick Guide

## Quick Setup for Testing (1-2 minutes delay)

### Step 1: Configure Short Delay
Edit `src/config/payout.config.ts`:

```typescript
// For 1 minute delay (testing)
export const PAYOUT_DELAY_DAYS = 1 / (24 * 60); // ~1 minute

// OR for 2 minutes delay
export const PAYOUT_DELAY_DAYS = 2 / (24 * 60); // ~2 minutes
```

### Step 2: Start the Server
```bash
npm run dev
```

You should see:
```
✅ Scheduled payout cron job initialized (runs every hour)
Server running on port 9716
```

### Step 3: Confirm a Booking

**API Request:**
```bash
POST http://localhost:9716/bookings/confirm
Content-Type: application/json

{
  "bookingId": "YOUR_BOOKING_ID_HERE"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Booking confirmed successfully. Host payout scheduled.",
  "booking": {
    "id": "675b2e8f9c8d4e001f123456",
    "bookingStatus": "completed",
    "paymentStatus": "succeeded",
    "totalAmount": 300,
    "scheduledPayoutDate": "2025-11-18T10:32:00.000Z",
    "payoutStatus": "pending"
  }
}
```

**Console Log:**
```
✅ Booking 675b2e8f9c8d4e001f123456 confirmed. Payout scheduled for 2025-11-18T10:32:00.000Z
```

### Step 4: Wait for Cron Job

The cron job runs **every hour at minute 0** (e.g., 10:00, 11:00, 12:00).

**To test immediately without waiting:**

#### Option A: Manually trigger the payout function
Create a test endpoint (temporary):

Add to `src/modules/booking/booking.routes.ts`:
```typescript
import { processPendingPayouts } from "../../services/scheduledPayout.service";

router.post("/process-payouts-now", async (req, res) => {
  try {
    await processPendingPayouts();
    res.json({ success: true, message: "Payouts processed" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
```

Then call:
```bash
POST http://localhost:9716/bookings/process-payouts-now
```

#### Option B: Change cron schedule to run every minute
Edit `src/server.ts`:
```typescript
// Change from "0 * * * *" to "* * * * *"
cron.schedule("* * * * *", async () => {
  console.log("🔄 Running scheduled payout cron job...");
  await processPendingPayouts();
});
```

### Step 5: Verify Payout

**Console Logs to Watch For:**
```
🔄 Running scheduled payout cron job...
Found 1 pending payout(s) to process
✅ Payout processed successfully for booking 675b2e8f9c8d4e001f123456. Amount: $270
Finished processing pending payouts
```

**Check Database:**
Query the booking to verify:
```javascript
{
  "payoutStatus": "completed",
  "payoutProcessedAt": "2025-11-18T10:33:00.000Z",
  "payoutTransferId": "tr_1234567890abcdef",
  "hostPayoutAmount": 270,
  "platformFeeAmount": 30
}
```

**Check Host's Revenue:**
Query the host user to verify `total_revenue` increased by $270.

**Check Stripe Dashboard:**
- Go to Stripe Dashboard → Transfers
- Look for transfer with description: "Payout for completed booking {bookingId}"
- Verify amount: $270.00

## Testing Scenarios

### Scenario 1: Normal Payout
1. Confirm booking
2. Wait for scheduled time
3. Cron job processes payout
4. ✅ Host receives $270, platform keeps $30

### Scenario 2: Host Without Stripe Account
1. Confirm booking for host without connected account
2. Wait for scheduled time
3. ❌ Payout fails with error: "Host does not have a valid Stripe account"
4. Booking `payoutStatus` = "failed"

### Scenario 3: Multiple Pending Payouts
1. Confirm 3 bookings
2. Wait for scheduled time
3. Cron job processes all 3 payouts
4. ✅ All 3 hosts receive their payouts

### Scenario 4: Already Processed Payout
1. Confirm booking
2. Wait for payout to process
3. Try to process again
4. ℹ️ Skipped: "Payout already completed"

## Troubleshooting

### Payout Not Processing
- Check `scheduledPayoutDate` is in the past
- Check `payoutStatus` is "pending"
- Check `bookingStatus` is "completed"
- Check cron job is running (look for logs)

### Stripe Transfer Fails
- Verify host has `connected_acc_id` set
- Verify host has `payouts_enabled = true`
- Check Stripe dashboard for error details
- Check server logs for error messages

### Cron Job Not Running
- Verify cron schedule syntax
- Check server logs for initialization message
- Restart server if needed

## Production Configuration

Before deploying to production:

1. **Reset delay to 5 days:**
```typescript
export const PAYOUT_DELAY_DAYS = 5;
```

2. **Keep cron schedule at hourly:**
```typescript
cron.schedule("0 * * * *", async () => {
  await processPendingPayouts();
});
```

3. **Remove test endpoints** (if added)

## Monitoring in Production

Set up alerts for:
- Failed payouts (`payoutStatus = "failed"`)
- Pending payouts older than expected
- Cron job errors in logs
- Stripe transfer failures

## Support

For issues or questions, check:
- `SCHEDULED_PAYOUT_IMPLEMENTATION.md` for detailed documentation
- Server logs for error messages
- Stripe dashboard for transfer details

