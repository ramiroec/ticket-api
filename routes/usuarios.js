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

// Development credentials for admin (convenience)
const DEV_ADMIN_EMAIL = process.env.DEV_ADMIN_EMAIL || 'admin@local';
const DEV_ADMIN_PASSWORD = process.env.DEV_ADMIN_PASSWORD || 'devpass';

// Admin login
router.post('/admin/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email y contraseña son requeridos' });

  // Development shortcut
  if (
    process.env.NODE_ENV === 'development' &&
    email === DEV_ADMIN_EMAIL &&
    password === DEV_ADMIN_PASSWORD
  ) {
    const adminUser = {
      id: 0,
      nombre: 'Admin Dev',
      email: DEV_ADMIN_EMAIL,
      rol: 'admin'
    };
    const token = createSession({ ...adminUser, tipo: 'admin' });
    return res.json({ token, user: adminUser });
  }

  try {
    // Para admin, verificar que sea un usuario con rol 'admin'
    const { rows } = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1 AND rol = $2',
      [email, 'admin']
    );
    if (!rows.length)
      return res.status(404).json({ error: 'Administrador no encontrado' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Contraseña incorrecta' });

    const token = createSession({
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      tipo: 'admin'
    });
    res.json({
      token,
      user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol }
    });
  } catch (error) {
    console.error('Error en login admin:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar usuario
router.put('/:id', async (req, res) => {
  const { nombre, email, rol } = req.body;
  const updates = { nombre, email, rol };
  const fields = Object.entries(updates)
    .filter(([, value]) => value !== undefined)
    .map(([key], idx) => `${key} = $${idx + 1}`);
  const values = Object.values(updates).filter(v => v !== undefined);

  if (!fields.length)
    return res.status(400).json({ error: 'No hay campos para actualizar' });

  try {
    const { rows } = await pool.query(
      `UPDATE usuarios SET ${fields.join(', ')} WHERE id = $${fields.length + 1} RETURNING id, nombre, email, rol`,
      [...values, req.params.id]
    );

    if (!rows.length)
      return res.status(404).json({ error: 'Usuario no encontrado' });

    res.json(rows[0]);
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    if (error.code === '23505')
      return res.status(409).json({ error: 'Ya existe otro usuario con ese email' });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Eliminar usuario
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM usuarios WHERE id = $1 RETURNING id, nombre, email, rol',
      [req.params.id]
    );

    if (!rows.length)
      return res.status(404).json({ error: 'Usuario no encontrado' });

    res.json({
      mensaje: 'Usuario eliminado correctamente',
      usuario: rows[0]
    });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    if (error.code === '23503')
      return res.status(409).json({
        error: 'No se puede eliminar el usuario porque tiene registros asociados'
      });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
