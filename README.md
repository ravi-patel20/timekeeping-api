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
- Employee 1: John Doe, Passcode: `1234`, isAdmin: `true`
- Employee 2: Jane Smith, Passcode: `5678`

## Endpoints

### POST /auth/identify-employee
Identify an employee by passcode for the current device session (property-bound). If the employee is an admin, also issues an `admin_session` httpOnly cookie (12 hours).

Request:
```json
{ "passcode": "1234" }
```

Response:
```json
{ "employeeId": "...", "name": "John Doe", "isAdmin": true }
```

### GET /employees
List employees for the current property. Requires `device_session` and `admin_session` cookies.

### GET /reports/employees-hours?start=ISO&end=ISO
Return employee summaries with total hours in the given range. Requires `device_session` and `admin_session` cookies.

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

### POST /clock/in
```json
{
  "passcode": "1234"
}
```

### POST /clock/out
```json
{
  "passcode": "1234"
}
```

### POST /clock/status
```json
{
  "passcode": "1234"
}
```
- Response includes:
  - `nextAction`: "Clock In" or "Clock Out"
  - `currentStatus`: "IN" or "OUT"
  - `hoursWorked`: number of hours worked today

### GET /auth/poll-status
- Query: `deviceId`
- Returns `verified` status. On success, sets a `device_session` cookie and returns `token` and `expiresAt`.

## Configuration

- `FRONTEND_REDIRECT_URL`: used by `/auth/verify` to redirect after clicking magic link.
- `MAGIC_LINK_SUCCESS_BASE_URL`: base URL used to construct the email verification link.

## Notes

- Admin flag: Employees have `isAdmin` (boolean, default `false`). Ensure migration applied.
- Admin sessions: Admins receive an `admin_session` cookie after identification to avoid sending passcodes repeatedly. `/auth/logout` clears both `device_session` and `admin_session`.
