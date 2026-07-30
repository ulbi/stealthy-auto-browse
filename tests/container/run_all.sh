#!/bin/sh
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
FAILED=0

echo "========================================"
echo "  Stealthy Auto Browse - Container Tests"
echo "========================================"

for test_script in "$SCRIPT_DIR"/test_*.sh; do
  test_name="$(basename "$test_script")"
  echo ""
  echo "--- Running: $test_name ---"

  # Look for a corresponding Dockerfile
  test_base="${test_name%.sh}"
  dockerfile="$SCRIPT_DIR/Dockerfile.$test_base"

  if [ -f "$dockerfile" ]; then
    # Build test image
    docker build -t "stealth-test-$test_base" \
      -f "$dockerfile" "$SCRIPT_DIR" > /dev/null 2>&1

    # Run test with repo mounted
    if docker run --rm -v "$REPO_DIR:/repo:ro" "stealth-test-$test_base"; then
      echo "  ✅ $test_name PASSED"
    else
      echo "  ❌ $test_name FAILED"
      FAILED=1
    fi
  else
    echo "  ⚠️  No Dockerfile.$test_base found, skipping"
  fi
done

echo ""
echo "========================================"
if [ $FAILED -eq 0 ]; then
  echo "  All tests PASSED ✅"
else
  echo "  Some tests FAILED ❌"
fi
echo "========================================"
exit $FAILED
