# Finance Manager Backend

This repo starts with a single TypeScript Lambda function so the Lambda execution model stays easy to understand.

## Current shape

- `src/functions/health.ts`: the Lambda handler
- `src/scripts/invoke-health.ts`: a tiny local runner that invokes the handler with a mock API Gateway event

The handler now uses `@types/aws-lambda`, so the event, context, and response types line up with AWS naming and shapes.

## Install

```bash
npm install
```

## Build

```bash
npm run build
```

## Invoke locally

```bash
npm run build
npm run dev:invoke:health
```

Expected response:

```json
{
  "statusCode": 200,
  "headers": {
    "content-type": "application/json"
  },
  "body": "{\"status\":\"ok\",\"service\":\"finance-manager-api\"}"
}
```
