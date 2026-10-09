var url = window.location.href;
var swLocation = '/sw.js';


if (navigator.serviceWorker) {

    if (url.includes('localhost')) {
        swLocation = '/sw.js';
    }

    navigator.serviceWorker.register(swLocation);
}


var titulo = $('#titulo');
var nuevoBtn = $('#nuevo-btn');
var salirBtn = $('#salir-btn');
var cancelarBtn = $('#cancel-btn');
var postBtn = $('#post-btn');
var avatarSel = $('#seleccion');
var timeline = $('#timeline');

var modal = $('#modal');
var modalAvatar = $('#modal-avatar');
var avatarBtns = $('.seleccion-avatar');
var txtMensaje = $('#txtMensaje');

var usuario;


function crearMensajeHTML(mensaje, personaje) {

    var content =`
    <li class="animated fadeIn fast">
        <div class="avatar">
            <img src="img/avatars/${personaje }.jpg">
        </div>
        <div class="bubble-container">
            <div class="bubble">
                <h3>@${personaje }</h3>
                <br/>
                ${mensaje }
            </div>
            
            <div class="arrow"></div>
        </div>
    </li>
    `;

    timeline.prepend(content);
    cancelarBtn.click();

}


function logIn(ingreso) {

    if (ingreso) {
        nuevoBtn.removeClass('oculto');
        salirBtn.removeClass('oculto');
        timeline.removeClass('oculto');
        avatarSel.addClass('oculto');
        modalAvatar.attr('src', 'img/avatars/' + usuario + '.jpg');
    } else {
        nuevoBtn.addClass('oculto');
        salirBtn.addClass('oculto');
        timeline.addClass('oculto');
        avatarSel.removeClass('oculto');

        titulo.text('Seleccione Personaje');
    }

}


avatarBtns.on('click', function () {

    usuario = $(this).data('user');

    titulo.text('@' + usuario);

    logIn(true);

});

salirBtn.on('click', function () {

    logIn(false);

});

nuevoBtn.on('click', function () {

    modal.removeClass('oculto');
    modal.animate({
        marginTop: '-=1000px',
        opacity: 1
    }, 200);

});

cancelarBtn.on('click', function () {
    if (!modal.hasClass('oculto')) {
        modal.animate({
            marginTop: '+=1000px',
            opacity: 0
        }, 200, function () {
            modal.addClass('oculto');
            txtMensaje.val('');
        });
    }
});

postBtn.on('click', function () {

    var mensaje = txtMensaje.val();
    if (mensaje.length === 0) {
        cancelarBtn.click();
        return;
    }

    var data = {
        mensaje: mensaje,
        user: usuario
    };

    fetch('api', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
        .then(res => res.json())
        .then(res => {
            console.log('app.js POST ok:', res);

            if (res && res.ok === false && res.errorType === 'connection') {
                guardarMensajeOffline(data);
            }
        })
        .catch(err => {
            console.log('app.js POST falló:', err.message);
            guardarMensajeOffline(data);
        });

    crearMensajeHTML(mensaje, usuario);

});



function getMensajes() {

    fetch('api')
        .then(res => res.json())
        .then(res => {
            var posts = res.mensajes || res;
            console.log(posts);
            posts.forEach(post =>
                crearMensajeHTML(post.mensaje, post.user));
        }).catch(err => {
            alert("app.js No se pudieron leer los mensajes en el api");
        });

}
getMensajes();


function mostrarToast(mensaje, opciones) {
    if (typeof $.mdtoast !== 'function') {
        console.warn('mdtoast no disponible:', mensaje);
        return;
    }

    return $.mdtoast(mensaje, Object.assign({
        interaction: true,
        interactionTimeout: 2000,
        actionText: 'OK',
        type: 'info'
    }, opciones || {}));
}

var ultimoToast = { tipo: null, tiempo: 0 };
function mostrarToastUnico(tipo, mensaje, opciones) {
    var ahora = Date.now();
    if (ultimoToast.tipo === tipo && (ahora - ultimoToast.tiempo) < 1500) {
        return;
    }
    ultimoToast = { tipo: tipo, tiempo: ahora };
    return mostrarToast(mensaje, opciones);
}


var estabaOnline = navigator.onLine;

function isOnline() {

    var online = navigator.onLine;

    if (online) {

        if (!estabaOnline) {
            mostrarToastUnico('online', 'Conexión restablecida', {
                type: 'success',
                actionText: 'OK!'
            });
        }

        pedirSincronizacion();

    } else {

        if (estabaOnline) {
            mostrarToastUnico('offline', 'Sin conexión a Internet', {
                type: 'warning',
                actionText: 'OK'
            });
        }
    }

    estabaOnline = online;
}

window.addEventListener('online', () => isOnline());
window.addEventListener('offline', () => isOnline());


if (navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener('message', event => {

        if (!event.data) return;

        if (event.data.tipo === 'sincronizacion-exitosa') {
            mostrarToastUnico('sync-ok', 'Los registros se sincronizaron correctamente.', {
                type: 'success',
                actionText: 'OK!'
            });

        } else if (event.data.tipo === 'sincronizacion-fallida') {
            mostrarToastUnico('sync-error', 'No se pudieron sincronizar los registros.', {
                type: 'error',
                actionText: 'Reintentar',
                interaction: true,
                interactionTimeout: 4000
            });
        }
    });
}


function pedirSincronizacion() {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.ready.then(reg => {
        const sw = reg.active || reg.waiting || reg.installing;
        if (sw) {
            sw.postMessage({ tipo: 'sincronizar' });
        } else {
            console.warn('app.js: no hay Service Worker disponible para sincronizar');
        }
    });
}

estabaOnline = navigator.onLine;
if (estabaOnline) {
    pedirSincronizacion();
}

function guardarMensajeOffline(data) {

    var request = indexedDB.open('chat-offline-db', 2);

    request.onupgradeneeded = function () {
        var db = request.result;
        if (!db.objectStoreNames.contains('mensajes-offline')) {
            db.createObjectStore('mensajes-offline', { keyPath: '_id' });
        }
        if (!db.objectStoreNames.contains('mensajes')) {
            db.createObjectStore('mensajes', { keyPath: '_id' });
        }
    };

    request.onsuccess = function () {
        var db = request.result;
        var tx = db.transaction('mensajes-offline', 'readwrite');
        var store = tx.objectStore('mensajes-offline');

        var id = (self.crypto && self.crypto.randomUUID)
            ? self.crypto.randomUUID()
            : (Date.now() + '-' + Math.random().toString(16).slice(2));

        store.add({
            _id: id,
            user: data.user,
            mensaje: data.mensaje,
            creado: new Date().toISOString()
        });

        tx.oncomplete = function () {
            console.log('app.js: mensaje guardado en mensajes-offline');
            db.close();

            if (navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({ tipo: 'sincronizar' });
            }
        };

        tx.onerror = function () {
            console.error('app.js: error guardando offline:', tx.error);
            db.close();
        };
    };

    request.onerror = function () {
        console.error('app.js: error abriendo IndexedDB:', request.error);
    };
}

