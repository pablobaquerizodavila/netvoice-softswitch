# Netvoice Softswitch - Linkotel

## Infraestructura
- NAS Synology DS1821+ con VMware Virtual Machine Manager
- Red LAN: 192.168.0.x

## VMs
### voip-core-01 (192.168.0.161)
- Ubuntu 22.04 LTS
- Asterisk 20.19.0 con PJSIP
- MySQL 8.0
- CDR via cdr_adaptive_odbc → MySQL
- Extensiones: 1001, 1002

### voip-panel-01 (IP por DHCP - reservar 192.168.0.162)
- Ubuntu 22.04 LTS
- Pendiente: FastAPI + React

## Próximos pasos
1. Instalar Python 3.11 + FastAPI en voip-panel-01
2. Conectar al MySQL de voip-core-01
3. Endpoints REST: GET /cdr, GET /extensions
4. Panel React
