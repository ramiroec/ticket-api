// auditoria.js - Rutas para consultar auditoría
const express = require('express');
const router = express.Router();
const pool = require('../conexionDB.js');

// Listar registros de auditoría con filtros opcionales
router.get('/', async (req, res) => {
  try {
    const { tabla, operacion, usuario_id, limit = 100 } = req.query;
    const conditions = [];
    const values = [];

    if (tabla) {
      values.push(tabla);
      conditions.push(`tabla = $${values.length}`);
    }
    if (operacion) {
      values.push(operacion);
      conditions.push(`operacion = $${values.length}`);
    }
    if (usuario_id) {
      values.push(usuario_id);
      conditions.push(`usuario_id = $${values.length}`);
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const { rows } = await pool.query(
      `SELECT a.*, u.nombre as usuario_nombre 
       FROM auditoria a 
       LEFT JOIN usuarios u ON a.usuario_id = u.id 
       ${where} 
       ORDER BY a.fecha DESC 
       LIMIT $${values.length + 1}`,
      [...values, parseInt(limit)]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener auditoría:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;