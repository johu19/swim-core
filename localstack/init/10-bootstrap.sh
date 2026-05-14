#!/bin/bash

set -euo pipefail

export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-us-east-1}"

FUNCTION_NAME="finance-manager-api"
API_NAME="finance-manager-api-local"
STAGE_NAME="local"
TABLE_NAME="finance-manager-local"
WORKSPACE_ROOT="/workspace"
LAMBDA_HANDLER="dist/lambda.handler"
STATE_DIR="${WORKSPACE_ROOT}/.localstack"
ARTIFACT_PATH="${WORKSPACE_ROOT}/.artifacts/lambda.zip"

mkdir -p "${STATE_DIR}"

echo "Waiting for Lambda deployment artifact..."
until [ -f "${ARTIFACT_PATH}" ]; do
  sleep 2
done

echo "Ensuring DynamoDB table exists..."
if ! awslocal dynamodb describe-table --table-name "${TABLE_NAME}" >/dev/null 2>&1; then
  awslocal dynamodb create-table \
    --table-name "${TABLE_NAME}" \
    --attribute-definitions \
      AttributeName=pk,AttributeType=S \
      AttributeName=sk,AttributeType=S \
    --key-schema \
      AttributeName=pk,KeyType=HASH \
      AttributeName=sk,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST >/dev/null
fi

echo "Ensuring Lambda function exists..."
if ! awslocal lambda get-function --function-name "${FUNCTION_NAME}" >/dev/null 2>&1; then
  awslocal lambda create-function \
    --function-name "${FUNCTION_NAME}" \
    --runtime nodejs22.x \
    --role arn:aws:iam::000000000000:role/lambda-role \
    --handler "${LAMBDA_HANDLER}" \
    --timeout 30 \
    --memory-size 512 \
    --zip-file "fileb://${ARTIFACT_PATH}" >/dev/null
fi

REST_API_ID="$(awslocal apigateway get-rest-apis --query "items[?name=='${API_NAME}'].id | [0]" --output text)"
if [ "${REST_API_ID}" = "None" ] || [ -z "${REST_API_ID}" ]; then
  REST_API_ID="$(awslocal apigateway create-rest-api --name "${API_NAME}" --query id --output text)"
fi

ROOT_RESOURCE_ID="$(awslocal apigateway get-resources --rest-api-id "${REST_API_ID}" --query "items[?path=='/'].id | [0]" --output text)"
PROXY_RESOURCE_ID="$(awslocal apigateway get-resources --rest-api-id "${REST_API_ID}" --query "items[?pathPart=='{proxy+}'].id | [0]" --output text)"

if [ "${PROXY_RESOURCE_ID}" = "None" ] || [ -z "${PROXY_RESOURCE_ID}" ]; then
  PROXY_RESOURCE_ID="$(awslocal apigateway create-resource \
    --rest-api-id "${REST_API_ID}" \
    --parent-id "${ROOT_RESOURCE_ID}" \
    --path-part "{proxy+}" \
    --query id \
    --output text)"
fi

LAMBDA_URI="arn:aws:apigateway:${AWS_DEFAULT_REGION}:lambda:path/2015-03-31/functions/arn:aws:lambda:${AWS_DEFAULT_REGION}:000000000000:function:${FUNCTION_NAME}/invocations"

awslocal apigateway put-method \
  --rest-api-id "${REST_API_ID}" \
  --resource-id "${ROOT_RESOURCE_ID}" \
  --http-method ANY \
  --authorization-type NONE >/dev/null 2>&1 || true

awslocal apigateway put-integration \
  --rest-api-id "${REST_API_ID}" \
  --resource-id "${ROOT_RESOURCE_ID}" \
  --http-method ANY \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "${LAMBDA_URI}" >/dev/null 2>&1 || true

awslocal apigateway put-method \
  --rest-api-id "${REST_API_ID}" \
  --resource-id "${PROXY_RESOURCE_ID}" \
  --http-method ANY \
  --authorization-type NONE >/dev/null 2>&1 || true

awslocal apigateway put-integration \
  --rest-api-id "${REST_API_ID}" \
  --resource-id "${PROXY_RESOURCE_ID}" \
  --http-method ANY \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "${LAMBDA_URI}" >/dev/null 2>&1 || true

awslocal lambda add-permission \
  --function-name "${FUNCTION_NAME}" \
  --statement-id apigateway-root \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:${AWS_DEFAULT_REGION}:000000000000:${REST_API_ID}/*/*/" >/dev/null 2>&1 || true

awslocal lambda add-permission \
  --function-name "${FUNCTION_NAME}" \
  --statement-id apigateway-proxy \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:${AWS_DEFAULT_REGION}:000000000000:${REST_API_ID}/*/*/*" >/dev/null 2>&1 || true

awslocal apigateway create-deployment \
  --rest-api-id "${REST_API_ID}" \
  --stage-name "${STAGE_NAME}" >/dev/null

echo "LocalStack API ready:"
echo "http://localhost:4566/restapis/${REST_API_ID}/${STAGE_NAME}/_user_request_/api/health"
printf "%s" "${REST_API_ID}" > "${STATE_DIR}/api-id"
