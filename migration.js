// migration.js - Agregar campo password_hash a tabla clientes
const pool = require('./conexionDB.js');

async function runMigration() {
  try {
    // Verificar si la columna ya existe
    const check = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'clientes' 
      AND column_name = 'password_hash'
    `);

    if (check.rows.length === 0) {
      console.log('Agregando columna password_hash a tabla clientes...');
      await pool.query(`
        ALTER TABLE clientes 
        ADD COLUMN password_hash TEXT
      `);
      console.log('✓ Columna password_hash agregada exitosamente');
    } else {
      console.log('✓ Columna password_hash ya existe');
    }

    console.log('Migración completada');
    process.exit(0);
  } catch (err) {
    console.error('Error en migración:', err);
    process.exit(1);
  }
}

runMigration();
