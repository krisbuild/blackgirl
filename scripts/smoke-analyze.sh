#!/usr/bin/env bash
# Send one photo through the local /api/analyze route and print the result.
# Usage: npm run smoke -- path/to/selfie.jpg [http://localhost:3000]
# With YOUCAM_MODE=live this spends API units on the first call; repeats are cached.
set -euo pipefail
IMG="${1:?usage: npm run smoke -- path/to/selfie.jpg [base-url]}"
BASE="${2:-http://localhost:3000}"
curl -sS -w '\nHTTP %{http_code}\n' -F "image=@${IMG}" "${BASE}/api/analyze"
