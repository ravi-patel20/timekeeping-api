# timekeeping-api

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Push schema to Neon or local PostgreSQL:
   ```
   npx prisma db push
   ```

3. Seed database:
   ```
   npx tsx prisma/seed.ts
   ```

4. Start the dev server:
   ```
   npm run start
   ```

## Seeded Test Values

- Property ID: `ABC123`
- Property Email: `property@example.com`
- Employee 1: John Doe, Passcode: `1234`
- Employee 2: Jane Smith, Passcode: `5678`

## Endpoints

### POST /auth/request-magic-link
```json
{
  "propertyId": "ABC123",
  "deviceId": "some-device-id"
}
```

### POST /clock
```json
{
  "deviceId": "some-device-id",
  "passcode": "1234"
}
```

### GET /auth/poll-status
- Query: `deviceId`
- Returns `verified` status. On success, sets a `device_session` cookie and returns `token` and `expiresAt`.

## Configuration

- `FRONTEND_REDIRECT_URL`: used by `/auth/verify` to redirect after clicking magic link.
- `MAGIC_LINK_SUCCESS_BASE_URL`: base URL used to construct the email verification link.
