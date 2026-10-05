// Section 3.1 of the Browser Guide: the terminal steps, in two editions.
// terminalStepsScripts(): run the lab scripts. terminalStepsExplicit(): every command written out.
module.exports = (k) => {
  const { P, H2, H3, code, table, callout } = k;

function terminalStepsScripts() {
  return [
    H2('3.1 The only terminal steps'),
    P('Three things cannot be done in a browser: starting the containers, adding the lab host names, and copying the CA certificates out of their container. Open a terminal (**Ctrl+Alt+T**) and run, from the lab folder:'),
    ...code([
      'cd ~/xroad-ls-lab',
      'bash scripts/preflight.sh          # checks the laptop; fix any FAIL line it prints',
      'bash scripts/setup-hosts.sh        # adds cs.lab, ss1.lab, ss2.lab, ss3.lab (asks for your password)',
      'docker compose up -d --build       # starts the 7 containers (first time: several GB download)',
      'bash scripts/fetch-ca-certs.sh     # writes certs/ca.pem, certs/ocsp.pem, certs/tsa.pem',
    ]),
    ...table(['Command', 'Why it is needed'], [
      ['`setup-hosts.sh`', 'Gives each admin page its own name. Browsers keep one login cookie per name, so with plain `localhost` logging in to ss2 would log you out of ss1.'],
      ['`docker compose up -d --build`', 'Starts cs, ca, ss1, ss2, ss3, mosd-portal and moha-registry. The X-Road servers need 3–5 minutes to be ready after this.'],
      ['`fetch-ca-certs.sh`', 'The test CA’s three certificates are needed in Phase 1. They live inside the ca container; this copies them to the `certs/` folder so the browser can upload them.'],
    ], [0.32, 0.68]),
    ...callout('warn', 'Check the clock', ['Certificates, OCSP and time-stamps all depend on the time. If you just booted from Windows, run `timedatectl status` and wait for **System clock synchronized: yes** before you start.']),
  ];
}

function terminalStepsExplicit() {
  return [
    H2('3.1 The terminal steps, command by command'),
    P('Four things cannot be done in a browser: checking the laptop, adding the lab host names, starting the containers, and copying the CA certificates out of their container. The lab folder has scripts for these (`scripts/preflight.sh`, `setup-hosts.sh`, `fetch-ca-certs.sh`, `install-docker.sh`). This edition shows **the individual commands those scripts run**, so you type each one yourself and see what it does. The result is the same either way.'),
    P('Open a terminal with **Ctrl+Alt+T**. Type each line in a grey box and press **Enter**. Lines starting with `#` are comments: do not type them.'),

    H3('3.1.1 Go to the lab folder'),
    ...code(['cd ~/xroad-ls-lab', 'pwd', 'ls']),
    ...callout('see', null, ['`pwd` prints `/home/victor/xroad-ls-lab`; `ls` lists `docker-compose.yml`, `README.md`, `certs`, `docs`, `moha-registry`, `mosd-portal`, `scripts`, `tests`. Every later command assumes you are in this folder.']),

    H3('3.1.2 Check the laptop (what preflight.sh checks)'),
    ...table(['Check', 'Command', 'You want'], [
      ['Ubuntu version', '`grep PRETTY_NAME /etc/os-release`', '`Ubuntu 26.04 LTS`'],
      ['CPU threads', '`nproc`', '4 or more'],
      ['Memory and swap', '`free -h`', '**Mem** total about 15 GB or more; with 8–15 GB, **Swap** of at least 4 GB'],
      ['Disk space for Docker', '`df -h /var/lib/docker`', '**Avail** 25 GB or more'],
      ['Clock', '`timedatectl status`', '**System clock synchronized: yes**'],
      ['Docker without sudo', '`docker info --format \'{{.ServerVersion}}\'`', 'a version number (e.g. `29.5.2`), no “permission denied”'],
      ['Compose', '`docker compose version`', '`Docker Compose version 2.x`'],
      ['Your groups', '`id -nG`', 'the word `docker` in the list'],
    ], [0.22, 0.42, 0.36]),
    P('**Lab ports free?** The containers need 13 ports. This prints any program already listening on one of them; **no output** means all are free:'),
    ...code(["ss -ltn | grep -E ':(1000|1080|1443|2000|2080|2443|3000|3080|3443|4000|8001|8500|8888)\\b'"]),
    ...callout('prob', null, [
      '**docker: command not found:** Docker is not installed yet; see 3.1.3.',
      '**permission denied … docker.sock:** you are not in the `docker` group yet, or have not logged out and in since being added. Run `sudo usermod -aG docker $USER`, then log out and back in.',
      '**Cannot connect to the Docker daemon:** start it with `sudo systemctl start docker`.',
      '**Clock not synchronized:** connect to the internet, then `sudo timedatectl set-ntp true`, and wait until `timedatectl status` says yes.',
      '**Little swap on a 8–15 GB laptop:** `sudo fallocate -l 8G /swap.img && sudo chmod 600 /swap.img && sudo mkswap /swap.img && sudo swapon /swap.img`.',
      '**A port is listed:** `sudo ss -ltnp | grep <port>` shows which program holds it; stop that program.',
      '**Low disk space:** `sudo apt clean` and `docker system prune`.',
    ]),

    H3('3.1.3 Only if Docker is not installed: install it (what install-docker.sh does)'),
    P('Skip this if `docker info` worked above. Otherwise run these blocks in order. They need internet and your password.'),
    P('**a) Remove Ubuntu’s own Docker packages**, which conflict with Docker’s official ones (“not installed” messages are fine):'),
    ...code(['sudo apt-get remove -y docker.io docker-compose docker-compose-v2 docker-doc docker-buildx podman-docker containerd runc']),
    P('**b) Add Docker’s package source and its signing key**, so apt can check that the packages really come from Docker:'),
    ...code([
      'sudo apt-get update',
      'sudo apt-get install -y ca-certificates curl',
      'sudo install -m 0755 -d /etc/apt/keyrings',
      'sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc',
      'sudo chmod a+r /etc/apt/keyrings/docker.asc',
      '. /etc/os-release',
      'sudo tee /etc/apt/sources.list.d/docker.sources >/dev/null <<EOF',
      'Types: deb',
      'URIs: https://download.docker.com/linux/ubuntu',
      'Suites: ${UBUNTU_CODENAME:-$VERSION_CODENAME}',
      'Components: stable',
      'Architectures: $(dpkg --print-architecture)',
      'Signed-By: /etc/apt/keyrings/docker.asc',
      'EOF',
      'sudo apt-get update',
    ]),
    P('The block from `sudo tee` to `EOF` is one command: paste it all at once. `. /etc/os-release` loads your Ubuntu code name, which fills in **Suites** (on 26.04: `resolute`).'),
    P('**c) Install Docker Engine and Compose, start it now and at every boot:**'),
    ...code([
      'sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin',
      'sudo systemctl enable --now docker',
    ]),
    P('**d) Let yourself use Docker without sudo, and test it:**'),
    ...code([
      'sudo usermod -aG docker $USER',
      'sudo apt-get install -y unzip',
      'sudo docker run --rm hello-world',
    ]),
    ...callout('see', null, ['`hello-world` prints **Hello from Docker!**. Now **log out and log back in** (or reboot): group changes only apply to new logins. Then repeat the checks in 3.1.2.']),
    ...callout('warn', 'The docker group', ['Being in the `docker` group is effectively administrator access. Fine on your own laptop; never add other people’s accounts on a shared machine.']),

    H3('3.1.4 Add the lab host names (what setup-hosts.sh does)'),
    P('First check whether they are already there:'),
    ...code(['grep "# x-road lab" /etc/hosts']),
    P('**If that prints a line**, they are set: skip to 3.1.5. **If it prints nothing**, add them (asks for your password):'),
    ...code(['echo "127.0.0.1 cs.lab ss1.lab ss2.lab ss3.lab ca.lab  # x-road lab" | sudo tee -a /etc/hosts']),
    P('Check that the names now point to your laptop:'),
    ...code(['getent hosts cs.lab ss1.lab ss2.lab ss3.lab']),
    ...callout('see', null, ['Four lines, each starting with `127.0.0.1`.']),
    ...callout('why', null, [
      '`/etc/hosts` is the laptop’s private phone book, checked before the internet. These names all point at `127.0.0.1` (this laptop). Browsers keep one login cookie per **name**, ignoring the port, so separate names keep the four admin pages logged in separately.',
      '`tee -a` **appends**. Without `-a` it would overwrite /etc/hosts and break networking. The `sudo` is on `tee`, not on `echo`, because the `>` of `sudo echo … > file` would run without root rights.',
      'To remove the names later: `sudo sed -i \'/# x-road lab/d\' /etc/hosts`.',
    ]),

    H3('3.1.5 Start the lab'),
    ...code(['docker compose up -d --build']),
    ...callout('see', null, ['Lines ending in **Started** for cs, ca, ss1, ss2, ss3, moha-registry and mosd-portal. The first time this downloads several GB of images; later runs use the cached images and take seconds.']),
    P('Check the containers:'),
    ...code(['docker compose ps']),
    ...callout('see', null, ['Seven rows, each with **STATUS** `Up …`.']),
    P('The X-Road servers need 3–5 minutes to start inside their containers. Watch the Central Server’s log until it settles, then press **Ctrl+C** (the container keeps running):'),
    ...code(['docker compose logs -f cs']),
    P('Or ask each admin page directly; `200` means ready, `000` means still starting:'),
    ...code([
      'curl -sk -o /dev/null -w "cs:  %{http_code}\\n" https://cs.lab:4000/',
      'curl -sk -o /dev/null -w "ss1: %{http_code}\\n" https://ss1.lab:1000/',
      'curl -sk -o /dev/null -w "ss2: %{http_code}\\n" https://ss2.lab:2000/',
      'curl -sk -o /dev/null -w "ss3: %{http_code}\\n" https://ss3.lab:3000/',
      'curl -s  -o /dev/null -w "test CA: %{http_code}\\n" http://localhost:8888/testca/',
    ]),
    ...table(['Part of the command', 'Meaning'], [
      ['`docker compose up`', 'Create and start everything described in `docker-compose.yml`.'],
      ['`-d`', 'Run in the background, so the terminal is free again.'],
      ['`--build`', 'Build the two ministry applications from their Dockerfiles first.'],
      ['`curl -sk`', '`-s`: no progress bar; `-k`: accept the self-signed certificate.'],
      ['`-o /dev/null -w "%{http_code}"`', 'Throw the page away and print only the HTTP status code.'],
    ], [0.35, 0.65]),

    H3('3.1.6 Copy the test CA’s certificates (what fetch-ca-certs.sh does)'),
    P('The test CA created three certificates inside its container when it first started. Phase 1 uploads them to the Central Server, so copy them into the `certs/` folder:'),
    ...code([
      'mkdir -p certs',
      'docker cp ca:/home/ca/CA/certs/ca.cert.pem   certs/ca.pem',
      'docker cp ca:/home/ca/CA/certs/ocsp.cert.pem certs/ocsp.pem',
      'docker cp ca:/home/ca/CA/certs/tsa.cert.pem  certs/tsa.pem',
    ]),
    P('Check each file is the right certificate:'),
    ...code([
      'openssl x509 -in certs/ca.pem   -noout -subject',
      'openssl x509 -in certs/ocsp.pem -noout -subject',
      'openssl x509 -in certs/tsa.pem  -noout -subject',
    ]),
    ...callout('see', null, ['`subject=O=Test, CN=Test CA`, then `CN=Test OCSP`, then `CN=Test TSA`.']),
    ...callout('why', null, [
      '`docker cp container:path destination` copies a file out of a running container. `mkdir -p` creates `certs/` if it is missing and does not complain if it exists.',
      'After a lab reset (`docker compose down -v`) the test CA makes **new** certificates. Always copy them again after a reset; the old files will not work.',
    ]),
    ...callout('warn', 'Check the clock', ['If you just booted from Windows, run `timedatectl status` and wait for **System clock synchronized: yes** before Phase 1.']),

    H3('3.1.7 Which script each step replaces'),
    ...table(['Section', 'Script it replaces', 'Result'], [
      ['3.1.2', '`bash scripts/preflight.sh`', 'Laptop checked'],
      ['3.1.3', '`bash scripts/install-docker.sh`', 'Docker installed (only if missing)'],
      ['3.1.4', '`bash scripts/setup-hosts.sh`', 'cs.lab, ss1.lab, ss2.lab, ss3.lab, ca.lab → 127.0.0.1'],
      ['3.1.5', '(no script)', '7 containers running'],
      ['3.1.6', '`bash scripts/fetch-ca-certs.sh`', '`certs/ca.pem`, `ocsp.pem`, `tsa.pem`'],
    ], [0.14, 0.42, 0.44]),
    P('The scripts are still in `scripts/` and do exactly the same. Use whichever you prefer.'),
  ];
}

// One configuration step: where, numbered clicks, values, what you should see, and what can go wrong.
function step(id, title, { where, why, clicks, values, see, wrong }) {
  const out = [H3(`${id}  ${title}`)];
  if (where) out.push(P(`**Where:** ${where}`));
  if (clicks) out.push(...steps(clicks));
  if (values) out.push(...table(['Field on screen', 'Type or choose'], values, [0.42, 0.58]));
  if (see) out.push(...callout('see', null, [].concat(see)));
  if (why) out.push(...callout('why', null, [].concat(why)));
  if (wrong) out.push(...callout('prob', null, [].concat(wrong)));
  return out;
}

  return { terminalStepsScripts, terminalStepsExplicit };
};
