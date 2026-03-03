// comentarios.js - comentarios relacionados a tickets
const express = require('express');
const router = express.Router();
const pool = require('../conexionDB.js');

// listar comentarios de un ticket
router.get('/ticket/:ticketId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM comentarios WHERE ticket_id = $1 ORDER BY fecha',
      [req.params.ticketId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener comentarios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// agregar comentario
router.post('/', async (req, res) => {
  const { ticket_id, autor_id, tipo, mensaje } = req.body;
  if (!ticket_id || !autor_id || !tipo || !mensaje)
    return res.status(400).json({ error: 'Faltan datos obligatorios' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO comentarios (ticket_id, autor_id, tipo, mensaje)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [ticket_id, autor_id, tipo, mensaje]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Error al crear comentario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
