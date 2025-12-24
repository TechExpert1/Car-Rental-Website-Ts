# Booking Frontend Integration Guide

This guide covers the complete frontend integration for the car rental booking system, including creating bookings, payment processing, cancellations, and viewing booking history.

---

## Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. User selects vehicle and dates                                          │
│     Frontend validates dates and calculates total                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  2. User clicks "Book Now"                                                  │
│     Frontend calls: POST /bookings                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  3. Backend creates booking & Stripe checkout session                       │
│     Response: { sessionUrl: "https://checkout.stripe.com/..." }             │
├─────────────────────────────────────────────────────────────────────────────┤
│  4. Frontend redirects to Stripe Checkout                                   │
│     window.location.href = sessionUrl                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  5. User completes payment on Stripe                                        │
│     Stripe handles card processing securely                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  6. Stripe redirects back to your app                                       │
│     Success: STRIPE_SUCCESS_REDIRECT                                        │
│     Cancel: STRIPE_FAILURE_REDIRECT                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  7. Webhook updates booking status                                          │
│     paymentStatus: "succeeded", bookingStatus: "active"                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  8. User can view bookings, host confirms completion                        │
│     GET /bookings, POST /bookings/confirm                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### 1. Create Booking (Stripe Checkout)

**Endpoint:** `POST /bookings`  
**Auth:** `userAuth` (User JWT required)

**Request:**
```json
{
  "vehicle": "64abc123def456",
  "host": "64host123id456",
  "pickupDate": "2025-01-15",
  "dropoffDate": "2025-01-20",
  "totalDays": 5,
  "totalAmount": 500.00
}
```

**Response:**
```json
{
  "sessionUrl": "https://checkout.stripe.com/c/pay/cs_test_xxx..."
}
```

**Error Responses:**
```json
// Vehicle not found
{ "message": "Vehicle not found" }

// Payment error
{ "message": "Payment processing failed" }
```

---

### 2. Get All Bookings

**Endpoint:** `GET /bookings`  
**Auth:** `userAuth` (User JWT required)

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 10) |
| `role` | string | Filter by role: "user" (renter) or "host" (car owner) |

**Response:**
```json
{
  "bookings": [
    {
      "_id": "64booking123id",
      "user": {
        "_id": "64user123id",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "host": {
        "_id": "64host123id",
        "name": "Jane Host",
        "email": "jane@example.com"
      },
      "vehicle": {
        "_id": "64vehicle123id",
        "name": "Toyota Camry 2024",
        "images": ["https://..."],
        "rent": 100
      },
      "totalAmount": 500,
      "totalDays": 5,
      "pickupDate": "2025-01-15T00:00:00.000Z",
      "dropoffDate": "2025-01-20T00:00:00.000Z",
      "paymentStatus": "succeeded",
      "bookingStatus": "active",
      "createdAt": "2025-01-10T12:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "totalPages": 3
  }
}
```

---

### 3. Cancel Booking

**Endpoint:** `POST /bookings/cancel/:id`  
**Auth:** `userAuth` (User JWT required)

**Request:**
```json
{
  "canceledBy": "user",  // "user" | "host" | "admin"
  "cancellationReason": "Change of plans"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Booking canceled successfully",
  "cancellationDetails": {
    "bookingId": "64booking123id",
    "canceledBy": "user",
    "canceledAt": "2025-01-12T10:30:00.000Z",
    "refundAmount": 250.00,
    "refundPercentage": 50,
    "hostPayoutAmount": 250.00,
    "platformFeeAmount": 0,
    "refundStatus": "processed",
    "message": "Cancellation 24-48 hours before trip. 50% refund to guest, 50% payout to host."
  }
}
```

**Cancellation Rules:**

| Scenario | User Refund | Host Payout | Platform Fee |
|----------|-------------|-------------|--------------|
| Free cancel (within 24h of booking, trip starts >48h away) | 100% | 0% | 0% |
| Cancel 24-48h before trip | 50% | 50% | 0% |
| Cancel <24h before trip | 0% | 90% | 10% |
| Host cancels | 100% | 0% | 10% penalty |

---

### 4. Confirm Booking (Host)

**Endpoint:** `POST /bookings/confirm`  
**Auth:** `userAuth` (User JWT required)

After the rental is complete, the host confirms the booking to trigger payout scheduling.

**Request:**
```json
{
  "bookingId": "64booking123id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Booking confirmed successfully. Host payout scheduled.",
  "booking": {
    "id": "64booking123id",
    "bookingStatus": "completed",
    "paymentStatus": "succeeded",
    "totalAmount": 500.00,
    "scheduledPayoutDate": "2025-01-25T00:00:00.000Z",
    "payoutStatus": "pending"
  }
}
```

---

### 5. Get Booking Stats (Host Dashboard)

**Endpoint:** `GET /bookings/stats`  
**Auth:** `hostAuth` (Host JWT required)

**Response:**
```json
{
  "totalRevenue": 15000.00,
  "lastWeekRevenue": 2500.00,
  "avgLastWeekRevenue": 357.14,
  "currentMonthRevenue": 5000.00
}
```

---

### 6. Get Monthly Revenue (Host Dashboard)

**Endpoint:** `GET /bookings/monthly-stats`  
**Auth:** `hostAuth` (Host JWT required)

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `year` | number | Year to get stats for (default: current year) |

**Response:**
```json
{
  "year": 2025,
  "monthlyRevenue": [
    { "month": 1, "revenue": 1500.00 },
    { "month": 2, "revenue": 2000.00 },
    // ... all 12 months
  ]
}
```

---

## Frontend Pages Required

### 1. Vehicle Booking Page

```typescript
// pages/vehicles/[id]/book.tsx
import { useState } from 'react';
import { useRouter } from 'next/router';

interface Vehicle {
  _id: string;
  name: string;
  rent: number;
  host: string;
  images: string[];
}

interface BookingFormProps {
  vehicle: Vehicle;
}

export default function BookingForm({ vehicle }: BookingFormProps) {
  const router = useRouter();
  const [pickupDate, setPickupDate] = useState('');
  const [dropoffDate, setDropoffDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate total
  const calculateTotal = () => {
    if (!pickupDate || !dropoffDate) return { days: 0, total: 0 };
    
    const pickup = new Date(pickupDate);
    const dropoff = new Date(dropoffDate);
    const days = Math.ceil((dropoff.getTime() - pickup.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      days: Math.max(0, days),
      total: Math.max(0, days) * vehicle.rent,
    };
  };

  const { days, total } = calculateTotal();

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (!pickupDate || !dropoffDate) {
      setError('Please select pickup and dropoff dates');
      setLoading(false);
      return;
    }

    if (new Date(pickupDate) >= new Date(dropoffDate)) {
      setError('Dropoff date must be after pickup date');
      setLoading(false);
      return;
    }

    if (new Date(pickupDate) < new Date()) {
      setError('Pickup date cannot be in the past');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vehicle: vehicle._id,
          host: vehicle.host,
          pickupDate,
          dropoffDate,
          totalDays: days,
          totalAmount: total,
        }),
      });

      const data = await response.json();

      if (response.ok && data.sessionUrl) {
        // Redirect to Stripe Checkout
        window.location.href = data.sessionUrl;
      } else {
        setError(data.message || 'Failed to create booking');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Book {vehicle.name}</h2>
      
      <form onSubmit={handleBooking}>
        {/* Pickup Date */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pickup Date
          </label>
          <input
            type="date"
            value={pickupDate}
            onChange={(e) => setPickupDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Dropoff Date */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Dropoff Date
          </label>
          <input
            type="date"
            value={dropoffDate}
            onChange={(e) => setDropoffDate(e.target.value)}
            min={pickupDate || new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Price Breakdown */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Daily Rate</span>
            <span className="font-medium">${vehicle.rent}/day</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Number of Days</span>
            <span className="font-medium">{days} days</span>
          </div>
          <hr className="my-2" />
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || days === 0}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : `Pay $${total.toFixed(2)}`}
        </button>
      </form>

      <p className="mt-4 text-sm text-gray-500 text-center">
        You'll be redirected to Stripe for secure payment
      </p>
    </div>
  );
}
```

---

### 2. Booking Success Page

```typescript
// pages/booking/success.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function BookingSuccess() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/bookings');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {/* Success Icon */}
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Booking Confirmed!
        </h1>
        
        <p className="text-gray-600 mb-6">
          Your payment was successful and your booking has been confirmed.
          You'll receive a confirmation email shortly.
        </p>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-500">
            Redirecting to your bookings in {countdown} seconds...
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/bookings"
            className="block w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700"
          >
            View My Bookings
          </Link>
          
          <Link
            href="/"
            className="block w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
```

---

### 3. Booking Failed/Canceled Page

```typescript
// pages/booking/canceled.tsx
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function BookingCanceled() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {/* Warning Icon */}
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Payment Canceled
        </h1>
        
        <p className="text-gray-600 mb-6">
          Your payment was canceled. No charges were made to your account.
          You can try again or browse other vehicles.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => router.back()}
            className="block w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700"
          >
            Try Again
          </button>
          
          <Link
            href="/vehicles"
            className="block w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200"
          >
            Browse Vehicles
          </Link>
        </div>
      </div>
    </div>
  );
}
```

---

### 4. My Bookings Page

```typescript
// pages/bookings/index.tsx
import { useEffect, useState } from 'react';

interface Booking {
  _id: string;
  vehicle: {
    _id: string;
    name: string;
    images: string[];
    rent: number;
  };
  host: {
    name: string;
    email: string;
  };
  user: {
    name: string;
    email: string;
  };
  totalAmount: number;
  totalDays: number;
  pickupDate: string;
  dropoffDate: string;
  paymentStatus: string;
  bookingStatus: string;
  createdAt: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function MyBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<'user' | 'host'>('user');
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchBookings();
  }, [role, page]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/bookings?role=${role}&page=${page}&limit=10`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );
      
      const data = await response.json();
      setBookings(data.bookings || []);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'in-progress': 'bg-yellow-100 text-yellow-800',
      'active': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800',
      'canceled': 'bg-red-100 text-red-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">My Bookings</h1>

      {/* Role Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => { setRole('user'); setPage(1); }}
          className={`px-4 py-2 rounded-lg font-medium ${
            role === 'user'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          As Renter
        </button>
        <button
          onClick={() => { setRole('host'); setPage(1); }}
          className={`px-4 py-2 rounded-lg font-medium ${
            role === 'host'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          As Host
        </button>
      </div>

      {/* Bookings List */}
      {bookings.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No bookings found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <div
              key={booking._id}
              className="bg-white rounded-lg shadow p-6 flex gap-6"
            >
              {/* Vehicle Image */}
              <div className="w-32 h-24 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                {booking.vehicle.images?.[0] && (
                  <img
                    src={booking.vehicle.images[0]}
                    alt={booking.vehicle.name}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              {/* Booking Details */}
              <div className="flex-grow">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold">{booking.vehicle.name}</h3>
                    <p className="text-gray-500 text-sm">
                      {role === 'user' ? `Host: ${booking.host.name}` : `Renter: ${booking.user.name}`}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(booking.bookingStatus)}`}>
                    {booking.bookingStatus}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Pickup</p>
                    <p className="font-medium">{formatDate(booking.pickupDate)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Dropoff</p>
                    <p className="font-medium">{formatDate(booking.dropoffDate)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Total</p>
                    <p className="font-medium">${booking.totalAmount.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <button className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                  View Details
                </button>
                {booking.bookingStatus === 'active' && (
                  <button className="px-4 py-2 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100">
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-gray-100 rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2">
            Page {page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
            disabled={page === pagination.totalPages}
            className="px-4 py-2 bg-gray-100 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
```

---

### 5. Cancel Booking Modal

```typescript
// components/CancelBookingModal.tsx
import { useState } from 'react';

interface Props {
  bookingId: string;
  canceledBy: 'user' | 'host';
  onClose: () => void;
  onSuccess: () => void;
}

export default function CancelBookingModal({ bookingId, canceledBy, onClose, onSuccess }: Props) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const handleCancel = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/bookings/cancel/${bookingId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            canceledBy,
            cancellationReason: reason,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setResult(data.cancellationDetails);
      } else {
        setError(data.error || 'Failed to cancel booking');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        {!result ? (
          <>
            <h2 className="text-xl font-bold mb-4">Cancel Booking</h2>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-yellow-800 mb-2">Cancellation Policy</h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Free cancel within 24h of booking (if trip starts >48h away)</li>
                <li>• 50% refund if cancelled 24-48h before trip</li>
                <li>• No refund if cancelled &lt;24h before trip</li>
              </ul>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for cancellation (optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Let us know why you're canceling..."
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Keep Booking
              </button>
              <button
                onClick={handleCancel}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Confirm Cancel'}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold mb-4">Booking Canceled</h2>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-gray-700 mb-3">{result.message}</p>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Refund Amount</span>
                  <span className="font-medium">${result.refundAmount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Refund Percentage</span>
                  <span className="font-medium">{result.refundPercentage}%</span>
                </div>
                {result.hostPayoutAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Host Payout</span>
                    <span className="font-medium">${result.hostPayoutAmount?.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => { onSuccess(); onClose(); }}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Done
            </button>
          </>
        )}
      </div>
    </div>
  );
}
```

---

### 6. Host Dashboard Stats Component

```typescript
// components/HostDashboardStats.tsx
import { useEffect, useState } from 'react';

interface Stats {
  totalRevenue: number;
  lastWeekRevenue: number;
  avgLastWeekRevenue: number;
  currentMonthRevenue: number;
}

export default function HostDashboardStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/bookings/stats`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-32 rounded-lg"></div>;
  }

  if (!stats) {
    return null;
  }

  const statCards = [
    {
      label: 'Total Revenue',
      value: `$${stats.totalRevenue.toFixed(2)}`,
      color: 'bg-green-50 text-green-700',
    },
    {
      label: 'This Month',
      value: `$${stats.currentMonthRevenue.toFixed(2)}`,
      color: 'bg-blue-50 text-blue-700',
    },
    {
      label: 'Last Week',
      value: `$${stats.lastWeekRevenue.toFixed(2)}`,
      color: 'bg-purple-50 text-purple-700',
    },
    {
      label: 'Avg. Daily (Last Week)',
      value: `$${stats.avgLastWeekRevenue.toFixed(2)}`,
      color: 'bg-orange-50 text-orange-700',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statCards.map((stat) => (
        <div key={stat.label} className={`${stat.color} rounded-lg p-4`}>
          <p className="text-sm opacity-75">{stat.label}</p>
          <p className="text-2xl font-bold">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}
```

---

### 7. Confirm Booking Button (Host)

```typescript
// components/ConfirmBookingButton.tsx
import { useState } from 'react';

interface Props {
  bookingId: string;
  onSuccess: () => void;
}

export default function ConfirmBookingButton({ bookingId, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!confirm('Are you sure the rental is complete? This will schedule payout to your account.')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/bookings/confirm`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ bookingId }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        alert(`Booking confirmed! Payout scheduled for ${new Date(data.booking.scheduledPayoutDate).toLocaleDateString()}`);
        onSuccess();
      } else {
        setError(data.error || 'Failed to confirm booking');
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
        onClick={handleConfirm}
        disabled={loading}
        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? 'Processing...' : 'Confirm Completion'}
      </button>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}
```

---

## Complete Service Class

```typescript
// services/bookingService.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL;

class BookingService {
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

  // Create a booking (returns Stripe checkout URL)
  async createBooking(data: {
    vehicle: string;
    host: string;
    pickupDate: string;
    dropoffDate: string;
    totalDays: number;
    totalAmount: number;
  }) {
    const res = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(data),
    });
    return res.json();
  }

  // Get all bookings for current user
  async getBookings(params: { role?: 'user' | 'host'; page?: number; limit?: number } = {}) {
    const query = new URLSearchParams({
      ...(params.role && { role: params.role }),
      page: String(params.page || 1),
      limit: String(params.limit || 10),
    });
    
    const res = await fetch(`${API_BASE}/bookings?${query}`, {
      headers: this.headers(),
    });
    return res.json();
  }

  // Cancel a booking
  async cancelBooking(bookingId: string, canceledBy: 'user' | 'host', reason?: string) {
    const res = await fetch(`${API_BASE}/bookings/cancel/${bookingId}`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ canceledBy, cancellationReason: reason }),
    });
    return res.json();
  }

  // Confirm booking completion (host)
  async confirmBooking(bookingId: string) {
    const res = await fetch(`${API_BASE}/bookings/confirm`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ bookingId }),
    });
    return res.json();
  }

  // Get host stats
  async getStats() {
    const res = await fetch(`${API_BASE}/bookings/stats`, {
      headers: this.headers(),
    });
    return res.json();
  }

  // Get monthly revenue
  async getMonthlyStats(year?: number) {
    const query = year ? `?year=${year}` : '';
    const res = await fetch(`${API_BASE}/bookings/monthly-stats${query}`, {
      headers: this.headers(),
    });
    return res.json();
  }
}

export default BookingService;
```

---

## Environment Variables

### Backend (.env)
```env
# Stripe Configuration
STRIPE_SECRET_KEY="sk_test_xxx"
STRIPE_WEBHOOK_SECRET="whsec_xxx"

# Redirect URLs after payment
STRIPE_SUCCESS_REDIRECT="http://localhost:3000/booking/success"
STRIPE_FAILURE_REDIRECT="http://localhost:3000/booking/canceled"

# Other
CLIENT_URL="http://localhost:3000"
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL="http://localhost:9716"
```

---

## Booking Status Flow

```
┌──────────────┐
│  in-progress │ ← Booking created, payment pending
└──────┬───────┘
       │ Payment succeeds (webhook)
       ▼
┌──────────────┐
│    active    │ ← Trip is scheduled/ongoing
└──────┬───────┘
       │ Host confirms completion OR User/Host cancels
       ▼
┌──────────────┐     ┌──────────────┐
│  completed   │ OR  │   canceled   │
└──────────────┘     └──────────────┘
       │                    │
       │ Payout processed   │ Refund processed
       ▼                    ▼
   Host paid            User refunded
```

---

## Payment Status Values

| Status | Description |
|--------|-------------|
| `pending` | Booking created, awaiting payment |
| `succeeded` | Payment successful |
| `failed` | Payment failed |
| `refunded` | Full refund issued |
| `partially_refunded` | Partial refund issued |

---

## Webhook Configuration

Set up webhook in Stripe Dashboard:
- **Endpoint:** `YOUR_SERVER_URL/bookings/webhook`
- **Events:** `checkout.session.completed`

---

## Testing Checklist

- [ ] Create booking with valid dates
- [ ] Redirect to Stripe Checkout works
- [ ] Success page shows after payment
- [ ] Cancel page shows when user cancels payment
- [ ] Booking appears in "My Bookings" list
- [ ] Filter bookings by role (user/host)
- [ ] Cancel booking as user (various time scenarios)
- [ ] Cancel booking as host (penalty applied)
- [ ] Host can confirm booking completion
- [ ] Stats display correctly on host dashboard
- [ ] Pagination works

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Payment redirect not working | Check STRIPE_SUCCESS_REDIRECT and STRIPE_FAILURE_REDIRECT env vars |
| Booking not updating after payment | Verify webhook endpoint and STRIPE_WEBHOOK_SECRET |
| "Vehicle already booked" error | Check date overlap logic on frontend |
| Cancellation refund failed | Ensure payment intent exists and is refundable |
| Host payout not scheduled | Host must confirm booking via POST /bookings/confirm |

---

## Support

For additional help, refer to:
- [Stripe Checkout Documentation](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Testing Stripe Payments](https://stripe.com/docs/testing)
