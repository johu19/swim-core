#!/bin/sh

set -eu

ARTIFACTS_DIR=".artifacts"
PACKAGE_DIR=".lambda-build"
ARTIFACT_PATH="${ARTIFACTS_DIR}/lambda.zip"

mkdir -p "${ARTIFACTS_DIR}"

rm -rf "${PACKAGE_DIR}"
mkdir -p "${PACKAGE_DIR}"

cp package.json package-lock.json "${PACKAGE_DIR}/"
cp -R dist "${PACKAGE_DIR}/dist"
cp -R node_modules "${PACKAGE_DIR}/node_modules"

npm prune --omit=dev --prefix "${PACKAGE_DIR}"

rm -f "${ARTIFACT_PATH}"
(
  cd "${PACKAGE_DIR}"
  zip -qr "../${ARTIFACT_PATH}" .
)

echo "Built Lambda artifact at ${ARTIFACT_PATH}"
