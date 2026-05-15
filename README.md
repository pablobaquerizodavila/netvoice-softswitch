# Netvoice Softswitch — Linkotel

Plataforma de telefonía IP carrier-grade con onboarding self-service, gestión multicanal de clientes, activación técnica automática y API para partners.

---

## Infraestructura

| Componente | IP | Descripción |
|---|---|---|
| NAS Synology DS1821+ | — | Hypervisor VMware, host de VMs |
| voip-lab-01 | 192.168.0.161 | Asterisk + MySQL |
| voip-panel-01 | 192.168.0.7 | FastAPI + React + Nginx |
| Kamailio SBC | 192.168.0.10 | Session Border Controller v5.5.4 |
| voip-ha-01 | 192.168.0.216 | Asterisk HA Node v20.19.0 |

### voip-lab-01 (192.168.0.161)
- Ubuntu 22.04 LTS
- Asterisk 20.19.0 con PJSIP
- MySQL 8.0 — bases: asterisk y netvoice
- CDR via cdr_adaptive_odbc
- ARI habilitado en puerto 8088

### voip-panel-01 (192.168.0.7)
- Ubuntu 22.04 LTS
- FastAPI (puerto 8000)
- React (build estático servido por Nginx)
- Nginx proxy reverso HTTPS puerto 8443

---

## Portales del sistema

| Portal | URL | Rol |
|---|---|---|
| Site principal | https://eneural.org:8443/ | Público |
| Contratar línea | https://eneural.org:8443/registro | Cliente self-service |
| Panel admin | https://eneural.org:8443/login | Admin / Agente |
| Panel SAC | https://eneural.org:8443/sac/login | Agente SAC |
| API docs | https://eneural.org:8443/docs | Partner / Developer |
| API v1 | https://eneural.org:8443/v1/ | Partner / API |
| ARI Asterisk | http://192.168.0.161:8088/ari | Interno |

---

## Flujo de onboarding completo

Cliente registro, verificar email, seleccionar plan, firma contrato OTP SHA-256, pago sandbox/PayPhone/Stripe, activacion automatica: troncal + DID ARCOTEL + creds SIP + PJSIP Asterisk. Progreso 6/6 completed.

---

## Contextos PJSIP en Asterisk

| Contexto | Uso |
|---|---|
| internal | Extensiones internas de la empresa |
| from-client | Lineas SIP de clientes Netvoice |
| from-external | Llamadas entrantes desde troncales |

---

## Backup

Ejecutar en voip-panel-01:
  python3 ~/netvoice_backup.py

Incluye: codigo fuente, build React, dump asterisk, dump netvoice, git push, compresion, rotacion 10 backups.

---

## Pendientes

- SMTP real para OTP y verificacion de email
- Pasarela de pago real PayPhone o Stripe
- Motor de facturacion recurrente CDR a factura mensual
- Grafana + Prometheus esperando NAS DS1621+
- App movil desktop Electron o React Native
- Fase 4 Media Server separado FreeSWITCH o Janus
