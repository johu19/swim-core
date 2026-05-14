# Finance Manager Backend

Serverless NestJS backend for a finance manager application using:

- API Gateway
- AWS Lambda
- NestJS 11
- Node.js 24
- DynamoDB

## Architecture baseline

This repo is set up for a Lambda-first workflow:

- `src/bootstrap.ts` creates and configures the Nest app
- `src/main.ts` runs the app locally as a normal HTTP server
- `src/lambda.ts` exposes the AWS Lambda handler
- `src/app.controller.ts` provides a minimal health endpoint at `/api/health`

The idea is to keep one shared Nest bootstrap and support both:

- local development with `npm run start:dev`
- serverless deployment through the compiled Lambda handler

## Local development

```bash
npm install
npm run start:dev
```

The local API will be available at:

```text
http://localhost:3000/api/health
```

## Docker

Build the image:

```bash
docker build -t finance-manager-api .
```

Run it locally:

```bash
docker run --rm -p 3000:3000 finance-manager-api
```

Then hit:

```text
http://localhost:3000/api/health
```

This image runs the compiled Nest app through `dist/main.js`. That makes it useful for local container testing and CI, while the Lambda-specific entrypoint remains `dist/lambda.js` for AWS or LocalStack integration.

## Docker Compose with LocalStack

This repo also includes a local AWS-shaped development setup:

- `app` installs dependencies, builds the Nest app, and packages a Lambda zip artifact
- `localstack` provisions DynamoDB, Lambda, and API Gateway
- `deployer` watches the zip artifact and updates the LocalStack Lambda code
- `proxy` exposes a friendlier local dev URL in front of LocalStack
- API requests hit LocalStack API Gateway first, then invoke the Lambda handler from `dist/lambda.js`

Start it with:

```bash
docker compose up --build
```

Once LocalStack finishes its init hook, test the API Gateway path with:

```bash
curl http://localhost:4566/restapis/<api-id>/local/_user_request_/api/health
```

The exact URL is also printed by the LocalStack bootstrap script in the container logs.

For a friendlier local URL, use the dev proxy:

```bash
curl http://localhost:8080/api/health
```

How it works:

- [docker-compose.yml](/Users/jgalvis/Desktop/personal_repos/finance-manager/docker-compose.yml:1) mounts the repo into both containers
- [watch-lambda-package.sh](/Users/jgalvis/Desktop/personal_repos/finance-manager/scripts/watch-lambda-package.sh:1) rebuilds `dist/` and packages `.artifacts/lambda.zip`
- [watch-localstack-lambda.sh](/Users/jgalvis/Desktop/personal_repos/finance-manager/scripts/watch-localstack-lambda.sh:1) updates the LocalStack Lambda whenever the artifact changes
- [10-bootstrap.sh](/Users/jgalvis/Desktop/personal_repos/finance-manager/localstack/init/10-bootstrap.sh:1) creates the DynamoDB table, Lambda function, API Gateway resources, and deployment
- [nginx.dev.conf.template](/Users/jgalvis/Desktop/personal_repos/finance-manager/proxy/nginx.dev.conf.template:1) forwards `localhost:8080` to the generated LocalStack API Gateway URL
- Lambda code is deployed as a zip artifact instead of using LocalStack hot-reload mounts, which avoids the Docker Desktop path-sharing issue on macOS

## Scripts

```bash
npm run build
npm run lint
npm run test
npm run test:e2e
```

## Current scope

This repo intentionally starts small. The default Nest starter code has been removed so we can grow the backend around real finance domains instead of tutorial placeholders.

Next logical modules to add:

- auth
- users
- accounts
- transactions
- budgets
- categories

## Deployment note

The Lambda entrypoint is the compiled `dist/lambda.js` handler export:

```text
handler
```

Your infrastructure layer can point API Gateway events to that Lambda handler while keeping Nest as the application framework behind it.
