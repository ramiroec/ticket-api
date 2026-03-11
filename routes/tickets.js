// tickets.js - Rutas para gestionar tickets
const express = require('express');
const router = express.Router();
const pool = require('../conexionDB.js');
const { sendMail } = require('../mailer');

// listar tickets con filtros opcionales
router.get('/', async (req, res) => {
  try {
    const { cliente_id, asignado_a, estado } = req.query;
    const conditions = [];
    const values = [];

    if (cliente_id) {
      values.push(cliente_id);
      conditions.push(`cliente_id = $${values.length}`);
    }
    if (asignado_a) {
      values.push(asignado_a);
      conditions.push(`asignado_a = $${values.length}`);
    }
    if (estado) {
      values.push(estado);
      conditions.push(`estado = $${values.length}`);
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const { rows } = await pool.query(`SELECT * FROM tickets ${where} ORDER BY fecha_creacion DESC`, values);
    res.json(rows);
  } catch (error) {
    console.error('Error al listar tickets:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// obtener ticket con comentarios y adjuntos
router.get('/:id', async (req, res) => {
  try {
    const ticketRes = await pool.query('SELECT * FROM tickets WHERE id = $1', [req.params.id]);
    if (!ticketRes.rows.length) return res.status(404).json({ error: 'Ticket no encontrado' });
    const ticket = ticketRes.rows[0];

    const commentsRes = await pool.query('SELECT * FROM comentarios WHERE ticket_id = $1 ORDER BY fecha', [ticket.id]);
    const attachmentsRes = await pool.query('SELECT * FROM adjuntos WHERE ticket_id = $1', [ticket.id]);

    ticket.comentarios = commentsRes.rows;
    ticket.adjuntos = attachmentsRes.rows;
    res.json(ticket);
  } catch (error) {
    console.error('Error al obtener ticket:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// crear ticket (debe ser cliente autenticado)
router.post('/', async (req, res) => {
  // si hay sesión, tomar el id del cliente
  if (req.user && req.user.tipo === 'cliente') {
    req.body.cliente_id = req.user.id;
  }

  const { cliente_id, servicio_id, resumen, descripcion, urgencia } = req.body;
  if (!cliente_id || !servicio_id || !resumen || !descripcion)
    return res.status(400).json({ error: 'Faltan datos obligatorios' });

  try {
    // Asignación automática sencilla: buscar primer usuario con rol tecnico y null asignado
    const assignRes = await pool.query('SELECT id FROM usuarios WHERE rol = $1 LIMIT 1', ['tecnico']);
    const asignado = assignRes.rows.length ? assignRes.rows[0].id : null;

    const { rows } = await pool.query(
      `INSERT INTO tickets (cliente_id, servicio_id, asignado_a, resumen, descripcion, urgencia)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [cliente_id, servicio_id, asignado, resumen, descripcion, urgencia]
    );
    const ticket = rows[0];

    // notificar
    sendMail({
      to: 'soporte@miempresa.com',
      subject: `Nuevo ticket #${ticket.id}`,
      text: `Se ha creado un nuevo ticket: ${ticket.resumen}`
    });

    res.status(201).json(ticket);
  } catch (error) {
    console.error('Error al crear ticket:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// actualizar ticket (estado, asignado_a, etc.)
router.put('/:id', async (req, res) => {
  const { estado, asignado_a, resumen, descripcion, urgencia } = req.body;
  const updates = { estado, asignado_a, resumen, descripcion, urgencia };
  const fields = Object.entries(updates)
    .filter(([, v]) => v !== undefined)
    .map(([k], idx) => `${k} = $${idx + 1}`);
  const values = Object.values(updates).filter(v => v !== undefined);

  if (!fields.length) return res.status(400).json({ error: 'No hay campos para actualizar' });

  try {
    const { rows } = await pool.query(
      `UPDATE tickets SET ${fields.join(', ')} WHERE id = $${fields.length + 1} RETURNING *`,
      [...values, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Ticket no encontrado' });
    res.json(rows[0]);
  } catch (error) {
    console.error('Error al actualizar ticket:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener estadísticas del dashboard
router.get('/stats/dashboard', async (req, res) => {
  try {
    // Total de tickets abiertos
    const abiertosRes = await pool.query("SELECT COUNT(*) as total FROM tickets WHERE estado = 'Abierto'");
    const totalAbiertos = abiertosRes.rows[0].total;

    // Total de tickets críticos
    const criticosRes = await pool.query("SELECT COUNT(*) as total FROM tickets WHERE urgencia = 'Crítica' OR urgencia = 'Alta'");
    const totalCriticos = criticosRes.rows[0].total;

    // Tickets por cliente
    const porClienteRes = await pool.query(`
      SELECT c.id, c.empresa, COUNT(t.id) as total_tickets
      FROM clientes c
      LEFT JOIN tickets t ON c.id = t.cliente_id
      GROUP BY c.id, c.empresa
      ORDER BY total_tickets DESC
    `);

    // Tickets por servicio (equipo)
    const porServicioRes = await pool.query(`
      SELECT s.id, s.nombre, COUNT(t.id) as total_tickets
      FROM servicios s
      LEFT JOIN tickets t ON s.id = t.servicio_id
      GROUP BY s.id, s.nombre
      ORDER BY total_tickets DESC
    `);

    // Productividad por técnico (tickets resueltos)
    const productividadRes = await pool.query(`
      SELECT u.id, u.nombre, 
             COUNT(CASE WHEN t.estado = 'Resuelto' THEN 1 END) as resueltos,
             COUNT(t.id) as total
      FROM usuarios u
      LEFT JOIN tickets t ON u.id = t.asignado_a
      GROUP BY u.id, u.nombre
      ORDER BY resueltos DESC
    `);

    // Total general de datos
    const totalesRes = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM tickets) as total_tickets,
        (SELECT COUNT(*) FROM clientes) as total_clientes,
        (SELECT COUNT(*) FROM usuarios) as total_usuarios,
        (SELECT COUNT(*) FROM servicios) as total_servicios
    `);

    res.json({
      resumen: {
        totalTickets: totalesRes.rows[0].total_tickets,
        totalAbiertos,
        totalCriticos,
        totalClientes: totalesRes.rows[0].total_clientes,
        totalUsuarios: totalesRes.rows[0].total_usuarios,
        totalServicios: totalesRes.rows[0].total_servicios
      },
      porCliente: porClienteRes.rows,
      porServicio: porServicioRes.rows,
      productividadTecnico: productividadRes.rows
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
