// auth.js - simple in-memory session store
const crypto = require('crypto');

// token --> { id, nombre, email, rol, tipo }
const sessions = {};

function createSession(user) {
  const token = crypto.randomBytes(24).toString('hex');
  sessions[token] = { ...user, createdAt: Date.now() };
  return token;
}

function getSession(token) {
  return sessions[token];
}

module.exports = { createSession, getSession };
