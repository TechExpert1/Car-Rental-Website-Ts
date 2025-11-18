# Host Penalty Deduction Implementation Guide

## Overview
When a host cancels a booking more than 48 hours before the trip start date, a 10% penalty is stored in the host's `pendingPenaltyAmount` field. This penalty should be deducted from the host's next payout.

## Current Implementation Status

### ✅ Completed
- Penalty calculation and storage in database
- `pendingPenaltyAmount` field added to User model
- Penalty is recorded when host cancels booking > 48h before trip

### ⏳ To Be Implemented
- Automatic penalty deduction during payout processing
- Notification to host about penalty deduction
- Penalty history tracking

## Implementation Steps

### Step 1: Modify Payout Function

Update the payout function in `src/modules/payment/payment.controller.ts` to check and deduct penalties:

```typescript
export const payoutToExternalAccount = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { amount } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Check for pending penalties
    const pendingPenalty = user.pendingPenaltyAmount || 0;
    let finalPayoutAmount = amount;
    let penaltyDeducted = 0;

    if (pendingPenalty > 0) {
      if (amount >= pendingPenalty) {
        // Deduct full penalty
        finalPayoutAmount = amount - pendingPenalty;
        penaltyDeducted = pendingPenalty;
        
        // Clear pending penalty
        user.pendingPenaltyAmount = 0;
      } else {
        // Deduct partial penalty (entire payout amount)
        finalPayoutAmount = 0;
        penaltyDeducted = amount;
        
        // Reduce pending penalty
        user.pendingPenaltyAmount = pendingPenalty - amount;
      }
      
      await user.save();
    }

    // Validate final payout amount
    if (finalPayoutAmount <= 0) {
      res.status(400).json({
        error: "Payout amount after penalty deduction is zero or negative",
        details: {
          requestedAmount: amount,
          penaltyDeducted: penaltyDeducted,
          remainingPenalty: user.pendingPenaltyAmount,
        },
      });
      return;
    }

    // Proceed with payout using finalPayoutAmount
    // ... existing payout logic ...

    res.status(200).json({
      success: true,
      message: "Payout processed successfully",
      details: {
        requestedAmount: amount,
        penaltyDeducted: penaltyDeducted,
        finalPayoutAmount: finalPayoutAmount,
        remainingPenalty: user.pendingPenaltyAmount,
      },
    });
  } catch (err: any) {
    console.error("Payout error:", err.message);
    res.status(500).json({ error: err.message });
  }
};
```

### Step 2: Add Penalty History Tracking (Optional)

Create a new model to track penalty history:

```typescript
// src/modules/penalty/penalty.model.ts
import mongoose, { Document, Schema, Model } from "mongoose";

export interface IPenalty extends Document {
  host: mongoose.Types.ObjectId;
  booking: mongoose.Types.ObjectId;
  penaltyAmount: number;
  reason: string;
  appliedAt: Date;
  deductedAt?: Date;
  deductedAmount?: number;
  status: "pending" | "partially_deducted" | "fully_deducted";
  createdAt: Date;
  updatedAt: Date;
}

const penaltySchema: Schema<IPenalty> = new Schema<IPenalty>(
  {
    host: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    booking: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Booking", 
      required: true 
    },
    penaltyAmount: { type: Number, required: true },
    reason: { type: String, required: true },
    appliedAt: { type: Date, required: true },
    deductedAt: { type: Date },
    deductedAmount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "partially_deducted", "fully_deducted"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const Penalty: Model<IPenalty> = mongoose.model<IPenalty>(
  "Penalty",
  penaltySchema
);
export default Penalty;
```

### Step 3: Update Cancel Booking to Create Penalty Record

Modify the cancel booking function to create a penalty record:

```typescript
// In booking.controller.ts, inside the host cancellation logic
if (hoursUntilPickup > 48) {
  const penaltyAmount = booking.totalAmount * 0.1;
  platformFeeAmount = penaltyAmount;

  // Update host's pending penalty
  const hostId = typeof booking.host === 'object' && (booking.host as any)._id
    ? (booking.host as any)._id
    : booking.host;
  const host = await User.findById(hostId);
  if (host) {
    host.pendingPenaltyAmount = (host.pendingPenaltyAmount || 0) + penaltyAmount;
    host.totalCancellations = (host.totalCancellations || 0) + 1;
    await host.save();
    
    // Create penalty record (if using penalty history)
    await Penalty.create({
      host: hostId,
      booking: booking._id,
      penaltyAmount: penaltyAmount,
      reason: "Host cancellation before 48 hours of trip start",
      appliedAt: new Date(),
      status: "pending",
    });
  }

  message = `Host cancellation before 48 hours. Full refund to guest. 10% penalty ($${penaltyAmount.toFixed(2)}) will be deducted from host's next payout.`;
}
```

### Step 4: Add Penalty Information to Host Dashboard

Create an endpoint to get host's penalty information:

```typescript
// src/modules/payment/payment.controller.ts
export const getHostPenaltyInfo = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Get penalty history (if using penalty model)
    const penalties = await Penalty.find({ host: userId })
      .populate("booking")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      pendingPenaltyAmount: user.pendingPenaltyAmount || 0,
      totalCancellations: user.totalCancellations || 0,
      penaltyHistory: penalties,
    });
  } catch (err: any) {
    console.error("Get penalty info error:", err.message);
    res.status(500).json({ error: err.message });
  }
};
```

## Testing the Penalty Deduction

### Test Case 1: Full Penalty Deduction
```javascript
// Host has $60 pending penalty
// Host requests $200 payout
// Expected: $140 payout, $60 deducted, $0 remaining penalty
```

### Test Case 2: Partial Penalty Deduction
```javascript
// Host has $100 pending penalty
// Host requests $50 payout
// Expected: $0 payout, $50 deducted, $50 remaining penalty
```

### Test Case 3: Multiple Penalties
```javascript
// Host cancels 3 bookings, accumulating penalties
// Each payout deducts from total pending penalty
// Track until all penalties are cleared
```

## Notification Examples

### Email Template for Penalty Applied
```
Subject: Cancellation Penalty Applied

Dear [Host Name],

A cancellation penalty of $[AMOUNT] has been applied to your account due to 
canceling booking #[BOOKING_ID] more than 48 hours before the trip start date.

This penalty will be automatically deducted from your next payout.

Current pending penalty: $[TOTAL_PENALTY]

Best regards,
[Platform Name]
```

### Email Template for Penalty Deducted
```
Subject: Payout Processed with Penalty Deduction

Dear [Host Name],

Your payout has been processed:
- Requested Amount: $[REQUESTED]
- Penalty Deducted: $[DEDUCTED]
- Final Payout: $[FINAL]
- Remaining Penalty: $[REMAINING]

Best regards,
[Platform Name]
```

## Database Queries for Monitoring

### Check All Hosts with Pending Penalties
```javascript
const hostsWithPenalties = await User.find({
  pendingPenaltyAmount: { $gt: 0 }
}).select('email username pendingPenaltyAmount totalCancellations');
```

### Total Platform Revenue from Penalties
```javascript
const totalPenalties = await User.aggregate([
  { $group: { _id: null, total: { $sum: "$pendingPenaltyAmount" } } }
]);
```

## Best Practices

1. **Always notify hosts** when penalties are applied or deducted
2. **Display pending penalties** prominently in host dashboard
3. **Log all penalty transactions** for audit purposes
4. **Allow hosts to view** their penalty history
5. **Consider grace periods** for first-time cancellations
6. **Implement appeals process** for disputed penalties

