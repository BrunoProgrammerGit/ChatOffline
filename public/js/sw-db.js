const OFFLINE_DB_NAME = 'chat-offline-db';
const OFFLINE_STORE_NAME = 'mensajes-offline';
let offlineDbPromise;

function abrirBaseDeDatos() {
    if ( !offlineDbPromise ) {
        offlineDbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(OFFLINE_DB_NAME, 1);

            request.onupgradeneeded = () => {
                const db = request.result;
                if ( !db.objectStoreNames.contains(OFFLINE_STORE_NAME) ) {
                    db.createObjectStore(OFFLINE_STORE_NAME, { keyPath: '_id' });
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
                .catch(err => console.error('No se pudo programar la sincronización:', err));
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

        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('No se pudo eliminar el mensaje sincronizado.'));
    }));
}

function postearMensajes() {
    return leerMensajesPendientes().then(mensajes => mensajes.reduce((cola, mensaje) => {
        return cola.then(() => fetch(new URL('api', self.registration.scope), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user: mensaje.user,
                mensaje: mensaje.mensaje
            })
        })).then(res => {
            if ( !res.ok ) {
                throw new Error(`La API rechazó el mensaje offline (${res.status}).`);
            }
            return eliminarMensajePendiente(mensaje._id);
        });
    }, Promise.resolve()));
}
