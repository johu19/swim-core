#!/bin/sh

set -eu

FUNCTION_NAME="${FUNCTION_NAME:-finance-manager-api}"
ARTIFACT_PATH="${ARTIFACT_PATH:-/workspace/.artifacts/lambda.zip}"
AWS_ENDPOINT_URL="${AWS_ENDPOINT_URL:-http://localstack:4566}"
LAST_HASH=""

until [ -f "${ARTIFACT_PATH}" ]; do
  sleep 2
done

until aws --endpoint-url="${AWS_ENDPOINT_URL}" lambda get-function --function-name "${FUNCTION_NAME}" >/dev/null 2>&1; do
  sleep 2
done

while true; do
  CURRENT_HASH="$(sha1sum "${ARTIFACT_PATH}" | awk '{print $1}')"

  if [ "${CURRENT_HASH}" != "${LAST_HASH}" ]; then
    aws --endpoint-url="${AWS_ENDPOINT_URL}" lambda update-function-code \
      --function-name "${FUNCTION_NAME}" \
      --zip-file "fileb://${ARTIFACT_PATH}" >/dev/null
    LAST_HASH="${CURRENT_HASH}"
    echo "Updated LocalStack Lambda code for ${FUNCTION_NAME}"
  fi

  sleep 2
done
