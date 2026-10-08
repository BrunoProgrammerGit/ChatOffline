const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });


const app = express();


const publicPath = path.resolve(__dirname, '../public');
const port = process.env.PORT || 3000;
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27018/chatoffline';


app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies


// Directorio Público
app.use(express.static(publicPath));

// Rutas 
const routes = require('./routes');
app.use('/api', routes );



mongoose.connect(mongoUri)
    .then(() => {
        console.log('Conectado a MongoDB');
        app.listen(port, () => {
            console.log(`Servidor corriendo en puerto ${ port }`);
        });
    })
    .catch((err) => {
        console.error('No se pudo conectar a MongoDB:', err.message);
        process.exitCode = 1;
    });

app.use((err, req, res, next) => {
    console.error('Error en la API:', err);
    if (res.headersSent) {
        return next(err);
    }
    res.status(500).json({
        ok: false,
        error: 'Error interno del servidor'
    });
});