// netlify/functions/estado.js
// Expone cuántos kilos se han vendido REALMENTE y cuántas personas han comprado.
// La página web llama esta función al cargar para mostrar el progreso actualizado.

const { getStore, connectLambda } = require('@netlify/blobs');

exports.handler = async function (event) {
  try {
    connectLambda(event);
    const vaca = getStore('vaca-origen');
    const kilosVendidos = parseInt(await vaca.get('kilosVendidos'), 10) || 0;
    const personas = parseInt(await vaca.get('personas'), 10) || 0;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kilosVendidos, personas, metaKilos: 400 }),
    };
  } catch (err) {
    // Si algo falla, devolvemos 0 en vez de romper la página
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kilosVendidos: 0, personas: 0, metaKilos: 400 }),
    };
  }
};
