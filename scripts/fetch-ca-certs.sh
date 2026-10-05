#!/usr/bin/env bash
# Copy the test CA, OCSP and TSA certificates out of the ca container into
# certs/, named the way the Central Server upload expects (Phase 1, steps 3-4).
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p certs
for name in ca ocsp tsa; do
  docker cp "ca:/home/ca/CA/certs/${name}.cert.pem" "certs/${name}.pem"
  subject=$(openssl x509 -in "certs/${name}.pem" -noout -subject 2>/dev/null || echo "(openssl not installed)")
  echo "certs/${name}.pem  ${subject}"
done
echo "Upload these from $(pwd)/certs in the Central Server UI."
