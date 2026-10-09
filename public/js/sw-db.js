const OFFLINE_DB_NAME = 'chat-offline-db';
const OFFLINE_DB_VERSION = 2;
const OFFLINE_STORE_NAME = 'mensajes-offline';
const MENSAJES_STORE_NAME = 'mensajes';

let offlineDbPromise;
let sincronizando = null;

function abrirBaseDeDatos() {
    if ( !offlineDbPromise ) {
        offlineDbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);

            request.onupgradeneeded = () => {
                const db = request.result;

                if ( !db.objectStoreNames.contains(OFFLINE_STORE_NAME) ) {
                    db.createObjectStore(OFFLINE_STORE_NAME, { keyPath: '_id' });
                }

                if ( !db.objectStoreNames.contains(MENSAJES_STORE_NAME) ) {
                    db.createObjectStore(MENSAJES_STORE_NAME, { keyPath: '_id' });
                }
            };

            request.onsuccess = () => {
                const db = request.result;
                db.onversionchange = () => {
                    db.close();
                    offlineDbPromise = null;
                };
                resolve(db);
            };

            request.onerror = () => reject(request.error);
            request.onblocked = () => reject(new Error('La base de datos de mensajes offline está bloqueada.'));
        });
    }

    return offlineDbPromise;
}

function inicializarBaseDeDatos() {
    return abrirBaseDeDatos().then(() => undefined);
}

function guardarMensaje(mensaje) {
    console.log('SW-DB: guardando mensaje en offline');
    return abrirBaseDeDatos().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(OFFLINE_STORE_NAME, 'readwrite');
        const id = (self.crypto && self.crypto.randomUUID)
            ? self.crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

        tx.objectStore(OFFLINE_STORE_NAME).add({
            ...mensaje,
            _id: id,
            creado: new Date().toISOString()
        });

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('No se pudo guardar el mensaje offline.'));
    })).then(() => {
        if ( self.registration.sync ) {
            return self.registration.sync.register('nuevo-post')
                .catch(err => {
                    console.warn('SW-DB: Background Sync no disponible:', err.name);
                });
        }
    }).then(() => new Response(JSON.stringify({ ok: true, offline: true }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' }
    }));
}

function leerMensajesPendientes() {
    return abrirBaseDeDatos().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(OFFLINE_STORE_NAME, 'readonly');
        const request = tx.objectStore(OFFLINE_STORE_NAME).getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        tx.onabort = () => reject(tx.error || new Error('No se pudieron leer los mensajes offline.'));
    }));
}

function eliminarMensajePendiente(id) {
    return abrirBaseDeDatos().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(OFFLINE_STORE_NAME, 'readwrite');
        tx.objectStore(OFFLINE_STORE_NAME).delete(id);

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('No se pudo eliminar el mensaje sincronizado.'));
    }));
}

function guardarMensajesEnObjectStore(mensajes) {
    if ( !Array.isArray(mensajes) ) return Promise.resolve();

    return abrirBaseDeDatos().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(MENSAJES_STORE_NAME, 'readwrite');
        const store = tx.objectStore(MENSAJES_STORE_NAME);

        store.clear();

        mensajes.forEach(m => {
            store.put({
                _id: String(m._id),
                user: m.user,
                mensaje: m.mensaje
            });
        });

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('No se pudo actualizar el ObjectStore mensajes.'));
    }));
}

function fetchConTimeout(url, opciones, ms) {
    ms = ms || 8000;
    return Promise.race([
        fetch(url, opciones),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout de sincronización')), ms)
        )
    ]);
}

function postearMensajes() {
    if ( sincronizando ) return sincronizando;

    sincronizando = leerMensajesPendientes().then(mensajes => {

        console.log('SW-DB: pendientes encontrados =', mensajes.length);

        if ( mensajes.length === 0 ) return 0;

        let enviados = 0;

        return mensajes.reduce((cola, mensaje) => {
            return cola.then(() => {
                console.log('SW-DB: enviando', mensaje._id);
                return fetchConTimeout(new URL('api', self.registration.scope), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user: mensaje.user,
                        mensaje: mensaje.mensaje
                    })
                });
            }).then(res => {
                console.log('SW-DB: respuesta', res.status, res.ok);
                if ( !res.ok ) {
                    throw new Error(`La API rechazó el mensaje offline (${res.status}).`);
                }
                return eliminarMensajePendiente(mensaje._id);
            }).then(() => {
                console.log('SW-DB: borrado', mensaje._id);
                enviados++;
            });
        }, Promise.resolve()).then(() => {
            console.log('SW-DB: total enviados =', enviados);
            return enviados;
        });

    }).catch(err => {
        console.error('SW-DB: error en postearMensajes:', err);
        return 0;
    }).finally(() => {
        sincronizando = null;
    });

    return sincronizando;
}