# WinyPay Bangladesh — cURL / Postman Examples

Base URL: `https://bd.gopostman.com`
Production callbacks: `https://jowabuzz.com`

## 1) Deposit request (WinyPay API — server-side only)

```bash
curl -X POST "https://bd.gopostman.com/api/merchant/payin/deposit.php" \
  -H "Content-Type: application/json" \
  -d '{
    "merchant_code": "M10AAF98",
    "secret_key": "YOUR_SECRET_KEY",
    "order_id": "DEP-1718700000000-101",
    "user_id": "101",
    "amount": "500.00",
    "pay_type": "bkash",
    "current_time": "2026-06-18 12:00:00",
    "jump_url": "https://jowabuzz.com/profile/deposit",
    "callback_url": "https://jowabuzz.com/api/payment/winypay/deposit-callback"
  }'
```

Expected success response contains `status=success` and `pay_url`. Redirect user to `pay_url`. **Do not credit balance yet.**

## 2) Deposit callback (simulate WinyPay → Jowabuzz)

```bash
BODY='{"status":"success","amount":"500.00","user_id":"101","pay_type":"bkash","order_id":"DEP-1718700000000-101","transaction_id":"DEP202604180405347755"}'
SIGN=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "YOUR_SECRET_KEY" | awk '{print $2}')

curl -X POST "https://jowabuzz.com/api/payment/winypay/deposit-callback" \
  -H "Content-Type: application/json" \
  -H "X-Callback-Sign: $SIGN" \
  -d "$BODY"
```

Expected:

```json
{"status":"ok","message":"Callback received successfully"}
```

Send the same request twice to verify idempotent handling (balance must not double-credit).

## 3) Withdrawal request (WinyPay API — server-side only)

```bash
curl -X POST "https://bd.gopostman.com/api/merchant/payout/withdrawal.php" \
  -H "Content-Type: application/json" \
  -d '{
    "merchant_code": "M10AAF98",
    "payout_key": "YOUR_PAYOUT_KEY",
    "order_id": "WDR-1718700000000-101",
    "user_id": "101",
    "amount": "500.00",
    "pay_type": "bkash",
    "account_no": "017XXXXXXXX",
    "account_name": "Player Name",
    "current_time": "2026-06-18 12:05:00",
    "callback_url": "https://jowabuzz.com/api/payment/winypay/withdraw-callback"
  }'
```

Immediate `status=success` only means forwarded. Final status comes from callback.

## 4) Withdrawal callback (simulate WinyPay → Jowabuzz)

```bash
BODY='{"status":"success","amount":"500.00","user_id":"101","pay_type":"bkash","order_id":"WDR-1718700000000-101","transaction_id":"WDR202604180001"}'
SIGN=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "YOUR_SECRET_KEY" | awk '{print $2}')

curl -X POST "https://jowabuzz.com/api/payment/winypay/withdraw-callback" \
  -H "Content-Type: application/json" \
  -H "X-Callback-Sign: $SIGN" \
  -d "$BODY"
```

## 5) User deposit via Jowabuzz API (authenticated)

```bash
curl -X POST "https://jowabuzz.com/api/user/deposit-request" \
  -H "Authorization: Bearer USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"amount":500,"method":"bkash","channel":"Personal"}'
```

When admin payment provider is `winypay`, response includes `gateway.payUrl` for redirect.

## 6) Admin WinyPay status

```bash
curl "https://jowabuzz.com/api/admin/winypay/status" \
  -H "Authorization: Bearer ADMIN_JWT"
```

## Environment variables (backend `.env`)

```
WINYPAY_BASE_URL=https://bd.gopostman.com
WINYPAY_MERCHANT_CODE=M10AAF98
WINYPAY_SECRET_KEY=
WINYPAY_PAYOUT_KEY=
WINYPAY_CURRENCY=BDT
WINYPAY_DEPOSIT_CALLBACK_URL=https://jowabuzz.com/api/payment/winypay/deposit-callback
WINYPAY_WITHDRAW_CALLBACK_URL=https://jowabuzz.com/api/payment/winypay/withdraw-callback
WINYPAY_JUMP_URL=https://jowabuzz.com/profile/deposit
```

Set **Admin → General Settings → Payment Gateway → WinyPay** to activate.
