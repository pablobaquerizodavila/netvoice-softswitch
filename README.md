# Netvoice Softswitch — Linkotel

Plataforma de telefonía IP carrier-grade con onboarding self-service, gestión multicanal de clientes, activación técnica automática y API para partners.

---

## Infraestructura

| Componente | IP | Descripción |
|---|---|---|
| NAS Synology DS1821+ | — | Hypervisor VMware, host de VMs |
| voip-lab-01 | 192.168.0.161 | Asterisk 20.19.0 + MySQL 8.0 |
| voip-panel-01 | 192.168.0.7 | FastAPI + React + Nginx |
| Kamailio SBC | 192.168.0.10 | Session Border Controller v5.5.4 |
| voip-ha-01 | 192.168.0.216 | Asterisk HA Node v20.19.0 |

---

## URLs del sistema

| Portal | URL |
|--------|-----|
| Panel admin / SAC | https://panel.eneural.org/login |
| Portal cliente | https://panel.eneural.org/registro |
| Agente SAC | https://panel.eneural.org/sac/login |
| API docs | https://panel.eneural.org/docs |
| API v1 | https://panel.eneural.org/v1/ |
| ARI Asterisk | http://192.168.0.161:8088/ari |

---

## Credenciales del sistema

| Usuario | Email | Password | Rol |
|---------|-------|----------|-----|
| Admin | admin@netvoice.ec | Admin1234! | admin |
| Agente SAC | sac@netvoice.ec | Sac2024# | agent |

---

## Stack técnico

- **Frontend:** React 19 + CRA + react-router-dom v7
- **Build:** `cd frontend && npm run build` → `frontend/build/`
- **Backend:** FastAPI (puerto 8000) + SQLAlchemy + MySQL 8.0
- **Web:** Nginx HTTPS → `frontend/build/` (fuente única repo Git)
- **Asterisk:** 20.19.0 PJSIP + CDR via cdr_adaptive_odbc
- **Design system:** Sora + JetBrains Mono, dark mode carrier-class

---

## Flujo de trabajo

```bash
# 1. Editar código
~/netvoice-softswitch/frontend/src/

# 2. Build y deploy
cd ~/netvoice-softswitch/frontend && npm run build

# 3. Cierre de hito — backup completo
cd ~/netvoice-softswitch
git add . && git commit -m "feat: descripción" && git push
python3 ~/netvoice_backup.py
```

---

## Roadmap — estado actual

### ✅ Fase 1 — Fundación Carrier-Class (en progreso)

| Hito | Descripción | Estado |
|------|-------------|--------|
| 1 | Shell carrier-class: design system dark, Sidebar pro, layout | ✅ Completado |
| 2 | Dashboard VoIP: KPIs reales ASR/ACD, sparkline, CDR live | ✅ Completado |
| 3 | Upgrade Clientes: tabs SAC/Admin/Partner, historial, docs | ✅ Completado |
| 4 | Upgrade Extensiones SIP: codecs, registro, CRUD carrier | ✅ Completado |
| 5 | DID Management: rangos ARCOTEL, asignacion, KPIs | ✅ Completado |
| 6 | Usuarios y Roles: 10 perfiles, permisos por modulo | ✅ Completado |

### 🔄 Fase 2 — Motor Comercial y Operativo

| Hito | Descripción | Estado |
|------|-------------|--------|
| 7  | LCR/Routing: rutas, failover, simulador | ⏳ Fase 2 |
| 8  | Tarifas: rate decks, márgenes, simulador rentabilidad | ⏳ Fase 2 |
| 9  | CDRs completo: filtros avanzados, análisis SIP codes | ⏳ Fase 2 |
| 10 | Billing: prepago/postpago, facturas, corte automático | ⏳ Fase 2 |
| 11 | Carriers/Proveedores: evaluación calidad, ASR por carrier | ⏳ Fase 2 |
| 12 | Portal Cliente self-service | ⏳ Fase 2 |
| 13 | Provisionamiento rápido: wizard, checklist | ⏳ Fase 2 |
| 14 | Tickets y soporte: SLA, historial, agentes | ⏳ Fase 2 |
| 15 | SMTP real para OTP | ⏳ Fase 2 |
| 16 | Pasarela de pago real: PayPhone / Stripe | ⏳ Fase 2 |

### ⏳ Fase 3 — NOC, Seguridad y Revendedores

| Hito | Descripción | Estado |
|------|-------------|--------|
| 17 | NOC Dashboard: latencia, jitter, alarmas 24/7 | ⏳ Fase 3 |
| 18 | Antifraude: detección anomalías, bloqueo automático | ⏳ Fase 3 |
| 19 | Portal Revendedor White Label | ⏳ Fase 3 |
| 20 | Auditoría: logs acceso, cambios config | ⏳ Fase 3 |
| 21 | Configuración general: SMTP, branding, multiempresa | ⏳ Fase 3 |
| 22 | API Center: tokens, documentación, logs de uso | ⏳ Fase 3 |

### ⏳ Fase 4 — Escala Carrier

| Hito | Descripción | Estado |
|------|-------------|--------|
| 23 | Media Server: FreeSWITCH o Janus en VM separada | ⏳ Fase 4 |
| 24 | App móvil/desktop: React Native o Electron | ⏳ Fase 4 |
| 25 | HA completo: failover automático Asterisk | ⏳ Fase 4 |

---

## VMs adicionales planificadas

| VM | IP tentativa | Propósito | Fase |
|----|-------------|-----------|------|
| voip-monitor-01 | 192.168.0.50 | Grafana + Prometheus | Fase 3 |
| voip-media-01 | 192.168.0.60 | FreeSWITCH / Janus | Fase 4 |

---

## Backup

```bash
python3 ~/netvoice_backup.py
```

Incluye: código fuente, build React, dump asterisk, dump netvoice, git push, compresión, rotación 10 backups.
