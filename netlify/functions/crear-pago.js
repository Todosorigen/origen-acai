// netlify/functions/crear-pago.js
// Esta función corre en el servidor (nunca en el navegador del cliente).
// Recibe la cantidad de kilos, calcula el precio de forma segura,
// y le pide a Mercado Pago que genere un link de pago (preferencia).

exports.handler = async function (event) {
  // Solo aceptamos peticiones POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Método no permitido' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const kilos = parseInt(body.kilos, 10);

    // Validamos la cantidad (nunca confíes en datos que vienen del navegador)
    if (!kilos || kilos < 1 || kilos > 20) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Cantidad de kilos inválida' }),
      };
    }

    // ---- Precio calculado aquí en el servidor, no en el navegador ----
    const PULPA = 23000;
    const TRANSPORTE = 5000;
    const DOMICILIO = 3500;
    const COMISION = 0.05;

    const subtotal = (PULPA + TRANSPORTE + DOMICILIO) * kilos;
    const total = Math.round(subtotal * (1 + COMISION));

    // ---- Armamos la preferencia de pago para Mercado Pago ----
    const preference = {
      items: [
        {
          title: `${kilos} ${kilos === 1 ? 'kilo' : 'kilos'} de açaí — Origen`,
          quantity: 1,
          unit_price: total,
          currency_id: 'COP',
        },
      ],
      back_urls: {
        success: 'https://todosorigen.co/?estado=aprobado',
        failure: 'https://todosorigen.co/?estado=fallido',
        pending: 'https://todosorigen.co/?estado=pendiente',
      },
      auto_return: 'approved',
    };

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preference),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'No se pudo generar el pago', detalle: data }),
      };
    }

    // Le devolvemos al navegador el link al que debe redirigir al cliente
    return {
      statusCode: 200,
      body: JSON.stringify({ init_point: data.init_point }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error interno', detalle: err.message }),
    };
  }
};
