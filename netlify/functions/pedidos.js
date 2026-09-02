// netlify/functions/pedidos.js
// Devuelve la lista completa de pedidos (nombre, dirección, teléfono, kilos)
// para que puedas consultarlos y despacharlos. Protegida con una contraseña
// simple para que solo tú puedas verla.

const { getStore } = require('@netlify/blobs');

exports.handler = async function (event) {
  try {
    const clave = (event.queryStringParameters && event.queryStringParameters.clave) || '';

    // La contraseña se guarda como variable de entorno (ADMIN_PASSWORD),
    // igual que hicimos con el Access Token de Mercado Pago.
    if (!process.env.ADMIN_PASSWORD || clave !== process.env.ADMIN_PASSWORD) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Clave incorrecta' }),
      };
    }

    const pedidos = getStore('pedidos-origen');
    const { blobs } = await pedidos.list();

    const lista = await Promise.all(
      blobs.map(async (b) => await pedidos.get(b.key, { type: 'json' }))
    );

    // Más recientes primero
    lista.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pedidos: lista }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Error interno', detalle: err.message }),
    };
  }
};
