// usuarios.js - Rutas para técnicos (usuarios del sistema)
const express = require('express');
const router = express.Router();
const pool = require('../conexionDB.js');
const bcrypt = require('bcrypt');
const { createSession } = require('../auth');

// Listar usuarios (solo para supervisores si se quisiera; no hay control de roles aquí)
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, nombre, email, rol FROM usuarios ORDER BY id');
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Registrar nuevo técnico
router.post('/', async (req, res) => {
  const { nombre, email, password, rol } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email y contraseña son obligatorios' });

  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nombre, email, rol`,
      [nombre, email, hash, rol || 'tecnico']
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Error al crear usuario:', error);
    if (error.code === '23505')
      return res.status(409).json({ error: 'Ya existe un usuario con ese email' });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Development credentials (overrides for convenience)
const DEV_TECH_EMAIL = process.env.DEV_TECH_EMAIL || 'dev@tech.local';
const DEV_TECH_PASSWORD = process.env.DEV_TECH_PASSWORD || 'devpass';

// Login técnico
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email y contraseña son requeridos' });

  // shortcut when running in development mode
  if (
    process.env.NODE_ENV === 'development' &&
    email === DEV_TECH_EMAIL &&
    password === DEV_TECH_PASSWORD
  ) {
    const devUser = {
      id: 0,
      nombre: 'Dev Técnico',
      email: DEV_TECH_EMAIL,
      rol: 'tecnico'
    };
    const token = createSession({ ...devUser, tipo: 'tecnico' });
    return res.json({ token, user: devUser });
  }

  try {
    const { rows } = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (!rows.length)
      return res.status(404).json({ error: 'Usuario no encontrado' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Contraseña incorrecta' });

    const token = createSession({ id: user.id, nombre: user.nombre, email: user.email, rol: user.rol, tipo: 'tecnico' });
    res.json({ token, user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol } });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// datos del técnico autenticado (usa Authorization Bearer)
router.get('/me', (req, res) => {
  const auth = req.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'No autorizado' });
  const token = auth.slice(7);
  const user = require('../auth').getSession(token);
  if (!user || user.tipo !== 'tecnico') return res.status(401).json({ error: 'No autorizado' });
  res.json(user);
});

module.exports = router;
