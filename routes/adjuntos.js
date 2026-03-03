// adjuntos.js - manejar enlaces/urls de archivos adjuntos de tickets
const express = require('express');
const router = express.Router();
const pool = require('../conexionDB.js');

// listar adjuntos por ticket
router.get('/ticket/:ticketId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM adjuntos WHERE ticket_id = $1',
      [req.params.ticketId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener adjuntos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// crear adjunto
router.post('/', async (req, res) => {
  const { ticket_id, archivo_url, tipo } = req.body;
  if (!ticket_id || !archivo_url)
    return res.status(400).json({ error: 'Faltan datos obligatorios' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO adjuntos (ticket_id, archivo_url, tipo)
       VALUES ($1,$2,$3) RETURNING *`,
      [ticket_id, archivo_url, tipo]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Error al crear adjunto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
