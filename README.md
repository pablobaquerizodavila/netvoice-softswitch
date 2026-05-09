# Netvoice Softswitch - Proyecto VoIP

## Estado actual
- Asterisk 20.19.0 instalado y funcionando
- MySQL 8.0 configurado con base de datos asterisk
- Extensiones 1001 y 1002 funcionando
- Llamadas internas probadas con audio OK

## Infraestructura
- VM: voip-lab-01
- IP: 192.168.0.161
- OS: Ubuntu 22.04.5 LTS
- Asterisk: 20.19.0
- MySQL: 8.0.45

## Credenciales (NO subir a repositorio público)
- MySQL root: auth_socket
- MySQL user asterisk: AsteriskDB2026!
- MySQL user voippanel: PanelDB2026!
- Extension 1001: Test1001!
- Extension 1002: Test1002!

## Pendiente
- CDR a MySQL via ODBC (en progreso)
- Segunda VM para panel web (voip-panel-01)
- FastAPI backend
- React frontend

## Arquitectura
- SIP Port: 5060 UDP
- RTP: 10000-20000 UDP
- Contexto interno: internal
- Codecs: ulaw, alaw, gsm

## Archivos importantes
- /etc/asterisk/pjsip.conf - Configuración SIP
- /etc/asterisk/extensions.conf - Dialplan
- /etc/asterisk/sorcery.conf - Backend de datos
- /etc/asterisk/extconfig.conf - Realtime config
- /var/lib/asterisk/astdb.sqlite3 - Contactos registrados

## Comandos útiles
asterisk -rx 'pjsip show endpoints'
asterisk -rx 'pjsip show contacts'
asterisk -rx 'cdr show status'
systemctl status asterisk
systemctl restart asterisk
