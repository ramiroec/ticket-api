// mailer.js - pequeño wrapper sobre nodemailer para enviar correos.
const nodemailer = require('nodemailer');

// Transportador simple que imprime el correo en consola.
// En un entorno real se podría configurar SMTP real.
const transporter = nodemailer.createTransport({ jsonTransport: true });

async function sendMail({ to, subject, text, html }) {
  const info = await transporter.sendMail({
    from: 'soporte@miempresa.com',
    to,
    subject,
    text,
    html
  });
  console.log('Mail enviado (simulado):', info);
  return info;
}

module.exports = { sendMail };
