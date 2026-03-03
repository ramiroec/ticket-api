-- Clientes
CREATE TABLE clientes (
id SERIAL PRIMARY KEY,
empresa VARCHAR(100),
contacto VARCHAR(100),
email VARCHAR(100) UNIQUE NOT NULL,
password_hash TEXT,
sla VARCHAR(50)
);

-- Servicios contratados
CREATE TABLE servicios (
id SERIAL PRIMARY KEY,
cliente_id INT REFERENCES clientes(id),
nombre VARCHAR(100),
tipo VARCHAR(50)
);

-- Usuarios del sistema (técnicos)
CREATE TABLE usuarios (
id SERIAL PRIMARY KEY,
nombre VARCHAR(100),
email VARCHAR(100) UNIQUE NOT NULL,
password_hash TEXT NOT NULL,
rol VARCHAR(20) -- tecnico, supervisor
);

-- Tickets
CREATE TABLE tickets (
id SERIAL PRIMARY KEY,
cliente_id INT REFERENCES clientes(id),
servicio_id INT REFERENCES servicios(id),
asignado_a INT REFERENCES usuarios(id),
resumen TEXT NOT NULL,
descripcion TEXT NOT NULL,
urgencia VARCHAR(20),
estado VARCHAR(20) DEFAULT 'Abierto',
fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Comentarios
CREATE TABLE comentarios (
id SERIAL PRIMARY KEY,
ticket_id INT REFERENCES tickets(id),
autor_id INT REFERENCES usuarios(id),
tipo VARCHAR(20), -- interno / externo
mensaje TEXT,
fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Adjuntos
CREATE TABLE adjuntos (
id SERIAL PRIMARY KEY,
ticket_id INT REFERENCES tickets(id),
archivo_url TEXT,
tipo VARCHAR(50)
);