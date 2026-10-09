// Guardar en el cache dinamico
function actualizaCacheDinamico(dynamicCache, req, res) {
  if (res.ok) {
    return caches.open(dynamicCache).then((cache) => {
      cache.put(req, res.clone());
      return res.clone();
    });
  } else {
    return res;
  }
}

// Cache with network update
function actualizaCacheStatico(staticCache, req, APP_SHELL_INMUTABLE) {
  if (APP_SHELL_INMUTABLE.includes(req.url)) {
    // No hace falta actualizar el inmutable
  } else {
    return fetch(req).then((res) => {
      return actualizaCacheDinamico(staticCache, req, res);
    });
  }
}

// Network with cache fallback / update
function manejoApiMensajes(cacheName, req) {

  // ----- POST -----
  if (req.method === "POST") {

    const guardarPendiente = () => req.clone().json().then(guardarMensaje);

    return fetch(req.clone()).then(
      (res) => {
        if (!res.ok) {
          return guardarPendiente();
        }

        return res
          .clone()
          .json()
          .then(
            (body) => {
              return body && body.ok === false ? guardarPendiente() : res;
            },
            () => res,
          );
      },
      () => guardarPendiente(),
    );
  }

  // ----- Otros métodos que no son GET -----
  else if (req.method !== "GET") {
    return fetch(req);
  }

  // ----- GET -----
  else {
    return fetch(req)
      .then((res) => {
        if (res.ok) {
          actualizaCacheDinamico(cacheName, req, res.clone());

          res
            .clone()
            .json()
            .then((body) => {
              const mensajes = Array.isArray(body)
                ? body
                : (body && body.mensajes) || [];
              return guardarMensajesEnObjectStore(mensajes);
            })
            .catch((err) =>
              console.warn(
                "SW: no se pudo actualizar ObjectStore mensajes:",
                err,
              ),
            );

          return res.clone();
        } else {
          return caches.match(req);
        }
      })
      .catch(() => {
        return caches.match(req);
      });
  }
}