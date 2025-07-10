# QuoteMaster Pro API Specification

## Base URL

`https://api.quotemaster.pro/v1`

## Authentication

All endpoints (except login) require `Authorization: Bearer {token}` header.

### Login

```
POST /auth/login
```

Request:

```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

Response:

```json
{
  "token": "jwt.token.here",
  "user": {
    "id": "user-1",
    "email": "user@example.com",
    "businessInfo": {
      "name": "Business Name",
      "phone": "050-1234567",
      "address": "Business Address",
      "logoUrl": null
    }
  }
}
```

### Logout

```
POST /auth/logout
```

Response: 204 No Content

### Get Current User

```
GET /auth/me
```

Response:

```json
{
  "id": "user-1",
  "email": "user@example.com",
  "businessInfo": {
    "name": "Business Name",
    "phone": "050-1234567",
    "address": "Business Address",
    "logoUrl": null
  }
}
```

## User Profile

### Update Business Info

```
PUT /users/{userId}/business-info
```

Request:

```json
{
  "name": "Updated Business Name",
  "phone": "050-7654321",
  "address": "Updated Address",
  "logoUrl": "data:image/png;base64,..."
}
```

Response: Updated user object

### Upload Logo

```
POST /users/{userId}/logo
Content-Type: multipart/form-data
```

Request: Form with `logo` file field
Response:

```json
{
  "logoUrl": "/uploads/logos/user-1/logo.png"
}
```

## Quotes

### List Quotes

```
GET /quotes
```

Query Params:

- `status`: Filter by status (draft|sent|approved|rejected)
- `limit`: Pagination limit
- `offset`: Pagination offset

Response:

```json
{
  "quotes": [
    {
      "id": "quote-1",
      "quoteNumber": "2024-001",
      "customer": {
        "name": "Customer Name",
        "email": "customer@example.com",
        "phone": "052-1112222",
        "address": "Customer Address"
      },
      "items": [
        {
          "id": "item-1",
          "description": "Service Description",
          "quantity": 1,
          "unitPrice": 1000
        }
      ],
      "notes": "Additional notes",
      "issueDate": "2024-07-15",
      "validUntil": "2024-08-14",
      "taxRate": 17,
      "status": "draft",
      "createdAt": "2024-07-15T10:00:00Z"
    }
  ],
  "total": 1
}
```

### Get Quote

```
GET /quotes/{quoteId}
```

Response: Single quote object

### Create Quote

```
POST /quotes
```

Request:

```json
{
  "customer": {
    "name": "New Customer",
    "email": "new@example.com",
    "phone": "052-3334444",
    "address": "New Address"
  },
  "items": [
    {
      "description": "New Service",
      "quantity": 1,
      "unitPrice": 1500
    }
  ],
  "notes": "New quote notes",
  "validUntil": "2024-08-14",
  "taxRate": 17
}
```

Response: Created quote object

### Update Quote

```
PUT /quotes/{quoteId}
```

Request: Full quote object
Response: Updated quote object

### Generate PDF

```
GET /quotes/{quoteId}/pdf
```

Response: PDF file with Content-Type: application/pdf
