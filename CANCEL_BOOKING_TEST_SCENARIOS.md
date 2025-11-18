# Cancel Booking Test Scenarios

## Test Scenario 1: User Free Cancellation (100% Refund)

### Setup
- User books a car for pickup in 3 days (72 hours from now)
- Booking amount: $300
- User cancels 2 hours after booking

### Expected Result
- ✅ Refund: $300 (100%)
- ✅ Host Payout: $0
- ✅ Platform Fee: $0
- ✅ Message: "Free cancellation within 24 hours of booking. 100% refund issued."
- ✅ Booking status: "canceled"
- ✅ Payment status: "refunded"

### API Call
```bash
curl -X POST http://localhost:3000/api/bookings/cancel/BOOKING_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER_JWT_TOKEN" \
  -d '{
    "canceledBy": "user",
    "cancellationReason": "Changed my mind"
  }'
```

---

## Test Scenario 2: User Moderate Cancellation (50% Refund)

### Setup
- User books a car for pickup in 2 days (48 hours from now)
- Booking amount: $400
- User cancels 30 hours before pickup (within 24-48 hour window)

### Expected Result
- ✅ Refund: $200 (50%)
- ✅ Host Payout: $200 (50%)
- ✅ Platform Fee: $0
- ✅ Message: "Cancellation 24-48 hours before trip. 50% refund to guest, 50% payout to host."
- ✅ Booking status: "canceled"
- ✅ Payment status: "partially_refunded"
- ✅ Host receives transfer of $200 to connected account

### API Call
```bash
curl -X POST http://localhost:3000/api/bookings/cancel/BOOKING_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER_JWT_TOKEN" \
  -d '{
    "canceledBy": "user",
    "cancellationReason": "Emergency came up"
  }'
```

---

## Test Scenario 3: User Late Cancellation (No Refund)

### Setup
- User books a car for pickup tomorrow
- Booking amount: $500
- User cancels 12 hours before pickup

### Expected Result
- ✅ Refund: $0 (0%)
- ✅ Host Payout: $450 (90%)
- ✅ Platform Fee: $50 (10%)
- ✅ Message: "Cancellation within 24 hours of trip. No refund. Host receives 90%, platform keeps 10%."
- ✅ Booking status: "canceled"
- ✅ Payment status: "succeeded" (no change)
- ✅ Host receives transfer of $450 to connected account

### API Call
```bash
curl -X POST http://localhost:3000/api/bookings/cancel/BOOKING_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER_JWT_TOKEN" \
  -d '{
    "canceledBy": "user",
    "cancellationReason": "Found another car"
  }'
```

---

## Test Scenario 4: Host Cancellation with Penalty

### Setup
- Host has a booking scheduled for 5 days from now
- Booking amount: $600
- Host cancels 5 days before pickup (> 48 hours)

### Expected Result
- ✅ Refund: $600 (100% to user)
- ✅ Host Payout: $0
- ✅ Platform Fee: $60 (10% penalty)
- ✅ Host's `pendingPenaltyAmount` increased by $60
- ✅ Host's `totalCancellations` incremented by 1
- ✅ Message: "Host cancellation before 48 hours. Full refund to guest. 10% penalty ($60.00) will be deducted from host's next payout."
- ✅ Booking status: "canceled"
- ✅ Payment status: "refunded"

### API Call
```bash
curl -X POST http://localhost:3000/api/bookings/cancel/BOOKING_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer HOST_JWT_TOKEN" \
  -d '{
    "canceledBy": "host",
    "cancellationReason": "Vehicle needs urgent maintenance"
  }'
```

### Verify Penalty in Database
```javascript
// Check host's pending penalty
const host = await User.findById(HOST_ID);
console.log(host.pendingPenaltyAmount); // Should be 60
console.log(host.totalCancellations); // Should be incremented
```

---

## Test Scenario 5: Host Cancellation Without Penalty

### Setup
- Host has a booking scheduled for tomorrow
- Booking amount: $350
- Host cancels 30 hours before pickup (< 48 hours)

### Expected Result
- ✅ Refund: $350 (100% to user)
- ✅ Host Payout: $0
- ✅ Platform Fee: $0
- ✅ Host's `pendingPenaltyAmount` NOT increased
- ✅ Message: "Host cancellation. Full refund to guest."
- ✅ Booking status: "canceled"
- ✅ Payment status: "refunded"

### API Call
```bash
curl -X POST http://localhost:3000/api/bookings/cancel/BOOKING_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer HOST_JWT_TOKEN" \
  -d '{
    "canceledBy": "host",
    "cancellationReason": "Personal emergency"
  }'
```

---

## Test Scenario 6: Authorization Failures

### Test 6a: User tries to cancel as host
```bash
curl -X POST http://localhost:3000/api/bookings/cancel/BOOKING_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER_JWT_TOKEN" \
  -d '{
    "canceledBy": "host"
  }'
```
**Expected**: 403 Forbidden - "You are not authorized to cancel this booking as host"

### Test 6b: Host tries to cancel as user
```bash
curl -X POST http://localhost:3000/api/bookings/cancel/BOOKING_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer HOST_JWT_TOKEN" \
  -d '{
    "canceledBy": "user"
  }'
```
**Expected**: 403 Forbidden - "You are not authorized to cancel this booking as user"

---

## Test Scenario 7: Edge Cases

### Test 7a: Cancel already canceled booking
**Expected**: 400 Bad Request - "Booking is already canceled"

### Test 7b: Cancel completed booking
**Expected**: 400 Bad Request - "Cannot cancel a completed booking"

### Test 7c: Cancel without authentication
**Expected**: 401 Unauthorized

### Test 7d: Cancel with invalid canceledBy
```json
{
  "canceledBy": "invalid_role"
}
```
**Expected**: 400 Bad Request - "canceledBy is required and must be 'user', 'host', or 'admin'"

---

## Database Verification Queries

### Check Booking Cancellation Details
```javascript
const booking = await Booking.findById(BOOKING_ID);
console.log({
  status: booking.bookingStatus,
  canceledBy: booking.canceledBy,
  canceledAt: booking.canceledAt,
  refundAmount: booking.refundAmount,
  refundPercentage: booking.refundPercentage,
  hostPayoutAmount: booking.hostPayoutAmount,
  platformFeeAmount: booking.platformFeeAmount
});
```

### Check Host Penalty
```javascript
const host = await User.findById(HOST_ID);
console.log({
  pendingPenalty: host.pendingPenaltyAmount,
  totalCancellations: host.totalCancellations
});
```

### Check Stripe Refund
```javascript
const refunds = await stripe.refunds.list({
  payment_intent: PAYMENT_INTENT_ID
});
console.log(refunds.data);
```

### Check Stripe Transfer (Host Payout)
```javascript
const transfers = await stripe.transfers.list({
  destination: HOST_CONNECTED_ACCOUNT_ID
});
console.log(transfers.data);
```

