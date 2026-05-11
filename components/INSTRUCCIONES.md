# Netvoice React UI — Instrucciones de instalación

## Archivos a reemplazar en ~/netvoice-ui/src/

Copia estos archivos al proyecto React existente en voip-panel-01:

```
App.js          → ~/netvoice-ui/src/App.js
App.css         → ~/netvoice-ui/src/App.css
components/
  Dashboard.js  → ~/netvoice-ui/src/components/Dashboard.js
  CDRPage.js    → ~/netvoice-ui/src/components/CDRPage.js
  Extensions.js → ~/netvoice-ui/src/components/Extensions.js
```

## Comando para Claude Code

Pega esto en Claude Code para que implemente los archivos:

```
Reemplaza los archivos del frontend React en ~/netvoice-ui/src/ con 
el nuevo diseño del dashboard. Los archivos están en la carpeta 
netvoice-react/ del repositorio. 

Estructura:
- App.js: shell principal con sidebar, topbar y navegación entre páginas
- App.css: estilos completos con fuente IBM Plex Sans
- components/Dashboard.js: métricas + últimas llamadas + extensiones
- components/CDRPage.js: tabla completa de CDR con filtro de búsqueda  
- components/Extensions.js: cards de extensiones con campos detallados

La API está en http://192.168.0.7:8000
Después de copiar los archivos ejecuta: cd ~/netvoice-ui && npm start
```

## Cambios respecto al diseño anterior

- Sidebar de navegación con 6 secciones
- Dashboard con 4 métricas en tiempo real
- Tipografía IBM Plex Sans + IBM Plex Mono
- Página CDR con búsqueda/filtro
- Página Extensiones con cards individuales por extensión
- Secciones "próximamente" para Métricas, Carriers y Ajustes
