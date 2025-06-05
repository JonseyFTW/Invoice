# Invoice Management System API Documentation

## Base URL

```
Production: https://yourdomain.com/api
Development: http://localhost:5000/api
```

## Authentication

All API endpoints (except auth endpoints) require authentication using JWT tokens.

### Headers

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Error Responses

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **General API**: 100 requests per 15 minutes per IP
- **Authentication**: 5 requests per 15 minutes per IP
- **File uploads**: 10 uploads per minute per IP
- **Email sending**: 50 emails per hour per IP
- **PDF generation**: 20 PDFs per 5 minutes per IP

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1640995200
```

---

## Authentication Endpoints

### POST /auth/register

Register a new user account.

**Request Body:**

```json
{
  "username": "string (3-50 chars, alphanumeric + underscore)",
  "email": "string (valid email)",
  "password": "string (min 6 chars, must contain uppercase, lowercase, number)"
}
```

**Response (201):**

```json
{
  "message": "User created successfully",
  "token": "jwt_token_string",
  "user": {
    "id": "uuid",
    "username": "string",
    "email": "string"
  }
}
```

**Errors:**

- `400`: Validation errors
- `409`: User already exists

### POST /auth/login

Authenticate user and receive JWT token.

**Request Body:**

```json
{
  "email": "string",
  "password": "string"
}
```

**Response (200):**

```json
{
  "message": "Login successful",
  "token": "jwt_token_string",
  "user": {
    "id": "uuid",
    "username": "string",
    "email": "string"
  }
}
```

**Errors:**

- `400`: Validation errors
- `401`: Invalid credentials

### GET /auth/profile

Get current user profile.

**Headers Required:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "user": {
    "id": "uuid",
    "username": "string",
    "email": "string",
    "createdAt": "ISO8601 date"
  }
}
```

---

## Customer Endpoints

### GET /customers

Get paginated list of customers.

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)
- `search`: Search by name or email

**Response (200):**

```json
{
  "customers": [
    {
      "id": "uuid",
      "name": "string",
      "email": "string",
      "phone": "string",
      "billingAddress": "string",
      "createdAt": "ISO8601 date",
      "updatedAt": "ISO8601 date"
    }
  ],
  "totalPages": "number",
  "currentPage": "number",
  "totalCount": "number"
}
```

### GET /customers/:id

Get specific customer by ID.

**Path Parameters:**

- `id`: Customer UUID

**Response (200):**

```json
{
  "customer": {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "phone": "string",
    "billingAddress": "string",
    "createdAt": "ISO8601 date",
    "updatedAt": "ISO8601 date"
  }
}
```

**Errors:**

- `404`: Customer not found

### POST /customers

Create a new customer.

**Request Body:**

```json
{
  "name": "string (required, 1-100 chars)",
  "email": "string (optional, valid email)",
  "phone": "string (optional)",
  "billingAddress": "string (optional, max 500 chars)"
}
```

**Response (201):**

```json
{
  "customer": {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "phone": "string",
    "billingAddress": "string",
    "createdAt": "ISO8601 date",
    "updatedAt": "ISO8601 date"
  }
}
```

### PUT /customers/:id

Update existing customer.

**Path Parameters:**

- `id`: Customer UUID

**Request Body:** Same as POST /customers

**Response (200):** Same as GET /customers/:id

### DELETE /customers/:id

Delete customer.

**Path Parameters:**

- `id`: Customer UUID

**Response (200):**

```json
{
  "message": "Customer deleted successfully"
}
```

---

## Invoice Endpoints

### GET /invoices

Get paginated list of invoices.

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)
- `status`: Filter by status (Unpaid, Paid, Overdue, Draft)
- `customerId`: Filter by customer UUID
- `search`: Search by invoice number

**Response (200):**

```json
{
  "invoices": [
    {
      "id": "uuid",
      "invoiceNumber": "string",
      "customerId": "uuid",
      "customer": {
        "id": "uuid",
        "name": "string",
        "email": "string"
      },
      "invoiceDate": "YYYY-MM-DD",
      "dueDate": "YYYY-MM-DD",
      "taxRate": "decimal",
      "status": "string",
      "paymentDate": "YYYY-MM-DD",
      "notes": "string",
      "lineItems": [
        {
          "id": "uuid",
          "description": "string",
          "quantity": "decimal",
          "unitPrice": "decimal",
          "lineTotal": "decimal"
        }
      ],
      "subtotal": "decimal",
      "taxAmount": "decimal",
      "grandTotal": "decimal",
      "createdAt": "ISO8601 date",
      "updatedAt": "ISO8601 date"
    }
  ],
  "totalPages": "number",
  "currentPage": "number",
  "totalCount": "number"
}
```

### GET /invoices/:id

Get specific invoice by ID.

**Path Parameters:**

- `id`: Invoice UUID

**Response (200):** Single invoice object (same structure as list item)

### POST /invoices

Create a new invoice.

**Request Body:**

```json
{
  "customerId": "uuid (required)",
  "invoiceDate": "YYYY-MM-DD (required)",
  "dueDate": "YYYY-MM-DD (required, must be after invoiceDate)",
  "taxRate": "decimal (optional, 0-100, default: 0)",
  "notes": "string (optional, max 1000 chars)",
  "lineItems": [
    {
      "description": "string (required, 1-500 chars)",
      "quantity": "decimal (required, > 0)",
      "unitPrice": "decimal (required, >= 0)"
    }
  ]
}
```

**Response (201):** Created invoice object

### PUT /invoices/:id

Update existing invoice.

**Path Parameters:**

- `id`: Invoice UUID

**Request Body:** Same as POST /invoices

**Response (200):** Updated invoice object

### DELETE /invoices/:id

Delete invoice.

**Path Parameters:**

- `id`: Invoice UUID

**Response (200):**

```json
{
  "message": "Invoice deleted successfully"
}
```

### PATCH /invoices/:id/mark-paid

Mark invoice as paid.

**Path Parameters:**

- `id`: Invoice UUID

**Response (200):**

```json
{
  "message": "Invoice marked as paid",
  "invoice": {
    "id": "uuid",
    "status": "Paid",
    "paymentDate": "YYYY-MM-DD"
  }
}
```

### GET /invoices/:id/pdf

Download invoice as PDF.

**Path Parameters:**

- `id`: Invoice UUID

**Response (200):**

- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="invoice-{number}.pdf"`
- Binary PDF data

### POST /invoices/:id/send-email

Send invoice via email to customer.

**Path Parameters:**

- `id`: Invoice UUID

**Response (200):**

```json
{
  "message": "Invoice sent successfully"
}
```

**Errors:**

- `400`: Customer email not found

---

## Expense Endpoints

### GET /expenses

Get paginated list of expenses.

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)
- `invoiceId`: Filter by linked invoice UUID

**Response (200):**

```json
{
  "expenses": [
    {
      "id": "uuid",
      "vendor": "string",
      "description": "string",
      "amount": "decimal",
      "expenseDate": "YYYY-MM-DD",
      "receiptImagePath": "string",
      "parsedData": "object",
      "invoiceId": "uuid",
      "invoice": {
        "id": "uuid",
        "invoiceNumber": "string",
        "customer": {
          "id": "uuid",
          "name": "string"
        }
      },
      "createdAt": "ISO8601 date",
      "updatedAt": "ISO8601 date"
    }
  ],
  "totalPages": "number",
  "currentPage": "number",
  "totalCount": "number"
}
```

### GET /expenses/:id

Get specific expense by ID.

**Path Parameters:**

- `id`: Expense UUID

**Response (200):** Single expense object

### POST /expenses

Create a new expense with optional receipt upload.

**Content-Type:** `multipart/form-data`

**Form Fields:**

- `vendor`: string (required, 1-100 chars)
- `description`: string (required, 1-1000 chars)
- `amount`: decimal (required, >= 0)
- `expenseDate`: YYYY-MM-DD (required)
- `invoiceId`: UUID (optional)
- `receipt`: file (optional, max 10MB, JPEG/PNG/PDF)

**Response (201):**

```json
{
  "expense": {
    "id": "uuid",
    "vendor": "string",
    "description": "string",
    "amount": "decimal",
    "expenseDate": "YYYY-MM-DD",
    "receiptImagePath": "string",
    "parsedData": "object",
    "invoiceId": "uuid"
  },
  "parsedData": {
    "merchant": "string",
    "date": "YYYY-MM-DD",
    "total": "decimal",
    "lineItems": [
      {
        "description": "string",
        "quantity": "decimal",
        "unitPrice": "decimal",
        "lineTotal": "decimal"
      }
    ]
  }
}
```

### PUT /expenses/:id

Update existing expense.

**Path Parameters:**

- `id`: Expense UUID

**Request:** Same as POST /expenses

**Response (200):** Updated expense object

### DELETE /expenses/:id

Delete expense.

**Path Parameters:**

- `id`: Expense UUID

**Response (200):**

```json
{
  "message": "Expense deleted successfully"
}
```

---

## Recurring Template Endpoints

### GET /recurring

Get paginated list of recurring templates.

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)

**Response (200):**

```json
{
  "templates": [
    {
      "id": "uuid",
      "customerId": "uuid",
      "customer": {
        "id": "uuid",
        "name": "string",
        "email": "string"
      },
      "templateName": "string",
      "baseInvoiceData": "object",
      "taxRate": "decimal",
      "frequency": "WEEKLY|MONTHLY|QUARTERLY|YEARLY",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "occurrences": "number",
      "nextRunDate": "YYYY-MM-DD",
      "isActive": "boolean",
      "completedOccurrences": "number",
      "createdAt": "ISO8601 date",
      "updatedAt": "ISO8601 date"
    }
  ],
  "totalPages": "number",
  "currentPage": "number",
  "totalCount": "number"
}
```

### POST /recurring

Create new recurring template.

**Request Body:**

```json
{
  "customerId": "uuid (required)",
  "templateName": "string (required, 1-100 chars)",
  "baseInvoiceData": {
    "lineItems": [
      {
        "description": "string",
        "quantity": "decimal",
        "unitPrice": "decimal"
      }
    ],
    "notes": "string",
    "paymentTerms": "number (days)"
  },
  "taxRate": "decimal (0-100, default: 0)",
  "frequency": "WEEKLY|MONTHLY|QUARTERLY|YEARLY (required)",
  "startDate": "YYYY-MM-DD (required)",
  "endDate": "YYYY-MM-DD (optional, must be after startDate)",
  "occurrences": "number (optional, min: 1)"
}
```

### POST /recurring/:id/generate

Manually generate invoice from template.

**Path Parameters:**

- `id`: Template UUID

**Response (201):**

```json
{
  "message": "Invoice generated successfully",
  "invoice": {
    "id": "uuid",
    "invoiceNumber": "string"
  }
}
```

---

## Reports Endpoints

### GET /reports/summary

Get business summary statistics.

**Query Parameters:**

- `from`: Start date (YYYY-MM-DD, optional)
- `to`: End date (YYYY-MM-DD, optional)

**Response (200):**

```json
{
  "totalInvoices": "number",
  "totalRevenue": "decimal",
  "totalExpenses": "decimal",
  "totalProfit": "decimal",
  "avgRevenuePerInvoice": "decimal",
  "unpaidInvoicesCount": "number"
}
```

### GET /reports/monthly

Get monthly revenue and expense data for the last 12 months.

**Response (200):**

```json
[
  {
    "month": "YYYY-MM",
    "revenue": "decimal",
    "expenses": "decimal",
    "profit": "decimal",
    "invoiceCount": "number"
  }
]
```

### GET /reports/top-customers

Get top customers by revenue.

**Query Parameters:**

- `limit`: Number of customers (default: 5, max: 50)

**Response (200):**

```json
[
  {
    "id": "uuid",
    "name": "string",
    "totalRevenue": "decimal",
    "invoiceCount": "number"
  }
]
```

---

## System Endpoints

### GET /health

System health check endpoint.

**Response (200):**

```json
{
  "status": "OK",
  "timestamp": "ISO8601 date",
  "services": {
    "database": "healthy|unhealthy|unknown",
    "email": "healthy|unhealthy|unknown",
    "gemini": "healthy|unavailable|unhealthy"
  }
}
```

**Response (503):** Same structure with `status: "DEGRADED"`

### GET /rate-limit-status

Get current rate limit status for the requesting IP.

**Response (200):**

```json
{
  "ip": "string",
  "currentCount": "number",
  "limit": "number",
  "windowMs": "number",
  "remaining": "number",
  "resetTime": "number (timestamp)"
}
```

---

## Error Codes

### Authentication Errors

- `AUTH_001`: Invalid or missing JWT token
- `AUTH_002`: Token expired
- `AUTH_003`: Invalid credentials
- `AUTH_004`: Account deactivated

### Validation Errors

- `VAL_001`: Required field missing
- `VAL_002`: Invalid field format
- `VAL_003`: Field value out of range
- `VAL_004`: Invalid file type
- `VAL_005`: File size too large

### Business Logic Errors

- `BIZ_001`: Due date must be after invoice date
- `BIZ_002`: Cannot delete customer with invoices
- `BIZ_003`: Invoice already paid
- `BIZ_004`: Customer email required for sending
- `BIZ_005`: Insufficient permissions

### System Errors

- `SYS_001`: Database connection error
- `SYS_002`: Email service unavailable
- `SYS_003`: PDF generation failed
- `SYS_004`: File upload failed
- `SYS_005`: External service error

### Rate Limiting Errors

- `RATE_001`: General rate limit exceeded
- `RATE_002`: Authentication rate limit exceeded
- `RATE_003`: Upload rate limit exceeded
- `RATE_004`: Email rate limit exceeded

---

## Examples

### Create Invoice with Line Items

```bash
curl -X POST "https://api.example.com/api/invoices" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "123e4567-e89b-12d3-a456-426614174000",
    "invoiceDate": "2024-01-15",
    "dueDate": "2024-02-15",
    "taxRate": 8.25,
    "notes": "Thank you for your business!",
    "lineItems": [
      {
        "description": "Plumbing repair service",
        "quantity": 1,
        "unitPrice": 150.00
      },
      {
        "description": "Parts and materials",
        "quantity": 1,
        "unitPrice": 75.00
      }
    ]
  }'
```

### Upload Receipt with Expense

```bash
curl -X POST "https://api.example.com/api/expenses" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "vendor=Home Depot" \
  -F "description=Tools and supplies" \
  -F "amount=89.99" \
  -F "expenseDate=2024-01-15" \
  -F "receipt=@receipt.jpg"
```

### Filter Invoices by Status

```bash
curl -X GET "https://api.example.com/api/invoices?status=Unpaid&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Webhooks (Future Enhancement)

The system can be configured to send webhooks for various events:

### Events

- `invoice.created`
- `invoice.paid`
- `invoice.overdue`
- `customer.created`
- `expense.created`

### Webhook Payload

```json
{
  "event": "invoice.paid",
  "timestamp": "ISO8601 date",
  "data": {
    "invoice": {
      "id": "uuid",
      "invoiceNumber": "string"
    }
  }
}
```

---

## SDK Support

Official SDKs are available for:

- JavaScript/Node.js
- Python
- PHP
- C#

Example usage (JavaScript):

```javascript
import InvoiceAPI from "@invoice-system/sdk";

const client = new InvoiceAPI({
  baseUrl: "https://api.example.com/api",
  token: "your-jwt-token",
});

const invoice = await client.invoices.create({
  customerId: "customer-uuid",
  invoiceDate: "2024-01-15",
  dueDate: "2024-02-15",
  lineItems: [
    {
      description: "Service",
      quantity: 1,
      unitPrice: 100.0,
    },
  ],
});
```
