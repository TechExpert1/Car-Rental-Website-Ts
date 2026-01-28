# Admin API Documentation

Base URL: `/admin`

## Authentication

All admin endpoints (except auth endpoints) require admin authentication via JWT token.

Include the token in the request header:
```
Authorization: Bearer <your_jwt_token>
```
or
```
token: <your_jwt_token>
```

---

## Admin Authentication

### 1. Admin Login
**POST** `/admin/auth/login`

Login as admin user.

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "email": "admin@example.com",
    "username": "admin",
    "name": "Admin Name",
    "role": "admin"
  },
  "token": "jwt_token_here"
}
```

---

### 2. Request Password Reset
**POST** `/admin/auth/forgot-password`

Request OTP for password reset.

**Request Body:**
```json
{
  "email": "admin@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent to your email",
  "otp": "123456"  // Only in development mode
}
```

---

### 3. Reset Password
**POST** `/admin/auth/reset-password`

Reset password using OTP.

**Request Body:**
```json
{
  "email": "admin@example.com",
  "otp": "123456",
  "newPassword": "newPassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

---

## Customer User Management

### 1. Get All Customers
**GET** `/admin/customers`

Get paginated list of customers with optional filters.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)
- `search` (optional): Search by email, username, or name
- `accountStatus` (optional): Filter by status (active, inactive, banned)

**Example:**
```
GET /admin/customers?page=1&limit=20&search=john&accountStatus=active
```

**Response:**
```json
{
  "success": true,
  "customers": [
    {
      "_id": "customer_id",
      "email": "customer@example.com",
      "username": "customer1",
      "name": "John Doe",
      "role": "customer",
      "accountStatus": "active",
      "averageGuestRating": 4.5,
      "totalGuestRatings": 10,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "pages": 5
  }
}
```

---

### 2. Get Customer Count
**GET** `/admin/customers/count`

Get count of customers by status.

**Response:**
```json
{
  "success": true,
  "total": 100,
  "active": 85,
  "inactive": 10,
  "banned": 5
}
```

---

### 3. Get Customer Profile
**GET** `/admin/customers/:customerId`

Get detailed customer profile with bookings.

**Response:**
```json
{
  "success": true,
  "customer": {
    "_id": "customer_id",
    "email": "customer@example.com",
    "username": "customer1",
    "name": "John Doe",
    "role": "customer",
    "accountStatus": "active",
    "averageGuestRating": 4.5,
    "totalGuestRatings": 10
  },
  "bookings": [
    {
      "_id": "booking_id",
      "vehicle": {
        "name": "Toyota Camry",
        "type": "Sedan",
        "rent": 50
      },
      "host": {
        "name": "Host Name",
        "email": "host@example.com"
      },
      "bookingStatus": "completed",
      "paymentStatus": "succeeded",
      "totalAmount": 200,
      "pickupDate": "2024-01-01",
      "dropoffDate": "2024-01-05"
    }
  ],
  "stats": {
    "totalBookings": 15,
    "completedBookings": 12,
    "canceledBookings": 3,
    "totalSpent": 3000
  }
}
```

---

### 4. Update Customer Status
**PATCH** `/admin/customers/:customerId/status`

Update customer account status.

**Request Body:**
```json
{
  "accountStatus": "active"  // active, inactive, or banned
}
```

**Response:**
```json
{
  "success": true,
  "message": "Customer account status updated to active",
  "customer": {
    "id": "customer_id",
    "email": "customer@example.com",
    "accountStatus": "active"
  }
}
```

---

## Host User Management

### 1. Get All Hosts
**GET** `/admin/hosts`

Get paginated list of hosts with optional filters.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)
- `search` (optional): Search by email, username, or name
- `approvalStatus` (optional): Filter by approval (pending, approved, rejected)
- `accountStatus` (optional): Filter by status (active, inactive, banned)

**Example:**
```
GET /admin/hosts?page=1&limit=20&approvalStatus=pending
```

**Response:**
```json
{
  "success": true,
  "hosts": [
    {
      "_id": "host_id",
      "email": "host@example.com",
      "username": "host1",
      "name": "Jane Smith",
      "role": "host",
      "hostApprovalStatus": "pending",
      "accountStatus": "active",
      "identityNumber": "ID123456",
      "idCardProof": "https://example.com/id.jpg",
      "addressProof": "https://example.com/address.pdf",
      "isVerifiedHost": false,
      "averageRating": 4.8,
      "totalRatings": 25,
      "totalCompletedTrips": 50,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 20,
    "pages": 3
  }
}
```

---

### 2. Get Pending Host Approvals
**GET** `/admin/hosts/pending`

Get all hosts pending approval.

**Response:**
```json
{
  "success": true,
  "pendingHosts": [
    {
      "_id": "host_id",
      "email": "host@example.com",
      "username": "host1",
      "name": "Jane Smith",
      "identityNumber": "ID123456",
      "idCardProof": "https://example.com/id.jpg",
      "addressProof": "https://example.com/address.pdf",
      "hostApprovalStatus": "pending",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 3. Get Host Count
**GET** `/admin/hosts/count`

Get count of hosts by status.

**Response:**
```json
{
  "success": true,
  "total": 50,
  "pending": 10,
  "approved": 35,
  "rejected": 5,
  "active": 40,
  "banned": 2
}
```

---

### 4. Get Host Profile
**GET** `/admin/hosts/:hostId`

Get detailed host profile with vehicles and bookings.

**Response:**
```json
{
  "success": true,
  "host": {
    "_id": "host_id",
    "email": "host@example.com",
    "username": "host1",
    "name": "Jane Smith",
    "hostApprovalStatus": "approved",
    "accountStatus": "active",
    "identityNumber": "ID123456",
    "idCardProof": "https://example.com/id.jpg",
    "addressProof": "https://example.com/address.pdf",
    "isVerifiedHost": true,
    "averageRating": 4.8,
    "totalRatings": 25
  },
  "vehicles": [
    {
      "_id": "vehicle_id",
      "name": "Toyota Camry",
      "type": "Sedan",
      "rent": 50,
      "status": "active",
      "approvalStatus": "approved"
    }
  ],
  "bookings": [
    {
      "_id": "booking_id",
      "vehicle": {
        "name": "Toyota Camry"
      },
      "user": {
        "name": "Customer Name"
      },
      "bookingStatus": "completed",
      "paymentStatus": "succeeded",
      "totalAmount": 200,
      "hostPayoutAmount": 170
    }
  ],
  "stats": {
    "totalVehicles": 5,
    "activeVehicles": 4,
    "totalBookings": 50,
    "completedBookings": 45,
    "canceledBookings": 5,
    "totalEarnings": 8500
  }
}
```

---

### 5. Approve Host
**POST** `/admin/hosts/:hostId/approve`

Approve a pending host account. An email notification will be sent to the host informing them of the approval.

**Response:**
```json
{
  "success": true,
  "message": "Host approved successfully",
  "host": {
    "id": "host_id",
    "email": "host@example.com",
    "hostApprovalStatus": "approved",
    "isVerifiedHost": true
  }
}
```

**Email Notification:** A congratulatory email is sent to the host with next steps for getting started.

---

### 6. Reject Host
**POST** `/admin/hosts/:hostId/reject`

Reject a pending host account. An email notification will be sent to the host with the rejection reason.

**Request Body:**
```json
{
  "reason": "Invalid or incomplete documentation"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Host rejected",
  "host": {
    "id": "host_id",
    "email": "host@example.com",
    "hostApprovalStatus": "rejected",
    "hostRejectionReason": "Invalid or incomplete documentation"
  }
}
```

**Email Notification:** An email is sent to the host explaining the rejection and providing guidance for re-submission.

---

### 7. Update Host Status
**PATCH** `/admin/hosts/:hostId/status`

Update host account status.

**Request Body:**
```json
{
  "accountStatus": "active"  // active, inactive, or banned
}
```

**Response:**
```json
{
  "success": true,
  "message": "Host account status updated to active",
  "host": {
    "id": "host_id",
    "email": "host@example.com",
    "accountStatus": "active"
  }
}
```

---

## Vehicle Management

### 1. Get All Vehicles
**GET** `/admin/vehicles`

Get paginated list of vehicles with optional filters.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)
- `search` (optional): Search by name, type, or model
- `approvalStatus` (optional): Filter by approval (pending, approved, rejected)
- `status` (optional): Filter by status (active, de-activated)

**Example:**
```
GET /admin/vehicles?page=1&limit=20&approvalStatus=pending
```

**Response:**
```json
{
  "success": true,
  "vehicles": [
    {
      "_id": "vehicle_id",
      "name": "Toyota Camry",
      "host": {
        "name": "Host Name",
        "email": "host@example.com"
      },
      "vehicleModel": "2023",
      "type": "Sedan",
      "rent": 50,
      "security": 200,
      "description": "Well-maintained sedan, perfect for city driving",
      "legalDocuments": "https://example.com/docs.pdf",
      "approvalStatus": "pending",
      "status": "active",
      "images": ["https://example.com/car1.jpg"],
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "pages": 5
  }
}
```

---

### 2. Get Pending Vehicle Approvals
**GET** `/admin/vehicles/pending`

Get all vehicles pending approval.

**Response:**
```json
{
  "success": true,
  "pendingVehicles": [
    {
      "_id": "vehicle_id",
      "name": "Toyota Camry",
      "host": {
        "name": "Host Name",
        "email": "host@example.com"
      },
      "description": "Well-maintained sedan",
      "legalDocuments": "https://example.com/docs.pdf",
      "approvalStatus": "pending",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 3. Get Vehicle Count
**GET** `/admin/vehicles/count`

Get count of vehicles by status.

**Response:**
```json
{
  "success": true,
  "total": 100,
  "pending": 15,
  "approved": 75,
  "rejected": 10,
  "active": 80,
  "deactivated": 20
}
```

---

### 4. Approve Vehicle
**POST** `/admin/vehicles/:vehicleId/approve`

Approve a pending vehicle. An email notification will be sent to the vehicle owner (host) informing them of the approval.

**Response:**
```json
{
  "success": true,
  "message": "Vehicle approved successfully",
  "vehicle": {
    "id": "vehicle_id",
    "name": "Toyota Camry",
    "approvalStatus": "approved"
  }
}
```

**Email Notification:** A notification email is sent to the host confirming their vehicle is now live and available for bookings.

---

### 5. Reject Vehicle
**POST** `/admin/vehicles/:vehicleId/reject`

Reject a pending vehicle. An email notification will be sent to the vehicle owner (host) with the rejection reason.

**Request Body:**
```json
{
  "reason": "Invalid or expired legal documents"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Vehicle rejected",
  "vehicle": {
    "id": "vehicle_id",
    "name": "Toyota Camry",
    "approvalStatus": "rejected",
    "rejectionReason": "Invalid or expired legal documents"
  }
}
```

**Email Notification:** An email is sent to the host explaining why the vehicle was rejected and providing guidance for updating and re-submitting the listing.

---

### 6. Delete Vehicle
**DELETE** `/admin/vehicles/:vehicleId`

Delete a vehicle from the platform. Cannot delete vehicles with active bookings.

**Response:**
```json
{
  "success": true,
  "message": "Vehicle deleted successfully",
  "vehicle": {
    "id": "vehicle_id",
    "name": "Toyota Camry",
    "host": {
      "name": "Host Name",
      "email": "host@example.com"
    }
  }
}
```

**Email Notification:** A notification email is sent to the host informing them that their vehicle listing has been removed.

**Error Cases:**
- `400`: Vehicle has active bookings (cannot be deleted)
- `404`: Vehicle not found

---

## Booking & Payment Management

### 1. Get All Bookings
**GET** `/admin/bookings`

Get paginated list of bookings with optional filters.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)
- `bookingStatus` (optional): Filter by booking status (in-progress, active, completed, canceled)
- `paymentStatus` (optional): Filter by payment status (pending, succeeded, failed, refunded, partially_refunded)

**Example:**
```
GET /admin/bookings?page=1&limit=20&bookingStatus=completed&paymentStatus=succeeded
```

**Response:**
```json
{
  "success": true,
  "bookings": [
    {
      "_id": "booking_id",
      "user": {
        "name": "Customer Name",
        "email": "customer@example.com"
      },
      "host": {
        "name": "Host Name",
        "email": "host@example.com"
      },
      "vehicle": {
        "name": "Toyota Camry",
        "type": "Sedan",
        "rent": 50
      },
      "bookingStatus": "completed",
      "paymentStatus": "succeeded",
      "totalAmount": 200,
      "totalDays": 4,
      "pickupDate": "2024-01-01",
      "dropoffDate": "2024-01-05",
      "hostPayoutAmount": 170,
      "platformFeeAmount": 30,
      "payoutStatus": "completed",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 500,
    "page": 1,
    "limit": 20,
    "pages": 25
  }
}
```

---

### 2. Get Booking Statistics
**GET** `/admin/bookings/stats`

Get comprehensive booking and payment statistics.

**Response:**
```json
{
  "success": true,
  "bookingStatus": {
    "total": 500,
    "inProgress": 20,
    "active": 50,
    "completed": 400,
    "canceled": 30
  },
  "paymentStatus": {
    "succeeded": 450,
    "pending": 20,
    "failed": 30
  },
  "revenue": {
    "totalRevenue": 50000,
    "platformFees": 7500,
    "hostPayouts": 42500
  }
}
```

---

## Platform Statistics

### 1. Get Platform Statistics
**GET** `/admin/stats`

Get comprehensive platform statistics.

**Response:**
```json
{
  "success": true,
  "stats": {
    "users": {
      "totalUsers": 1000,
      "customers": 800,
      "hosts": 150,
      "admins": 5,
      "activeUsers": 950,
      "bannedUsers": 10
    },
    "hosts": {
      "total": 150,
      "pending": 20,
      "approved": 120,
      "rejected": 10,
      "active": 140,
      "banned": 5
    },
    "vehicles": {
      "total": 300,
      "pending": 30,
      "approved": 250,
      "rejected": 20,
      "active": 280,
      "deactivated": 20
    },
    "bookings": {
      "bookingStatus": {
        "total": 500,
        "inProgress": 20,
        "active": 50,
        "completed": 400,
        "canceled": 30
      },
      "paymentStatus": {
        "succeeded": 450,
        "pending": 20,
        "failed": 30
      },
      "revenue": {
        "totalRevenue": 50000,
        "platformFees": 7500,
        "hostPayouts": 42500
      }
    }
  }
}
```

---

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "error": "Error message describing what went wrong"
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation error)
- `401`: Unauthorized (invalid or missing token)
- `403`: Forbidden (not admin)
- `404`: Not Found
- `422`: Unprocessable Entity (business logic error)
- `500`: Internal Server Error

---

## Host Signup Flow

When a user signs up as a host, they can optionally provide:
- `identityNumber`: Their ID number
- `idCardProof`: URL to uploaded ID card image
- `addressProof`: URL to uploaded address proof document

The host account will be created with `hostApprovalStatus: "pending"` and they won't be able to login until an admin approves their account.

---

## Vehicle Submission Flow

When a host adds a vehicle, they should provide:
- `description`: Description of the vehicle
- `legalDocuments`: URL to uploaded legal documents (registration, insurance, etc.)

The vehicle will be created with `approvalStatus: "pending"` and won't be visible to customers until an admin approves it.

---

## Email Notifications

The admin system automatically sends email notifications to users when their host applications or vehicle listings are approved or rejected.

### Host Approval Notifications
- **Approval Email**: Sent when a host application is approved, containing congratulations and next steps
- **Rejection Email**: Sent when a host application is rejected, including the specific rejection reason and guidance for re-submission

### Vehicle Approval Notifications
- **Approval Email**: Sent when a vehicle listing is approved, confirming the vehicle is now live and available for bookings
- **Rejection Email**: Sent when a vehicle listing is rejected, including the rejection reason and instructions for updating the listing

### Email Features
- **Professional Templates**: All emails use branded HTML templates with clear, actionable content
- **Reason Inclusion**: Rejection emails always include the specific reason provided by the admin
- **Error Handling**: Email delivery failures don't affect the approval/rejection process
- **Asynchronous**: Emails are sent in the background for optimal performance
