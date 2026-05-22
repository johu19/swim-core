# Finance Manager Backend

This repo starts with a single TypeScript Lambda function so the Lambda execution model stays easy to understand before adding more AWS pieces.

## Current shape

- `src/functions/health.ts`: the Lambda handler
- `src/lib/dynamo.ts`: a tiny DynamoDB client/ping helper
- `src/lib/http.ts`: a tiny JSON response helper
- `src/scripts/invoke-health.ts`: a local runner that invokes the handler with a mock API Gateway event

The handler uses `@types/aws-lambda`, so the event, context, and response types line up with AWS naming and shapes.

## Install

```bash
npm install
```

## Build

```bash
npm run build
```

## Local DynamoDB

For local development, this repo includes Docker Compose for:

- DynamoDB Local
- a DynamoDB browser UI

Start it with:

```bash
docker compose up -d
```

That exposes DynamoDB at:

```text
http://localhost:8000
```

The DynamoDB UI is available at:

```text
http://localhost:8001
```

The Compose file uses:

- `amazon/dynamodb-local:latest`
- `gerardojunior/dynamodb-admin:latest`

AWS’s current Docker Compose example also uses that official `latest` tag for DynamoDB Local, and the verified Docker Hub image was updated recently. Sources:
- [AWS docs](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.DownloadingAndRunning.html)
- [Docker Hub image](https://hub.docker.com/r/amazon/dynamodb-local)
- [DynamoDB admin image](https://hub.docker.com/r/gerardojunior/dynamodb-admin)

## Create the transaction table

To create the local DynamoDB table named `transaction`, run:

```bash
npm run create:table:transaction
```

The script uses:

- table name: `transaction`
- partition key: `pk` (`S`)
- sort key: `sk` (`S`)
- billing mode: `PAY_PER_REQUEST`

It also prints the table description after creation, or tells you if the table already exists.

## Invoke locally

```bash
npm run build
npm run dev:invoke:health
```

The local invoke script defaults to:

- `AWS_REGION=us-east-1`
- `AWS_ACCESS_KEY_ID=local`
- `AWS_SECRET_ACCESS_KEY=local`
- `DYNAMODB_ENDPOINT=http://localhost:8000`

So if Docker Compose is running DynamoDB Local, the health Lambda will also test database connectivity.

## Health flow

The current `health` Lambda does three things:

1. receives a mock API Gateway event from the local runner
2. sends a small DynamoDB request (`ListTables`) as a connectivity check
3. returns a Lambda-style JSON response

If DynamoDB is reachable, the function returns:

```json
{
  "statusCode": 200,
  "headers": {
    "content-type": "application/json"
  },
  "body": "{\"status\":\"ok\",\"service\":\"finance-manager-api\",\"database\":{\"ok\":true,\"endpoint\":\"http://localhost:8000\"}}"
}
```

If DynamoDB is down or unreachable, the function returns a degraded health response with `503`:

```json
{
  "statusCode": 503,
  "headers": {
    "content-type": "application/json"
  },
  "body": "{\"status\":\"degraded\",\"service\":\"finance-manager-api\",\"database\":{\"ok\":false,\"endpoint\":\"http://localhost:8000\",\"error\":\"...\"}}"
}
```
