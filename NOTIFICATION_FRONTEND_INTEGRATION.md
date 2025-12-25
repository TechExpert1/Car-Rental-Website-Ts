# Notification Frontend Integration Guide

This guide covers the complete frontend integration for the notification system in the car rental platform, including fetching notifications, marking as read, real-time updates, and displaying notifications in the UI.

---

## Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. Backend creates notification                                            │
│     Various events trigger notifications (booking, payout, review, etc.)    │
├─────────────────────────────────────────────────────────────────────────────┤
│  2. Frontend polls or listens for notifications                             │
│     GET /notifications?unread=true&page=1&limit=20                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  3. Display notification badge with unread count                            │
│     Show indicator in header/navbar                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  4. User clicks notification bell                                           │
│     Show dropdown/panel with recent notifications                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  5. User clicks on a notification                                           │
│     POST /notifications/mark-read { id }                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  6. User navigates to notification page                                     │
│     View all notifications with pagination                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  7. Mark all notifications as read                                          │
│     POST /notifications/mark-all-read                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  8. Clear all notifications                                                 │
│     DELETE /notifications                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### 1. Get Notifications

**Endpoint:** `GET /notifications`  
**Auth:** `userAuth` (User JWT required)

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20) |
| `unread` | boolean | Filter unread only: "true" or "false" |

**Response:**
```json
{
  "notifications": [
    {
      "_id": "64notif123id",
      "user": "64user123id",
      "type": "booking_confirmed",
      "title": "Booking Confirmed",
      "message": "Your booking for Toyota Camry has been confirmed",
      "read": false,
      "data": {
        "bookingId": "64booking123id",
        "vehicleName": "Toyota Camry 2024"
      },
      "createdAt": "2025-01-15T10:30:00.000Z",
      "updatedAt": "2025-01-15T10:30:00.000Z"
    },
    {
      "_id": "64notif456id",
      "user": "64user123id",
      "type": "payout_processed",
      "title": "Payout Processed",
      "message": "Your payout of $450.00 has been processed",
      "read": true,
      "data": {
        "payoutId": "64payout123id",
        "amount": 450.00
      },
      "createdAt": "2025-01-14T08:15:00.000Z",
      "updatedAt": "2025-01-15T09:20:00.000Z"
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 20,
    "totalPages": 2
  }
}
```

---

### 2. Mark Notification as Read

**Endpoint:** `POST /notifications/mark-read`  
**Auth:** `userAuth` (User JWT required)

**Request:**
```json
{
  "id": "64notif123id"
}
```

**Response:**
```json
{
  "message": "Marked as read",
  "notification": {
    "_id": "64notif123id",
    "user": "64user123id",
    "type": "booking_confirmed",
    "title": "Booking Confirmed",
    "message": "Your booking for Toyota Camry has been confirmed",
    "read": true,
    "data": {
      "bookingId": "64booking123id"
    },
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T11:45:00.000Z"
  }
}
```

**Error Responses:**
```json
// Unauthorized
{ "error": "Unauthorized" }

// Notification not found
{ "error": "Notification not found" }
```

---

### 3. Mark All Notifications as Read

**Endpoint:** `POST /notifications/mark-all-read`  
**Auth:** `userAuth` (User JWT required)

**Request:** No body required

**Response:**
```json
{
  "message": "All notifications marked as read"
}
```

---

### 4. Clear All Notifications

**Endpoint:** `DELETE /notifications`  
**Auth:** `userAuth` (User JWT required)

**Request:** No body required

**Response:**
```json
{
  "message": "All notifications cleared"
}
```

---

## Notification Types

The system supports various notification types. Each type can have different icons, colors, and navigation actions:

| Type | Description | Icon | Action |
|------|-------------|------|--------|
| `booking_confirmed` | User's booking was confirmed | ✅ Check | Navigate to booking details |
| `booking_canceled` | Booking was canceled | ❌ X | Navigate to booking details |
| `payout_processed` | Host payout was processed | 💰 Dollar | Navigate to payouts/earnings |
| `payout_scheduled` | Host payout has been scheduled | 📅 Calendar | Navigate to payouts |
| `review_received` | User received a new review | ⭐ Star | Navigate to reviews |
| `badge_unlocked` | User unlocked a new badge | 🏆 Trophy | Navigate to badges/profile |
| `vehicle_approved` | Host's vehicle was approved | 🚗 Car | Navigate to vehicle listing |
| `vehicle_rejected` | Host's vehicle was rejected | ⚠️ Warning | Navigate to vehicle submission |
| `booking_request` | Host received a booking request | 📬 Inbox | Navigate to booking management |
| `payment_failed` | Payment processing failed | 💳 Card | Navigate to payment settings |

---

## Frontend Components

### 1. Notification Context & Hook

Create a context to manage notifications globally across your app:

```typescript
// context/NotificationContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Notification {
  _id: string;
  user: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  data?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAll: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/notifications?limit=20`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.notifications?.filter((n: Notification) => !n.read).length || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/notifications/mark-read`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id }),
        }
      );

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => n._id === id ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/notifications/mark-all-read`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const clearAll = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/notifications`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (response.ok) {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  // Auto-refresh notifications every 30 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};
```

---

### 2. Notification Bell Icon (Header Component)

Add this to your header/navbar to show notification indicator:

```typescript
// components/NotificationBell.tsx
import { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';
import NotificationDropdown from './NotificationDropdown';

export default function NotificationBell() {
  const { unreadCount } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg transition-colors"
        aria-label="Notifications"
      >
        {/* Bell Icon */}
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full min-w-[20px]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && <NotificationDropdown onClose={() => setIsOpen(false)} />}
    </div>
  );
}
```

---

### 3. Notification Dropdown

```typescript
// components/NotificationDropdown.tsx
import { useNotifications } from '../context/NotificationContext';
import { useRouter } from 'next/router';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  onClose: () => void;
}

export default function NotificationDropdown({ onClose }: Props) {
  const router = useRouter();
  const { notifications, loading, markAsRead, markAllAsRead } = useNotifications();
  
  const recentNotifications = notifications.slice(0, 5);

  const getNotificationIcon = (type: string) => {
    const icons: Record<string, string> = {
      'booking_confirmed': '✅',
      'booking_canceled': '❌',
      'payout_processed': '💰',
      'payout_scheduled': '📅',
      'review_received': '⭐',
      'badge_unlocked': '🏆',
      'vehicle_approved': '🚗',
      'vehicle_rejected': '⚠️',
      'booking_request': '📬',
      'payment_failed': '💳',
    };
    return icons[type] || '📢';
  };

  const handleNotificationClick = async (notification: any) => {
    // Mark as read
    if (!notification.read) {
      await markAsRead(notification._id);
    }

    // Navigate based on type
    const routes: Record<string, string> = {
      'booking_confirmed': `/bookings/${notification.data?.bookingId}`,
      'booking_canceled': `/bookings/${notification.data?.bookingId}`,
      'booking_request': `/bookings/${notification.data?.bookingId}`,
      'payout_processed': '/payouts',
      'payout_scheduled': '/payouts',
      'review_received': '/reviews',
      'badge_unlocked': '/profile/badges',
      'vehicle_approved': `/vehicles/${notification.data?.vehicleId}`,
      'vehicle_rejected': `/vehicles/${notification.data?.vehicleId}`,
      'payment_failed': '/settings/payment',
    };

    const route = routes[notification.type] || '/notifications';
    router.push(route);
    onClose();
  };

  const formatTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  return (
    <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[600px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
        {notifications.some(n => !n.read) && (
          <button
            onClick={markAllAsRead}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="overflow-y-auto flex-grow">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : recentNotifications.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="text-6xl mb-4">🔔</div>
            <p className="text-gray-500">No notifications yet</p>
            <p className="text-sm text-gray-400 mt-1">
              We'll notify you when something important happens
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentNotifications.map((notification) => (
              <button
                key={notification._id}
                onClick={() => handleNotificationClick(notification)}
                className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                  !notification.read ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex gap-3">
                  {/* Icon */}
                  <div className="flex-shrink-0 text-2xl">
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-grow min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium text-gray-900 ${
                        !notification.read ? 'font-semibold' : ''
                      }`}>
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <span className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-1.5"></span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatTime(notification.createdAt)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="border-t border-gray-200 p-3">
          <button
            onClick={() => {
              router.push('/notifications');
              onClose();
            }}
            className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
}
```

---

### 4. Full Notifications Page

```typescript
// pages/notifications/index.tsx
import { useState, useEffect } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { useRouter } from 'next/router';

interface Notification {
  _id: string;
  user: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  data?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { markAsRead, markAllAsRead, clearAll } = useNotifications();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchNotifications();
  }, [filter, page]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(filter === 'unread' ? { unread: 'true' } : {}),
      });

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/notifications?${queryParams}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id);
    setNotifications(prev =>
      prev.map(n => n._id === id ? { ...n, read: true } : n)
    );
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleClearAll = async () => {
    if (confirm('Are you sure you want to clear all notifications? This action cannot be undone.')) {
      await clearAll();
      setNotifications([]);
      setPagination(null);
    }
  };

  const getNotificationIcon = (type: string) => {
    const icons: Record<string, string> = {
      'booking_confirmed': '✅',
      'booking_canceled': '❌',
      'payout_processed': '💰',
      'payout_scheduled': '📅',
      'review_received': '⭐',
      'badge_unlocked': '🏆',
      'vehicle_approved': '🚗',
      'vehicle_rejected': '⚠️',
      'booking_request': '📬',
      'payment_failed': '💳',
    };
    return icons[type] || '📢';
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await handleMarkAsRead(notification._id);
    }

    const routes: Record<string, string> = {
      'booking_confirmed': `/bookings/${notification.data?.bookingId}`,
      'booking_canceled': `/bookings/${notification.data?.bookingId}`,
      'booking_request': `/bookings/${notification.data?.bookingId}`,
      'payout_processed': '/payouts',
      'payout_scheduled': '/payouts',
      'review_received': '/reviews',
      'badge_unlocked': '/profile/badges',
      'vehicle_approved': `/vehicles/${notification.data?.vehicleId}`,
      'vehicle_rejected': `/vehicles/${notification.data?.vehicleId}`,
      'payment_failed': '/settings/payment',
    };

    const route = routes[notification.type];
    if (route) {
      router.push(route);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffHours < 1) {
      const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  if (loading && notifications.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Notifications</h1>
        <p className="text-gray-600">Stay up to date with your account activity</p>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        {/* Filter Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => { setFilter('all'); setPage(1); }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => { setFilter('unread'); setPage(1); }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'unread'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Unread
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {notifications.some(n => !n.read) && (
            <button
              onClick={handleMarkAllAsRead}
              className="px-4 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-medium transition-colors"
            >
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-4 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg">
          <div className="text-6xl mb-4">🔔</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          </h3>
          <p className="text-gray-500">
            {filter === 'unread'
              ? "You're all caught up!"
              : "We'll notify you when something important happens"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow border border-gray-200 divide-y divide-gray-100">
          {notifications.map((notification) => (
            <div
              key={notification._id}
              onClick={() => handleNotificationClick(notification)}
              className={`p-6 hover:bg-gray-50 cursor-pointer transition-colors ${
                !notification.read ? 'bg-blue-50/50' : ''
              }`}
            >
              <div className="flex gap-4">
                {/* Icon */}
                <div className="flex-shrink-0">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                    !notification.read ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-grow min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <h3 className={`text-base font-medium text-gray-900 ${
                      !notification.read ? 'font-semibold' : ''
                    }`}>
                      {notification.title}
                    </h3>
                    {!notification.read && (
                      <span className="flex-shrink-0 w-2.5 h-2.5 bg-blue-600 rounded-full mt-1.5"></span>
                    )}
                  </div>
                  <p className="text-gray-600 mb-2">{notification.message}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span>{formatDate(notification.createdAt)}</span>
                    <span className="capitalize">{notification.type.replace('_', ' ')}</span>
                  </div>
                </div>

                {/* Mark as Read Button */}
                {!notification.read && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkAsRead(notification._id);
                    }}
                    className="flex-shrink-0 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    Mark read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-gray-600">
            Showing {((page - 1) * (pagination.limit || 20)) + 1} to{' '}
            {Math.min(page * (pagination.limit || 20), pagination.total)} of{' '}
            {pagination.total} notifications
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-medium text-gray-700">
              Page {page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Setup Instructions

### 1. Wrap Your App with NotificationProvider

```typescript
// pages/_app.tsx
import { NotificationProvider } from '../context/NotificationContext';
import '../styles/globals.css';

function MyApp({ Component, pageProps }) {
  return (
    <NotificationProvider>
      <Component {...pageProps} />
    </NotificationProvider>
  );
}

export default MyApp;
```

### 2. Add Notification Bell to Header

```typescript
// components/Header.tsx
import NotificationBell from './NotificationBell';

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div>Logo</div>
          
          <div className="flex items-center gap-4">
            {/* Add notification bell */}
            <NotificationBell />
            
            {/* Other header items */}
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
```

### 3. Install Date-fns for Date Formatting

```bash
npm install date-fns
```

Or use vanilla JavaScript for date formatting if you prefer not to add dependencies.

---

## Styling with Tailwind CSS

If you're using Tailwind CSS, the components above are already styled. If you're using vanilla CSS, here's a basic CSS file:

```css
/* styles/notifications.css */

/* Notification Bell */
.notification-bell {
  position: relative;
  padding: 0.5rem;
  color: #6b7280;
  transition: color 0.2s;
}

.notification-bell:hover {
  color: #111827;
}

.notification-badge {
  position: absolute;
  top: 0;
  right: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: bold;
  color: white;
  background-color: #dc2626;
  border-radius: 9999px;
  min-width: 20px;
  transform: translate(50%, -50%);
}

/* Notification Dropdown */
.notification-dropdown {
  position: absolute;
  right: 0;
  margin-top: 0.5rem;
  width: 24rem;
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  z-index: 50;
  max-height: 600px;
  display: flex;
  flex-direction: column;
}

.notification-item {
  padding: 1rem;
  border-bottom: 1px solid #f3f4f6;
  cursor: pointer;
  transition: background-color 0.2s;
}

.notification-item:hover {
  background-color: #f9fafb;
}

.notification-item.unread {
  background-color: #eff6ff;
}

.notification-unread-dot {
  width: 0.5rem;
  height: 0.5rem;
  background-color: #2563eb;
  border-radius: 9999px;
}

/* Loading Spinner */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.spinner {
  animation: spin 1s linear infinite;
  border: 2px solid #e5e7eb;
  border-top-color: #2563eb;
  border-radius: 9999px;
  width: 2rem;
  height: 2rem;
}
```

---

## Advanced Features

### 1. Real-time Notifications with WebSockets

For real-time notifications, you can integrate Socket.IO:

```typescript
// lib/socket.ts
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initSocket = (token: string) => {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_API_URL || '', {
      auth: { token },
    });

    socket.on('connect', () => {
      console.log('Socket connected');
    });

    socket.on('notification', (notification) => {
      // Handle new notification
      console.log('New notification:', notification);
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
```

Update NotificationContext to use WebSocket:

```typescript
// Add to NotificationContext
useEffect(() => {
  const token = localStorage.getItem('token');
  if (token) {
    const socket = initSocket(token);
    
    socket.on('notification', (newNotification) => {
      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Show toast notification
      showToast(newNotification);
    });
    
    return () => disconnectSocket();
  }
}, []);
```

### 2. Toast Notifications

Add toast notifications for real-time updates:

```typescript
// components/Toast.tsx
import { useEffect, useState } from 'react';

interface ToastProps {
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

export default function Toast({ title, message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = {
    success: 'bg-green-50 text-green-800 border-green-200',
    error: 'bg-red-50 text-red-800 border-red-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200',
  };

  return (
    <div className={`fixed top-4 right-4 max-w-sm w-full ${colors[type]} border rounded-lg shadow-lg p-4 z-50 animate-slide-in`}>
      <div className="flex items-start gap-3">
        <div className="flex-grow">
          <h4 className="font-semibold mb-1">{title}</h4>
          <p className="text-sm">{message}</p>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          ✕
        </button>
      </div>
    </div>
  );
}
```

### 3. Push Notifications (Browser API)

Request permission and show browser notifications:

```typescript
// lib/pushNotifications.ts
export const requestNotificationPermission = async () => {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
};

export const showBrowserNotification = (title: string, options?: NotificationOptions) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/logo.png',
      badge: '/badge.png',
      ...options,
    });
  }
};
```

---

## Testing

### Example Test Scenarios

1. **Fetch Notifications**: Verify notifications load correctly
2. **Mark as Read**: Check notification status updates
3. **Mark All as Read**: Ensure all notifications update
4. **Clear All**: Verify all notifications are deleted
5. **Pagination**: Test page navigation
6. **Real-time Updates**: Verify WebSocket notifications appear
7. **Navigation**: Ensure clicking notifications navigates correctly

### Sample Test with Jest

```typescript
// __tests__/notifications.test.ts
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NotificationsPage from '../pages/notifications';
import { NotificationProvider } from '../context/NotificationContext';

describe('Notifications Page', () => {
  it('renders notifications correctly', async () => {
    render(
      <NotificationProvider>
        <NotificationsPage />
      </NotificationProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });
  });

  it('marks notification as read', async () => {
    // Implementation
  });
});
```

---

## Environment Variables

Add to your `.env` file:

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

---

## Best Practices

1. **Polling Interval**: Don't poll too frequently (30-60 seconds is reasonable)
2. **Limit Notifications**: Show only recent notifications in dropdown (5-10)
3. **Mark as Read**: Mark notifications as read when clicked
4. **Clear Old**: Periodically clear very old notifications
5. **Error Handling**: Handle API errors gracefully
6. **Loading States**: Show loading indicators during API calls
7. **Accessibility**: Ensure keyboard navigation and screen reader support
8. **Performance**: Use React.memo and useMemo for optimization

---

## Troubleshooting

### Issue: Notifications not loading
- **Solution**: Check authentication token, API endpoint, and network requests

### Issue: Unread count not updating
- **Solution**: Verify markAsRead API call is successful and state updates correctly

### Issue: WebSocket not connecting
- **Solution**: Check Socket.IO server configuration and authentication

### Issue: Dropdown closes unexpectedly
- **Solution**: Ensure click-outside detection is working correctly

---

## Summary

You now have a complete notification system with:

✅ Notification bell with unread badge  
✅ Dropdown with recent notifications  
✅ Full notifications page with pagination  
✅ Mark as read / mark all as read functionality  
✅ Clear all notifications  
✅ Navigation to relevant pages based on notification type  
✅ Real-time updates (optional WebSocket integration)  
✅ Toast notifications (optional)  
✅ Browser push notifications (optional)

This system seamlessly integrates with your car rental platform and provides users with timely updates about bookings, payouts, reviews, badges, and more!
