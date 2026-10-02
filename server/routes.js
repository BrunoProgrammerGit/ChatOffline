// Routes.js - Módulo de rutas
var express = require("express");
var router = express.Router();

const mensajes = [
  {
    _id: '1',
    user: 'spiderman',
    mensaje: 'Hola Mundo'
  }

];

function getNextId(){
  if(mensajes.length === 0) return '1';
  const ids = mensajes 
  .map(m => parseInt(m._id, 10))
  .filter(id => !isNaN(id));
  const maxId = ids.length > 0 ? Math.max(...ids) : 0;
  return String(maxId + 1);
}

// Get mensajes
router.get("/", function (req, res) {
  // res.json('Obteniendo mensajes');
  res.json(mensajes);
});

// Post mensaje
router.post("/", function (req, res) {
  const mensaje = {
    _id: getNextId(),
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
