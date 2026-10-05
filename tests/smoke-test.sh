#!/usr/bin/env bash
# End-to-end checks through the consumer Security Server (ss2, host port 2080).
# Run from the project folder after finishing the setup guide.
set -u
SS=${SS:-http://localhost:2080}
CLIENT="LS-DEV/GOV/MOSD/GRANTS-PORTAL"
PROVIDER="LS-DEV/GOV/MOHA/POPULATION-REGISTRY"
DIR="$(cd "$(dirname "$0")" && pwd)"
pass=0; fail=0

check() { # name, expected substring, actual output
  if grep -q -- "$2" <<<"$3"; then echo "PASS  $1"; pass=$((pass+1));
  else echo "FAIL  $1"; echo "      expected to contain: $2"; echo "      got: $(head -c 400 <<<"$3")"; fail=$((fail+1)); fi
}

echo "== Using consumer Security Server $SS as $CLIENT"

out=$(curl -s -H "X-Road-Client: $CLIENT" "$SS/r1/$PROVIDER/listMethods")
check "REST metaservice listMethods shows population-api" '"population-api"' "$out"

out=$(curl -s -H "X-Road-Client: $CLIENT" "$SS/r1/$PROVIDER/allowedMethods")
check "REST metaservice allowedMethods (access rights granted)" '"population-api"' "$out"

out=$(curl -s -H "X-Road-Client: $CLIENT" -H "X-Road-UserId: smoke-test" \
      "$SS/r1/$PROVIDER/population-api/citizens/150319480002")
check "REST getCitizen returns Thabo Letsie" '"surname":"Letsie"' "$out"

out=$(curl -s -H "X-Road-Client: $CLIENT" "$SS/r1/$PROVIDER/population-api/citizens/050519500004/vital-status")
check "REST getVitalStatus returns DECEASED" '"DECEASED"' "$out"

out=$(curl -s -o /dev/null -w '%{http_code}' -H "X-Road-Client: $CLIENT" \
      "$SS/r1/$PROVIDER/population-api/citizens/999999999999")
check "REST unknown citizen -> 404 from registry" '404' "$out"

out=$(curl -s -H "Content-Type: text/xml; charset=utf-8" --data-binary "@$DIR/verifyIdentity.xml" "$SS/")
check "SOAP verifyIdentity returns match=true" '<pop:match>true</pop:match>' "$out"

out=$(docker compose exec -T mosd-portal python -c \
  "import urllib.request; urllib.request.urlopen('http://moha-registry:8000/health', timeout=3)" 2>&1)
check "Portal cannot bypass X-Road to reach the registry" 'Error' "$out"

echo "== $pass passed, $fail failed"
[ "$fail" -eq 0 ]
