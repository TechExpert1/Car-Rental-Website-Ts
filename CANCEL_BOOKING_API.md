# Cancel Booking API Documentation

## Overview
The cancel booking functionality has been implemented with comprehensive refund rules for both user and host cancellations.

## API Endpoint
```
POST /api/bookings/cancel/:id
```

**Authentication Required**: Yes (userAuth middleware)

## Request Parameters

### URL Parameters
- `id` (string, required): The booking ID to cancel

### Body Parameters
```json
{
  "canceledBy": "user" | "host" | "admin",
  "cancellationReason": "Optional reason for cancellation"
}
```

## Cancellation Rules

### User Cancellation Rules

1. **Free Cancellation (100% Refund)**
   - **Condition**: Cancel within 24 hours of booking AND trip starts after 48 hours
   - **Refund**: 100% to user
   - **Host Payout**: 0%
   - **Platform Fee**: 0%

2. **Moderate Cancellation (50% Refund)**
   - **Condition**: Cancel 24-48 hours before trip starts
   - **Refund**: 50% to user
   - **Host Payout**: 50%
   - **Platform Fee**: 0%

3. **Late Cancellation (No Refund)**
   - **Condition**: Cancel within 24 hours before trip starts
   - **Refund**: 0% to user
   - **Host Payout**: 90%
   - **Platform Fee**: 10%

### Host Cancellation Rules

1. **Cancellation Before 48 Hours**
   - **Refund**: 100% to user
   - **Host Penalty**: 10% of booking amount deducted from next payout
   - **Penalty Storage**: Stored in `user.pendingPenaltyAmount` field
   - **Cancellation Counter**: Increments `user.totalCancellations`

2. **Cancellation Within 48 Hours**
   - **Refund**: 100% to user
   - **Host Penalty**: None
   - **Note**: Still not recommended for host reputation

### Admin Cancellation Rules
- **Refund**: 100% to user (default)
- **Host Payout**: 0%
- **Platform Fee**: 0%

## Response Format

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Booking canceled successfully",
  "cancellationDetails": {
    "bookingId": "booking_id",
    "canceledBy": "user",
    "canceledAt": "2025-11-18T10:30:00.000Z",
    "refundAmount": 150.00,
    "refundPercentage": 100,
    "hostPayoutAmount": 0,
    "platformFeeAmount": 0,
    "refundStatus": "processed",
    "message": "Free cancellation within 24 hours of booking. 100% refund issued."
  }
}
```

### Error Responses

**401 Unauthorized**
```json
{
  "error": "Unauthorized"
}
```

**400 Bad Request**
```json
{
  "error": "canceledBy is required and must be 'user', 'host', or 'admin'"
}
```

**403 Forbidden**
```json
{
  "error": "You are not authorized to cancel this booking as user"
}
```

**404 Not Found**
```json
{
  "error": "Booking not found"
}
```

**500 Internal Server Error**
```json
{
  "error": "Failed to process refund",
  "details": "Error message"
}
```

## Database Changes

### Booking Model Updates
New fields added to track cancellation details:
- `canceledBy`: "user" | "host" | "admin"
- `canceledAt`: Date
- `cancellationReason`: string
- `refundAmount`: number
- `refundPercentage`: number
- `hostPayoutAmount`: number
- `platformFeeAmount`: number
- `refundProcessedAt`: Date
- `paymentStatus`: Added "partially_refunded" enum value

### User Model Updates
New field for host penalty tracking:
- `pendingPenaltyAmount`: number (default: 0)

## Example Usage

### User Cancels Booking
```javascript
const response = await fetch('/api/bookings/cancel/booking_id_here', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  },
  body: JSON.stringify({
    canceledBy: 'user',
    cancellationReason: 'Change of plans'
  })
});

const result = await response.json();
console.log(result);
```

### Host Cancels Booking
```javascript
const response = await fetch('/api/bookings/cancel/booking_id_here', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  },
  body: JSON.stringify({
    canceledBy: 'host',
    cancellationReason: 'Vehicle maintenance required'
  })
});

const result = await response.json();
console.log(result);
```

## Notes

1. **Refund Processing**: Refunds are processed immediately through Stripe
2. **Host Payouts**: If host has a connected Stripe account with payouts enabled, the payout is transferred immediately
3. **Penalty Tracking**: Host penalties are stored in the database and should be deducted during the next payout process
4. **Authorization**: Users can only cancel as "user" if they are the booking user, and as "host" if they are the booking host
5. **Booking Status**: After cancellation, `bookingStatus` is set to "canceled"
6. **Payment Status**: Updated to "refunded" (full refund) or "partially_refunded" (partial refund)

