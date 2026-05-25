# swim-core Backend

`swim-core` is a Lambda-first TypeScript backend for a swim app. The current MVP is focused on authenticated swimmer profiles stored in DynamoDB, with local DynamoDB startup, local Lambda invocation, a shared Lambda runner, Zod-based validation, and unit tests for the profile handlers.

## Current features

Implemented Lambda handlers:

- `health`
- `create-profile`
- `get-profile`

Current profile flow:

- authentication data is read from mocked or real Cognito-style JWT claims
- the shared Lambda runner extracts auth, parses request data, validates inputs, and handles errors
- `create-profile` validates the body with Zod and creates a profile for the authenticated user
- `get-profile` fetches the authenticated user profile

## Architecture

The current Lambda flow is intentionally layered:

- `functions`: Lambda entrypoints and success responses
- `lambda runner`: shared API Gateway wrapper
- `validations`: Zod schemas and input types
- `services`: business rules and orchestration
- `repositories`: DynamoDB access
- `error handler`: centralized error-to-response mapping

The shared runner is responsible for:

- extracting Cognito auth claims
- parsing body JSON
- validating body, path, and query inputs with Zod
- passing normalized inputs into the handler
- catching errors and delegating to `handleError`

## Environment

Local configuration lives in the root `.env` file:

```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=local
AWS_SECRET_ACCESS_KEY=local
DYNAMODB_ENDPOINT=http://localhost:8000
SWIM_CORE_TABLE_NAME=swim-core
```

## Install

```bash
npm install
```

## Scripts

Build:

```bash
npm run build
```

Create the DynamoDB table manually:

```bash
npm run create:table:swim-core
```

Invoke a Lambda locally:

```bash
npm run dev:invoke -- health
npm run dev:invoke -- create-profile
npm run dev:invoke -- get-profile
```

Run unit tests:

```bash
npm test
```

## Local DynamoDB

Start DynamoDB Local with Docker Compose:

```bash
docker compose up -d
```

DynamoDB Local is exposed at:

```text
http://localhost:8000
```

The `dynamodb-init` service waits for DynamoDB to be ready and then runs the table creation script automatically.

## DynamoDB table design

Current table:

- table name: `swim-core`
- partition key: `pk` (`S`)
- sort key: `sk` (`S`)
- billing mode: `PAY_PER_REQUEST`

Current implemented entity: `Profile`

Profile key shape:

- `pk = PROFILE#<cognitoId>`
- `sk = PROFILE#<cognitoId>`

Stored attributes:

- `profileId`
- `email`
- `firstName`
- `lastName`
- `birthDate`
- `gender`
- `teamName`
- `createdAt`
- `updatedAt`

Important note:

- at the Lambda/service boundary, the authenticated user identity is treated as `cognitoId`
- in the current repository record shape, that value is persisted as `profileId`

## Validation

`create-profile` uses `zod` for body validation.

Current body schema:

- `firstName`
- `lastName`
- `birthDate`
- `gender`
- `teamName`

The full service input extends that body with auth-derived fields:

- `cognitoId`
- `email`

## Auth model

The current backend expects Cognito-style JWT claims in the API Gateway event:

- `sub` -> authenticated user id
- `email` -> authenticated user email

For local invocation, these claims are mocked in request fixtures.

## Local Lambda invocation fixtures

Each Lambda has its own request fixture.

Body fixtures are separate and only used where needed:

- `create-profile` currently has a dedicated body fixture

The local invoker builds a mock API Gateway v2 event and prints the Lambda response in a readable JSON format.

## Handler behavior

### `health`

- checks DynamoDB connectivity with `ListTables`
- returns `200` when the database is reachable
- returns `503` when the database is unavailable

### `create-profile`

- requires authenticated claims
- requires email to be present in claims
- validates body with Zod
- checks for an existing profile
- writes a new profile with generated `createdAt` and `updatedAt`

Typical responses:

- `201` profile created
- `400` invalid body
- `401` missing auth claims
- `400` profile already exists
- `500` unexpected backend error

### `get-profile`

- requires authenticated claims
- reads the profile for the authenticated user

Typical responses:

- `200` profile found
- `401` missing auth claims
- `404` profile not found
- `500` unexpected backend error

## Tests

There are unit tests for the two profile Lambdas:

- `create-profile`
- `get-profile`

These tests mock interactions below the Lambda layer so DynamoDB is not touched. They verify:

- auth claim extraction
- body validation behavior
- success response shape
- error mapping behavior

## Current limitations

- AWS deployment infrastructure is not implemented yet
- Cognito is not wired for real hosted auth yet; local invocation uses mocked claims
- only the profile domain is implemented so far
- performance recording and swimmer times are not implemented yet
