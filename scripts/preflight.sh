#!/usr/bin/env bash
# Pre-flight check for the X-Road lab on Ubuntu 26.04.
# Run before `docker compose up`:  bash scripts/preflight.sh
# Exit code = number of FAIL lines (0 = good to go).
set -u
ME=${USER:-$(id -un)}
fails=0; warns=0
ok()   { printf '  \033[32mOK\033[0m    %s\n' "$*"; }
warn() { printf '  \033[33mWARN\033[0m  %s\n' "$*"; warns=$((warns+1)); }
fail() { printf '  \033[31mFAIL\033[0m  %s\n' "$*"; fails=$((fails+1)); }
fix()  { printf '        fix: %s\n' "$*"; }

echo "== System"
. /etc/os-release 2>/dev/null || true
if [ "${VERSION_ID:-}" = "26.04" ]; then ok "${PRETTY_NAME}"
else warn "Written for Ubuntu 26.04, found ${PRETTY_NAME:-unknown}"; fi

cores=$(nproc)
if [ "$cores" -ge 4 ]; then ok "$cores CPU threads"; else warn "$cores CPU threads (4+ recommended)"; fi

mem_gb=$(awk '/MemTotal/ {printf "%d", $2/1024/1024 + 0.5}' /proc/meminfo)
swap_gb=$(awk '/SwapTotal/ {printf "%d", $2/1024/1024 + 0.5}' /proc/meminfo)
if [ "$mem_gb" -ge 15 ]; then ok "${mem_gb} GB RAM"
elif [ "$mem_gb" -ge 8 ]; then
  warn "${mem_gb} GB RAM: enough, but close browsers/IDEs you don't need while the stack runs"
  if [ "$swap_gb" -lt 4 ]; then
    warn "only ${swap_gb} GB swap with ${mem_gb} GB RAM"
    fix "sudo fallocate -l 8G /swap.img && sudo chmod 600 /swap.img && sudo mkswap /swap.img && sudo swapon /swap.img"
  fi
else fail "${mem_gb} GB RAM: the 5 X-Road containers need roughly 6 GB on their own"; fi

docker_dir=/var/lib/docker; [ -d "$docker_dir" ] || docker_dir=/var/lib
free_gb=$(df -BG --output=avail "$docker_dir" | tail -1 | tr -dc '0-9')
if [ "$free_gb" -ge 25 ]; then ok "${free_gb} GB free for Docker ($docker_dir)"
elif [ "$free_gb" -ge 15 ]; then warn "${free_gb} GB free for Docker: tight (images + volumes take about 10-15 GB)"
else fail "${free_gb} GB free for Docker ($docker_dir): need about 15 GB"
     fix "free space on the Ubuntu partition (dual-boot partitions are often small): sudo apt clean; docker system prune"; fi

echo "== Clock (X-Road certificates, OCSP and time-stamps all depend on it)"
if command -v timedatectl >/dev/null; then
  synced=$(timedatectl show -p NTPSynchronized --value 2>/dev/null)
  localrtc=$(timedatectl show -p LocalRTC --value 2>/dev/null)
  if [ "$synced" = "yes" ]; then ok "clock synchronised with NTP ($(date '+%H:%M %Z'))"
  else fail "clock not synchronised with NTP"
       fix "connect to the internet, then: sudo timedatectl set-ntp true && timedatectl status"; fi
  if [ "$localrtc" = "yes" ]; then
    ok "hardware clock in local time (normal with a Windows dual boot)"
  else
    warn "hardware clock in UTC. With a Windows dual boot, Ubuntu can start 2 h off until NTP corrects it"
    fix "check 'System clock synchronized: yes' in timedatectl before starting the lab, or: sudo timedatectl set-local-rtc 1 --adjust-system-clock"
  fi
fi

echo "== Docker"
if ! command -v docker >/dev/null; then
  fail "docker not installed"; fix "bash scripts/install-docker.sh"
else
  if docker info >/dev/null 2>&1; then ok "Docker Engine $(docker version --format '{{.Server.Version}}' 2>/dev/null) reachable without sudo"
  elif id -nG "$ME" | grep -qw docker; then fail "Docker daemon not running"; fix "sudo systemctl start docker"
  else fail "$ME cannot use docker without sudo"; fix "sudo usermod -aG docker \$USER, then log out and back in"; fi
  if docker compose version >/dev/null 2>&1; then ok "$(docker compose version)"
  else fail "Compose v2 plugin missing"; fix "sudo apt install docker-compose-plugin"; fi
fi

echo "== Ports (must be free on 127.0.0.1)"
busy=""
for p in 1000 1080 1443 2000 2080 2443 3000 3080 3443 4000 8001 8500 8888; do
  if ss -Hltn "sport = :$p" 2>/dev/null | grep -q .; then
    # ports held by this lab's own containers are fine
    if docker ps --format '{{.Ports}}' 2>/dev/null | grep -q "127.0.0.1:$p->"; then continue; fi
    busy="$busy $p"
  fi
done
if [ -z "$busy" ]; then ok "all 13 lab ports free (or used by the lab)"
else fail "ports already in use:$busy"; fix "sudo ss -ltnp | grep -E ':($(echo $busy | tr ' ' '|'))\\b'  to see what holds them"; fi

echo "== Browser setup"
if getent hosts cs.lab | grep -q '^127\.0\.0\.1'; then ok "cs.lab / ss1.lab / ss2.lab / ss3.lab point to this laptop"
else warn "lab host names not set; admin UIs on plain localhost will log each other out"
     fix "bash scripts/setup-hosts.sh"; fi
for b in firefox chromium google-chrome; do command -v "$b" >/dev/null && ok "browser found: $b"; done
command -v unzip >/dev/null || warn "unzip not installed (sudo apt install unzip)"
command -v curl  >/dev/null || warn "curl not installed (sudo apt install curl)"

echo "== $fails failed, $warns warnings"
[ "$fails" -eq 0 ] && echo "Ready: docker compose up -d --build"
exit "$fails"
