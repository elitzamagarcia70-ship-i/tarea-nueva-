// Comprueba la sesión al abrir cada pantalla: si no hay, manda a /login; si hay, muestra el nombre y la página.
$(function () {
  $.getJSON('/api/me')
    .done(u => { $('#userName').text(u.nombre); $('html').removeClass('cargando'); })
    .fail(() => { location.href = '/login'; });
});
