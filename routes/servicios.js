// servicios.js - Rutas CRUD para servicios
const express = require('express');
const router = express.Router();
const pool = require('../conexionDB.js');

// Listar todos los servicios
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM servicios ORDER BY id');
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener servicios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener servicio por ID
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM servicios WHERE id = $1',
      [req.params.id]
    );

    if (!rows.length) return res.status(404).json({ error: 'Servicio no encontrado' });
    res.json(rows[0]);
  } catch (error) {
    console.error('Error al obtener servicio:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear nuevo servicio
router.post('/', async (req, res) => {
  const { cliente_id, nombre, tipo } = req.body;
  if (!cliente_id || !nombre)
    return res.status(400).json({ error: 'Faltan datos obligatorios' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO servicios (cliente_id, nombre, tipo)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [cliente_id, nombre, tipo]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Error al crear servicio:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar servicio
router.put('/:id', async (req, res) => {
  const { cliente_id, nombre, tipo } = req.body;
  const updates = { cliente_id, nombre, tipo };
  const fields = Object.entries(updates)
    .filter(([, value]) => value !== undefined)
    .map(([key], idx) => `${key} = $${idx + 1}`);
  const values = Object.values(updates).filter(v => v !== undefined);

  if (!fields.length) return res.status(400).json({ error: 'No hay campos para actualizar' });

  try {
    const { rows } = await pool.query(
      `UPDATE servicios SET ${fields.join(', ')} WHERE id = $${fields.length + 1} RETURNING *`,
      [...values, req.params.id]
    );

    if (!rows.length) return res.status(404).json({ error: 'Servicio no encontrado' });
    res.json(rows[0]);
  } catch (error) {
    console.error('Error al actualizar servicio:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Eliminar servicio
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM servicios WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Servicio no encontrado' });
    res.json({ mensaje: 'Servicio eliminado', servicio: rows[0] });
  } catch (error) {
    console.error('Error al eliminar servicio:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
