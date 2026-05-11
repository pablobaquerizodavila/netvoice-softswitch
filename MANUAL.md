# Manual de Procesos — Netvoice Softswitch / Linkotel
**Versión 1.0 — Mayo 2026**

> Este manual documenta los procesos de instalación, configuración, operación y desarrollo del sistema Netvoice Softswitch. Debe actualizarse cada vez que se complete una nueva funcionalidad o se resuelva un problema relevante.

---

## Índice
1. [Infraestructura](#1-infraestructura)
2. [voip-core-01 — Motor VoIP](#2-voip-core-01--motor-voip-192168016)
3. [voip-panel-01 — Panel Web](#3-voip-panel-01--panel-web-1921680)
4. [Troubleshooting](#4-troubleshooting)
5. [Flujo de Desarrollo](#5-flujo-de-desarrollo)
6. [Próximos Pasos](#6-próximos-pasos)
7. [Historial de Versiones](#7-historial-de-versiones)

---

## 1. Infraestructura

### 1.1 Hardware
- NAS Synology DS1821+ — 31 GB RAM, procesador AMD Ryzen
- VMware Virtual Machine Manager (incluido en DSM)
- Router TP-Link — DHCP con reservas de IP por MAC
- Red LAN: 192.168.0.x / 24

### 1.2 Máquinas Virtuales

| VM | IP Fija | OS | Rol | Estado |
|---|---|---|---|---|
| voip-core-01 | 192.168.0.161 | Ubuntu 22.04 LTS | Motor VoIP + Base de datos | ✅ Activo |
| voip-panel-01 | 192.168.0.7 | Ubuntu 22.04 LTS | Panel Web + API REST | ✅ Activo |

> Las IPs están reservadas en el router TP-Link por dirección MAC para que no cambien al reiniciar.

### 1.3 Acceso SSH
- Cliente: PuTTY (Windows)
- Usuario: `pbaquerizo`

```bash
ssh pbaquerizo@192.168.0.161   # voip-core-01
ssh pbaquerizo@192.168.0.7     # voip-panel-01
```

---

## 2. voip-core-01 — Motor VoIP (192.168.0.161)

### 2.1 Stack de Software

| Componente | Versión | Notas |
|---|---|---|
| Asterisk | 20.19.0 | Compilado desde fuentes con `--with-pjproject-bundled` |
| PJSIP | Bundled | 50 módulos cargados al iniciar |
| MySQL | 8.0 | Base de datos: asterisk, usuario: asteriskuser |
| MariaDB ODBC | Unicode | DSN: asterisk-connector |
| cdr_adaptive_odbc | Módulo Asterisk | Backend CDR activo |

### 2.2 Instalación de Asterisk (resumen)

```bash
cd /usr/src/asterisk-20.19.0
sudo ./configure --with-pjproject-bundled
sudo make -j$(nproc)
sudo make install
sudo ldconfig
```

> ⚠️ **IMPORTANTE:** Copiar `libasteriskpj.so.2` para evitar conflicto de versiones:
```bash
sudo cp /usr/lib/libasteriskpj.so.2 /usr/lib/x86_64-linux-gnu/libasteriskpj.so.2
sudo ldconfig && sudo systemctl restart asterisk
```

### 2.3 Extensiones PJSIP

| Extensión | Codec | Contexto | Contraseña | Estado |
|---|---|---|---|---|
| 1001 | ulaw, alaw, gsm | internal | Test1001! | ✅ Registrada |
| 1002 | ulaw, alaw, gsm | internal | Test1002! | ✅ Registrada |

```bash
# Verificar extensiones registradas
sudo asterisk -rx "pjsip show contacts"
```

### 2.4 CDR — Registro de Llamadas en MySQL

Archivos de configuración relevantes:
- `/etc/odbc.ini` — DSN de conexión ODBC
- `/etc/asterisk/res_odbc.conf` — conexión Asterisk a ODBC
- `/etc/asterisk/cdr_adaptive_odbc.conf` — mapeo tabla CDR
- `/etc/asterisk/cdr.conf` — opciones CDR (`unanswered=yes`)

```bash
# Verificar CDR activo
sudo asterisk -rx "cdr show status"
sudo asterisk -rx "odbc show"

# Consultar llamadas registradas
mysql -u asteriskuser -p asterisk -e \
  "SELECT calldate,src,dst,duration,disposition FROM cdr ORDER BY calldate DESC LIMIT 10;"
```

### 2.5 Comandos de Operación Diaria

| Acción | Comando |
|---|---|
| Ver estado de Asterisk | `sudo systemctl status asterisk` |
| Reiniciar Asterisk | `sudo systemctl restart asterisk` |
| Consola interactiva | `sudo asterisk -rvvvvv` |
| Ver extensiones | `sudo asterisk -rx "pjsip show endpoints"` |
| Ver llamadas activas | `sudo asterisk -rx "core show channels"` |
| Ver módulos cargados | `sudo asterisk -rx "module show like pjsip"` |
| Ver log en tiempo real | `sudo tail -f /var/log/asterisk/full` |

---

## 3. voip-panel-01 — Panel Web (192.168.0.7)

### 3.1 Stack de Software

| Componente | Versión | Puerto |
|---|---|---|
| Python | 3.11.0 | — |
| FastAPI + Uvicorn | 0.136.1 / 0.46.0 | 8000 |
| SQLAlchemy + PyMySQL | 2.0.49 / 1.1.3 | — |
| Node.js | v20.20.2 | — |
| React (CRA) | Última | 3000 |

### 3.2 Estructura del Proyecto Backend

```
~/netvoice-panel/
  app/
    __init__.py
    main.py      # endpoints REST + CORS
    database.py  # conexión SQLAlchemy a MySQL
  .env           # variables de entorno
  venv/          # entorno virtual Python
```

### 3.3 Variables de Entorno (.env)

```env
DB_HOST=192.168.0.161
DB_PORT=3306
DB_USER=asterisk
DB_PASSWORD=<password>
DB_NAME=asterisk
```

### 3.4 Endpoints API REST

| Método | Endpoint | Descripción |
|---|---|---|
| GET | / | Status del sistema |
| GET | /cdr | Historial de llamadas (limit=50, DESC) |
| GET | /extensions | Extensiones desde ps_endpoints |
| GET | /docs | Swagger UI — documentación automática |

### 3.5 Servicio systemd

```bash
sudo systemctl status netvoice-panel    # ver estado
sudo systemctl restart netvoice-panel   # reiniciar
sudo systemctl enable netvoice-panel    # activar en arranque
sudo journalctl -u netvoice-panel -f    # ver logs
```

Archivo: `/etc/systemd/system/netvoice-panel.service`

### 3.6 Frontend React

```bash
# Arrancar en desarrollo
cd ~/netvoice-ui && npm start
```

- URL: http://192.168.0.7:3000
- Pestañas: CDR (tabla de llamadas) y Extensiones

### 3.7 Comandos de Operación Diaria

| Acción | Comando |
|---|---|
| Ver estado API | `sudo systemctl status netvoice-panel` |
| Reiniciar API | `sudo systemctl restart netvoice-panel` |
| Ver logs API | `sudo journalctl -u netvoice-panel -f` |
| Arrancar React (dev) | `cd ~/netvoice-ui && npm start` |
| Verificar API | `curl http://192.168.0.7:8000/` |

---

## 4. Troubleshooting

### PJSIP no carga — 0 modules loaded
**Causa:** Conflicto de `libasteriskpj` entre `/usr/lib` y `/usr/lib/x86_64-linux-gnu/`
```bash
sudo cp /usr/lib/libasteriskpj.so.2 /usr/lib/x86_64-linux-gnu/libasteriskpj.so.2
sudo ldconfig && sudo systemctl restart asterisk
```

### CDR no graba en MySQL
**Causa:** `cdr_odbc.conf` apuntaba al DSN de ODBC en vez del nombre de sección en `res_odbc.conf`
```ini
# En cdr_adaptive_odbc.conf usar:
[connection]
connection=asterisk   # nombre de sección en res_odbc.conf, NO el DSN
table=cdr
```

### calldate muestra 1900-01-01
**Causa:** Columna `calldate` sin `DEFAULT CURRENT_TIMESTAMP`
```sql
ALTER TABLE cdr MODIFY calldate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
```

### MySQL rechaza conexión remota
**Causa:** `bind-address=127.0.0.1` en `mysqld.cnf`
```bash
# Editar /etc/mysql/mysql.conf.d/mysqld.cnf
# Cambiar: bind-address = 0.0.0.0
sudo systemctl restart mysql
```

### Error cryptography con MySQL 8
**Causa:** MySQL 8 usa `caching_sha2_password` y PyMySQL necesita el paquete `cryptography`
```bash
pip install cryptography
```

### CORS error en React
**Causa:** FastAPI sin middleware CORS
```python
# En main.py agregar:
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
```

---

## 5. Flujo de Desarrollo

### 5.1 Herramientas

| Herramienta | Versión | Uso |
|---|---|---|
| Claude Code CLI | v2.1.138 | Desarrollo de código desde Windows |
| Git | 2.54.0 (Windows) | Control de versiones |
| Node.js | v24.15.0 (Windows) | Runtime para Claude Code |
| PuTTY | Última | SSH a VMs |
| MicroSIP | Última | Softphone para pruebas VoIP |

### 5.2 Repositorio GitHub
- URL: https://github.com/pablobaquerizodavila/netvoice-softswitch
- Rama principal: `main`

```powershell
# Clonar en Windows
cd "C:\Users\Pablo B"
git clone https://github.com/pablobaquerizodavila/netvoice-softswitch
```

### 5.3 Flujo con Claude Code
```powershell
cd "C:\Users\Pablo B\netvoice-softswitch"
claude
```

**Prompt de contexto para este chat:**
```
Continuamos proyecto Netvoice Softswitch - Linkotel.
Repo: github.com/pablobaquerizodavila/netvoice-softswitch
voip-core-01 (192.168.0.161): Asterisk + MySQL + CDR OK
voip-panel-01 (192.168.0.7): FastAPI:8000 + React:3000 OK
```

### 5.4 Workflow Git
```bash
git pull origin main          # siempre antes de trabajar
git add .                     # agregar cambios
git commit -m "descripcion"   # commit descriptivo
git push origin main          # subir a GitHub
```

---

## 6. Próximos Pasos

| Prioridad | Tarea | Descripción | Estado |
|---|---|---|---|
| Alta | Nginx | Proxy reverso para React en puerto 80 | 🔧 Pendiente |
| Alta | Login JWT | Autenticación con tokens para el panel | ✅ Completado |
| Media | Gráficos CDR | Dashboard con métricas (recharts) | 🔧 Pendiente |
| Media | CRUD extensiones | Crear/editar/eliminar desde el panel | 🔧 Pendiente |
| Media | Carriers/Trunks | Interfaces para proveedores de telefonía | 🔧 Pendiente |
| Baja | PM2/Screen | Persistir React entre sesiones SSH | 🔧 Pendiente |

---

## 7. Módulo de Login JWT

### 7.1 Archivos del módulo

```
netvoice-softswitch/
  sql/
    users_table.sql      # Tabla users en MySQL
    seed_admin.sql       # Usuario admin inicial
  panel/
    app/
      database.py        # Conexión SQLAlchemy + get_db()
      models.py          # Modelo User (SQLAlchemy)
      auth.py            # JWT: hash, tokens, dependencias
      main.py            # FastAPI app completa con auth
    requirements.txt     # Dependencias Python
    .env.example         # Variables de entorno de referencia
  ui/src/
    api.js               # Axios con Bearer token + interceptor 401
    contexts/
      AuthContext.jsx    # Estado global de sesión (login/logout)
    components/
      Login.jsx          # Pantalla de login
      PrivateRoute.jsx   # Redirige a /login si no hay sesión
      Navbar.jsx         # Barra con usuario, rol y botón Salir
    App.jsx              # Rutas con BrowserRouter + AuthProvider
```

### 7.2 Despliegue en voip-panel-01

#### Paso 1 — Base de datos (en voip-core-01, 192.168.0.161)

```bash
mysql -u asteriskuser -p asterisk < sql/users_table.sql
mysql -u asteriskuser -p asterisk < sql/seed_admin.sql
```

> Credencial inicial: `admin` / `Admin1234!` — **cambiar tras el primer login**.

#### Paso 2 — Backend (en voip-panel-01, 192.168.0.7)

```bash
# Copiar archivos del panel al servidor
scp -r panel/app/*.py pbaquerizo@192.168.0.7:~/netvoice-panel/app/
scp panel/requirements.txt pbaquerizo@192.168.0.7:~/netvoice-panel/

# En la VM: instalar dependencias nuevas
ssh pbaquerizo@192.168.0.7
cd ~/netvoice-panel
source venv/bin/activate
pip install -r requirements.txt

# Agregar JWT_SECRET_KEY al .env
echo "JWT_SECRET_KEY=$(openssl rand -hex 32)" >> .env

# Reiniciar el servicio
sudo systemctl restart netvoice-panel
sudo systemctl status netvoice-panel
```

#### Paso 3 — Frontend (en voip-panel-01)

```bash
# Copiar archivos del frontend al servidor
scp ui/src/api.js pbaquerizo@192.168.0.7:~/netvoice-ui/src/
scp -r ui/src/contexts pbaquerizo@192.168.0.7:~/netvoice-ui/src/
scp ui/src/components/Login.jsx pbaquerizo@192.168.0.7:~/netvoice-ui/src/components/
scp ui/src/components/PrivateRoute.jsx pbaquerizo@192.168.0.7:~/netvoice-ui/src/components/
scp ui/src/components/Navbar.jsx pbaquerizo@192.168.0.7:~/netvoice-ui/src/components/
scp ui/src/App.jsx pbaquerizo@192.168.0.7:~/netvoice-ui/src/

# En la VM: instalar react-router-dom y axios
ssh pbaquerizo@192.168.0.7
cd ~/netvoice-ui
npm install react-router-dom axios

# Integrar las rutas/vistas existentes en el nuevo App.jsx
# (descomentar imports en ui/src/App.jsx)
npm start
```

### 7.3 Nuevos endpoints API

| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| POST | /auth/login | No | Devuelve JWT (form: username + password) |
| GET | /auth/me | Bearer | Usuario y rol del token |
| POST | /auth/change-password | Bearer | Cambiar contraseña propia |
| GET | /users | admin | Listar usuarios |
| POST | /users | admin | Crear usuario |
| DELETE | /users/{id} | admin | Eliminar usuario |
| GET | /cdr | Bearer | Historial de llamadas (protegido) |
| GET | /extensions | Bearer | Extensiones (protegido) |

### 7.4 Verificar funcionamiento

```bash
# Obtener token
TOKEN=$(curl -s -X POST http://192.168.0.7:8000/auth/login \
  -d "username=admin&password=Admin1234!" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Usar token
curl -H "Authorization: Bearer $TOKEN" http://192.168.0.7:8000/auth/me
curl -H "Authorization: Bearer $TOKEN" http://192.168.0.7:8000/cdr
```

---

## 8. Historial de Versiones

| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | Mayo 2026 | Versión inicial — Asterisk + PJSIP + MySQL + CDR + FastAPI + React completados |
| 1.1 | Mayo 2026 | Módulo de Login JWT — autenticación backend FastAPI + frontend React |

---
*Netvoice Softswitch / Linkotel — Manual de Procesos v1.1*
