// Builds docs/XRoad-Lab-REST-and-SOAP-Services.docx: how the two services work end to end.
// Run from docs/report-src:  node build-services.js
const path = require('path');
const { newDoc, save, C, Paragraph, TextRun, BorderStyle } = require('./lib');

const k = newDoc();
const { add, P, note, H1, H2, H3, bullets, steps, code, table, callout, figure } = k;

// ---------------------------------------------------------------------------
add(
  new Paragraph({ children: [], spacing: { before: 2000 } }),
  new Paragraph({ children: [new TextRun({ text: 'X-ROAD LOCAL LAB', bold: true, size: 28, color: C.blue })], spacing: { after: 120 } }),
  new Paragraph({ children: [new TextRun({ text: 'REST and SOAP in X-Road', bold: true, size: 60, color: C.navy })], spacing: { after: 120 } }),
  new Paragraph({ children: [new TextRun({ text: 'How MOHA’s two services are described, published, protected, called and combined in the LS-DEV lab', size: 28, color: C.grey })],
    spacing: { after: 500 }, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: C.blue, space: 12 } } }),
  ...table(['', ''], [
    ['Author', 'Motlatsi Victor Mpahane, student attachee'],
    ['Scope', 'The REST service `population-api` and the SOAP service `verifyIdentity` v1 of `LS-DEV/GOV/MOHA/POPULATION-REGISTRY`, and how the MOSD Grants Portal uses them'],
    ['Based on', 'The lab’s own code: `moha-registry/app/main.py`, `openapi.yaml`, `population.wsdl`, `mosd-portal/app/xroad.py`, `mosd-portal/app/main.py`, `tests/verifyIdentity.xml`'],
    ['X-Road version', '7.7.0'],
  ], [0.22, 0.78], true),
  note('Prepared with Claude (Anthropic). All identifiers and citizen data are synthetic.'),
  k.pageBreak(),
  ...k.toc(),
);

// ---------------------------------------------------------------------------
add(H1('1. The big picture'),
  P('The lab uses **both** of X-Road’s message styles side by side, for one business purpose: deciding whether an Old Age Pension applicant qualifies. MOHA’s Population Registry offers its data through two interfaces, and X-Road publishes both under **one subsystem**, `LS-DEV/GOV/MOHA/POPULATION-REGISTRY`.'),
  ...table(['Service code', 'Protocol', 'Operation', 'What it answers', 'What it discloses'], [
    ['`population-api`', 'REST (JSON over HTTP)', '`GET /citizens/{id}` (getCitizen)', 'The full citizen record', 'Everything: names, birth date, sex, district, village, citizenship, alive/deceased, death date'],
    ['', '', '`GET /citizens/{id}/vital-status` (getVitalStatus)', 'Alive or deceased', 'Only the status (and death date)'],
    ['`verifyIdentity` v1', 'SOAP (XML envelope over HTTP POST)', 'verifyIdentity', '“Do these details match?”', '`found`, `match`, which fields mismatched, vital status. **Never the record itself.**'],
  ], [0.15, 0.15, 0.24, 0.18, 0.28]),
  ...callout('why', 'Why both?', ['Real governments run both kinds of systems: older ones, and X-Road’s original protocol, use SOAP; newer ones use REST. X-Road treats them as equals: same certificates, same signing, same access control, same logging. Only the **envelope** differs, that is, how the caller says *who it is* and *what it wants*.']),
  P('Neither application ever talks to the other directly:'),
  ...code(['mosd-portal ──HTTP──► ss2 ══ signed, mutual TLS ══► ss3 ──HTTP──► moha-registry', ' (MOSD LAN)          (consumer SS)          (provider SS)         (MOHA LAN)']),
  ...figure('restsoap', 'The same journey in two envelopes: where the caller’s identity and the target service travel in REST and in SOAP.', 1400, 760),
);

// ---------------------------------------------------------------------------
add(H1('2. Where the services come from: the provider side'),
  H2('2.1 The registry implements them'),
  P('In `moha-registry/app/main.py`:'),
  ...code([
    'REST  GET  /api/citizens/{id}               → get_citizen()',
    'REST  GET  /api/citizens/{id}/vital-status  → get_vital_status()',
    'SOAP  POST /soap                            → soap_endpoint()   (accepts only <pop:verifyIdentity>)',
  ]),
  P('It also serves the two **service descriptions** that ss3 imports: `/openapi.yaml` for REST and `/soap/population.wsdl` for SOAP.'),
  H2('2.2 ss3 reads the descriptions (Phase 5)'),
  P('X-Road does not guess anything. It takes everything from these two files:'),
  ...table(['ss3 needs to know', 'From the OpenAPI file (REST)', 'From the WSDL (SOAP)'], [
    ['Service name', 'You type it: `population-api`', 'The operation name: `verifyIdentity`'],
    ['Version', '(none)', '`<xrd:version>v1</xrd:version>`'],
    ['Where to forward', '`servers: url: http://moha-registry:8000/api`', '`<soap:address location="http://moha-registry:8000/soap"/>`'],
    ['Finer-grained units', 'Each path becomes an **endpoint**: `GET /citizens/*`, `GET /citizens/*/vital-status`', '(none: access is per operation)'],
  ], [0.22, 0.4, 0.38]),
  P('`{nationalId}` becomes `*` because path parameters turn into wildcards; that is why ss3 lists `GET /citizens/*`.'),
  ...callout('why', 'Why the WSDL declares the X-Road header elements inline', ['The WSDL defines `xrd:client`, `xrd:service`, `xrd:id`, `xrd:userId` and `xrd:protocolVersion` itself instead of importing X-Road’s schema from the internet. That way ss3 can read the WSDL with no internet access.']),
  H2('2.3 MOHA grants access (Phase 5, step 5.4)'),
  P('On ss3, GRANTS-PORTAL was given rights to `population-api` (all its endpoints) and to `verifyIdentity`. The **provider** decides; MOSD cannot grant itself anything. REST rights can be narrowed to a **single endpoint**; experiment 12.2 in the Browser Guide does exactly that.'),
  H2('2.4 How ss2 finds the service'),
  P('ss3 keeps the service list itself and answers questions about it (section 6). Global configuration only tells ss2 *where* POPULATION-REGISTRY lives: on the Security Server SS3, at address `ss3`.'),
);

// ---------------------------------------------------------------------------
add(H1('3. A REST call, hop by hop'),
  H2('3.1 What the portal sends to ss2'),
  P('From `rest_get()` in `mosd-portal/app/xroad.py`:'),
  ...code([
    'GET http://ss2:8080/r1/LS-DEV/GOV/MOHA/POPULATION-REGISTRY/population-api/citizens/150319480002',
    'X-Road-Client: LS-DEV/GOV/MOSD/GRANTS-PORTAL',
    'X-Road-UserId: officer.ntsane',
    'Accept: application/json',
  ]),
  P('The URL carries the routing:'),
  ...code([
    '/r1 / LS-DEV/GOV/MOHA/POPULATION-REGISTRY / population-api / citizens/150319480002',
    ' │     └──────────── provider subsystem ┘   └ service code ┘ └ path inside the API ┘',
    ' └ X-Road REST protocol, version 1',
  ]),
  ...bullets([
    '**Who is calling:** the HTTP **header** `X-Road-Client`.',
    '**What is wanted:** the **URL**: provider, service code, path.',
    '**The officer:** `X-Road-UserId`, recorded for accountability, not used for access control.',
  ]),
  H2('3.2 What happens in between'),
  ...steps([
    '**ss2** checks that GRANTS-PORTAL is a client registered on this server and that the connection type (HTTP) matches. It **signs** the request with MOSD’s sign key, looks up POPULATION-REGISTRY in global configuration (on ss3), and opens **mutual TLS** to ss3.',
    '**ss3** checks the signature and the certificates (OCSP), then the access right: may GRANTS-PORTAL call `population-api`, and this exact **method + path** (`GET /citizens/*`)? It also checks that the service is enabled.',
    '**ss3 rewrites the URL:** it removes the X-Road prefix and appends the rest to the service URL from the OpenAPI file, adding X-Road headers the registry can trust because ss3 verified them:',
  ]),
  ...code([
    'GET http://moha-registry:8000/api/citizens/150319480002',
    'X-Road-Client: LS-DEV/GOV/MOSD/GRANTS-PORTAL   ← verified by ss3',
    'X-Road-Id: LS-DEV-…                            ← unique message ID',
    'X-Road-UserId: officer.ntsane',
  ]),
  P('**4. The registry:** `get_citizen()` reads the `X-Road-*` headers (`rest_xroad_meta()`), writes an audit row and returns JSON.'),
  P('**5. Back the same way:** ss3 signs the response, ss2 verifies it, and both write the exchange to their message logs with a TSA time-stamp. The portal receives the JSON plus headers such as `X-Road-Id` and `X-Road-Request-Hash`.'),
  H2('3.3 Errors in REST'),
  ...table(['Case', 'What comes back', 'How the portal treats it'], [
    ['The registry has no such citizen', 'HTTP 404 with `{"error": "NOT_FOUND", …}`, passed through **unchanged**', 'A normal answer (smoke-test check 5)'],
    ['X-Road refuses (access, disabled, unknown…)', '`X-Road-Error` header and JSON `{"type": "Server.ServerProxy.AccessDenied", "message": …}`', 'An error with a “Fix:” hint (`rest_get()`, lines 114–125)'],
  ], [0.28, 0.42, 0.30]),
);

// ---------------------------------------------------------------------------
add(H1('4. A SOAP call, hop by hop'),
  H2('4.1 What the portal sends to ss2'),
  P('From `build_verify_envelope()`; the same message is in `tests/verifyIdentity.xml`:'),
  ...code([
    'POST http://ss2:8080/          ← the server root: no routing information in the URL',
    'Content-Type: text/xml; charset=utf-8',
    '',
    '<soapenv:Envelope …>',
    '  <soapenv:Header>',
    '    <xrd:client id:objectType="SUBSYSTEM">         ← WHO is calling',
    '      LS-DEV / GOV / MOSD / GRANTS-PORTAL',
    '    </xrd:client>',
    '    <xrd:service id:objectType="SERVICE">          ← WHAT is wanted',
    '      LS-DEV / GOV / MOHA / POPULATION-REGISTRY / verifyIdentity / v1',
    '    </xrd:service>',
    '    <xrd:id>3868363e-…</xrd:id>                    ← message ID (the portal makes a UUID)',
    '    <xrd:userId>officer.ntsane</xrd:userId>',
    '    <xrd:protocolVersion>4.0</xrd:protocolVersion> ← X-Road SOAP protocol version',
    '  </soapenv:Header>',
    '  <soapenv:Body>',
    '    <pop:verifyIdentity>                           ← the actual question',
    '      <pop:nationalId>150319480002</pop:nationalId>',
    '      <pop:firstName>Thabo</pop:firstName>',
    '      <pop:surname>Letsie</pop:surname>',
    '      <pop:dateOfBirth>1948-03-15</pop:dateOfBirth>',
    '    </pop:verifyIdentity>',
    '  </soapenv:Body>',
    '</soapenv:Envelope>',
  ]),
  P('**Everything is inside the message.** The `xrd:` header does the job of REST’s URL and `X-Road-Client` header, and the identifiers are structured XML elements instead of a slash-separated string.'),
  H2('4.2 What happens in between'),
  P('The checks are the same as for REST: signing, mutual TLS, OCSP, access rights, enabled service. The differences:'),
  ...bullets([
    '**ss3 forwards the whole envelope** to the WSDL’s address, `http://moha-registry:8000/soap`. There is no URL rewriting.',
    '**Access is per operation:** `verifyIdentity` as a whole. SOAP has no endpoints.',
  ]),
  H2('4.3 The registry’s answer'),
  P('`soap_endpoint()` in `moha-registry/app/main.py`:'),
  ...steps([
    'Reads the `xrd:` header for the audit log (`_identifier_to_str()` turns the XML identifier back into `LS-DEV/GOV/MOSD/GRANTS-PORTAL`).',
    'Compares each supplied field with the record, ignoring upper/lower case and skipping fields the caller left out.',
    'Replies:',
  ]),
  ...code([
    '<soapenv:Header> …the request header, copied back UNCHANGED… </soapenv:Header>',
    '<soapenv:Body>',
    '  <pop:verifyIdentityResponse>',
    '    <pop:nationalId>150319480002</pop:nationalId>',
    '    <pop:found>true</pop:found>',
    '    <pop:match>true</pop:match>',
    '    <pop:vitalStatus>ALIVE</pop:vitalStatus>',
    '  </pop:verifyIdentityResponse>',
    '</soapenv:Body>',
  ]),
  ...callout('why', 'Why the header is echoed', ['X-Road’s SOAP protocol requires the provider to copy the request’s `xrd:` header back unchanged. ss3 checks that the response header matches the request, so a response cannot be swapped for another message. That is what `resp_env.append(header)` (line 214) does.']),
  P('With a wrong surname the answer is `match=false` with `<pop:mismatchedFields>surname</pop:mismatchedFields>`: the caller learns **that** something is wrong and **which field**, but **not the correct value**.'),
  H2('4.4 Errors in SOAP'),
  P('Registry errors and X-Road errors both come back as a **SOAP Fault**, for example `<faultcode>Server.ServerProxy.AccessDenied</faultcode>`. The portal reads `faultcode` to choose its “Fix:” hint (`verify_identity()`, line 196).'),
);

// ---------------------------------------------------------------------------
add(H1('5. REST and SOAP side by side'),
  ...table(['', 'REST (`population-api`)', 'SOAP (`verifyIdentity` v1)'], [
    ['Where the portal sends it', '`http://ss2:8080/r1/<provider>/<service>/<path>`', '`http://ss2:8080/` (POST)'],
    ['Caller identity', '`X-Road-Client` HTTP header', '`<xrd:client>` in the SOAP header'],
    ['Target service', 'In the URL', '`<xrd:service>` in the SOAP header'],
    ['Message ID', 'Created by ss2, returned as `X-Road-Id`', 'Created by the client (`<xrd:id>`)'],
    ['Version', '(none in this lab)', '`<xrd:serviceVersion>v1` (from the WSDL’s `xrd:version`)'],
    ['Service description', 'OpenAPI 3 YAML', 'WSDL'],
    ['Access-rights granularity', 'Service **or single endpoint** (method + path)', 'Service (operation)'],
    ['ss3 forwards to', 'Service URL + remaining path', 'WSDL `soap:address`'],
    ['Provider must echo the header', 'No', '**Yes**'],
    ['X-Road error format', '`X-Road-Error` header + JSON `type` / `message`', 'SOAP Fault `faultcode` / `faultstring`'],
    ['Signing, mutual TLS, OCSP, time-stamped logs', 'Yes', 'Yes, identical'],
  ], [0.28, 0.36, 0.36]),
);

// ---------------------------------------------------------------------------
add(H1('6. Asking X-Road about services: metaservices'),
  P('Security Servers also answer questions *about* services. The smoke test uses the REST ones:'),
  ...code([
    '# Which REST services does POPULATION-REGISTRY offer?',
    'curl -H "X-Road-Client: LS-DEV/GOV/MOSD/GRANTS-PORTAL" \\',
    '  http://localhost:2080/r1/LS-DEV/GOV/MOHA/POPULATION-REGISTRY/listMethods',
    '',
    '# Which of them may GRANTS-PORTAL call, down to the endpoints?',
    'curl -H "X-Road-Client: LS-DEV/GOV/MOSD/GRANTS-PORTAL" \\',
    '  http://localhost:2080/r1/LS-DEV/GOV/MOHA/POPULATION-REGISTRY/allowedMethods',
  ]),
  P('`allowedMethods` is answered by ss3, so it is a quick way to check access rights from the **consumer’s** side. SOAP has equivalents (`listMethods`, `allowedMethods`, `getWsdl`) that are called with an envelope.'),
);

// ---------------------------------------------------------------------------
add(H1('7. How the portal combines them'),
  H2('7.1 The four buttons'),
  ...table(['Button', 'Calls', 'Why this combination'], [
    ['**Verify identity**', 'SOAP only', 'Confirms the applicant is who they claim, without MOSD seeing the record'],
    ['**Look up record**', 'REST `GET /citizens/{id}`', 'The full record, when the officer genuinely needs it'],
    ['**Vital status only**', 'REST `GET /citizens/{id}/vital-status`', 'The minimum needed for “is this person alive?”'],
    ['**Check pension eligibility**', 'SOAP **then** REST getCitizen', 'Both answers combined into one decision'],
  ], [0.26, 0.32, 0.42]),
  H2('7.2 The pension decision'),
  P('`assess_pension()` in `mosd-portal/app/main.py`:'),
  ...steps([
    'Did either call fail? → **UNABLE**; the trace shows why.',
    'SOAP says `found=false` → **REJECT**, “Not in the population register”. This is decided from the SOAP answer alone; the REST 404 is then expected.',
    'Otherwise **four** conditions must all hold:',
  ]),
  ...table(['Condition', 'Comes from'], [
    ['Identity details match the register', 'SOAP `match`'],
    ['Recorded as alive', 'REST `vitalStatus`'],
    ['Mosotho citizen (citizenship `LS`)', 'REST `citizenship`'],
    ['Age 70 or over (demo rule `PENSION_AGE`)', 'REST `dateOfBirth`'],
  ], [0.55, 0.45]),
  ...callout('why', 'The design point', ['SOAP answers “is this person who they say they are?” without disclosing data. REST provides the facts the rule needs. Endpoint-level access lets a less trusted caller be given `vital-status` only. **The less a caller needs, the less it gets**: minimal disclosure, enforced by MOHA’s own Security Server rather than by MOSD’s good behaviour.']),
  ...figure('request', 'One click of “Check pension eligibility”, hop by hop (the REST call is shown; the SOAP call takes the same path just before it).', 1400, 820),
);

// ---------------------------------------------------------------------------
add(H1('8. What each common error means'),
  ...table(['Error', 'REST / SOAP', 'Decided by', 'Meaning'], [
    ['`AccessDenied`', 'both', 'ss3', 'No right to this service, or to this endpoint'],
    ['`ServiceDisabled`', 'both', 'ss3', 'Service description switched off (returns the disable notice)'],
    ['`UnknownService`', 'both', 'ss2 / ss3', 'Wrong service code or version, or configuration not yet refreshed'],
    ['`SslAuthenticationFailed`', 'both', 'ss2', 'The portal’s connection type does not match (HTTP vs HTTPS)'],
    ['`InvalidClientIdentifier`', 'both', 'ss2', '`X-Road-Client` / `<xrd:client>` is not a client on ss2'],
    ['`ServiceFailed` / network error', 'both', 'ss3', 'The registry is down or returned an error'],
    ['HTTP 404 `{"error": "NOT_FOUND"}`', 'REST', 'registry', 'A normal answer: no such citizen. Not an X-Road error.'],
    ['`found=false`', 'SOAP', 'registry', 'The SOAP equivalent of “not found”'],
  ], [0.3, 0.13, 0.15, 0.42]),
);

// ---------------------------------------------------------------------------
add(H1('9. Try it yourself'),
  P('These work once the lab has reached Phase 5 (services published, access granted). Run them from the lab folder:'),
  ...code([
    'cd ~/xroad-ls-lab',
    '',
    '# REST: full record (-i shows the X-Road-* response headers)',
    'curl -i -H "X-Road-Client: LS-DEV/GOV/MOSD/GRANTS-PORTAL" -H "X-Road-UserId: me" \\',
    '  http://localhost:2080/r1/LS-DEV/GOV/MOHA/POPULATION-REGISTRY/population-api/citizens/150319480002',
    '',
    '# REST: status only',
    'curl -H "X-Road-Client: LS-DEV/GOV/MOSD/GRANTS-PORTAL" \\',
    '  http://localhost:2080/r1/LS-DEV/GOV/MOHA/POPULATION-REGISTRY/population-api/citizens/050519500004/vital-status',
    '',
    '# SOAP: the ready-made envelope (edit the surname in a copy to see match=false)',
    'curl -H "Content-Type: text/xml; charset=utf-8" --data-binary @tests/verifyIdentity.xml http://localhost:2080/',
  ]),
  P('Then open **http://localhost:8001/audit**: your calls appear with client `LS-DEV/GOV/MOSD/GRANTS-PORTAL`, the user ID you sent, and the message ID.'),
  ...table(['Try', 'Expect'], [
    ['REST with `-i`', 'HTTP 200, JSON record, response headers `X-Road-Id`, `X-Road-Request-Hash`'],
    ['REST vital-status for 050519500004', '`{"nationalId": "050519500004", "vitalStatus": "DECEASED", "dateOfDeath": …}`'],
    ['REST with ID 999999999999', 'HTTP 404, `{"error": "NOT_FOUND", …}` from the registry'],
    ['SOAP as provided', '`<pop:found>true</pop:found><pop:match>true</pop:match>`'],
    ['SOAP with surname changed', '`match` false and `mismatchedFields` surname'],
    ['Change `X-Road-Client` to a made-up subsystem', 'An X-Road error from ss2 (the client is not registered there)'],
  ], [0.4, 0.6]),
);

// ---------------------------------------------------------------------------
add(H1('10. Summary for reports'),
  ...callout('box', 'In one paragraph', [
    'MOHA publishes one subsystem, POPULATION-REGISTRY, with two services. `population-api` is a REST API described by OpenAPI, with two endpoints (full record and vital status). `verifyIdentity` v1 is a SOAP operation described by a WSDL; it confirms identity details without returning the record. ss3 learns each service’s internal address and structure from those descriptions, and MOHA grants access per service, or for REST per endpoint.',
    'The consumer always calls its own Security Server, ss2. For REST, the client identity travels in the `X-Road-Client` header and the target in the `/r1/…` URL. For SOAP, both travel in the `xrd:` SOAP header, which the provider must echo back unchanged.',
    'Either way, the message is signed, carried over mutual TLS, access-checked by the provider’s Security Server and time-stamped in both message logs. The Grants Portal combines both services: SOAP to verify the applicant, REST for the facts the pension rule needs. That is minimal disclosure enforced by the data owner.',
  ]),
  H2('Key points to remember'),
  ...bullets([
    'One subsystem can publish both REST and SOAP services; X-Road secures them identically.',
    'Service descriptions (OpenAPI, WSDL) are where ss3 learns the real address and structure. The registry’s address is never given to the consumer.',
    'REST: identity in a header, target in the URL, access down to single endpoints.',
    'SOAP: identity and target in the envelope header, which the provider must echo; access per operation.',
    'The provider decides access; the consumer’s Security Server only checks that the caller is its own registered client.',
    'Combining a non-disclosing check (SOAP) with narrowly scoped data (REST endpoints) is how X-Road supports minimal disclosure.',
  ]),
);

save(k, path.resolve(__dirname, '../XRoad-Lab-REST-and-SOAP-Services.docx'), {
  title: 'X-Road LS-DEV Lab: REST and SOAP services', header: 'X-Road LS-DEV lab · REST and SOAP services', creator: 'Motlatsi Victor Mpahane',
});
