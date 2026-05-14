#!/bin/sh

set -eu

LAST_HASH=""

npm ci
npm run build -- --watch &

while true; do
  if [ -f dist/lambda.js ]; then
    CURRENT_HASH="$(
      {
        find dist -type f | sort
        printf '%s\n' package.json package-lock.json
      } | xargs cat | sha1sum | awk '{print $1}'
    )"

    if [ "${CURRENT_HASH}" != "${LAST_HASH}" ]; then
      ./scripts/build-lambda-package.sh
      LAST_HASH="${CURRENT_HASH}"
    fi
  fi

  sleep 2
done
