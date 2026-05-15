# Netvoice Softswitch - Linkotel

## Infraestructura
- NAS Synology DS1821+ con VMware
- Red LAN: 192.168.0.x

## VMs
### voip-lab-01 (192.168.0.161)
- Ubuntu 22.04 LTS
- Asterisk 20.19.0 con PJSIP
- MySQL 8.0 · DB: asterisk
- CDR via cdr_adaptive_odbc

### voip-panel-01 (192.168.0.7)
- Ubuntu 22.04 LTS
- FastAPI (puerto 8000) + React (puerto 3000)
- Nginx proxy reverso en puerto 80

## Estructura
- `asterisk/` — Configuraciones Asterisk
- `backend/`  — FastAPI + JWT + MySQL
- `frontend/` — React Dashboard
- `sql/`      — Scripts SQL

## Acceso
- Panel: http://192.168.0.7
- API:   http://192.168.0.7/auth/login
- Docs:  http://192.168.0.7/docs

## Credenciales por defecto
- Usuario: admin
- Ver .env para configuración de DB
