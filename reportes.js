// Pantalla de reportes: pide los datos a /api/reportes y dibuja tarjetas y barras (sin librerías de gráficas)
$(function () {
  $(document).ajaxError((e, x) => { if (x.status === 401) location.href = '/login'; });
  const esc = s => $('<i>').text(s ?? '').html();
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const colores = { 'Recibido': '#2e9e4f', 'En proceso': '#f0b429', 'Atendido': '#1a73e8' };
  const filtros = () => ({ desde: $('#desde').val(), hasta: $('#hasta').val() });
  const fechaCorta = d => d.split('-').reverse().join('/');

  // Barra horizontal: etiqueta, barra proporcional y cantidad
  const barra = (nombre, n, max, color) => `
    <div class="hbar">
      <span title="${esc(nombre)}">${esc(nombre)}</span>
      <div class="track"><div class="fill" style="width:${max ? (n / max * 100) : 0}%;background:${color}"></div></div>
      <b>${n}</b>
    </div>`;

  function lista(filas) {
    if (!filas.length) return '<p class="vacio">Sin datos.</p>';
    const max = Math.max(...filas.map(f => +f.n));
    return filas.map(f => barra(f.nombre, +f.n, max, 'var(--blue)')).join('');
  }

  function cargar() {
    $.getJSON('/api/reportes', filtros()).done(r => {
      const f = filtros(), total = +r.total;
      $('#periodo').text(
        f.desde || f.hasta
          ? `Periodo: ${f.desde ? fechaCorta(f.desde) : 'inicio'} al ${f.hasta ? fechaCorta(f.hasta) : 'hoy'}`
          : 'Periodo: todos los documentos'
      );

      // Tarjetas con el total y cada estatus
      const pct = n => total ? Math.round(n / total * 100) + '%' : '0%';
      let h = `<div class="card"><small>Total de documentos</small><strong>${total}</strong></div>`;
      Object.keys(colores).forEach(e => {
        h += `<div class="card" style="border-left:5px solid ${colores[e]}"><small>${e}</small><strong>${r.estatus[e]}</strong><span class="pct">${pct(r.estatus[e])} del total</span></div>`;
      });
      $('#cards').html(h);

      if (!total) {
        $('#porEstatus, #porMes, #topRem, #topDest').html('<p class="vacio">No hay documentos en este periodo.</p>');
        return;
      }

      // Por estatus
      $('#porEstatus').html(Object.keys(colores).map(e => barra(e, +r.estatus[e], total, colores[e])).join(''));

      // Por mes (columnas verticales)
      const max = Math.max(...r.meses.map(m => +m.n));
      $('#porMes').html('<div class="cols">' + r.meses.map(m => {
        const [y, mm] = m.mes.split('-');
        return `<div class="col"><b>${m.n}</b><div class="v" style="height:${Math.max(4, Math.round(m.n / max * 120))}px"></div><span>${meses[+mm - 1]} ${y.slice(2)}</span></div>`;
      }).join('') + '</div>');

      // Más frecuentes
      $('#topRem').html(lista(r.remitentes));
      $('#topDest').html(lista(r.destinatarios));
    }).fail(() => $('#periodo').text('No se pudo cargar el reporte.'));
  }

  $('#btnGenerar').on('click', cargar);
  $('#btnPrint').on('click', () => window.print());               // en "Imprimir" se puede elegir "Guardar como PDF"
  $('#btnCsv').on('click', () => { location.href = '/api/export?' + $.param(filtros()); });
  $('#menuBtn').on('click', () => $('#side').toggleClass('open'));
  cargar();
});
