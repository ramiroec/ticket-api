const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// Middleware de logging personalizado
app.use((req, res, next) => {
    const start = process.hrtime();
    res.on('finish', () => {
        const durationInMilliseconds = getDurationInMilliseconds(start);
        console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${durationInMilliseconds.toLocaleString()} ms`);
    });
    next();
});

function getDurationInMilliseconds(start) {
    const NS_PER_SEC = 1e9;
    const NS_TO_MS = 1e6;
    const diff = process.hrtime(start);
    return (diff[0] * NS_PER_SEC + diff[1]) / NS_TO_MS;
}

// Middleware para analizar JSON y permitir CORS (cualquier origen)
app.use(express.json());
app.use(cors()); // Ahora permite todos los orígenes

// Se elimina el middleware que restringía orígenes específicos

// ⚠️ Eliminado: Middleware de token de acceso (API_TOKEN) - ahora todas las rutas son públicas

const { getSession } = require('./auth');

// Importar rutas
const rutas = {
    clientes: require('./routes/clientes'),
    servicios: require('./routes/servicios'),
    usuarios: require('./routes/usuarios'),
    tickets: require('./routes/tickets'),
    comentarios: require('./routes/comentarios'),
    adjuntos: require('./routes/adjuntos'),
    auditoria: require('./routes/auditoria'),
};

// Session middleware opcional: lee x-session-token y pega usuario en req.user (solo informativo, no bloquea)
app.use((req, res, next) => {
    const token = req.get('x-session-token');
    if (token) {
        const user = getSession(token);
        if (user) req.user = user;
    }
    next();
});

// Definir rutas
app.use('/api/clientes', rutas.clientes);
app.use('/api/servicios', rutas.servicios);
app.use('/api/usuarios', rutas.usuarios);
app.use('/api/tickets', rutas.tickets);
app.use('/api/comentarios', rutas.comentarios);
app.use('/api/adjuntos', rutas.adjuntos);
app.use('/api/auditoria', rutas.auditoria);

// Middleware de manejo de errores
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
});

// Iniciar servidor
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});