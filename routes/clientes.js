// clientes.js - Rutas CRUD de clientes
const express = require('express');
const router = express.Router();
const pool = require('../conexionDB.js');
const bcrypt = require('bcrypt');
const { createSession } = require('../auth');
const { sendMail } = require('../mailer');

// Development default credentials (convenience)
const DEV_CLIENT_EMAIL = process.env.DEV_CLIENT_EMAIL || 'dev@client.local';
const DEV_CLIENT_PASSWORD = process.env.DEV_CLIENT_PASSWORD || 'devpass';

// Login de cliente por email + contraseña
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) 
    return res.status(400).json({ error: 'Email y contraseña son requeridos' });

  // shortcut cuando estamos en desarrollo
  if (process.env.NODE_ENV === 'development' && 
      email === DEV_CLIENT_EMAIL && 
      password === DEV_CLIENT_PASSWORD) {
    const client = { id: 0, email: DEV_CLIENT_EMAIL };
    const token = createSession({ ...client, tipo: 'cliente' });
    return res.json({ 
      token, 
      user: { id: 0, email: DEV_CLIENT_EMAIL, empresa: 'Cliente Dev' } 
    });
  }

  try {
    const { rows } = await pool.query('SELECT * FROM clientes WHERE email = $1', [email]);
    if (!rows.length) 
      return res.status(404).json({ error: 'Cliente no encontrado' });

    const client = rows[0];
    
    // Si no tiene contraseña (tabla vieja), rechazar
    if (!client.password_hash) 
      return res.status(401).json({ error: 'Contraseña incorrecta' });

    const match = await bcrypt.compare(password, client.password_hash);
    if (!match) 
      return res.status(401).json({ error: 'Contraseña incorrecta' });

    const token = createSession({ 
      id: client.id, 
      email: client.email, 
      empresa: client.empresa,
      tipo: 'cliente' 
    });
    
    res.json({ 
      token, 
      user: { 
        id: client.id, 
        email: client.email, 
        empresa: client.empresa 
      } 
    });
  } catch (error) {
    console.error('Error en login cliente:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// obtener datos del cliente autenticado (usa x-session-token)
router.get('/me', (req, res) => {
  const token = req.get('x-session-token');
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  const user = require('../auth').getSession(token);
  if (!user || user.tipo !== 'cliente') return res.status(401).json({ error: 'No autorizado' });
  res.json(user);
});

// Listar todos los clientes
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM clientes ORDER BY id'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener clientes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener cliente por ID
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM clientes WHERE id = $1',
      [req.params.id]
    );

    if (!rows.length)
      return res.status(404).json({ error: 'Cliente no encontrado' });

    res.json(rows[0]);
  } catch (error) {
    console.error('Error al obtener cliente:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear nuevo cliente
router.post('/', async (req, res) => {
  const { empresa, contacto, email, sla } = req.body;

  if (!email)
    return res.status(400).json({ error: 'El email es obligatorio' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO clientes (empresa, contacto, email, sla)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [empresa, contacto, email, sla]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Error al crear cliente:', error);

    if (error.code === '23505')
      return res.status(409).json({ error: 'Ya existe un cliente con ese email' });

    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar cliente
router.put('/:id', async (req, res) => {
  const { empresa, contacto, email, sla } = req.body;
  const updates = { empresa, contacto, email, sla };

  const fields = Object.entries(updates)
    .filter(([_, value]) => value !== undefined)
    .map(([key], index) => `${key} = $${index + 1}`);

  const values = Object.values(updates)
    .filter(value => value !== undefined);

  if (!fields.length)
    return res.status(400).json({ error: 'No hay campos para actualizar' });

  try {
    const { rows } = await pool.query(
      `UPDATE clientes
       SET ${fields.join(', ')}
       WHERE id = $${fields.length + 1}
       RETURNING *`,
      [...values, req.params.id]
    );

    if (!rows.length)
      return res.status(404).json({ error: 'Cliente no encontrado' });

    res.json(rows[0]);
  } catch (error) {
    console.error('Error al actualizar cliente:', error);

    if (error.code === '23505')
      return res.status(409).json({ error: 'Ya existe otro cliente con ese email' });

    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Eliminar cliente
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM clientes WHERE id = $1 RETURNING *',
      [req.params.id]
    );

    if (!rows.length)
      return res.status(404).json({ error: 'Cliente no encontrado' });

    res.json({
      mensaje: 'Cliente eliminado correctamente',
      cliente: rows[0]
    });
  } catch (error) {
    console.error('Error al eliminar cliente:', error);

    if (error.code === '23503')
      return res.status(409).json({
        error: 'No se puede eliminar el cliente porque tiene registros asociados'
      });

    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;