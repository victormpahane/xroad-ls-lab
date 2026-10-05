// Builds docs/XRoad-Lab-Build-Report.docx
// Run from docs/report-src:  node build.js
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType, ImageRun, PageBreak, TableOfContents, Footer, Header,
  PageNumber, LevelFormat, TabStopType,
} = require('docx');

const LAB = path.resolve(__dirname, '../..');
const W = 9026; // A4 width minus 1" margins, in DXA
const C = { navy: '1F3A5F', blue: '2B5F96', green: '2E7D55', orange: 'B5651D', gold: '7A6100', grey: '4A5563', red: 'B23A3A' };
const FONT = 'Calibri', MONO = 'Consolas';

// ---------- snippets ----------
const SN = {};
{ let cur = null;
  for (const line of fs.readFileSync(path.join(__dirname, 'snippets.txt'), 'utf8').split('\n')) {
    const m = line.match(/^### (\S+)$/);
    if (m) { cur = m[1]; SN[cur] = []; } else if (cur) SN[cur].push(line);
  }
  for (const k in SN) { while (SN[k].length && SN[k][SN[k].length - 1] === '') SN[k].pop(); }
}
const file = (p) => fs.readFileSync(path.join(LAB, p), 'utf8').replace(/\s+$/, '').split('\n');

// ---------- inline markup: **bold**, `code`, _italic_ ----------
function runs(text, base = {}) {
  const out = [];
  for (const part of String(text).split(/(\*\*[^*]+\*\*|`[^`]+`)/)) {
    if (!part) continue;
    if (part.startsWith('**')) out.push(new TextRun({ ...base, text: part.slice(2, -2), bold: true }));
    else if (part.startsWith('`')) out.push(new TextRun({ ...base, text: part.slice(1, -1), font: MONO, size: 19, color: '1F3A5F' }));
    else out.push(new TextRun({ ...base, text: part }));
  }
  return out;
}

// ---------- block helpers ----------
const body = [];
const add = (...x) => body.push(...x.flat());
const P = (t, opts = {}) => new Paragraph({ children: runs(t, opts.run || {}), spacing: { after: 120, line: 276 }, ...opts.para });
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)], pageBreakBefore: true });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const H3 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(t)] });
let listId = 0;
const bullets = (items) => items.map((t) => new Paragraph({ children: runs(t), numbering: { reference: 'bul', level: 0 }, spacing: { after: 60, line: 264 } }));
const steps = (items) => { const inst = ++listId; return items.map((t) => new Paragraph({ children: runs(t), numbering: { reference: 'num', level: 0, instance: inst }, spacing: { after: 60, line: 264 } })); };

function code(lines, caption) {
  if (typeof lines === 'string') lines = SN[lines] || (() => { throw new Error('missing snippet ' + lines); })();
  const out = [];
  if (caption) out.push(new Paragraph({ children: [new TextRun({ text: caption, bold: true, size: 18, color: C.grey })], spacing: { before: 120, after: 40 }, keepNext: true }));
  lines.forEach((l, i) => out.push(new Paragraph({
    children: [new TextRun({ text: l === '' ? ' ' : l, font: MONO, size: 16 })],
    shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'F3F5F8' },
    border: { left: { style: BorderStyle.SINGLE, size: 18, color: '9AA5B1', space: 6 } },
    spacing: { before: i === 0 ? 60 : 0, after: i === lines.length - 1 ? 160 : 0, line: 240 },
    indent: { left: 120, right: 60 },
    keepLines: true,
  })));
  return out;
}

const border = { style: BorderStyle.SINGLE, size: 4, color: 'C9CFD8' };
const borders = { top: border, bottom: border, left: border, right: border };
function table(head, rows, fr, noHead = false) {
  const widths = fr.map((f) => Math.round(f * W));
  widths[widths.length - 1] = W - widths.slice(0, -1).reduce((a, b) => a + b, 0);
  const cell = (t, i, isHead) => new TableCell({
    borders, width: { size: widths[i], type: WidthType.DXA },
    shading: isHead ? { type: ShadingType.CLEAR, color: 'auto', fill: 'E3EEF9' } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: String(t).split('\n').map((line) => new Paragraph({ children: runs(line, isHead ? { bold: true, color: C.navy } : {}), spacing: { after: 0, line: 252 } })),
  });
  return [new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: widths,
    rows: [...(noHead ? [] : [new TableRow({ tableHeader: true, cantSplit: true, children: head.map((h, i) => cell(h, i, true)) })]),
      ...rows.map((r) => new TableRow({ cantSplit: true, children: r.map((t, i) => cell(t, i, false)) }))],
  }), new Paragraph({ children: [], spacing: { after: 80 } })];
}

const CALLOUT = { why: ['Why', 'E3EEF9', C.blue], tip: ['Tip', 'E4F4EC', C.green], warn: ['Watch out', 'FBEFE2', C.orange], prob: ['Problem found', 'FBE9E9', C.red], ok: ['', 'E4F4EC', C.green] };
function callout(kind, title, lines) {
  const [label, fill, col] = CALLOUT[kind];
  const b = { style: BorderStyle.SINGLE, size: 2, color: fill };
  return [new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: [W],
    rows: [new TableRow({ cantSplit: true, children: [new TableCell({
      width: { size: W, type: WidthType.DXA },
      borders: { top: b, bottom: b, right: b, left: { style: BorderStyle.SINGLE, size: 24, color: col } },
      shading: { type: ShadingType.CLEAR, color: 'auto', fill },
      margins: { top: 100, bottom: 100, left: 160, right: 160 },
      children: [
        new Paragraph({ children: [new TextRun({ text: label ? label + (title ? ': ' : '') : '\u2713 ', bold: true, color: col }), new TextRun({ text: title || '', bold: true })], spacing: { after: 60 } }),
        ...[].concat(lines).map((l) => new Paragraph({ children: runs(l), spacing: { after: 60, line: 264 } })),
      ] })] })],
  }), new Paragraph({ children: [], spacing: { after: 80 } })];
}

const FIG = { n: 0 };
function figure(name, caption, wPx = 1400, hPx) {
  const png = path.join(__dirname, 'img', name + '.png');
  const widthPt = 600; // docx-js sizes images in px at 96 dpi: 600 px = 6.25 in
  const h = Math.round(widthPt * (hPx / wPx));
  FIG.n++;
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 120, after: 60 },
      children: [new ImageRun({ type: 'png', data: fs.readFileSync(png), transformation: { width: widthPt, height: h },
        altText: { title: caption, description: caption, name } })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
      children: [new TextRun({ text: `Figure ${FIG.n}. `, bold: true, size: 18, color: C.grey }), new TextRun({ text: caption, italics: true, size: 18, color: C.grey })] }),
  ];
}
// browser route table: [step, route, values]
const route = (rows) => table(['Step', 'Browser route (click path)', 'What to enter / expect'], rows, [0.08, 0.52, 0.40]);

// =====================================================================
// COVER
// =====================================================================
add(
  new Paragraph({ children: [], spacing: { before: 2200 } }),
  new Paragraph({ children: [new TextRun({ text: 'X-ROAD LOCAL LAB', bold: true, size: 28, color: C.blue })], spacing: { after: 120 } }),
  new Paragraph({ children: [new TextRun({ text: 'Build Report', bold: true, size: 64, color: C.navy })], spacing: { after: 120 } }),
  new Paragraph({ children: [new TextRun({ text: 'From docker-compose.yml to a working data exchange between MOSD and MOHA on X-Road 7.7.0', size: 30, color: C.grey })], spacing: { after: 600 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: C.blue, space: 12 } } }),
  ...table(['', ''], [
    ['Author', 'Motlatsi Victor Mpahane, student attachee'],
    ['Purpose', 'Record and explain, step by step, how the LS-DEV X-Road lab was built, so that someone new can follow and repeat it'],
    ['Date of the build', '2 October 2026, one session, on Ubuntu 26.04 LTS'],
    ['X-Road version', '7.7.0 (Docker images from NIIS)'],
    ['Result', '**All 6 phases complete. Smoke test 7 passed, 0 failed.**'],
    ['Companion material', 'X-Road Lab Beginner Guide (Word), README.md, docs/phase*-browser.md'],
  ], [0.25, 0.75], true),
  P('Prepared with Claude (Anthropic). All identifiers, certificates and citizen data in this lab are synthetic and for learning only.', { run: { italics: true, color: C.grey, size: 18 } }),
  new Paragraph({ children: [new PageBreak()] }),
  new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Contents')] }),
  new TableOfContents('Contents', { hyperlink: true, headingStyleRange: '1-2' }),
  P('If the table above is empty, right-click it in Word and choose **Update Field**.', { run: { italics: true, color: C.grey, size: 18 } }),
);

// =====================================================================
// 1 SUMMARY
// =====================================================================
add(H1('1. Summary'),
  P('This report explains how a complete, working X-Road network was built on one laptop, starting from a Docker Compose file and ending with two government information systems exchanging data securely. It is written for a beginner: every idea is explained before it is used, every command that was run is listed, and for every configuration step the equivalent **browser route** (the menus you click in the admin web pages) is given, so the work can be repeated either way.'),
  P('**The scenario.** A grants officer at the Ministry of Social Development (**MOSD**) processes an Old Age Pension application. The MOSD Grants Portal must check the applicant against the Ministry of Home Affairs (**MOHA**) Population Registry. The two ministries never connect their systems directly: every request travels through X-Road, which signs, encrypts, access-checks and logs it.'),
  H2('1.1 What was built'),
  ...table(['Item', 'Result'], [
    ['Containers', '7 running: cs, ca, ss1, ss2, ss3, mosd-portal, moha-registry'],
    ['X-Road instance', '`LS-DEV`, one Central Server, one test certificate authority'],
    ['Security Servers', '3 registered: SS1 (MCST, management), SS2 (MOSD), SS3 (MOHA)'],
    ['Information systems', '`LS-DEV/GOV/MOSD/GRANTS-PORTAL` (consumer) and `LS-DEV/GOV/MOHA/POPULATION-REGISTRY` (provider), both REGISTERED'],
    ['Services published', 'REST `population-api` (2 endpoints) and SOAP `verifyIdentity` v1, both accessible to GRANTS-PORTAL only'],
    ['End-to-end test', 'Portal decisions correct for all 5 sample applicants; smoke test 7/7; audit log shows the verified caller'],
  ], [0.25, 0.75]),
  H2('1.2 The phases at a glance'),
  ...figure('phases', 'The build in seven phases. Each phase ends with a checkpoint.', 1400, 520),
  H2('1.3 Three problems found and fixed'),
  P('The lab README was written before testing on 7.7.0. Three steps failed or were incomplete (all three are now corrected in README.md). Each is explained in full where it happened (section 7) and summarised in section 11:'),
  ...steps([
    '**A comma in the organisation name breaks certificate requests.** `Ministry of Communications, Science and Technology` cannot be used in the certificate’s O field.',
    '**X-Road 7.7.0 requires a Subject Alternative Name** on every certificate request; the README did not mention it.',
    '**The management services needed two more settings** (their real address and the Central Server’s TLS certificate). Without them ss2 and ss3 could not have registered.',
  ]),
  H2('1.4 How to read this report'),
  ...bullets([
    'Sections 2 and 3 explain the ideas and the Docker environment. Read them first if X-Road or Docker is new to you.',
    'Section 4 explains the two ways of configuring X-Road (browser and API) and the command pattern used throughout.',
    'Sections 5 to 10 follow the build phase by phase. Each has: what and why, the browser route, the exact commands, the result, and a checkpoint.',
    'Section 11 lists problems and fixes; section 12 the current state and next steps. The appendices hold every lab script in full, a quick reference and a glossary.',
  ]),
  ...callout('tip', 'Commands in grey boxes', ['Lines in grey boxes are typed in a terminal (Ctrl+Alt+T). Lines starting with `#` are comments for you to read, not to type. `<...>` means “replace with your own value”. Long commands continue on the next line after a backslash `\\`.']),
);

// =====================================================================
// 2 BACKGROUND
// =====================================================================
add(H1('2. X-Road in five minutes'),
  P('X-Road is open-source software, created in Estonia and maintained by the Nordic Institute for Interoperability Solutions (NIIS), that lets organisations exchange data securely over a network. **There is no central database.** Each organisation keeps its own data. X-Road only provides a trusted, standard way for one system to ask another for data.'),
  H2('2.1 The components'),
  ...table(['Component', 'Container in this lab', 'Its job in one sentence'], [
    ['Central Server', '`cs`', 'Keeps the official list of members and Security Servers and publishes it, signed, as the “global configuration” every Security Server downloads about once a minute.'],
    ['Security Server', '`ss1`, `ss2`, `ss3`', 'The gateway each organisation runs: signs and encrypts outgoing messages, verifies incoming ones, checks access rights, keeps a log.'],
    ['Management Security Server', '`ss1`', 'The operator’s Security Server; it carries registration requests from the other Security Servers to the Central Server.'],
    ['Certificate Authority (CA)', '`ca`', 'Issues certificates: an authentication certificate proves who a server is; a signing certificate proves who an organisation is.'],
    ['OCSP responder', '`ca`, port 8888', 'Answers “is this certificate still valid?”.'],
    ['Time-Stamping Authority (TSA)', '`ca`, port 8899', 'Stamps the message logs with a trusted time.'],
    ['Information system (IS)', '`mosd-portal`, `moha-registry`', 'The ministry’s own application. It only ever talks to its own Security Server.'],
  ], [0.24, 0.22, 0.54]),
  H2('2.2 How X-Road names things'),
  P('Every participant has an identifier read from general to specific:'),
  ...code(['LS-DEV / GOV / MOHA / POPULATION-REGISTRY / population-api', '  |       |     |            |                   |', 'instance class member    subsystem           service']),
  ...table(['Part', 'Meaning', 'Values in this lab'], [
    ['Instance', 'One whole X-Road network (one Central Server)', '`LS-DEV`'],
    ['Member class', 'A category of organisation', '`GOV`'],
    ['Member code', 'One organisation', '`MCST`, `MOSD`, `MOHA`'],
    ['Subsystem', 'One information system inside an organisation', '`MANAGEMENT`, `GRANTS-PORTAL`, `POPULATION-REGISTRY`'],
    ['Service', 'One API offered by a subsystem', '`population-api` (REST), `verifyIdentity` v1 (SOAP)'],
    ['Server code', 'One Security Server of a member', '`SS1`, `SS2`, `SS3`'],
  ], [0.18, 0.42, 0.40]),
  H2('2.3 Values used throughout'),
  ...table(['What', 'Value'], [
    ['X-Road operator (owns cs and ss1)', 'MCST, Ministry of Communications, Science and Technology'],
    ['Consumer', 'MOSD, Ministry of Social Development: subsystem GRANTS-PORTAL on ss2'],
    ['Provider', 'MOHA, Ministry of Home Affairs: subsystem POPULATION-REGISTRY on ss3'],
    ['Admin login, all four admin UIs', '`xrd` / `secret`'],
    ['Token PIN, everywhere', '`123456xrd!`'],
    ['Certificate profile', '`ee.ria.xroad.common.certificateprofile.impl.FiVRKCertificateProfileInfoProvider`'],
  ], [0.35, 0.65]),
  ...figure('trust', 'Trust in X-Road: the anchor makes a Security Server trust the Central Server’s signed configuration; the configuration says which CA to trust.', 1400, 700),
);

// =====================================================================
// 3 ENVIRONMENT
// =====================================================================
add(H1('3. The lab environment: Docker Compose'),
  P('Installing five X-Road servers on real machines would take days. **Docker** runs each one in an isolated **container** on the laptop, and **Docker Compose** describes all of them in a single file, `docker-compose.yml`, so one command starts the whole network.'),
  ...table(['Docker word', 'Think of it as', 'Example here'], [
    ['Image', 'An installer or template, downloaded once', '`niis/xroad-security-server-sidecar:7.7.0`'],
    ['Container', 'A running copy of an image, like a small virtual machine', '`ss2`'],
    ['Volume', 'A disk that survives when the container is deleted', '`ss2-conf-data` holds ss2’s configuration and keys'],
    ['Network', 'A private virtual LAN; containers find each other by name', '`xroad-network`, `mosd-lan`, `moha-lan`'],
    ['Published port', 'A door from the laptop into a container', '`127.0.0.1:2000:4000` = laptop port 2000 → ss2 port 4000'],
  ], [0.18, 0.42, 0.40]),
  ...figure('topology', 'The seven containers, the three Docker networks and the published ports. The portal has no route to the registry except through ss2 and ss3.', 1400, 860),
  H2('3.1 The lab folder'),
  ...code([
    'xroad-ls-lab/',
    '├── docker-compose.yml        the recipe: 7 containers, 12 volumes, 3 networks',
    '├── README.md                 condensed setup guide',
    '├── scripts/',
    '│   ├── install-docker.sh     installs Docker Engine + Compose (once)',
    '│   ├── setup-hosts.sh        adds cs.lab, ss1.lab ... to /etc/hosts (once)',
    '│   ├── preflight.sh          checks the laptop is ready (each session)',
    '│   └── fetch-ca-certs.sh     copies CA/OCSP/TSA certificates out of the ca container',
    '├── tests/',
    '│   ├── smoke-test.sh         7 end-to-end checks',
    '│   └── verifyIdentity.xml    a ready-made SOAP request',
    '├── moha-registry/            provider IS: Dockerfile, requirements.txt, app/',
    '├── mosd-portal/              consumer IS: Dockerfile, requirements.txt, app/',
    '├── certs/                    CA certificates land here (Phase 1)',
    '└── docs/                     browser walkthroughs per phase + this report',
  ]),
  H2('3.2 docker-compose.yml, in full'),
  P('This is the complete file that was used, unchanged. The comment lines (starting with `#`) at the top already explain the design; the tables after the listing go through each part.'),
  ...code(file('docker-compose.yml'), 'docker-compose.yml'),
  H2('3.3 Reading the compose file'),
  H3('Services (containers)'),
  ...table(['Service', 'Image', 'Networks', 'Role'], [
    ['`cs`', '`niis/xroad-central-server:noble-7.7.0`', 'xroad-network', 'Central Server'],
    ['`ca`', '`ghcr.io/nordic-institute/xrddev-testca:latest`', 'xroad-network', 'Test CA, OCSP (:8888), TSA (:8899)'],
    ['`ss1`', '`niis/xroad-security-server-sidecar:7.7.0`', 'xroad-network', 'Management Security Server (MCST)'],
    ['`ss2`', 'same', 'xroad-network + mosd-lan', 'Consumer Security Server (MOSD)'],
    ['`ss3`', 'same', 'xroad-network + moha-lan', 'Provider Security Server (MOHA)'],
    ['`moha-registry`', 'built from `./moha-registry`', 'moha-lan', 'Population Registry (Python/FastAPI)'],
    ['`mosd-portal`', 'built from `./mosd-portal`', 'mosd-lan', 'Grants Portal (Python/FastAPI)'],
  ], [0.17, 0.38, 0.22, 0.23]),
  H3('Lines inside one service, explained with ss2'),
  ...table(['Line', 'Meaning'], [
    ['`image:`', 'Which template to run. Security Servers use the “sidecar” image, a complete Security Server in one container.'],
    ['`container_name: ss2`', 'Fixed name. It is also ss2’s host name on its networks, so other containers can reach it as `ss2`.'],
    ['`127.0.0.1:2000:4000`', 'Admin UI. Laptop port 2000 → container port 4000. Opened as https://ss2.lab:2000.'],
    ['`127.0.0.1:2080:8080`', 'Where information systems send requests (plain HTTP). Used by the smoke test and curl.'],
    ['`127.0.0.1:2443:8443`', 'The same as 8080, over HTTPS.'],
    ['`XROAD_TOKEN_PIN`', 'Unlocks the server’s key store automatically at start-up (that is why token “log in” was usually already done).'],
    ['`XROAD_ADMIN_USER / _PASSWORD`', 'The admin UI login: xrd / secret.'],
    ['`volumes:`', 'Three disks: the database, `/etc/xroad` (configuration and keys) and `/var/lib/xroad` (message log archives).'],
    ['`depends_on: [cs, ca]`', 'Start cs and ca first.'],
  ], [0.32, 0.68]),
  ...callout('why', 'Why 127.0.0.1 in front of every port?', ['A port written as `2000:4000` listens on every network card, including Wi-Fi, and Docker opens it past Ubuntu’s firewall. Writing `127.0.0.1:2000:4000` means only programs on this laptop can connect. This matters because every admin UI uses the well-known login xrd / secret.']),
  ...callout('why', 'Why three networks?', ['In real life each ministry’s systems sit on its own network and only its Security Server faces outwards. `mosd-lan` holds only the portal and ss2; `moha-lan` holds only the registry and ss3. The portal therefore has no road to the registry except X-Road. Smoke-test check 7 proves this.']),
  H3('Published ports on the laptop'),
  ...table(['Laptop port', 'Goes to', 'Open it as'], [
    ['4000', 'cs admin UI', 'https://cs.lab:4000'],
    ['1000 / 2000 / 3000', 'ss1 / ss2 / ss3 admin UI', 'https://ss1.lab:1000, https://ss2.lab:2000, https://ss3.lab:3000'],
    ['1080 / 2080 / 3080', 'ss1 / ss2 / ss3 IS port (HTTP)', 'http://localhost:2080 (used to test as the portal)'],
    ['1443 / 2443 / 3443', 'ss1 / ss2 / ss3 IS port (HTTPS)', '(not used in this lab)'],
    ['8888', 'Test CA signing page and OCSP', 'http://localhost:8888/testca/'],
    ['8500', 'MOSD Grants Portal', 'http://localhost:8500'],
    ['8001', 'MOHA registry audit page', 'http://localhost:8001/audit'],
  ], [0.22, 0.33, 0.45]),
  H3('Volumes and networks'),
  P('The 12 named volumes (`cs-db-data`, `cs-conf-data`, `ca-data`, and three per Security Server: `-db-data`, `-conf-data`, `-archive-data`) keep all configuration when containers are stopped or recreated. `docker compose down` keeps them; **`docker compose down -v` deletes them**, which is a full reset. The three networks are ordinary Docker bridge networks.'),
  H2('3.4 The two information system images'),
  P('The two Python applications are built locally from their folders when `docker compose up --build` runs. Both Dockerfiles are identical:'),
  ...code(file('moha-registry/Dockerfile'), 'moha-registry/Dockerfile (mosd-portal/Dockerfile is the same)'),
  ...table(['Line', 'Meaning'], [
    ['`FROM python:3.12-slim`', 'Start from a small official Python image.'],
    ['`WORKDIR /srv`', 'Work inside the folder /srv in the image.'],
    ['`COPY requirements.txt .` + `RUN pip install ...`', 'Install the Python libraries listed in requirements.txt.'],
    ['`COPY app ./app`', 'Copy the application code in.'],
    ['`EXPOSE 8000` / `CMD [...]`', 'The app listens on port 8000; uvicorn is the web server that runs it.'],
  ], [0.4, 0.6]),
  ...code(file('moha-registry/requirements.txt'), 'moha-registry/requirements.txt'),
  ...code(file('mosd-portal/requirements.txt'), 'mosd-portal/requirements.txt'),
  ...table(['Application', 'What it offers'], [
    ['moha-registry (provider)', 'REST `GET /api/citizens/{id}` and `GET /api/citizens/{id}/vital-status`; SOAP `POST /soap` (verifyIdentity); the service descriptions `/openapi.yaml` and `/soap/population.wsdl` that ss3 imports; an `/audit` page listing every call with the verified X-Road caller.'],
    ['mosd-portal (consumer)', 'The grants officer’s web page. `app/xroad.py` calls ss2 at `http://ss2:8080`, naming itself `LS-DEV/GOV/MOSD/GRANTS-PORTAL` (set by the environment variables in the compose file). The demo pension rule is age 70 or over, alive, and identity details matching.'],
  ], [0.28, 0.72]),
);

// =====================================================================
// 4 METHOD
// =====================================================================
add(H1('4. How the work was done: browser or API'),
  P('Every X-Road admin page (cs, ss1, ss2, ss3) is a web application on top of a **REST API**. Each button you click sends one API request. So there are two equivalent ways to do every configuration step:'),
  ...table(['', 'Browser route', 'Admin API route'], [
    ['How', 'Log in at https://cs.lab:4000 etc. and click through menus', 'Send HTTP requests with `curl` to `https://localhost:4000/api/v1/...` from inside the container'],
    ['Good for', 'Learning, seeing each screen, one-off changes', 'Speed, repeatability, scripting, exact records of what was done'],
    ['Used in this build', 'Documented for every step (tables titled “Browser route”)', 'Actually used to carry out the build; every command is listed'],
  ], [0.18, 0.41, 0.41]),
  P('Both routes change the same database, so you can mix them: anything done through the API is visible in the browser immediately, and vice versa. Each phase in this report therefore shows **both**.'),
  H2('4.1 API keys'),
  P('The API does not use the xrd/secret login for normal calls. Instead you create an **API key** once per server. The only call that accepts xrd/secret is the one that creates a key, and only from inside the container (localhost):'),
  ...code('api-key'),
  P('After that, every call carries the key in a header. The pattern used throughout this report is:'),
  ...code('api-pattern'),
  ...table(['Part', 'Meaning'], [
    ['`docker exec cs`', 'Run the following command inside the cs container (where the API listens on localhost:4000).'],
    ['`curl -sk`', '`-s` silent (no progress bar), `-k` accept the self-signed certificate.'],
    ['`-H "Authorization: X-Road-ApiKey token=$K"`', 'Prove who we are with the API key.'],
    ['`-X POST/PUT/PATCH` and `-d \'{...}\'`', 'The action and its JSON data.'],
  ], [0.42, 0.58]),
  P('In longer sequences two short helper functions were used inside the container, so the lines stay readable: `c` = curl with the key, `j` = `c` plus a JSON content-type header.'),
  ...callout('warn', 'API keys are powerful', ['Each key created here has full admin rights. Keys were created on all four servers during the build and are still active. They are listed under **Settings → API Keys** in each admin UI, where they can be revoked (see section 12).']),
  H2('4.2 Finding the exact API calls'),
  P('Rather than guess, the official API description (OpenAPI) was read out of each server’s own software, so every call matched version 7.7.0 exactly:'),
  ...code('api-spec'),
);

// =====================================================================
// 5 PHASE 0
// =====================================================================
add(H1('5. Phase 0: Prepare Ubuntu and start the containers'),
  P('**Goal:** a laptop with Docker, the lab host names, a synchronised clock, and all seven containers running.'),
  H2('5.1 Checking the laptop'),
  P('Docker had already been installed (with `scripts/install-docker.sh`). Its state was checked:'),
  ...code('p0-check'),
  P('Everything was in place except the host names. The installed packages showed a mix:'),
  ...code('p0-packages'), ...code('p0-packages-out'),
  ...callout('warn', 'Two sets of Docker packages', ['Both Ubuntu’s own packages (`docker.io`, `containerd`, `docker-compose-v2`) and Docker’s official ones (`docker-ce`, `containerd.io`) are installed. Step 3 of install-docker.sh normally removes Ubuntu’s versions. It caused no problems in this build, so it was left alone; if Docker behaves oddly later, remove the Ubuntu packages and re-run install-docker.sh.']),
  H2('5.2 Preflight'),
  ...code('p0-preflight'), ...code('p0-preflight-out', 'Output'),
  P('**0 failed, 2 warnings.** The clock warning only matters after booting from Windows (always check `System clock synchronized: yes`). The host-name warning was fixed next.'),
  H2('5.3 Start everything'),
  ...code('p0-up'),
  ...table(['Command', 'What happens behind the scenes'], [
    ['`docker compose up -d --build`', 'Downloads the X-Road images (several GB the first time), builds the two IS images from their Dockerfiles, creates the 12 volumes and 3 networks, starts 7 containers. `-d` = in the background.'],
    ['`bash scripts/setup-hosts.sh`', 'Adds the line `127.0.0.1 cs.lab ss1.lab ss2.lab ss3.lab ca.lab # x-road lab` to /etc/hosts, so each admin UI gets its own browser cookie and they stop logging each other out.'],
  ], [0.35, 0.65]),
  P('The X-Road servers need a few minutes to start their internal services. The endpoints were polled until they answered:'),
  ...code('p0-wait'),
  ...callout('ok', 'Checkpoint 0 passed', ['`docker compose ps`: all 7 containers Up. The cs login page answered after about 30 seconds; portal, registry audit page and test CA answered 200; the three Security Server UIs followed a few minutes later.']),
);

// =====================================================================
// 6 PHASE 1
// =====================================================================
add(H1('6. Phase 1: Configure the Central Server'),
  P('**Goal:** create the LS-DEV network on cs: its name, who may join, which CA and TSA to trust, the members, and the keys that sign the global configuration. The phase ends by downloading the **anchor**, the file every Security Server needs to trust this Central Server.'),
  H2('6.1 Browser route'),
  P('Open https://cs.lab:4000 (accept the certificate warning), log in with `xrd` / `secret`.'),
  ...route([
    ['1.1', 'First login opens **Initialisation**', 'Instance identifier `LS-DEV`, Central Server address `cs`, PIN `123456xrd!` twice → Submit'],
    ['1.2', '**Settings → System Settings → Member Classes → Add**', 'Code `GOV`, description `Government ministries and agencies`'],
    ['1.3a', '**Trust Services → Certification Services → Add certification service**', 'Upload `certs/ca.pem`; Certificate profile info = the FiVRK class name (section 2.3); TLS-only box unchecked → Save'],
    ['1.3b', 'Click **Test CA → OCSP Responders → Add**', 'URL `http://ca:8888`, certificate `certs/ocsp.pem`'],
    ['1.4', '**Trust Services → Timestamping Services → Add**', 'URL `http://ca:8899`, certificate `certs/tsa.pem`'],
    ['1.5', '**Members → Add member** (×3), then member → **Subsystems → Add subsystem**', 'MCST + MANAGEMENT, MOSD + GRANTS-PORTAL, MOHA + POPULATION-REGISTRY, class GOV, full ministry names'],
    ['1.6', '**Settings → System Settings → Management Services → Service Provider Identifier → Edit**', 'Select `MCST : MANAGEMENT`'],
    ['1.7', '**Global Configuration → Internal Configuration → Signing Keys** (log in to token if asked) → **Add key**; repeat under **External Configuration**', 'Labels `internal-signing-key`, `external-signing-key`'],
    ['1.8', '**Global Configuration → Internal Configuration → Anchor → Download**', 'Save the XML file; it goes to all three Security Servers'],
  ]),
  ...callout('tip', 'File picker', ['In any upload dialog press **Ctrl+L** and paste a full path such as `/home/victor/xroad-ls-lab/certs/ca.pem`.']),
  H2('6.2 Commands used'),
  P('First an API key was created on cs (section 4.1). Then:'),
  H3('Step 1.1 Initialise'),
  ...code('p1-init'),
  P('This named the network and created the software token, the password-protected key store that will hold the configuration signing keys. `cs` is the address Security Servers use to download configuration: the container name on xroad-network.'),
  H3('Step 1.2 Member class'),
  ...code('p1-class'),
  H3('Steps 1.3 to 1.6: certificates, TSA, members, management provider'),
  P('The test CA’s three certificates were copied out of the ca container and into cs:'),
  ...code('p1-certs'),
  P('Then one script ran the remaining steps inside cs:'),
  ...code('p1-script', 'p1.sh'),
  ...table(['Step', 'Answer from cs'], [
    ['1.3', 'Certification service id 1, “Test CA”, valid until 2046-09-27, profile FiVRK, tls_auth false; OCSP responder id 1 `http://ca:8888`'],
    ['1.4', 'Timestamping service id 1 `http://ca:8899`, certificate “Test TSA”'],
    ['1.5', 'Members `LS-DEV:GOV:MCST`, `LS-DEV:GOV:MOSD`, `LS-DEV:GOV:MOHA` and their subsystems created (HTTP 201 each)'],
    ['1.6', 'Provider `SUBSYSTEM:LS-DEV:GOV:MCST:MANAGEMENT`; services address `https://cs:4002/managementservice/manage/`; WSDL `http://cs/managementservices.wsdl`; Security Server still empty'],
  ], [0.1, 0.9]),
  H3('Steps 1.7 and 1.8: signing keys and anchor'),
  ...code('p1-keys'), ...code('p1-anchor'),
  P('The token login answered `token_action_not_possible` because `XROAD_TOKEN_PIN` had already unlocked it; both keys were created. Anchor hash `82:C6:F6:33:…:E8`. The anchor file begins:'),
  ...code(['<ns3:configurationAnchor ...>', '    <generatedAt>2026-10-02T12:53:26.926Z</generatedAt>', '    <instanceIdentifier>LS-DEV</instanceIdentifier>', '    <source>', '        <downloadURL>http://cs/internalconf</downloadURL>', '        <verificationCert>MIIC2DCCAcCg...</verificationCert>']),
  ...callout('why', 'What is the anchor?', ['It contains the address where configuration is downloaded (`http://cs/internalconf`) and the public key that checks its signature. Uploading it is the moment a Security Server decides which X-Road network to trust.']),
  H2('6.3 Result'),
  ...code('p1-verify'),
  ...callout('ok', 'Checkpoint 1 passed', ['No alerts (no red banners); global configuration published (HTTP 200); anchor saved as `~/Downloads/configuration_anchor_LS-DEV.xml`.']),
);

// =====================================================================
// 7 PHASE 2
// =====================================================================
add(H1('7. Phase 2: ss1, the management Security Server'),
  P('**Goal:** bring up ss1 for MCST, the X-Road operator, and make it host the **management services**. Those services are how every other Security Server sends registration requests to the Central Server, so ss1 must work before ss2 and ss3 can join.'),
  ...figure('certflow', 'The registration workflow every Security Server goes through. Steps 2 to 4 run twice: signing key and authentication key.', 1400, 560),
  H2('7.1 Browser route'),
  P('Tabs: https://ss1.lab:1000 (ss1), https://cs.lab:4000 (cs), http://localhost:8888/testca/ (test CA). Login xrd / secret.'),
  ...route([
    ['1', 'ss1: first login → **Initialisation wizard**', 'Upload anchor → Confirm; owner class `GOV`, code `MCST` (name fills in); server code `SS1`; PIN `123456xrd!`'],
    ['2', 'ss1: **Keys and Certificates → SOFTTOKEN-0 → Log in** (only if asked)', 'PIN `123456xrd!`'],
    ['3', 'ss1: **Settings → System Parameters → Timestamping Services → Add**', 'Select **Test TSA**'],
    ['4', 'ss1: **Keys and Certificates → SOFTTOKEN-0 → Add key** (×2)', 'SIGNING for `GOV:MCST`, and AUTHENTICATION with CN `ss1`. Test CA, format **DER**, O = `Ministry of Communications Science and Technology` (**no comma**), Subject Alternative Name `ss1`'],
    ['5', 'Test CA page: choose file → **Sign** or **Auth** → Sign', 'Downloads a .pem certificate for each CSR'],
    ['6', 'ss1: **Keys and Certificates → Import cert** (×2); click auth cert → **Activate**', 'Sign cert shows Registered at once'],
    ['7', 'ss1: auth cert → **Register**; then cs: **Management Requests → Approve**', 'Address `ss1`; wait 1–2 min for owner MCST REGISTERED'],
    ['8a', 'ss1: **Clients → Add subsystem → MCST / MANAGEMENT → Add**, register Yes', 'Fails with UnknownMember … clientReg. **Expected.**'],
    ['8b', 'cs: **Settings → System Settings → Management Services → Management Services Security Server → Edit**', 'Select `SS1`; on ss1 MANAGEMENT becomes REGISTERED'],
    ['8c', 'ss1: **Clients → MANAGEMENT → Services → Add WSDL**; switch it on', '`http://cs/managementservices.wsdl`'],
    ['8d', 'ss1: expand WSDL → click any service → Service URL, tick **Apply to all**', '`https://cs:4002/managementservice/manage/`'],
    ['8e', 'cs: **Settings → TLS Certificates → Management Service TLS certificate → Download certificate**; extract; ss1: **MANAGEMENT → Internal Servers → Add** certificate', 'Upload `management-service.pem` from the .tar.gz'],
    ['8f', 'ss1: **MANAGEMENT → Service Clients → Add subject**', 'Global group `security-server-owners`, all services'],
  ]),
  H2('7.2 Commands used'),
  H3('Steps 1 to 3: initialise, token, time-stamping'),
  ...code('p2-init'),
  P('ss1 now trusts LS-DEV’s Central Server and downloads its configuration every minute. The owner name filled in by itself because MCST was already in the global configuration (Phase 1, step 1.5).'),
  H3('Step 4: keys and certificate requests'),
  P('First ss1 was asked which fields the test CA’s profile needs:'),
  ...code('p2-fields'),
  P('The first attempt used the README’s organisation name and failed for both keys:'),
  ...code('p2-error', 'From docker compose logs ss1'),
  ...callout('prob', '1. A comma in the organisation name', [
    'X-Road writes a certificate subject as text, `C=FI, O=..., CN=...`, with **commas between fields**. The comma inside “Communications, Science” made the signer read it as a new field and stop with “badly formatted directory string”.',
    '**Fix:** type the O field without the comma: `Ministry of Communications Science and Technology`. The member name on the Central Server may keep its comma; only the certificate field must not. X-Road had already deleted the two half-made keys itself, so nothing needed cleaning up.',
  ]),
  ...callout('prob', '2. Subject Alternative Name is required in 7.7.0', ['The field list above shows `subjectAltName` as required for both keys. The README did not mention it. **Fix:** enter the server’s name, `ss1`.']),
  P('The corrected requests:'),
  ...code('p2-csr'),
  H3('Step 5: sign at the test CA'),
  ...code('p2-sign'), ...code('p2-sign-out', 'Output'),
  ...callout('why', 'Two certificates, two jobs', ['The **signing** certificate (Non Repudiation) belongs to the organisation, MCST: it signs messages. The **authentication** certificate (Digital Signature, Key Encipherment, DNS:ss1) belongs to the server: it is what ss1 shows when another Security Server connects. The test CA signs anything; a real CA would check documents first.']),
  H3('Steps 6 and 7: import, activate, register, approve'),
  ...code('p2-import'), ...code('p2-approve'),
  ...callout('why', 'Why approve by hand?', ['Approval is X-Road’s trust model: the operator confirms that this server really belongs to this organisation before it joins. Auto-approval can be switched on, but doing it by hand shows each request.']),
  H3('Step 8: the MANAGEMENT subsystem and its services'),
  ...code('p2-mgmt'),
  ...callout('why', 'Why does the first try fail?', ['To register a subsystem, a Security Server calls the management service `clientReg`. But MANAGEMENT is the subsystem that provides `clientReg`, and nobody hosts it yet. So the first registration is done from the Central Server side instead.']),
  ...code('p2-wsdl'),
  ...callout('prob', '3. The management services had no real address and no TLS trust', [
    'After adding the WSDL, every one of the 10 services pointed at the placeholder `http://INSERT_MANAGEMENT_SERVICE_ADDRESS_HERE`, and none had any service clients. Requests from ss2 and ss3 in Phase 3 would have failed.',
    '**Fix:** (8d) set the address of all services to the Central Server’s services address, `https://cs:4002/managementservice/manage/`; (8e) because that address is HTTPS with verification on, upload cs’s management TLS certificate to MANAGEMENT’s Internal Servers (the download is a `.tar.gz` holding `management-service.cer` and `.pem`, subject CN=localhost); (8f) give the `security-server-owners` global group access to every service.',
  ]),
  ...code('p2-fix'),
  H2('7.3 Result'),
  ...code('p2-verify'),
  ...table(['Check', 'Result'], [
    ['Clients', '`LS-DEV:GOV:MCST` and `LS-DEV:GOV:MCST:MANAGEMENT` REGISTERED'],
    ['Certificates', '`ss1-auth` and `ss1-sign`: REGISTERED, active, OCSP_RESPONSE_GOOD'],
    ['Management services', 'WSDL enabled; all 10 services at `https://cs:4002/managementservice/manage/`; security-server-owners has access'],
    ['Time-stamping', 'WAITING until the first message is logged. Normal at this point; it turned OK in Phase 6.'],
  ], [0.25, 0.75]),
  ...callout('ok', 'Checkpoint 2 passed', ['On ss1, Clients shows the MCST owner and the MANAGEMENT subsystem as REGISTERED.']),
);

// =====================================================================
// 8 PHASE 3
// =====================================================================
add(H1('8. Phase 3: ss2 (MOSD) and ss3 (MOHA)'),
  P('**Goal:** repeat Phase 2 steps 1 to 7 on the two ministries’ Security Servers. Step 8 is not repeated: only ss1 hosts management services.'),
  ...table(['Value', 'ss2', 'ss3'], [
    ['Admin UI', 'https://ss2.lab:2000', 'https://ss3.lab:3000'],
    ['Owner member', '`GOV` / `MOSD`', '`GOV` / `MOHA`'],
    ['Security Server code', '`SS2`', '`SS3`'],
    ['SIGN CSR client', '`GOV:MOSD`', '`GOV:MOHA`'],
    ['Organization (O), both CSRs', '`Ministry of Social Development`', '`Ministry of Home Affairs`'],
    ['AUTH CSR CN and Subject Alt. Name', '`ss2`', '`ss3`'],
    ['Register address', '`ss2`', '`ss3`'],
  ], [0.34, 0.33, 0.33]),
  H2('8.1 Browser route'),
  P('Exactly Phase 2 steps 1 to 7 (section 7.1) with the values above. These ministry names contain no commas, so they can be typed as written. On cs, approve the two *Auth certificate registration* requests for `LS-DEV:GOV:MOSD:SS2` and `LS-DEV:GOV:MOHA:SS3`.'),
  ...figure('mgmtflow', 'Registration of ss2 and ss3 travels through ss1’s management services. This was the first real X-Road message on the network.', 1400, 600),
  H2('8.2 Commands used'),
  P('Because the steps are identical for both servers, they were put into one script that takes the server’s values as arguments:'),
  ...code('p3-script', 'ss-setup.sh'),
  ...code('p3-run'), ...code('p3-run-out', 'Output'),
  P('Both registration requests went through ss1 without error, which also proved that the Phase 2 fixes worked. Then on cs:'),
  ...code('p3-approve'),
  ...callout('ok', 'Checkpoint 3 passed', ['After about 90 seconds: `LS-DEV:GOV:MOSD` REGISTERED on ss2, `LS-DEV:GOV:MOHA` REGISTERED on ss3. All four certificates OCSP good; global configuration OK on both. cs lists SS1, SS2 and SS3.']),
);

// =====================================================================
// 9 PHASES 4-5
// =====================================================================
add(H1('9. Phases 4 and 5: subsystems, services and access rights'),
  P('**Goal (Phase 4):** put each information system on its Security Server. **Goal (Phase 5):** publish MOHA’s two APIs on ss3 and allow the Grants Portal, and only the Grants Portal, to call them.'),
  H2('9.1 Browser route'),
  ...route([
    ['4.1', 'ss3: **Clients → Add subsystem → Select subsystem → MOHA / POPULATION-REGISTRY → Add**', 'Register? **Yes**'],
    ['4.2', 'ss2: **Clients → Add subsystem → MOSD / GRANTS-PORTAL → Add**', 'Register? **Yes**'],
    ['4.3', 'cs: **Management Requests**', 'Approve both *Client registration* requests; wait for REGISTERED'],
    ['4.4', 'ss2: **Clients → GRANTS-PORTAL → Internal Servers → Connection type**', '**HTTP**'],
    ['5.1', 'ss3: **Clients → POPULATION-REGISTRY → Services → Add REST**', 'Type **OpenAPI 3 Description**, URL `http://moha-registry:8000/openapi.yaml`, service code `population-api`'],
    ['5.2', 'same tab → **Add WSDL**', '`http://moha-registry:8000/soap/population.wsdl`'],
    ['5.3', 'same tab: toggle on each description row', 'Both enabled (new ones start “Out of order”)'],
    ['5.4', 'click `population-api` → **Service clients → Add subjects**; repeat for `verifyIdentity`', 'Search `GRANTS-PORTAL`, tick `LS-DEV:GOV:MOSD:GRANTS-PORTAL` → Add'],
  ]),
  ...callout('why', 'Why connection type HTTP?', ['The portal sends plain HTTP to `http://ss2:8080`. With the default (HTTPS), ss2 would refuse it with SslAuthenticationFailed. A real deployment keeps HTTPS and gives ss2 the portal’s TLS certificate.']),
  ...callout('why', 'Who decides access?', ['The **provider**. MOHA chooses on its own ss3 who may call its data; MOSD cannot give itself access. Granting at service level allows every endpoint; granting only the `vital-status` endpoint is the minimal-disclosure experiment in Lesson 7.']),
  H2('9.2 Commands used'),
  P('New API keys were created on ss2 and ss3 (the earlier ones had been kept in a temporary folder that was cleared). Then:'),
  ...code('p4', 'Phase 4'),
  P('Both subsystems were REGISTERED about 70 seconds after approval; GRANTS-PORTAL’s connection type showed HTTP.'),
  ...code('p5', 'Phase 5'),
  ...code('p5-out', 'Result on ss3'),
  P('ss3 read the service address `http://moha-registry:8000/api` from the OpenAPI file’s `servers:` line and the two endpoints from its paths, and read `verifyIdentity` v1 and its address from the WSDL. These URLs only work from ss3: `moha-registry` exists only on moha-lan.'),
  H2('9.3 Result'),
  ...code('p5-check'),
  ...callout('ok', 'Checkpoints 4 and 5 passed', ['Both subsystems REGISTERED, both service descriptions enabled, GRANTS-PORTAL listed as a service client of `population-api` and `verifyIdentity.v1`. The allowedMethods call went laptop → ss2 → ss3 and back, proving routing and access rights.']),
);

// =====================================================================
// 10 PHASE 6
// =====================================================================
add(H1('10. Phase 6: End-to-end test'),
  P('**Goal:** watch requests travel portal → ss2 → ss3 → registry and back, from four angles. Nothing is configured.'),
  ...figure('request', 'What happens on one click of “Check pension eligibility”.', 1400, 820),
  H2('10.1 Browser route'),
  ...route([
    ['1', 'http://localhost:8500 → **Sample applicants → Use** next to Thabo Letsie → **Check pension eligibility**', 'ELIGIBLE, three ticks, two green trace entries (SOAP, REST)'],
    ['2', 'http://localhost:8001/audit', 'Two new rows per check, caller `LS-DEV/GOV/MOSD/GRANTS-PORTAL`, user `officer.ntsane`'],
    ['3', 'ss2 / ss3: **Diagnostics**', 'Global configuration, OCSP and Timestamping all green'],
  ]),
  H2('10.2 Commands used and results'),
  H3('Smoke test'),
  ...code('p6-smoke'), ...code('p6-smoke-out', 'Output'),
  P('Check 7 is the security check: the portal container tries to reach `http://moha-registry:8000` directly and fails, because mosd-lan and moha-lan are separate networks.'),
  H3('The portal, for all five sample applicants'),
  ...code('p6-portal'),
  ...table(['National ID', 'Applicant', 'Decision', 'Why'], [
    ['010119550001', 'Mpho Mokoena', '**ELIGIBLE**', 'identity matches, alive, age ≥ 70'],
    ['150319480002', 'Thabo Letsie', '**ELIGIBLE**', 'identity matches, alive, age ≥ 70'],
    ['220719900003', 'Lineo Ramakatane', 'REJECT', 'born 1990, too young'],
    ['050519500004', 'Teboho Mofokeng', 'REJECT', 'recorded as deceased'],
    ['999999999999', '(none)', 'REJECT', 'not in the register (404 passed through)'],
  ], [0.2, 0.24, 0.16, 0.4]),
  P('All five match the expected results in the README.'),
  H3('The provider’s audit page'),
  ...table(['API', 'Operation', 'National ID', 'X-Road client (verified by ss3)', 'User', 'Outcome'], [
    ['SOAP', 'verifyIdentity', '150319480002', 'LS-DEV/GOV/MOSD/GRANTS-PORTAL', 'officer.ntsane', 'match'],
    ['REST', 'getCitizen', '150319480002', 'LS-DEV/GOV/MOSD/GRANTS-PORTAL', 'officer.ntsane', 'found'],
    ['REST', 'getCitizen', '999999999999', 'LS-DEV/GOV/MOSD/GRANTS-PORTAL', 'officer.ntsane', 'not found'],
  ], [0.08, 0.15, 0.16, 0.33, 0.16, 0.12]),
  P('(Extract.) The **X-Road client** column is added by ss3 after it verified ss2’s signature, so the registry can trust it. MOHA sees exactly which ministry, which system and which officer asked for which citizen: the X-Road audit trail.'),
  H3('By hand with curl'),
  ...code('p6-curl'),
  H3('Time-stamping now works'),
  ...code('p6-tsa'),
  ...callout('ok', 'Checkpoint 6 passed', ['Smoke test 7/7, portal decisions correct, audit page shows the verified caller, time-stamping OK. **The X-Road network works end to end.**']),
);

// =====================================================================
// 11 PROBLEMS
// =====================================================================
add(H1('11. Problems found and how they were solved'),
  ...table(['#', 'Where', 'Symptom', 'Cause', 'Fix'], [
    ['1', 'Phase 2, step 4', '`Signer.InternalError`; log: “badly formatted directory string”', 'Comma in O = “Ministry of Communications, Science and Technology”; commas separate DN fields', 'O field without comma: `Ministry of Communications Science and Technology`'],
    ['2', 'Phase 2, step 4', 'Field required but not in README', '7.7.0 FiVRK profile requires `subjectAltName`', 'Enter the server name (`ss1`, `ss2`, `ss3`)'],
    ['3', 'Phase 2, step 8', 'All management services at `INSERT_MANAGEMENT_SERVICE_ADDRESS_HERE`, no service clients', 'README step 3.8 omits these settings', 'Set URL `https://cs:4002/managementservice/manage/` for all; upload cs TLS cert to MANAGEMENT; grant security-server-owners'],
    ['4', 'Phase 2, step 8a', 'UnknownMember … clientReg', 'Expected: MANAGEMENT cannot register itself', 'Register from cs: Management Services Security Server = SS1'],
    ['5', 'Phase 1, step 1.7', '`token_action_not_possible` on login', 'Token already unlocked by `XROAD_TOKEN_PIN`', 'None needed'],
    ['6', 'Phase 0', 'Ubuntu and Docker packages both installed', 'Earlier installs', 'Left alone (no effect); remove Ubuntu’s if issues appear'],
    ['7', 'Phase 2 diagnostics', 'Time-stamping WAITING', 'No messages logged yet', 'None; OK after Phase 6'],
  ], [0.04, 0.13, 0.25, 0.28, 0.30]),
  P('Problems 1 to 3 have since been corrected in `README.md` (Phase 2 steps 3.4 and 3.8, the Phase 3 values table, and a new Troubleshooting row). The browser walkthroughs in `docs/` include the fixes too.'),
);

// =====================================================================
// 12 STATE & NEXT
// =====================================================================
add(H1('12. Current state and next steps'),
  H2('12.1 What is running now'),
  ...table(['Server', 'State'], [
    ['cs', 'LS-DEV initialised; CA, OCSP, TSA trusted; 3 members; SS1–SS3 registered; global configuration published'],
    ['ss1', 'MCST owner + MANAGEMENT REGISTERED; management services working'],
    ['ss2', 'MOSD owner + GRANTS-PORTAL REGISTERED; connection type HTTP'],
    ['ss3', 'MOHA owner + POPULATION-REGISTRY REGISTERED; population-api and verifyIdentity published, GRANTS-PORTAL has access'],
  ], [0.15, 0.85]),
  H2('12.2 Everyday commands'),
  ...code('daily'),
  ...callout('warn', 'Do not run docker compose down -v', ['It deletes all 12 volumes, i.e. every configuration, key and certificate made in this report. Use `stop` / `start` between sessions.']),
  H2('12.3 Housekeeping'),
  ...bullets([
    '**API keys:** keys with full admin rights were created during the build: one on cs, one on ss1, two each on ss2 and ss3. Revoke any you do not want under **Settings → API Keys** in each admin UI.',
    '**Anchor file:** `~/Downloads/configuration_anchor_LS-DEV.xml` is needed again only if a Security Server is rebuilt.',
  ]),
  H2('12.4 Next: Lesson 7, break it to learn it'),
  ...table(['Change', 'Expected error', 'What it teaches'], [
    ['Remove GRANTS-PORTAL’s access to population-api on ss3', 'AccessDenied on REST; SOAP still works', 'Access is per service, set by the provider'],
    ['Grant access to the vital-status endpoint only', '“Vital status only” works, full record denied', 'Minimal disclosure'],
    ['Disable the WSDL description on ss3', 'ServiceDisabled on SOAP', 'Taking a service offline without deleting it'],
    ['`docker compose stop moha-registry`', 'ServiceFailed / network error', 'X-Road reports where in the chain it failed'],
    ['GRANTS-PORTAL connection type back to HTTPS on ss2', 'SslAuthenticationFailed', 'How ISs must connect'],
    ['Enter a wrong surname', 'SOAP match=false, REJECT', 'Verification without exposing the record'],
  ], [0.38, 0.32, 0.30]),
  H2('12.5 Lab versus a real deployment'),
  ...table(['In this lab', 'In a real deployment'], [
    ['Docker test images', 'X-Road packages on Ubuntu servers, per the NIIS installation guides'],
    ['Test CA with the Finnish test profile (C=FI)', 'An approved CA and TSA with a matching certificate profile'],
    ['Made-up identifiers (LS-DEV, GOV, MOHA)', 'Identifiers agreed in governance documents; member codes are registration numbers'],
    ['Plain HTTP between IS and Security Server', 'HTTPS with client certificates'],
    ['Default logins, one shared PIN, full-rights API keys', 'Individual accounts, strong PINs, hardware security modules, least-privilege keys'],
    ['Synthetic citizens, demo pension rule', 'Real personal data, protected under data protection law'],
  ], [0.45, 0.55]),
);

// =====================================================================
// APPENDICES
// =====================================================================
add(H1('Appendix A. The lab scripts in full'),
  P('These are the unchanged files from the lab folder. They are explained line by line in Lesson 4 of the Beginner Guide.'),
  H2('A.1 scripts/setup-hosts.sh'), ...code(file('scripts/setup-hosts.sh')),
  H2('A.2 scripts/fetch-ca-certs.sh'), ...code(file('scripts/fetch-ca-certs.sh')),
  H2('A.3 scripts/install-docker.sh'), ...code(file('scripts/install-docker.sh')),
  H2('A.4 scripts/preflight.sh'), ...code(file('scripts/preflight.sh')),
  H2('A.5 tests/smoke-test.sh'), ...code(file('tests/smoke-test.sh')),
  H2('A.6 tests/verifyIdentity.xml'), ...code(file('tests/verifyIdentity.xml')),
);
add(H1('Appendix B. Quick reference'),
  ...table(['What', 'Address', 'Login'], [
    ['Central Server UI', 'https://cs.lab:4000', 'xrd / secret'],
    ['ss1 / ss2 / ss3 UI', 'https://ss1.lab:1000 · https://ss2.lab:2000 · https://ss3.lab:3000', 'xrd / secret'],
    ['Test CA signing page', 'http://localhost:8888/testca/', '—'],
    ['Grants Portal', 'http://localhost:8500', '—'],
    ['Registry audit page', 'http://localhost:8001/audit', '—'],
    ['Consumer endpoint (as the portal)', 'http://localhost:2080', 'header `X-Road-Client`'],
    ['Token PIN', '`123456xrd!`', '—'],
  ], [0.3, 0.5, 0.2]),
  ...table(['Identifier', 'Value'], [
    ['Security Servers', '`LS-DEV:GOV:MCST:SS1`, `LS-DEV:GOV:MOSD:SS2`, `LS-DEV:GOV:MOHA:SS3`'],
    ['Subsystems', '`LS-DEV:GOV:MCST:MANAGEMENT`, `LS-DEV:GOV:MOSD:GRANTS-PORTAL`, `LS-DEV:GOV:MOHA:POPULATION-REGISTRY`'],
    ['REST service', '`LS-DEV/GOV/MOHA/POPULATION-REGISTRY/population-api` → `http://moha-registry:8000/api`'],
    ['SOAP service', '`LS-DEV/GOV/MOHA/POPULATION-REGISTRY/verifyIdentity/v1` → `http://moha-registry:8000/soap`'],
    ['Management services', 'WSDL `http://cs/managementservices.wsdl`, address `https://cs:4002/managementservice/manage/`'],
    ['Global configuration', '`http://cs/internalconf`'],
  ], [0.25, 0.75]),
  H2('Browser walkthroughs'),
  ...bullets(['`docs/phase1-central-server-browser.md`', '`docs/phase2-ss1-browser.md`', '`docs/phase3-ss2-ss3-browser.md`', '`docs/phase4-5-subsystems-services-browser.md`', '`docs/phase6-test-browser.md`']),
);
add(H1('Appendix C. Glossary'),
  ...table(['Term', 'Meaning'], [
    ['Anchor', 'File holding the Central Server’s address and the key that verifies its configuration; uploaded to each Security Server.'],
    ['API / REST API', 'A way for programs to ask a server to do things over HTTP. Every admin button calls it.'],
    ['API key', 'A secret string sent with each API call instead of a username and password.'],
    ['Auth certificate', 'Proves the identity of a Security Server; used for mutual TLS between servers.'],
    ['CSR', 'Certificate Signing Request: a public key plus details, sent to a CA to be turned into a certificate.'],
    ['DER / PEM', 'Two file formats for the same certificate data: binary (DER) or text (PEM). The test CA wants DER CSRs.'],
    ['Global configuration', 'The signed list of members, servers, CAs and services that every Security Server downloads each minute.'],
    ['Global group', 'A named group defined on the Central Server, e.g. security-server-owners.'],
    ['Management services', 'Services hosted by the operator’s subsystem (MCST/MANAGEMENT) that carry registration requests to the Central Server.'],
    ['Mutual TLS', 'An encrypted connection where both sides prove who they are with certificates.'],
    ['OCSP', 'Online Certificate Status Protocol: asks whether a certificate is still valid.'],
    ['Sign certificate', 'Proves the identity of a member organisation; used to sign messages.'],
    ['Subsystem', 'One information system inside a member organisation; access rights are given to subsystems.'],
    ['Token', 'A protected key store (here a software token) holding a server’s private keys; unlocked with the PIN.'],
    ['TSA', 'Time-Stamping Authority: provides trusted time stamps for message logs.'],
    ['WSDL / OpenAPI', 'Machine-readable descriptions of a SOAP API (WSDL) or REST API (OpenAPI).'],
  ], [0.22, 0.78]),
  P('**References:** NIIS Knowledge Base, “How to Set Up a Local Test Environment Using Docker Compose” and “How to Configure Central Server (version >= 7.3.0)”; X-Road documentation at docs.x-road.global; Docker, “Install Docker Engine on Ubuntu”.'),
);

// =====================================================================
const doc = new Document({
  creator: 'Motlatsi Victor Mpahane',
  title: 'X-Road LS-DEV Lab: Build Report',
  description: 'How the LS-DEV X-Road lab was built, phase by phase',
  features: { updateFields: true },
  styles: {
    default: { document: { run: { font: FONT, size: 21 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 34, bold: true, color: C.navy, font: FONT }, paragraph: { spacing: { before: 0, after: 200 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 27, bold: true, color: C.blue, font: FONT }, paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1, keepNext: true } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 23, bold: true, color: C.navy, font: FONT }, paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2, keepNext: true } },
    ],
  },
  numbering: { config: [
    { reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
    { reference: 'num', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 300 } } } }] },
  ] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1300, left: 1440 } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'X-Road LS-DEV lab · Build report', size: 16, color: '8A94A3' })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: ['Page ', PageNumber.CURRENT, ' of ', PageNumber.TOTAL_PAGES], size: 16, color: '8A94A3' })] })] }) },
    children: body,
  }],
});
const out = path.join(LAB, 'docs', 'XRoad-Lab-Build-Report.docx');
Packer.toBuffer(doc).then((b) => { fs.writeFileSync(out, b); console.log('wrote', out, b.length, 'bytes,', FIG.n, 'figures'); });
