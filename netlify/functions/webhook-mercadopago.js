// netlify/functions/webhook-mercadopago.js
// Mercado Pago llama esta función automáticamente cada vez que el estado
// de un pago cambia. Cuando confirma que un pago quedó "approved" (aprobado),
// sumamos esos kilos al contador real de la vaca.

const { getStore } = require('@netlify/blobs');

exports.handler = async function (event) {
  try {
    // Mercado Pago manda el ID del pago por query string o dentro del body,
    // según el tipo de notificación (webhook nuevo vs. IPN clásico).
    const params = event.queryStringParameters || {};
    let paymentId = params['data.id'] || params['id'];
    let topic = params['type'] || params['topic'];

    if (!paymentId && event.body) {
      try {
        const body = JSON.parse(event.body);
        paymentId = (body.data && body.data.id) || paymentId;
        topic = body.type || topic;
      } catch (e) { /* body no era JSON, lo ignoramos */ }
    }

    // Solo nos interesan notificaciones de pagos (no de otros eventos)
    if (topic !== 'payment' || !paymentId) {
      return { statusCode: 200, body: 'ok' };
    }

    // Nunca confiamos ciegamente en el webhook: consultamos el pago real
    // directamente en la API de Mercado Pago con nuestro Access Token.
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
    });
    const payment = await res.json();

    if (!res.ok || payment.status !== 'approved') {
      return { statusCode: 200, body: 'ok' };
    }

    const kilos = parseInt(payment.metadata && payment.metadata.kilos, 10) || 0;
    if (kilos <= 0) {
      return { statusCode: 200, body: 'ok' };
    }

    // Evitamos contar el mismo pago dos veces (Mercado Pago puede reenviar
    // la misma notificación varias veces).
    const procesados = getStore('pagos-procesados');
    const yaProcesado = await procesados.get(String(paymentId));
    if (yaProcesado) {
      return { statusCode: 200, body: 'ok' };
    }

    const vaca = getStore('vaca-origen');
    const actualKilos = parseInt(await vaca.get('kilosVendidos'), 10) || 0;
    const actualPersonas = parseInt(await vaca.get('personas'), 10) || 0;

    await vaca.set('kilosVendidos', String(actualKilos + kilos));
    await vaca.set('personas', String(actualPersonas + 1));
    await procesados.set(String(paymentId), '1');

    return { statusCode: 200, body: 'ok' };
  } catch (err) {
    // Siempre respondemos 200: si le devolvemos un error, Mercado Pago
    // reintenta indefinidamente la misma notificación.
    return { statusCode: 200, body: 'ok' };
  }
};
