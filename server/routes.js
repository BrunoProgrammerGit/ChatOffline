// Routes.js - Módulo de rutas
var express = require("express");
var router = express.Router();

const mensajes = [
  {
    _id: "XXX",
    user: "spiderman",
    mensaje: "Hola Mundo",
  },
];

// Get mensajes
router.get("/", function (req, res) {
  // res.json('Obteniendo mensajes');
  res.json(mensajes);
});

// Post mensaje
router.post("/", function (req, res) {
  const mensaje = {
    mensaje: req.body.mensaje,
    user: req.body.user,
  };

  mensajes.push(mensaje);

  console.log(mensajes);

  res.json({
    ok: true,
    mensaje,
  });
});

router.delete("/:id", function (req, res) {
  const id = req.params.id;
  const index = mensajes.findIndex((m) => m._id === id);

  if (index === -1) {
    return res.status(404).json({
      ok: false,
      error: `No existe un mensaje con el id ${id}`,
    });
  }
  const [eliminado] = mensajes.splice(index, 1);

  res.json({
    ok: true,
    mensaje: eliminado,
  });
});

module.exports = router;
