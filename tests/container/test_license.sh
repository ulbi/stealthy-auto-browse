#!/bin/sh
set -e

echo "=== Test: LICENSE ==="

if [ ! -f /repo/LICENSE ]; then
  echo "FAIL: LICENSE file not found"
  exit 1
fi

if grep -q "MIT License" /repo/LICENSE; then
  echo "PASS: LICENSE is MIT"
  exit 0
fi

echo "FAIL: LICENSE is NOT MIT"
exit 1
