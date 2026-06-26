# SOFTAPI SDR Integration Guide for Cursor

## Read this first

This file replaces the need to attach the PDF in Cursor. Copy this file into the root of the Jowabuzz project as:

`SOFTAPI_INTEGRATION_GUIDE.md`

Then give Cursor this instruction:

> Read `SOFTAPI_INTEGRATION_GUIDE.md` completely before writing code. Implement the SoftAPI SDR provider integration exactly according to this guide. Do not break any existing project feature.

---

# Final Cursor Integration Prompt

You are working on my existing Jowabuzz gaming platform.

I need to integrate a new game provider:

- Provider name: SoftAPI
- Provider code: SDR
- API version: v1
- Mode: Seamless
- Environment: test
- Status: Active
- API Base URL: `https://767fafapi.live/api/v1`
- Username: `Jowabuzzofficial@gmail.com`
- Currency to use: `BDT`
- Language: `bn`

Important: The provider supports multiple currencies and confirmed that for my platform I must pass `BDT` in the currency parameter. Do not send USDT in the API payload.

---

## Critical safety rules

Before coding, analyze the whole project structure.

Do not delete, replace, or break any existing:

- Oracle integration
- Existing game providers
- Payment gateway
- Deposit system
- Withdraw system
- Wallet system
- Affiliate system
- Agent system
- Admin panel
- User panel
- Authentication/session system
- Existing database tables
- Existing APIs
- Existing UI
- Existing routes/controllers/services/models
- Existing business logic

Add SoftAPI as a new modular provider integration only.

If any existing file must be modified, make the smallest safe change and explain why.

---

## Environment variables

Do not hardcode token or secret in source code. Add these to `.env` and `.env.example`.

```env
SOFTAPI_BASE_URL=https://767fafapi.live/api/v1
SOFTAPI_PROVIDER=SDR
SOFTAPI_TOKEN=785103d6bb36532dad159078d6b1f16f
SOFTAPI_SECRET=8245907d5882a746927243835ffb35c6
SOFTAPI_CURRENCY=BDT
SOFTAPI_LANGUAGE=bn
SOFTAPI_ENV=test
SOFTAPI_RETURN_URL=https://your-domain.com/game/return
SOFTAPI_CALLBACK_URL=https://your-domain.com/api/softapi/callback
```

For local development, use the local backend callback URL if needed.

---

# Official SoftAPI documentation summary

The SoftAPI Launch Game API starts third-party game sessions and sends game result callbacks to our server.

The flow is:

1. Player clicks Play Game.
2. Our server prepares player/session payload.
3. Our server encrypts the payload with AES-256-ECB.
4. Our server Base64 encodes the encrypted payload.
5. Our server calls the SoftAPI launch endpoint.
6. SoftAPI returns a launch URL.
7. Frontend redirects/opens the game URL.
8. After bet/win, SoftAPI sends a POST callback to our server.
9. Our server updates wallet balance.
10. Our server returns callback response.

---

# Launch Game API

## Endpoint

```http
GET https://767fafapi.live/api/v1
```

The request must include:

```text
?payload={encrypted_payload}&token={SOFTAPI_TOKEN}
```

## Launch payload

Create payload with these fields:

```json
{
  "user_id": "USER_ID_OR_USERNAME",
  "balance": 500,
  "game_uid": "GAME_CODE_OR_UID",
  "token": "SOFTAPI_TOKEN",
  "timestamp": 1696329392000,
  "return": "https://your-domain.com/game/return",
  "callback": "https://your-domain.com/api/softapi/callback",
  "currency_code": "BDT",
  "language": "bn"
}
```

Important:

- `user_id` must identify the logged-in user.
- `balance` must be the user's current wallet balance.
- `game_uid` must be the selected game/provider game ID.
- `token` must come from `.env`.
- `timestamp` must be current time in milliseconds.
- `return` must be the frontend return URL.
- `callback` must be the backend public callback URL.
- `currency_code` must be `BDT`.
- `language` should be `bn`.

If the provider expects `currency` instead of `currency_code`, use the exact field supported by the documentation/provider. Prefer `currency_code=BDT` because the documentation uses `currency_code`.

---

# Encryption requirement

SoftAPI documentation uses:

- Algorithm: AES-256-ECB
- Secret key length: exactly 32 characters
- Output: Base64 encoded encrypted string

Implementation requirement:

1. JSON encode the payload.
2. Encrypt JSON string using AES-256-ECB with `SOFTAPI_SECRET`.
3. Use raw encrypted data.
4. Base64 encode encrypted result.
5. URL encode Base64 string when sending in query parameter.

Important:

- Validate that `SOFTAPI_SECRET` length is exactly 32 characters.
- Do not log the raw secret.
- Do not log the full encrypted payload.
- Mask token/secret in logs.

---

# Launch success response

Expected success format:

```json
{
  "code": 0,
  "msg": "Game launched successfully",
  "data": {
    "url": "https://igamingapis.live/launch?de=abcdef12345&game_name=Sweet+Magic"
  }
}
```

If `code === 0` and `data.url` exists:

- Return that URL to frontend.
- Frontend redirects or opens the game.

If response is invalid:

- Do not crash.
- Return safe error to frontend.
- Save error log without exposing token/secret.

---

# Backend launch route

Create a protected route similar to:

```http
POST /api/softapi/launch
```

or use the existing game launch route pattern if the project already has one.

Request body:

```json
{
  "game_uid": "GAME_ID"
}
```

Backend must:

1. Verify user is logged in.
2. Get fresh user balance from database.
3. Build payload.
4. Encrypt payload.
5. Call SoftAPI.
6. Return launch URL.

Response to frontend:

```json
{
  "success": true,
  "url": "GAME_LAUNCH_URL"
}
```

Error response:

```json
{
  "success": false,
  "message": "Unable to launch game. Please try again."
}
```

---

# Callback API

## Route

Create:

```http
POST /api/softapi/callback
```

## Callback payload

SoftAPI sends:

```json
{
  "game_uid": "3978",
  "game_round": "12928475122950747877",
  "member_account": "23213",
  "bet_amount": 50,
  "win_amount": 30,
  "timestamp": "2025-10-14 16:41:45"
}
```

Fields:

- `game_uid`: game session/game ID
- `game_round`: unique round ID
- `member_account`: user ID
- `bet_amount`: amount bet
- `win_amount`: amount won
- `timestamp`: game time

---

# Callback wallet logic

Documentation formula:

```text
new_balance = old_balance - bet_amount + win_amount
```

Example:

```text
old_balance = 500
bet_amount = 50
win_amount = 30
new_balance = 500 - 50 + 30 = 480
```

Rules:

1. Find user by `member_account`.
2. Convert `bet_amount` and `win_amount` to numbers.
3. Validate values are not negative.
4. Use a database transaction/lock if available.
5. Prevent duplicate processing using `game_round`.
6. Save transaction log.
7. Update wallet.
8. Update turnover/VIP using bet amount.
9. Return callback response.

---

# Duplicate callback protection

Very important.

If the same `game_round` already exists for provider `SOFTAPI/SDR`, do not update balance again.

Return a safe successful callback response so provider does not keep retrying.

Suggested unique key:

```text
provider + game_round
```

or

```text
provider + game_uid + game_round + member_account
```

---

# Callback response

Documentation response:

```json
{
  "credit_amount": 20,
  "timestamp": 1696329392000
}
```

Where:

```text
credit_amount = max(0, bet_amount - win_amount)
```

Examples:

- Bet 50, Win 30 → credit_amount 20
- Bet 50, Win 70 → credit_amount 0

Return this exact style unless existing project/provider requires extra fields.

---

# Transaction log

Create or reuse a game transaction table/service.

Each callback should save:

```text
provider: SOFTAPI
provider_code: SDR
user_id
member_account
game_uid
game_round
bet_amount
win_amount
credit_amount
balance_before
balance_after
currency: BDT
status: processed / duplicate / failed
raw_payload
created_at
updated_at
```

Do not store token/secret in DB.

---

# Balance safety

Rules:

- User balance must not become invalid.
- Use decimal-safe handling.
- If user not found, return safe error response.
- If insufficient balance for bet, handle according to existing game provider pattern.
- Do not allow double update.
- Do not update balance outside a DB transaction if the project supports transactions.

---

# Turnover integration

After valid callback:

- Add `bet_amount` to existing turnover system.
- Follow existing project turnover rules.
- Do not create a separate conflicting turnover system.
- Only update turnover once per unique game round.

---

# VIP integration

After valid callback:

- Add VIP EXP/progress according to existing VIP system.
- Usually VIP progress should be based on bet turnover.
- Do not break existing VIP thresholds/rewards.
- Only update VIP once per unique game round.

---

# Frontend integration

Use existing game card/play button UI.

When user clicks Play:

1. Show loading.
2. Call backend launch route.
3. If success and URL returned, open/redirect to game URL.
4. If error, show user-friendly message.

Do not redesign existing UI.

Do not change unrelated layout.

---

# Admin/private debug

If adding debug/status route:

- Must be admin-only.
- Never public.
- Never show token/secret.
- Mask sensitive values.

Example:

```json
{
  "provider": "SOFTAPI",
  "code": "SDR",
  "env": "test",
  "baseUrl": "https://767fafapi.live/api/v1",
  "currency": "BDT",
  "status": "configured"
}
```

---

# Error handling

Handle:

- Missing env
- Invalid secret length
- Missing game_uid
- User not logged in
- User not found
- Invalid provider response
- Provider timeout
- Callback invalid JSON
- Missing callback fields
- Duplicate callback
- DB transaction error
- Wallet update failure
- Turnover update failure
- VIP update failure

Use safe responses and logs.

---

# Security requirements

Do not log:

- Full token
- Full secret
- Full encrypted payload
- User sensitive data unnecessarily

Use masked logs:

```text
token: 785103****f16f
secret: 824590****5c6
```

Callback route should validate payload fields and source where possible.

---

# Recommended backend structure

Follow existing project structure. If no structure exists, use something like:

```text
backend/
  routes/
    softapiRoutes.js
  controllers/
    softapiController.js
  services/
    softapiService.js
    softapiCryptoService.js
  models/
    gameTransactionModel.js
  migrations/
    softapi_game_transactions.sql
```

But do not force this structure if the project already has its own pattern.

---

# Suggested implementation functions

```text
encryptSoftApiPayload(payload)
buildSoftApiLaunchPayload(user, game_uid)
launchSoftApiGame(user, game_uid)
handleSoftApiCallback(payload)
processSoftApiRound(payload)
saveSoftApiTransaction(data)
updateWalletForSoftApiRound(data)
updateTurnoverForSoftApiRound(data)
updateVipForSoftApiRound(data)
```

---

# Testing checklist

After implementation, run these tests:

## Launch tests

1. Logged-in user clicks game.
2. Backend sends encrypted payload.
3. Provider returns `code: 0`.
4. Frontend receives launch URL.
5. Game opens.

## Callback tests

Test callback with:

```json
{
  "game_uid": "3978",
  "game_round": "TEST_ROUND_001",
  "member_account": "23213",
  "bet_amount": 50,
  "win_amount": 30,
  "timestamp": "2025-10-14 16:41:45"
}
```

Expected:

```text
balance decreases by 20
credit_amount returns 20
transaction saved
turnover updated by 50
VIP updated by 50
```

## Win test

```json
{
  "game_uid": "3978",
  "game_round": "TEST_ROUND_002",
  "member_account": "23213",
  "bet_amount": 50,
  "win_amount": 100,
  "timestamp": "2025-10-14 16:41:45"
}
```

Expected:

```text
balance increases by 50
credit_amount returns 0
```

## Duplicate test

Send `TEST_ROUND_001` again.

Expected:

```text
balance does not change again
transaction marked duplicate or ignored safely
callback still returns safe response
```

## Invalid callback test

Missing required field.

Expected:

```text
no wallet update
safe error response
error logged
```

---

# Final completion report required

After implementation, provide a report:

1. Files created
2. Files modified
3. Routes added
4. ENV variables added
5. Database migration/table added
6. Launch test result
7. Callback test result
8. Duplicate callback test result
9. Balance update test result
10. Turnover update test result
11. VIP update test result
12. Any risk or pending provider confirmation

---

# Final instruction to Cursor

Read this full guide before coding.

Implement SoftAPI SDR as a new modular provider.

Use BDT currency.

Use AES-256-ECB encryption.

Use callback formula:

```text
new_balance = old_balance - bet_amount + win_amount
```

Do not break existing Jowabuzz features.

Build and test the project after implementation.
