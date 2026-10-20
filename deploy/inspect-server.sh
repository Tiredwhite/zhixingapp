#!/usr/bin/env bash
# Read-only checks. Does not install, restart, or alter services.
set -u
printf '\n== Account and OS ==\n'
whoami
cat /etc/os-release
printf '\n== Resources ==\n'
getconf _NPROCESSORS_ONLN
free -h
df -h /
printf '\n== Available runtimes ==\n'
for tool in python3 docker nginx certbot; do
  command -v "$tool" || true
done
python3 --version 2>/dev/null || true
docker compose version 2>/dev/null || true
printf '\n== Listening TCP ports ==\n'
ss -lnt
printf '\n== Enabled Nginx site names ==\n'
if [ -d /etc/nginx/sites-enabled ]; then
  find /etc/nginx/sites-enabled -maxdepth 1 -type l -printf '%f\n'
fi
printf '\n== Service status ==\n'
for service in nginx docker; do
  systemctl is-active "$service" 2>/dev/null || true
done
