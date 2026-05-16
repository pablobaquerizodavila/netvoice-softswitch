# Netvoice Softswitch — Linkotel

**Plataforma VoIP carrier-class** construida sobre Asterisk 20 + Kamailio 5.5 con panel de administracion React/FastAPI.

## Infraestructura

| VM | IP | Rol | Stack |
|----|-----|-----|-------|
| voip-sbc-01 | 192.168.0.10 | Kamailio SBC | UDP/TCP :5060, TLS :5061 |
| voip-lab-01 | 192.168.0.161 | Asterisk PBX + MySQL | Asterisk 20.19.0, MySQL 8.0 |
| voip-panel-01 | 192.168.0.7 | Panel Web | FastAPI :8000, React, Nginx HTTPS |
| voip-ha-01 | 192.168.0.216 | Asterisk HA | Sync cada 5min, health check cada 1min |
| voip-monitor-01 | 192.168.0.170 | Monitoreo | Grafana 13 :3000, Prometheus 2.51 :9090 |
| voip-media-01 | 192.168.0.18 | Media Server | Asterisk 20.19.0, ConfBridge, MixMonitor |
| NAS DS1621+ | 192.168.0.116 | Backup | Synology VMM, 7TB, backups diarios |

## URLs

| Servicio | URL |
|----------|-----|
| Panel Admin | https://panel.eneural.org |
| App Movil (PWA) | https://panel.eneural.org/app |
| Grafana | http://192.168.0.170:3000 |
| Prometheus | http://192.168.0.170:9090 |
| API Docs | https://panel.eneural.org/docs |

## Stack Tecnologico

**Frontend:** React 18, React Router, Recharts, JsSIP (WebRTC), CSS variables design system

**Backend:** FastAPI, SQLAlchemy, PyMySQL, reportlab, WebSockets

**Infraestructura:** Asterisk 20 PJSIP, Kamailio 5.5, MySQL 8.0, Nginx, Let's Encrypt

**Monitoreo:** Prometheus + Node Exporter + Grafana 13, alertas CPU/RAM/Disco

## Modulos del Panel

| Modulo | Ruta | Descripcion |
|--------|------|-------------|
| Dashboard | /dashboard | KPIs VoIP, ASR/ACD, CDR live |
| CDR Llamadas | /cdr | Historial con filtros avanzados |
| CDR Live | /cdr-live | WebSocket tiempo real |
| Extensiones | /extensions | CRUD extensiones SIP PJSIP |
| Metricas | /metricas | Graficos Recharts ASR/ACD/NER |
| Network Map | /network | NOC, estado nodos, CPU/RAM |
| Carriers | /carriers | Trunks SIP carrier-class |
| Clientes | /clientes-v2 | 7 tabs con contratos/pagos/DIDs |
| Planes | /planes | Planes de cobro con tarifas |
| Series DID | /dids | Numeracion ARCOTEL |
| Antifraude | /antifraude | Blacklist/whitelist/alertas |
| API Center | /api | Partners y API keys |
| Revendedores | /revendedores | Portal white label |
| Billing | /billing | Facturacion automatica IVA 12% |
| Softphone | /softphone | WebRTC JsSIP integrado |
| App Movil | /app | PWA Dashboard+CDR+NOC |
| Usuarios | /usuarios | 10 roles, permisos granulares |
| Auditoria | /auditoria | Log completo de acciones |
| Ajustes | /settings | SMTP, password, sistema |

## Backups

```bash
# Backup manual completo (codigo + BD + git push)
python3 ~/netvoice_backup.py

# Sync al NAS DS1621+
~/netvoice_nas_backup.sh

# Cron automatico
# 02:00 — backup local
# 03:00 — sync NAS
```

## Restore

```bash
tar -xzf netvoice_YYYYMMDD_HHMMSS.tar.gz -C ~/backups/
mysql -u netvoice -pNetvoice2024# asterisk < asterisk_YYYYMMDD.sql
mysql -u netvoice -pNetvoice2024# netvoice  < netvoice_YYYYMMDD.sql
cd ~/netvoice-softswitch/frontend && npm run build
sudo systemctl restart netvoice-panel.service
```

## Desarrollo

```bash
# Editar frontend
cd ~/netvoice-softswitch/frontend/src/components/

# Build y deploy
cd ~/netvoice-softswitch/frontend && npm run build
sudo nginx -s reload

# Editar backend
nano ~/netvoice-panel/app/main.py
sudo systemctl restart netvoice-panel.service
```

## Seguridad

- HTTPS con Let's Encrypt (auto-renovacion certbot)
- Headers: HSTS, X-Frame-Options, CSP, nosniff
- UFW activo en todos los nodos
- SIP TLS :5061 en Kamailio
- WSS :8089 en Asterisk para WebRTC
- JWT autenticacion en API
- IPs LAN-only para servicios internos

## Repositorio

https://github.com/pablobaquerizodavila/netvoice-softswitch

---

**Linkotel S.A.** | Guayaquil, Ecuador | 2026
