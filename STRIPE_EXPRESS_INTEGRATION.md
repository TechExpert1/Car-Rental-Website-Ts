# Stripe Express Account Integration Guide

This guide covers the complete frontend integration for Stripe Connect Express accounts, allowing hosts to receive payouts for car rentals.

---

## Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. Host clicks "Connect Stripe" button                                     │
│     Frontend calls: POST /payment/connect-stripe                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  2. Backend creates Express account & returns onboarding URL                │
│     Response: { onboardingUrl: "https://connect.stripe.com/..." }           │
├─────────────────────────────────────────────────────────────────────────────┤
│  3. Frontend redirects host to Stripe's hosted onboarding form              │
│     window.location.href = onboardingUrl                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  4. Host completes form on Stripe (bank details, identity, etc.)            │
│     Stripe handles all compliance & verification                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  5. Stripe redirects back to your app                                       │
│     Redirect to: CLIENT_URL/stripe/callback                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  6. Frontend checks account status                                          │
│     GET /payment/account-status                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  7. If payouts_enabled = true, host can receive payments!                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### 1. Start/Continue Onboarding

**Endpoint:** `POST /payment/connect-stripe`  
**Auth:** `hostAuth` (Host JWT required)

**Request:**
```json
{
  "email": "host@example.com"
}
```

**Response (New Account):**
```json
{
  "message": "Connected account created successfully",
  "connectedAccountId": "acct_1ABC123DEF456",
  "onboardingUrl": "https://connect.stripe.com/express/onboarding/..."
}
```

**Response (Continue Incomplete Onboarding):**
```json
{
  "message": "Continue account onboarding",
  "connectedAccountId": "acct_1ABC123DEF456",
  "connectedExternalAccountId": "ba_xxx",
  "onboardingUrl": "https://connect.stripe.com/express/onboarding/..."
}
```

**Response (Already Connected):**
```json
{
  "error": "You already have a connected account",
  "connectedAccountId": "acct_1ABC123DEF456",
  "connectedExternalAccountId": "ba_xxx"
}
```

---

### 2. Refresh Onboarding Link

Use this when the onboarding link expires (links expire after a few minutes).

**Endpoint:** `POST /payment/refresh-onboarding`  
**Auth:** `hostAuth` (Host JWT required)

**Request:** No body required

**Response:**
```json
{
  "message": "New onboarding link generated",
  "connectedAccountId": "acct_1ABC123DEF456",
  "onboardingUrl": "https://connect.stripe.com/express/onboarding/..."
}
```

---

### 3. Get Account Status

**Endpoint:** `GET /payment/account-status`  
**Auth:** `hostAuth` (Host JWT required)

**Response (No Account):**
```json
{
  "hasAccount": false,
  "message": "No connected account found"
}
```

**Response (Account Connected):**
```json
{
  "hasAccount": true,
  "connectedAccountId": "acct_1ABC123DEF456",
  "connectedExternalAccountId": "ba_xxx",
  "payoutsEnabled": true,
  "chargesEnabled": true,
  "detailsSubmitted": true,
  "totalRevenue": 1500.00
}
```

**Status Fields Explained:**
| Field | Description |
|-------|-------------|
| `hasAccount` | Whether host has started Stripe Connect |
| `payoutsEnabled` | Can receive payouts (main indicator of completion) |
| `chargesEnabled` | Can accept payments |
| `detailsSubmitted` | Has submitted all required info |
| `totalRevenue` | Lifetime earnings on platform |

---

### 4. Request Payout

**Endpoint:** `POST /payment/payout`  
**Auth:** `hostAuth` (Host JWT required)

**Request:**
```json
{
  "amount": 100.00
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payout created successfully. The amount will be transferred within 2-3 business days.",
  "payout": {
    "id": "po_xxx",
    "amount": 100.00,
    "currency": "usd",
    "status": "pending",
    "arrival_date": 1703376000
  }
}
```

---

## Frontend Pages Required

### 1. `/stripe/callback` - Return Page

This page is where Stripe redirects after onboarding.

```typescript
// pages/stripe/callback.tsx (Next.js example)
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function StripeCallback() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'incomplete'>('loading');
  const [accountStatus, setAccountStatus] = useState(null);

  useEffect(() => {
    checkAccountStatus();
  }, []);

  const checkAccountStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/payment/account-status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      setAccountStatus(data);
      
      if (data.payoutsEnabled) {
        setStatus('success');
        // Redirect to dashboard after 3 seconds
        setTimeout(() => router.push('/dashboard?stripe=success'), 3000);
      } else {
        setStatus('incomplete');
      }
    } catch (error) {
      console.error('Error checking status:', error);
      setStatus('incomplete');
    }
  };

  const handleContinueOnboarding = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/payment/refresh-onboarding', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      if (data.onboardingUrl) {
        window.location.href = data.onboardingUrl;
      }
    } catch (error) {
      console.error('Error refreshing link:', error);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4">Verifying your Stripe account...</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-green-500 text-6xl mb-4">✓</div>
          <h1 className="text-2xl font-bold">Stripe Connected Successfully!</h1>
          <p className="text-gray-600 mt-2">You can now receive payouts for your rentals.</p>
          <p className="text-sm text-gray-400 mt-4">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center max-w-md">
        <div className="text-yellow-500 text-6xl mb-4">⚠</div>
        <h1 className="text-2xl font-bold">Onboarding Incomplete</h1>
        <p className="text-gray-600 mt-2">
          Your Stripe account setup is not complete. Please continue the onboarding process.
        </p>
        <button
          onClick={handleContinueOnboarding}
          className="mt-6 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
        >
          Continue Setup
        </button>
        <button
          onClick={() => router.push('/dashboard')}
          className="mt-4 block w-full text-gray-600 hover:text-gray-800"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
```

---

### 2. `/stripe/refresh` - Refresh Page

This page handles when the onboarding link expires.

```typescript
// pages/stripe/refresh.tsx
import { useEffect } from 'react';

export default function StripeRefresh() {
  useEffect(() => {
    refreshOnboardingLink();
  }, []);

  const refreshOnboardingLink = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/payment/refresh-onboarding', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (data.onboardingUrl) {
        // Redirect to new onboarding URL
        window.location.href = data.onboardingUrl;
      } else if (data.error) {
        // Redirect to dashboard with error
        window.location.href = '/dashboard?stripe_error=' + encodeURIComponent(data.error);
      }
    } catch (error) {
      console.error('Error refreshing link:', error);
      window.location.href = '/dashboard?stripe_error=refresh_failed';
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4">Refreshing your onboarding link...</p>
      </div>
    </div>
  );
}
```

---

## Complete React Component Examples

### Connect Stripe Button Component

```typescript
// components/ConnectStripeButton.tsx
import { useState } from 'react';

interface Props {
  userEmail: string;
  onSuccess?: () => void;
}

export default function ConnectStripeButton({ userEmail, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/payment/connect-stripe', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: userEmail }),
      });

      const data = await response.json();

      if (response.ok && data.onboardingUrl) {
        // Redirect to Stripe onboarding
        window.location.href = data.onboardingUrl;
      } else if (data.error === 'You already have a connected account') {
        // Already connected
        onSuccess?.();
      } else {
        setError(data.error || 'Failed to connect Stripe');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleConnect}
        disabled={loading}
        className="flex items-center gap-2 bg-[#635BFF] text-white px-6 py-3 rounded-lg hover:bg-[#5851DB] disabled:opacity-50"
      >
        {loading ? (
          <>
            <span className="animate-spin">⟳</span>
            Connecting...
          </>
        ) : (
          <>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
            </svg>
            Connect with Stripe
          </>
        )}
      </button>
      {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
    </div>
  );
}
```

---

### Account Status Component

```typescript
// components/StripeAccountStatus.tsx
import { useEffect, useState } from 'react';

interface AccountStatus {
  hasAccount: boolean;
  connectedAccountId?: string;
  payoutsEnabled?: boolean;
  chargesEnabled?: boolean;
  detailsSubmitted?: boolean;
  totalRevenue?: number;
}

export default function StripeAccountStatus() {
  const [status, setStatus] = useState<AccountStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/payment/account-status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Error fetching status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContinueOnboarding = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/payment/refresh-onboarding', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.onboardingUrl) {
        window.location.href = data.onboardingUrl;
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-24 rounded-lg"></div>;
  }

  if (!status?.hasAccount) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-semibold text-yellow-800">Stripe Not Connected</h3>
        <p className="text-yellow-700 text-sm mt-1">
          Connect your Stripe account to start receiving payouts.
        </p>
      </div>
    );
  }

  if (!status.payoutsEnabled) {
    return (
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <h3 className="font-semibold text-orange-800">Onboarding Incomplete</h3>
        <p className="text-orange-700 text-sm mt-1">
          Complete your Stripe setup to receive payouts.
        </p>
        <button
          onClick={handleContinueOnboarding}
          className="mt-3 text-sm bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
        >
          Continue Setup
        </button>
      </div>
    );
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-center gap-2">
        <span className="text-green-500 text-xl">✓</span>
        <h3 className="font-semibold text-green-800">Stripe Connected</h3>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-500">Account ID</p>
          <p className="font-mono text-xs">{status.connectedAccountId}</p>
        </div>
        <div>
          <p className="text-gray-500">Total Revenue</p>
          <p className="font-semibold">${status.totalRevenue?.toFixed(2) || '0.00'}</p>
        </div>
        <div>
          <p className="text-gray-500">Payouts</p>
          <p className={status.payoutsEnabled ? 'text-green-600' : 'text-red-600'}>
            {status.payoutsEnabled ? 'Enabled' : 'Disabled'}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Charges</p>
          <p className={status.chargesEnabled ? 'text-green-600' : 'text-red-600'}>
            {status.chargesEnabled ? 'Enabled' : 'Disabled'}
          </p>
        </div>
      </div>
    </div>
  );
}
```

---

### Request Payout Component

```typescript
// components/RequestPayout.tsx
import { useState } from 'react';

interface Props {
  availableBalance: number;
}

export default function RequestPayout({ availableBalance }: Props) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handlePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const payoutAmount = parseFloat(amount);
    
    if (isNaN(payoutAmount) || payoutAmount <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid amount' });
      setLoading(false);
      return;
    }

    if (payoutAmount > availableBalance) {
      setMessage({ type: 'error', text: 'Amount exceeds available balance' });
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/payment/payout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: payoutAmount }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: `Payout of $${payoutAmount.toFixed(2)} initiated! Expected arrival: 2-3 business days.` 
        });
        setAmount('');
      } else {
        setMessage({ type: 'error', text: data.error || 'Payout failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Request Payout</h3>
      
      <div className="mb-4">
        <p className="text-gray-500 text-sm">Available Balance</p>
        <p className="text-2xl font-bold text-green-600">${availableBalance.toFixed(2)}</p>
      </div>

      <form onSubmit={handlePayout}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount (USD)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <input
              type="number"
              step="0.01"
              min="1"
              max={availableBalance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-700' 
              : 'bg-red-50 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || availableBalance <= 0}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Request Payout'}
        </button>
      </form>
    </div>
  );
}
```

---

## Complete Service Class

```typescript
// services/stripeService.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL;

class StripeService {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private headers() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  // Start or continue Stripe Connect onboarding
  async connectStripe(email: string) {
    const res = await fetch(`${API_BASE}/payment/connect-stripe`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ email }),
    });
    return res.json();
  }

  // Refresh onboarding link if expired
  async refreshOnboarding() {
    const res = await fetch(`${API_BASE}/payment/refresh-onboarding`, {
      method: 'POST',
      headers: this.headers(),
    });
    return res.json();
  }

  // Get current account status
  async getAccountStatus() {
    const res = await fetch(`${API_BASE}/payment/account-status`, {
      headers: this.headers(),
    });
    return res.json();
  }

  // Request payout
  async requestPayout(amount: number) {
    const res = await fetch(`${API_BASE}/payment/payout`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ amount }),
    });
    return res.json();
  }
}

export default StripeService;
```

---

## Environment Variables

### Backend (.env)
```env
# Stripe Configuration
STRIPE_SECRET_KEY="sk_test_xxx"
STRIPE_WEBHOOK_SECRET="whsec_xxx"
STRIPE_CLIENT_ID="ca_xxx"

# URLs
CLIENT_URL="http://localhost:3000"
SERVER_URL="http://localhost:9716"
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL="http://localhost:9716/api"
```

---

## Webhook Events (Backend Handles Automatically)

The backend listens for these Stripe webhook events to update user records:

| Event | What it Updates |
|-------|-----------------|
| `account.updated` | `payouts_enabled`, `connected_external_acc_id` |
| `account.external_account.created` | `connected_external_acc_id` |
| `account.external_account.updated` | `connected_external_acc_id` |
| `capability.updated` | `payouts_enabled` |

---

## User Database Fields

The User model stores these Stripe-related fields:

```typescript
{
  connected_acc_id: string;        // "acct_xxx" or "none"
  connected_external_acc_id: string; // "ba_xxx" or "none"
  payouts_enabled: boolean;        // Can receive payouts
  payments_enabled: boolean;       // Can accept payments
  total_revenue: number;           // Lifetime earnings
  pendingPenaltyAmount: number;    // Penalties to deduct
}
```

---

## Testing Checklist

- [ ] Host can click "Connect Stripe" button
- [ ] Redirect to Stripe onboarding form works
- [ ] Return to `/stripe/callback` after completing form
- [ ] Account status shows correct state
- [ ] Refresh link works when onboarding link expires
- [ ] Payout request works for connected accounts
- [ ] Error states are handled gracefully
- [ ] Already connected accounts show appropriate message

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Onboarding link expired | Use `POST /payment/refresh-onboarding` |
| Payouts not enabled after onboarding | Check Stripe dashboard for missing requirements |
| Webhook not updating user | Verify webhook secret and endpoint in Stripe dashboard |
| "Only hosts can connect" error | Ensure user has `role: "host"` |

---

## Stripe Dashboard Setup

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Enable **Connect** in settings
3. Set up **Webhook endpoint**: `YOUR_SERVER_URL/api/payments/webhook`
4. Add webhook events:
   - `account.updated`
   - `account.external_account.created`
   - `account.external_account.updated`
   - `capability.updated`
5. Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

---

## Support

For additional help, refer to:
- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Express Account Types](https://stripe.com/docs/connect/express-accounts)
- [Testing Connect](https://stripe.com/docs/connect/testing)
