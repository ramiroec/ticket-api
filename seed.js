// seed.js - crea cuentas de desarrollo si no existen
const pool = require('./conexionDB');
const bcrypt = require('bcrypt');

async function seed() {
  try {
    const devTechEmail = process.env.DEV_TECH_EMAIL || 'dev@tech.local';
    const devTechPassword = process.env.DEV_TECH_PASSWORD || 'devpass';
    const devClientEmail = process.env.DEV_CLIENT_EMAIL || 'dev@client.local';
    const devClientPassword = process.env.DEV_CLIENT_PASSWORD || 'devpass';

    // técnico de desarrollo
    const { rows: techRows } = await pool.query('SELECT * FROM usuarios WHERE email=$1', [devTechEmail]);
    if (!techRows.length) {
      const hash = await bcrypt.hash(devTechPassword, 10);
      await pool.query(
        `INSERT INTO usuarios (nombre,email,password_hash,rol) VALUES ($1,$2,$3,$4)`,
        ['Dev Técnico', devTechEmail, hash, 'tecnico']
      );
      console.log('Usuario técnico de desarrollo creado:', devTechEmail, '/', devTechPassword);
    } else {
      console.log('Usuario técnico de desarrollo ya existe');
    }

    // cliente de desarrollo
    const { rows: clientRows } = await pool.query('SELECT * FROM clientes WHERE email=$1', [devClientEmail]);
    if (!clientRows.length) {
      const clientHash = await bcrypt.hash(devClientPassword, 10);
      await pool.query(
        `INSERT INTO clientes (empresa,contacto,email,password_hash,sla) VALUES ($1,$2,$3,$4,$5)`,
        ['Cliente Dev', 'Contacto Dev', devClientEmail, clientHash, 'Gold']
      );
      console.log('Cliente de desarrollo creado:', devClientEmail, '/', devClientPassword);
    } else {
      // Si el cliente existe pero no tiene contraseña, actualizarla
      const client = clientRows[0];
      if (!client.password_hash) {
        const clientHash = await bcrypt.hash(devClientPassword, 10);
        await pool.query(
          `UPDATE clientes SET password_hash=$1 WHERE email=$2`,
          [clientHash, devClientEmail]
        );
        console.log('Cliente de desarrollo actualizado con contraseña:', devClientEmail, '/', devClientPassword);
      } else {
        console.log('Cliente de desarrollo ya existe con contraseña');
      }
    }

    process.exit(0);
  } catch (err) {
    console.error('Error seeding datos de desarrollo:', err);
    process.exit(1);
  }
}

seed();