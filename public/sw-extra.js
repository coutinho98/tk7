// Carregado pelo service worker gerado: ao tocar na notificação, volta para o app.
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) =>
      list.length ? list[0].focus() : self.clients.openWindow('./#/sessao')
    )
  );
});
