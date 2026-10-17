/* Gestión de Documentos · UNACH ETDA
   Lógica del navegador con jQuery: listado, búsqueda, filtros, formulario, visor, cámara/PDF y QR.
   Los datos se piden a /api/documentos con AJAX (JSON). */
$(function () {
  // Si la sesión venció, regresa al inicio de sesión
  $(document).ajaxError((e, x) => { if (x.status === 401) location.href = '/login'; });
  let page = 1;        // página actual del listado
  let archivo = null;  // archivo PDF que se va a subir
  const MAX_PDF = 4 * 1024 * 1024; // límite por petición de las funciones de Vercel
  const esc = s => $('<i>').text(s ?? '').html();
  const fecha = d => d.split('-').reverse().join('/');
  const fmt = b => b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
  const colores = { 'Recibido': '#2e9e4f', 'En proceso': '#f0b429', 'Atendido': '#1a73e8' };
  const params = () => ({ action: 'list', page, q: $('#q').val(), estatus: $('#estatus').val(), desde: $('#desde').val(), hasta: $('#hasta').val() });

  // Pide los documentos a /api/documentos con la búsqueda y los filtros actuales; dibuja la tabla y la paginación
  function load() {
    $.getJSON('/api/documentos', params()).done(r => {
      const $b = $('#rows').empty();
      if (!r.rows.length) $b.append('<tr><td colspan="7" class="empty">No hay documentos con esos filtros.</td></tr>');
      r.rows.forEach(d => {
        const pdf = d.archivo_pdf ? `<button class="ver" title="Ver documento">👁</button><a href="/api/archivo?id=${d.id_documento}&dl=1" download title="Descargar">⬇</a>` : '';
        const $tr = $(`<tr>
          <td data-l="No. Oficio">${esc(d.no_oficio)}</td><td data-l="Fecha">${fecha(d.fecha)}</td>
          <td data-l="Asunto">${esc(d.asunto)}</td><td data-l="Remitente">${esc(d.remitente)}</td>
          <td data-l="Destinatario">${esc(d.destinatario)}</td>
          <td data-l="Estatus"><span class="tag ${d.estatus.replace(' ', '-')}">${esc(d.estatus)}</span></td>
          <td data-l="Acciones"><div class="acc">${pdf}<button class="edit" title="Editar">✎</button><button class="del" title="Eliminar">🗑</button></div></td></tr>`);
        $tr.data('d', d).appendTo($b);
      });
      const pages = Math.max(1, Math.ceil(r.total / r.per)), from = r.total ? (r.page - 1) * r.per + 1 : 0;
      $('#info').text(`Mostrando ${from} a ${Math.min(r.page * r.per, r.total)} de ${r.total} registros`);
      let h = `<button data-p="${page - 1}" ${page <= 1 ? 'disabled' : ''}>‹</button>`;
      for (let i = Math.max(1, page - 2); i <= Math.min(pages, page + 2); i++) h += `<button data-p="${i}" class="${i == page ? 'cur' : ''}">${i}</button>`;
      $('#pager').html(h + `<button data-p="${page + 1}" ${page >= pages ? 'disabled' : ''}>›</button>`);
    });
  }

  // --- Archivo adjunto: ficha con el nombre y tamaño del archivo elegido ---
  function mostrarChip(nombre, tamano, esPdf) {
    $('#chipName').text(nombre); $('#chipSize').text(tamano);
    $('#chipIc').text(esPdf ? 'PDF' : 'IMG').toggleClass('img', !esPdf);
    $('#chip').prop('hidden', false);
  }
  function setArchivo(f) {
    archivo = f;
    if (f) mostrarChip(f.name, fmt(f.size), f.type === 'application/pdf');
    else $('#chip').prop('hidden', true);
  }
  $('#btnFoto').on('click', () => $('#fotoIn').click());
  $('#btnPdf').on('click', () => $('#pdfIn').click());
  // Arma un PDF de una página con una imagen JPEG, sin librerías externas (se hace en el navegador)
  function jpegAPdf(jpg, w, h) {
    const enc = new TextEncoder(), partes = [], pos = [];
    let largo = 0;
    const add = d => { const b = typeof d === 'string' ? enc.encode(d) : d; partes.push(b); largo += b.length; };
    const horiz = w > h, PW = horiz ? 842 : 595, PH = horiz ? 595 : 842;      // A4 en puntos
    const r = Math.min((PW - 30) / w, (PH - 30) / h), dw = w * r, dh = h * r;
    const contenido = `q ${dw.toFixed(2)} 0 0 ${dh.toFixed(2)} ${((PW - dw) / 2).toFixed(2)} ${((PH - dh) / 2).toFixed(2)} cm /Im0 Do Q`;
    const obj = (n, cab, flujo) => {
      pos[n] = largo; add(`${n} 0 obj\n${cab}`);
      if (flujo) { add('\nstream\n'); add(flujo); add('\nendstream'); }
      add('\nendobj\n');
    };
    add('%PDF-1.4\n');
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
    obj(4, `<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>`, jpg);
    obj(5, `<< /Length ${contenido.length} >>`, contenido);
    const xref = largo;
    add('xref\n0 6\n0000000000 65535 f \n');
    for (let i = 1; i <= 5; i++) add(String(pos[i]).padStart(10, '0') + ' 00000 n \n');
    add(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
    return new Blob(partes, { type: 'application/pdf' });
  }
  // Convierte una foto (cámara o imagen) en un archivo PDF
  function fotoAPdf(file) {
    return new Promise((ok, fail) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, 1800 / Math.max(img.width, img.height)); // reduce fotos muy grandes
        const w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k));
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h);
        c.toBlob(async b => {
          try {
            const jpg = new Uint8Array(await b.arrayBuffer());
            const nombre = 'Documento_' + new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '') + '.pdf';
            ok(new File([jpegAPdf(jpg, w, h)], nombre, { type: 'application/pdf' }));
          } catch (e) { fail(e); } finally { URL.revokeObjectURL(url); }
        }, 'image/jpeg', 0.8);
      };
      img.onerror = () => { URL.revokeObjectURL(url); fail(new Error('No se pudo leer la imagen')); };
      img.src = url;
    });
  }
  // Todo documento se almacena como PDF: el PDF se adjunta tal cual y la foto se convierte antes de subirla
  $('#pdfIn').on('change', function () {
    const f = this.files[0]; this.value = '';
    if (!f) return;
    if (f.type !== 'application/pdf') return $('#err').text('Selecciona un archivo PDF.');
    if (f.size > MAX_PDF) return $('#err').text('El PDF no puede pesar más de 4 MB.');
    $('#err').text(''); setArchivo(f);
  });
  $('#fotoIn').on('change', function () {
    const f = this.files[0]; this.value = '';
    if (!f) return;
    $('#err').text('Convirtiendo la foto a PDF...');
    fotoAPdf(f).then(p => {
      if (p.size > MAX_PDF) return $('#err').text('El PDF resultante pesa más de 4 MB. Toma la foto con menos resolución.');
      $('#err').text(''); setArchivo(p);
    }).catch(() => $('#err').text('No se pudo convertir la foto a PDF. Intenta con otra foto o selecciona un PDF.'));
  });
  $('#chipX').on('click', () => setArchivo(null));

  const punto = () => $('#dot').css('background', colores[$('#mEstatus').val()]);
  $('#mEstatus').on('change', punto);

  // Abre el formulario: vacío para registrar, o con los datos de la fila para editar
  function abrir(d) {
    $('#form')[0].reset(); $('#err').text(''); setArchivo(null);
    $('#mTitle').text(d ? '✎ Editar Documento' : '📄 Registrar Documento');
    $('#id').val(d?.id_documento || '');
    if (d) {
      ['no_oficio', 'fecha', 'asunto', 'remitente', 'destinatario'].forEach(k => $('#' + k).val(d[k]));
      $('#mEstatus').val(d.estatus);
      if (d.archivo_pdf) mostrarChip(d.archivo_pdf, 'Archivo actual', true);
    } else $('#fecha').val(new Date().toISOString().slice(0, 10));
    punto();
    $('#modal')[0].showModal();
  }

  $('#btnNuevo, #navNuevo, #bNuevo').on('click', e => { e.preventDefault(); $('#side').removeClass('open'); abrir(); });
  $('#bBuscar, #navBuscar').on('click', e => { e.preventDefault(); $('#side').removeClass('open'); scrollTo(0, 0); $('#q').focus(); });
  $('#q').on('keydown', e => { if (e.key === 'Enter') { clearTimeout(window.t); page = 1; load(); } });

  // --- QR para abrir la app en el celular ---
  $('#qrUrl').val(location.origin + '/');
  function dibujarQr() {
    const u = $('#qrUrl').val().trim();
    $('#qrBox').empty();
    if (u) new QRCode($('#qrBox')[0], { text: u, width: 220, height: 220 });
  }
  $('#btnQr, #navQr').on('click', e => { e.preventDefault(); $('#side').removeClass('open'); $('#qrModal')[0].showModal(); dibujarQr(); });
  $('#qrUrl').on('input', dibujarQr);
  $('#qrClose').on('click', () => $('#qrModal')[0].close());
  $('[data-go=top]').on('click', () => scrollTo(0, 0));
  $('#cancel').on('click', () => $('#modal')[0].close());
  $('#btnFiltrar').on('click', () => { page = 1; load(); });
  $('#q').on('input', () => { clearTimeout(window.t); window.t = setTimeout(() => { page = 1; load(); }, 300); });
  $('#pager').on('click', 'button', function () { page = +$(this).data('p'); load(); });
  $('#rows').on('click', '.edit', function () { abrir($(this).closest('tr').data('d')); });
  $('#rows').on('click', '.del', function () {
    const d = $(this).closest('tr').data('d');
    if (confirm(`¿Eliminar el oficio ${d.no_oficio}? Esta acción no se puede deshacer.`))
      $.ajax({ url: '/api/documentos?action=delete', method: 'POST', contentType: 'application/json', data: JSON.stringify({ id: d.id_documento }) }).done(load);
  });
  $('#form').on('submit', function (e) {
    e.preventDefault();
    if (!$('#id').val() && !archivo) return $('#err').text('Adjunta una foto o un PDF del documento.');
    const datos = Object.fromEntries(new FormData(this).entries());
    const fallo = x => { $('#btnGuardar').prop('disabled', false); $('#err').text(x.responseJSON?.error || `No se pudo guardar (código ${x.status}).`); };
    const guardar = ref => $.ajax({ url: '/api/documentos?action=save', method: 'POST', contentType: 'application/json', data: JSON.stringify({ ...datos, archivo: ref || null }) })
      .done(() => { $('#btnGuardar').prop('disabled', false); $('#modal')[0].close(); load(); }).fail(fallo);
    $('#err').text(''); $('#btnGuardar').prop('disabled', true);
    if (!archivo) return guardar(null);
    // 1) el PDF se sube a /api/subir (Vercel Blob)  2) se guardan los datos con la referencia del archivo
    $.ajax({ url: '/api/subir', method: 'POST', data: archivo, processData: false, contentType: 'application/pdf' })
      .done(r => guardar(r.ref)).fail(fallo);
  });
  $('#menuBtn').on('click', () => $('#side').toggleClass('open'));
  // --- Visor: muestra el PDF (o imagen antigua) dentro de la plataforma, con botón de descarga ---
  function verDocumento(d) {
    const url = '/api/archivo?id=' + d.id_documento;
    const esPdf = d.archivo_pdf.toLowerCase().endsWith('.pdf');
    $('#visorTitulo').text('Oficio ' + d.no_oficio);
    $('#visorCuerpo').html(esPdf ? `<iframe src="${url}" title="Documento PDF"></iframe>` : `<img src="${url}" alt="Documento">`);
    $('#visorAbrir').attr('href', url);
    $('#visorDescarga').attr('href', url + '&dl=1');
    $('#visor')[0].showModal();
  }
  $('#rows').on('click', '.ver', function () { verDocumento($(this).closest('tr').data('d')); });
  $('#visorClose').on('click', () => $('#visor')[0].close());
  $('#visor').on('close', () => $('#visorCuerpo').empty());

  // Atajos desde otras pantallas: /?nuevo=1 y /?buscar=1
  const qs = new URLSearchParams(location.search);
  if (qs.get('nuevo')) abrir();
  if (qs.get('buscar')) $('#q').focus();
  load();
});
