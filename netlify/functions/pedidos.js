// netlify/functions/pedidos.js
// Devuelve la lista completa de pedidos (nombre, dirección, teléfono, kilos)
// para que puedas consultarlos y despacharlos. Protegida con una contraseña
// simple para que solo tú puedas verla.

const { getStore } = require('@netlify/blobs');

exports.handler = async function (event) {
  try {
    const clave = (event.queryStringParameters && event.queryStringParameters.clave) || '';
    const claveGuardada = process.env.ADMIN_PASSWORD || '';

    // --- Diagnóstico temporal (se ve en el log de Netlify, no en el navegador) ---
    console.log('DIAGNÓSTICO clave recibida, longitud:', clave.length);
    console.log('DIAGNÓSTICO ADMIN_PASSWORD existe:', !!process.env.ADMIN_PASSWORD, '- longitud:', claveGuardada.length);
    console.log('DIAGNÓSTICO ¿coinciden?:', clave === claveGuardada);

    // La contraseña se guarda como variable de entorno (ADMIN_PASSWORD),
    // igual que hicimos con el Access Token de Mercado Pago.
    if (!claveGuardada || clave !== claveGuardada) {
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
