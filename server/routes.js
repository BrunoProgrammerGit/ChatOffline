// Routes.js - Módulo de rutas
var express = require("express");
var router = express.Router();
const mongoose = require('mongoose');
const Mensaje = require('./models/mensaje');

// Get mensajes
// Get mensajes
router.get("/", async function (req, res) {
    try {
        const mensajes = await Mensaje.find().sort({ _id: 1 });

        return res.status(200).json({
            ok: true,
            mensajes
        });

    } catch (err) {
        console.error('No se pudieron leer los mensajes:', err);

        const connectionError = mongoose.connection.readyState !== 1 ||
            /MongooseServerSelectionError|MongoNetworkError|MongoNetworkTimeoutError|MongoTimeoutError/.test(err.name) ||
            ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNRESET'].includes(err.code);

        return res.status(connectionError ? 503 : 500).json({
            ok: false,
            errorType: connectionError ? 'connection' : 'database',
            error: connectionError
                ? 'No hay conexión con la base de datos'
                : 'No se pudieron leer los mensajes de la base de datos'
        });
    }
});

// Post mensaje
router.post('/', async function (req, res) {
    try {
        const user = req.body?.user;
        const texto = req.body?.mensaje;

        if (typeof user !== 'string' || typeof texto !== 'string' ||
            !user.trim() || !texto.trim()) {
            return res.status(400).json({
                ok: false,
                errorType: 'validation',
                error: "Mensaje o usuario vacíos"
            });
        }

        const mensaje = await Mensaje.create(req.body);
        return res.status(200).json({
            ok: true,
            mensaje
        });
    } catch (err) {
        console.error('No se pudo guardar el mensaje:', err);

        const connectionError = mongoose.connection.readyState !== 1 ||
            /MongooseServerSelectionError|MongoNetworkError|MongoNetworkTimeoutError|MongoTimeoutError/.test(err.name) ||
            ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNRESET'].includes(err.code);

        return res.status(connectionError ? 503 : 500).json({
            ok: false,
            errorType: connectionError ? 'connection' : 'database',
            error: connectionError
                ? 'No hay conexión con la base de datos'
                : 'No se pudo guardar el mensaje en la base de datos'
        });
    }
});

router.delete("/:id", async function (req, res) {
  const id = req.params.id;

  if (!mongoose.isObjectIdOrHexString(id)) {
    return res.status(400).json({
      ok: false,
      error: "Id de mensaje inválido"
    });
  }

  const eliminado = await Mensaje.findByIdAndDelete(id);
  if (!eliminado) {
    return res.status(404).json({
      ok: false,
      error: `No existe un mensaje con el id ${id}`,
    });
  }

  res.json({
    ok: true,
    mensaje: eliminado,
  });
});


module.exports = router;
