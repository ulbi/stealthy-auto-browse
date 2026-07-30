#!/bin/sh
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
FAILED=0

echo "========================================"
echo "  Stealthy Auto Browse - Container Tests"
echo "========================================"

find_tests() {
  local search_dir="$1"
  find "$search_dir" -name 'test_*.sh' -type f
}

for test_script in $(find_tests "$SCRIPT_DIR") $(find_tests "$REPO_DIR" -path '*/tests/container/test_*.sh'); do
  test_name="$(basename "$test_script")"
  test_dir="$(dirname "$test_script")"
  test_base="${test_name%.sh}"
  dockerfile="$test_dir/Dockerfile.$test_base"

  echo ""
  echo "--- Running: $test_name ($(realpath --relative-to=$REPO_DIR $test_script)) ---"

  if [ -f "$dockerfile" ]; then
    docker build -t "stealth-test-$test_base" \
      -f "$dockerfile" "$test_dir" > /dev/null 2>&1

    if docker run --rm -v "$REPO_DIR:/repo:ro" "stealth-test-$test_base"; then
      echo "  ✅ $test_name PASSED"
    else
      echo "  ❌ $test_name FAILED"
      FAILED=1
    fi
  else
    echo "  ⚠️  No Dockerfile.$test_base found at $dockerfile, skipping"
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
