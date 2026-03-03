# Ticket API (versión simple)

Este proyecto expone un backend minimalista para un sistema de tickets.
No utiliza `.env`; todas las variables (base de datos/transporte de correo) están embebidas en el código para mantenerlo sencillo.

## Características implementadas

- Conexión a PostgreSQL mediante `pg`.
- Rutas CRUD para `clientes`, `servicios`, `usuarios`, `tickets`, `comentarios` y `adjuntos`.
- Login de técnicos con contraseña (`bcrypt`) y login de clientes mediante "enlace mágico" (token en memoria).
- Almacenamiento simple de sesiones en memoria; los tokens se envían en el header `x-session-token`.
- Middleware global que exige un `Authorization: Bearer <API_TOKEN>` para todas las rutas ` /api/*`.
- Envío de correos simulado con `nodemailer` (transportador JSON que imprime en consola).
- Registro de peticiones con tiempos de ejecución.

## Instalación

```bash
cd /home/ramiro/ticket/ticket-api
npm install
node app.js    # arranca en puerto 3000 (puede modificarse con PORT)
```

## Headers obligatorios

Todas las peticiones a la API deben incluir:

```
Authorization: Bearer mi_teki_secreto_compartido_12345
```

Cuando un cliente o técnico obtiene un token de sesión, también puede incluir:

```
x-session-token: <token_sesion>
```

## Ejemplos de uso

- **Cliente**
  - POST `/api/clientes/login`  `{ "email": "cliente@dominio.com" }`
  - POST `/api/tickets` crear ticket (requiere `cliente_id` o sesión de cliente)

- **Técnico**
  - POST `/api/usuarios/login` `{ "email": "tech@dominio.com", "password": "123" }`
  - GET `/api/tickets?asignado_a=5`  listar tickets asignados

- CRUD normal en `/api/clientes`, `/api/servicios`, `/api/usuarios`, etc.

## Notas y pasos siguientes

- El envío de correo actualmente sólo muestra el mensaje en la consola; puedes cambiar el `transporter` en `mailer.js` si deseas usar SMTP real.
- La autenticación por sesión está en memoria: reiniciar el servidor borra todos los tokens.
- No hay validación exhaustiva ni control de permisos (p.ej. sólo detalle de cliente para su propio ticket). Deberás ampliarlo según necesidades.
- La lógica de asignación automática de tickets es muy básica; puedes modificarla para usar SLA, equipos, etc.
- Para adjuntos reales deberías implementar un upload (multer / S3, etc.) y guardar la URL resultante.

---

## Atajos para desarrollo

Si estás trabajando en modo `development` es molesto crear y verificar cuentas cada vez. Para acelerar las pruebas:

1. **Cuentas genéricas**
   * Técnico: `dev@tech.local` / `devpass`
   * Cliente: `dev@client.local` (no requiere contraseña)
   * Cambia los valores con las variables de entorno
     `DEV_TECH_EMAIL`, `DEV_TECH_PASSWORD` y `DEV_CLIENT_EMAIL`.

   Además, la API construye los enlaces de acceso utilizando la URL del
   front-end. Por defecto se asume `http://localhost:5173`, pero puedes
   especificar otra con la variable `FRONTEND_URL` (por ejemplo si tu cliente
   corre en otro puerto o dominio).

2. **Semilla de datos**
   Ejecuta `npm run seed` desde la carpeta del API para insertar los
   registros si no existen. El script usa la conexión de `conexionDB.js`.

3. **Login directo**
   - El endpoint `POST /api/usuarios/login` detecta el correo/contraseña de
     desarrollo y devuelve un token sin consultar la base de datos.
   - El endpoint `POST /api/clientes/login` devuelve `link` y `token` cuando se
     usa el correo genérico, de modo que no hace falta mirar la "simulación de
     correo" en la consola.

4. **Uso**
   - Técnicos: manda `{ "email": "dev@tech.local", "password": "devpass" }`
     a `/api/usuarios/login`.
   - Clientes: manda `{ "email": "dev@client.local" }` a
     `/api/clientes/login` y usa el `token` de la respuesta como sesión.

Estas facilidades sólo se activan cuando `NODE_ENV` es `development`.

---

Este código es una base sobre la cual puedes construir el resto de funcionalidades descritas en el requerimiento original (panel, notificaciones SLA, re-asignaciones, estadísticas, etc.).

¡Listo para seguir desarrollando! 🚀
