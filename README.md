# Netvoice Softswitch - Linkotel

## Infraestructura
- NAS Synology DS1821+ con VMware Virtual Machine Manager
- Red LAN: 192.168.0.x
- Router TP-Link con IPs reservadas por MAC

## VMs

### voip-core-01 (192.168.0.161)
- Ubuntu 22.04 LTS
- Asterisk 20.19.0 con PJSIP (50 modulos)
- MySQL 8.0 - base de datos: asterisk
- CDR via cdr_adaptive_odbc -> tabla cdr en MySQL
- Extensiones: 1001, 1002 - audio OK

### voip-panel-01 (192.168.0.7)
- Ubuntu 22.04 LTS
- Python 3.11 + FastAPI 0.136.1 + Uvicorn
- React dashboard - puerto 3000
- API REST - puerto 8000
- Servicio systemd activo (netvoice-panel.service)

## Endpoints API
- GET / -> status
- GET /cdr -> historial de llamadas
- GET /extensions -> extensiones registradas
- GET /docs -> Swagger UI

## URLs
- Panel web: http://192.168.0.7:3000
- API: http://192.168.0.7:8000
- Swagger: http://192.168.0.7:8000/docs

## Proximos pasos
1. Nginx como proxy reverso (produccion)
2. Login JWT para el panel web
3. Graficos y metricas de CDR
4. Gestion de extensiones (CRUD)
5. Integracion con carriers/trunks
