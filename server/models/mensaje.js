const mongoose = require('mongoose');

const mensajeSchema = new mongoose.Schema({
    user: {
        type: String,
        required: true,
        trim: true
    },
    mensaje: {
        type: String,
        required: true,
        trim: true
    }
}, {
    collection: 'mensajes'
});

module.exports = mongoose.model('Mensaje', mensajeSchema);
