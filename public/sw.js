importScripts('js/sw-db.js');
importScripts('js/sw-utils.js');


const STATIC_CACHE    = 'static-v5';
const DYNAMIC_CACHE   = 'dynamic-v1';
const INMUTABLE_CACHE = 'inmutable-v1';


const APP_SHELL = [
    '/',
    'index.html',
    'css/style.css',
    'img/favicon.ico',
    'img/avatars/hulk.jpg',
    'img/avatars/ironman.jpg',
    'img/avatars/spiderman.jpg',
    'img/avatars/thor.jpg',
    'img/avatars/wolverine.jpg',
    'js/app.js',
    'js/sw-db.js',
    'js/sw-utils.js',
    'js/libs/plugins/mdtoast.min.js',
    'js/libs/plugins/mdtoast.min.css'
];

const APP_SHELL_INMUTABLE = [
    'https://fonts.googleapis.com/css?family=Quicksand:300,400',
    'https://fonts.googleapis.com/css?family=Lato:400,300',
    'https://use.fontawesome.com/releases/v5.3.1/css/all.css',
    'https://cdnjs.cloudflare.com/ajax/libs/animate.css/3.7.0/animate.css',
    'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.3.1/jquery.min.js'
];



self.addEventListener('install', e => {

    const cacheStatic = caches.open( STATIC_CACHE ).then(cache =>
        cache.addAll( APP_SHELL ));

    const cacheInmutable = caches.open( INMUTABLE_CACHE ).then(cache =>
        Promise.all(
            APP_SHELL_INMUTABLE.map( url =>
                // no-cors evita el bloqueo por CORS (respuesta opaque)
                fetch( url, { mode: 'no-cors' } )
                    // cache.put sí acepta respuestas opaque (cache.add no)
                    .then( res => cache.put( url, res ) )
                    // si un CDN falla, no tumba la instalación del SW
                    .catch( err => console.warn('No se pudo cachear:', url, err) )
            )
        )
    );

    e.waitUntil( Promise.all([ cacheStatic, cacheInmutable, inicializarBaseDeDatos() ]) );

});


self.addEventListener('activate', e => {

    const respuesta = caches.keys().then( keys =>
        Promise.all(
            keys.map( key => {

                if ( key !== STATIC_CACHE && key.includes('static') ) {
                    return caches.delete(key);
                }

                if ( key !== DYNAMIC_CACHE && key.includes('dynamic') ) {
                    return caches.delete(key);
                }

            })
        )
    );

    e.waitUntil( respuesta );

});



self.addEventListener( 'fetch', e => {
    let respuesta;

    if ( e.request.url.includes('/api') ) {
        respuesta = manejoApiMensajes( DYNAMIC_CACHE, e.request );
    } else {
        respuesta = caches.match( e.request ).then( res => {
            if ( res ) {
                actualizaCacheStatico( STATIC_CACHE, e.request, APP_SHELL_INMUTABLE );
                return res;
            } else {
                return fetch( e.request ).then( newRes => {
                    return actualizaCacheDinamico( DYNAMIC_CACHE, e.request, newRes );
                });
            }
        });

    }

    e.respondWith( respuesta );

});


// ---------- Sincronización de mensajes pendientes ----------

function notificarClientes(tipo) {
    return self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(clientes => {
            clientes.forEach(cliente => cliente.postMessage({ tipo }));
        });
}

// Evento de Background Sync (cuando el navegador lo permite)
self.addEventListener('sync', e => {

    console.log('SW: Sync');

    if ( e.tag === 'nuevo-post' ) {

        const respuesta = postearMensajes().then(
            enviados => enviados > 0 ? notificarClientes('sincronizacion-exitosa') : undefined,
            error => notificarClientes('sincronizacion-fallida').then(() => {
                // relanzamos el error para que el navegador reintente el sync
                throw error;
            })
        );

        e.waitUntil( respuesta );
    }

});

self.addEventListener('message', e => {

    if ( e.data && e.data.tipo === 'sincronizar' ) {

        const respuesta = postearMensajes().then(
            enviados => enviados > 0 ? notificarClientes('sincronizacion-exitosa') : undefined,
            error => {
                console.error('SW: falló la sincronización manual:', error);
                return notificarClientes('sincronizacion-fallida');
            }
        );

        e.waitUntil( respuesta );
    }

});