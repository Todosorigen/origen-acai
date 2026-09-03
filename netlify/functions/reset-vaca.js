// netlify/functions/reset-vaca.js
// Reinicia el contador de kilos vendidos y personas a 0 (vuelve a "Faltan 400 kilos").
// Úsala UNA SOLA VEZ para borrar las compras de prueba internas antes de lanzar de verdad.
// Protegida con la misma clave del panel de pedidos (ADMIN_PASSWORD).
//
// Cómo usarla: entra en el navegador a
//   https://todosorigen.co/.netlify/functions/reset-vaca?clave=TU_CLAVE&confirmar=si

const { getStore, connectLambda } = require('@netlify/blobs');

exports.handler = async function (event) {
  try {
    connectLambda(event);
    const params = event.queryStringParameters || {};
    const clave = params.clave || '';
    const confirmar = params.confirmar || '';

    if (!process.env.ADMIN_PASSWORD || clave !== process.env.ADMIN_PASSWORD) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Clave incorrecta' }),
      };
    }

    if (confirmar !== 'si') {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Falta confirmar. Agrega &confirmar=si al final de la URL para reiniciar de verdad.',
        }),
      };
    }

    const vaca = getStore('vaca-origen');
    await vaca.set('kilosVendidos', '0');
    await vaca.set('personas', '0');

    // También borramos los pedidos de prueba (nombre/dirección) guardados
    // durante las pruebas internas, para que el panel arranque limpio.
    const pedidos = getStore('pedidos-origen');
    const { blobs } = await pedidos.list();
    await Promise.all(blobs.map((b) => pedidos.delete(b.key)));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, mensaje: 'Contador reiniciado a 0 kilos vendidos, pedidos de prueba borrados.' }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Error interno', detalle: err.message }),
    };
  }
};
