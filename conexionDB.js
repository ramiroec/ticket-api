// conexionBD.js
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_n43SktorxjPs@ep-muddy-glitter-aikp9xcs-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
});

const pg = require('pg');

// Parser para manejar los tipos de datos de fecha y hora sin zona horaria
pg.types.setTypeParser(1114, function(stringValue) {
  return stringValue;  // 1114 es para el tipo de dato timestamp sin zona horaria
});

pg.types.setTypeParser(1082, function(stringValue) {
  return stringValue;  // 1082 es para el tipo de dato date
});

module.exports = pool;
