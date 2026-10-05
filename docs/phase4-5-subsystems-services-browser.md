# Phases 4 and 5 in the browser: subsystems, services and access rights

Click-by-click version of Lesson 6, Phases 4 and 5, for X-Road 7.7.0.
Phase 4 puts each information system on its Security Server. Phase 5 publishes MOHA's two APIs on
ss3 and lets the Grants Portal call them.

**Before you start**

- Checkpoint 3 passed: owners `MOSD` on ss2 and `MOHA` on ss3 are REGISTERED.
- `docker compose ps` shows `moha-registry` Up (ss3 downloads the service descriptions from it).
- Tabs: **ss2** https://ss2.lab:2000, **ss3** https://ss3.lab:3000, **cs** https://cs.lab:4000.
  Login `xrd` / `secret`.

---

## Phase 4: Register the IS subsystems

### Step 1: Add POPULATION-REGISTRY on ss3

ss3 → **Clients** → **Add subsystem** → **Select subsystem** → pick `MOHA / POPULATION-REGISTRY`
(it is in the list because you created it on cs in Phase 1) → **Add**.
When asked "register?" → **Yes**.

### Step 2: Add GRANTS-PORTAL on ss2

ss2 → **Clients** → **Add subsystem** → **Select subsystem** → `MOSD / GRANTS-PORTAL` → **Add** →
register **Yes**.

Both show **Registration in progress**.

### Step 3: Approve on the Central Server

cs → **Management Requests**. You see two *Client registration* requests:

| Security Server | Client |
|---|---|
| `LS-DEV:GOV:MOHA:SS3` | `LS-DEV:GOV:MOHA:POPULATION-REGISTRY` |
| `LS-DEV:GOV:MOSD:SS2` | `LS-DEV:GOV:MOSD:GRANTS-PORTAL` |

**Approve** each. After one to two minutes both subsystems show **REGISTERED** on their servers.

**Why register the subsystem and not just the server:** global configuration records which subsystem
lives on which Security Server. That is how ss2 later knows to send requests for
`MOHA/POPULATION-REGISTRY` to ss3.

### Step 4: Connection type HTTP for GRANTS-PORTAL

ss2 → **Clients** → **GRANTS-PORTAL** → **Internal Servers** tab → **Connection type** → **HTTP** → save.

**Why:** the portal sends plain HTTP to `http://ss2:8080`. The default (HTTPS) would make ss2 refuse
it with `SslAuthenticationFailed`. In a real deployment you would keep HTTPS and give ss2 the
portal's TLS certificate.

### Checkpoint 4

ss2 Clients: `MOSD:GRANTS-PORTAL` REGISTERED, connection type HTTP.
ss3 Clients: `MOHA:POPULATION-REGISTRY` REGISTERED.

---

## Phase 5: Publish the MOHA services on ss3

All on ss3 → **Clients** → **POPULATION-REGISTRY** → **Services** tab.

### Step 5: Add the REST service

**Add REST** →

| Field | Value |
|---|---|
| Type | **OpenAPI 3 Description** |
| URL | `http://moha-registry:8000/openapi.yaml` |
| Service code | `population-api` |

→ **Add**. Expand it. You should see:

- service URL `http://moha-registry:8000/api` (taken from the spec's `servers:` line)
- endpoints `GET /citizens/*` and `GET /citizens/*/vital-status`, plus the catch-all `* **`

### Step 6: Add the SOAP service

**Add WSDL** → `http://moha-registry:8000/soap/population.wsdl` → **Add**.
Expand it: service `verifyIdentity.v1` with URL `http://moha-registry:8000/soap`.

**Why these URLs don't open in your browser:** `moha-registry` is a name that only exists on
`moha-lan`, inside Docker. ss3 is on that network, your browser is not. That is the point: only ss3
can reach the registry.

### Step 7: Enable both

New service descriptions start **disabled** ("Out of order"). Switch the toggle **on** for each row.

### Step 8: Access rights

For **population-api**:
click the service → **Service clients** / **Access rights** → **Add subjects** → search
`GRANTS-PORTAL` → tick `LS-DEV:GOV:MOSD:GRANTS-PORTAL` → **Add selected**.

Repeat for **verifyIdentity**.

(Alternatively: POPULATION-REGISTRY → **Service Clients** tab → **Add subject** → GRANTS-PORTAL →
tick both services.)

**Who decides:** the provider. MOHA chooses on its own ss3 who may call its data. MOSD cannot grant
itself access. Granting at service level allows every endpoint; granting only an endpoint, such as
`vital-status`, is the minimal-disclosure experiment in Lesson 7.

### Checkpoint 5

On ss3 → POPULATION-REGISTRY → Services: both descriptions enabled, and `GRANTS-PORTAL` listed as a
service client of `population-api` and `verifyIdentity`.

**Quick proof from your terminal** (wait one to two minutes after step 8 first):

```bash
curl -H "X-Road-Client: LS-DEV/GOV/MOSD/GRANTS-PORTAL" \
  http://localhost:2080/r1/LS-DEV/GOV/MOHA/POPULATION-REGISTRY/allowedMethods
```

This asks ss2, which asks ss3, "what may GRANTS-PORTAL call?". The answer lists `population-api`
with its two endpoints.

---

## Command-line equivalents (admin API, `https://localhost:4000/api/v1` inside each container)

| Step | Server | API call |
|---|---|---|
| 1, 2 | ss3, ss2 | `POST /clients` then `PUT /clients/{id}/register` |
| 3 | cs | `POST /management-requests/{id}/approval` |
| 4 | ss2 | `PATCH /clients/LS-DEV:GOV:MOSD:GRANTS-PORTAL` `{"connection_type":"HTTP"}` |
| 5 | ss3 | `POST /clients/{id}/service-descriptions` `{"type":"OPENAPI3","url":...,"rest_service_code":"population-api"}` |
| 6 | ss3 | `POST /clients/{id}/service-descriptions` `{"type":"WSDL","url":...}` |
| 7 | ss3 | `PUT /service-descriptions/{id}/enable` |
| 8 | ss3 | `POST /services/{client}:{service}/service-clients` `{"items":[{"id":"LS-DEV:GOV:MOSD:GRANTS-PORTAL","service_client_type":"SUBSYSTEM"}]}` |
