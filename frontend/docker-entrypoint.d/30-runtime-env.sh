#!/bin/sh
set -eu

# Generate runtime config for static frontend assets.
: "${VITE_API_URL:=}"
envsubst '${VITE_API_URL}' \
  < /usr/share/nginx/html/env.template.js \
  > /usr/share/nginx/html/env.js
