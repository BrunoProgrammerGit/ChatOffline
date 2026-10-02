// Routes.js - Módulo de rutas
var express = require('express');
var router = express.Router();


const mensajes = [

  {
    _id: 'XXX',
    user: 'spiderman',
    mensaje: 'Hola Mundo'
  }

];


// Get mensajes
router.get('/', function (req, res) {
  // res.json('Obteniendo mensajes');
  res.json( mensajes );
});


// Post mensaje
router.post('/', function (req, res) {
    const mensaje = {
        mensaje: req.body.mensaje,
        user: req.body.user
    };
    
    if(!validMessage(mensaje)){
        return res.status(400).json({
            ok: false,
            error: "Mensaje o usuario vacíos" 
        })
    }

  mensajes.push( mensaje );

  console.log(mensajes);


  res.json({
    ok: true,
    mensaje
  });
});

function validMessage(mensaje){
    return Boolean(mensaje?.mensaje?.trim() && mensaje?.user?.trim());
}


module.exports = router;