# swim-core Backend

`swim-core` is a Lambda-first TypeScript backend for a swim app. The current MVP focuses on swimmer profiles backed by DynamoDB and modeled around authenticated users, with local scripts for DynamoDB startup and Lambda invocation.

## Current capabilities

Implemented Lambda handlers:

- `health`
- `create-profile`
- `get-profile`

Current profile behavior:

- `create-profile` reads `profileId` from JWT claims (`claims.sub`)
- validates the request body
- generates `createdAt` and `updatedAt` in the service layer
- writes the profile to DynamoDB with a conditional insert
- `get-profile` also reads `profileId` from `claims.sub`
- fetches the authenticated user profile from DynamoDB

## Project structure

```text
src/
  functions/
    health.ts
    create-profile.ts
    get-profile.ts
  lib/
    auth.ts
    dynamo.ts
    env.ts
    http.ts
  repositories/
    profile-repository.ts
  services/
    profile-service.ts
  validations/
    create-profile.ts
  scripts/
    create-swim-core-table.ts
    invoke-lambda.ts
    fixtures/
      requests/
      bodies/
```

The profile flow is intentionally separated into layers:

- `function`: Lambda handler and HTTP response mapping
- `validation`: request body parsing and validation
- `service`: business logic like timestamp generation and domain errors
- `repository`: DynamoDB read/write logic

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

## Build

```bash
npm run build
```

## DynamoDB local

Docker Compose starts DynamoDB Local and a one-shot init container that creates the table automatically:

```bash
docker compose up -d
```

DynamoDB Local is exposed at:

```text
http://localhost:8000
```

The init service reads its base AWS settings from `.env` and overrides `DYNAMODB_ENDPOINT` internally to talk to the DynamoDB container over Docker networking.

## Table creation

You can also create the table manually:

```bash
npm run create:table:swim-core
```

The table uses:

- table name: `swim-core`
- partition key: `pk` (`S`)
- sort key: `sk` (`S`)
- billing mode: `PAY_PER_REQUEST`

The creation script waits for DynamoDB to become ready, creates the table if needed, and prints the final table description.

## Current DynamoDB model

The current implemented entity is `Profile`.

Profile item:

- `pk = PROFILE#<profileId>`
- `sk = PROFILE#<profileId>`

Stored profile attributes:

- `profileId`
- `email`
- `firstName`
- `lastName`
- `birthDate`
- `gender`
- `teamName`
- `createdAt`
- `updatedAt`

Important DynamoDB note:

- only key attributes are declared when the table is created
- non-key fields like `email`, `firstName`, and `teamName` are stored on each item when the repository writes data

The profile id is treated as the authenticated user id and is expected to come from Cognito-style JWT claims via `sub`.

## Local Lambda invocation

Run any registered Lambda locally with:

```bash
npm run dev:invoke -- <lambda-name>
```

Examples:

```bash
npm run dev:invoke -- health
npm run dev:invoke -- create-profile
npm run dev:invoke -- get-profile
```

The local invoker builds a mock API Gateway v2 event and pretty-prints the Lambda response.

### Request fixtures

Each Lambda has its own request fixture under `src/scripts/fixtures/requests`:

- `health.json`
- `create-profile.json`
- `get-profile.json`

These fixtures control things like:

- HTTP method
- path
- query parameters
- headers
- mocked JWT claims

### Body fixtures

Only Lambdas that need a request body have a body fixture.

Current body fixtures:

- `src/scripts/fixtures/bodies/create-profile.json`

That file represents the payload sent to `create-profile`. The `profileId` is not part of the body because the handler reads it from `claims.sub`.

## Implemented Lambda behavior

### `health`

- checks DynamoDB connectivity with `ListTables`
- returns `200` when the database is reachable
- returns `503` when the database is unavailable

### `create-profile`

- expects an authenticated `sub` claim
- validates:
  - `email`
  - `firstName`
  - `lastName`
  - `birthDate`
  - `gender`
  - `teamName`
- generates `createdAt` and `updatedAt`
- writes the profile with a conditional insert

Possible responses:

- `201` profile created
- `400` invalid body or missing auth claim
- `409` profile already exists
- `500` backend or DynamoDB error

### `get-profile`

- expects an authenticated `sub` claim
- fetches the profile for that authenticated user

Possible responses:

- `200` profile found
- `400` missing auth claim
- `404` profile not found
- `500` backend or DynamoDB error

## Current limitations

- there is no deployed AWS infrastructure yet
- Cognito is not wired for real authentication yet; local invocation mocks JWT claims
- there are no automated tests yet
- performance entities and swimmer times are not implemented yet

## Useful files

- [package.json](/Users/jgalvis/Desktop/personal_repos/swim-core/package.json)
- [docker-compose.yml](/Users/jgalvis/Desktop/personal_repos/swim-core/docker-compose.yml)
- [.env](/Users/jgalvis/Desktop/personal_repos/swim-core/.env)
- [src/functions/create-profile.ts](/Users/jgalvis/Desktop/personal_repos/swim-core/src/functions/create-profile.ts)
- [src/functions/get-profile.ts](/Users/jgalvis/Desktop/personal_repos/swim-core/src/functions/get-profile.ts)
- [src/repositories/profile-repository.ts](/Users/jgalvis/Desktop/personal_repos/swim-core/src/repositories/profile-repository.ts)
- [src/scripts/invoke-lambda.ts](/Users/jgalvis/Desktop/personal_repos/swim-core/src/scripts/invoke-lambda.ts)
