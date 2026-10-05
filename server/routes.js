// Routes.js - Módulo de rutas
var express = require("express");
var router = express.Router();
const mongoose = require('mongoose');
const Mensaje = require('./models/mensaje');

// Get mensajes
router.get("/", async function (req, res) {
  const mensajes = await Mensaje.find();
  res.json(mensajes);
});

// Post mensaje
router.post('/', async function (req, res) {
    const user = req.body?.user;
    const texto = req.body?.mensaje;

    if (typeof user !== 'string' || typeof texto !== 'string' ||
        !user.trim() || !texto.trim()) {
        return res.status(400).json({
            ok: false,
            error: "Mensaje o usuario vacíos"
        });
    }

    const mensaje = await Mensaje.create({
        user: user.trim(),
        mensaje: texto.trim()
    });

    res.status(201).json({
        ok: true,
        mensaje
    });
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
