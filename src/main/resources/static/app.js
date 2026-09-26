/**
 * Liga Fútbol — Frontend ES6 Application
 * Consume los endpoints REST de Spring Boot usando fetch API.
 * Gestiona Modales, Toasts, Tabla de Posiciones, Encuentros, Equipos y Estadísticas.
 */

// =====================================================================
// 1. CONFIGURACIÓN Y CONSTANTES DE ENDPOINTS
// =====================================================================
const API_BASE = '/api';
const API = {
  equipos: {
    listar: () => `${API_BASE}/equipos`,                      // GET /api/equipos
    crear: () => `${API_BASE}/equipos`,                       // POST /api/equipos
    obtenerPorId: (id) => `${API_BASE}/equipos/${id}`,        // GET /api/equipos/{id}
    actualizar: (id) => `${API_BASE}/equipos/${id}`,          // PUT /api/equipos/{id}
    eliminar: (id) => `${API_BASE}/equipos/${id}`,            // DELETE /api/equipos/{id}
    buscar: (nombre) => `${API_BASE}/equipos/buscar?nombre=${encodeURIComponent(nombre)}`, // GET /api/equipos/buscar
  },
  encuentros: {
    listar: () => `${API_BASE}/encuentros`,                   // GET /api/encuentros
    listarFiltrado: (params) => `${API_BASE}/encuentros?${params}`, // GET /api/encuentros?filtros
    crear: () => `${API_BASE}/encuentros`,                    // POST /api/encuentros
    obtenerPorId: (id) => `${API_BASE}/encuentros/${id}`,     // GET /api/encuentros/{id}
    actualizar: (id) => `${API_BASE}/encuentros/${id}`,       // PUT /api/encuentros/{id}
    eliminar: (id) => `${API_BASE}/encuentros/${id}`,         // DELETE /api/encuentros/{id}
    tablaPosiciones: () => `${API_BASE}/encuentros/tabla-posiciones`, // GET /api/encuentros/tabla-posiciones
    recientes: () => `${API_BASE}/encuentros/recientes`       // GET /api/encuentros/recientes
  },
  estadisticas: {
    exportarCsv: () => `${API_BASE}/estadisticas/posiciones/export/csv`, // GET /api/estadisticas/posiciones/export/csv
    resumen: () => `${API_BASE}/estadisticas/resumen`,
    equipoStats: (id) => `${API_BASE}/equipos/${id}/estadisticas`
  }
};

// =====================================================================
// 2. ESTADO GLOBAL
// =====================================================================
let equiposCache = [];
let encuentrosCache = [];
let tablaPosicionesCache = [];
let accionAEliminar = null; // Callback para modal de confirmación

// Instancias de Modales Bootstrap
let modalEquipoBS = null;
let modalEncuentroBS = null;
let modalEliminarBS = null;

let graficoGolesChartInstance = null;
let statsEquiposCache = new Map();

// =====================================================================
// 3. INICIALIZACIÓN AL CARGAR EL DOM
// =====================================================================
document.addEventListener('DOMContentLoaded', () => {
  // Inicializar modales Bootstrap
  const elModalEquipo = document.getElementById('modalEquipo');
  const elModalEncuentro = document.getElementById('modalEncuentro');
  const elModalEliminar = document.getElementById('modalConfirmarEliminar');

  if (elModalEquipo) modalEquipoBS = new bootstrap.Modal(elModalEquipo);
  if (elModalEncuentro) modalEncuentroBS = new bootstrap.Modal(elModalEncuentro);
  if (elModalEliminar) modalEliminarBS = new bootstrap.Modal(elModalEliminar);

  // Formularios
  const formEquipo = document.getElementById('formEquipo');
  const formEncuentro = document.getElementById('formEncuentro');
  if (formEquipo) formEquipo.addEventListener('submit', manejarSubmitEquipo);
  if (formEncuentro) formEncuentro.addEventListener('submit', manejarSubmitEncuentro);

  // Botones de apertura
  const btnAbrirEquipo = document.getElementById('btnAbrirModalEquipo');
  const btnAbrirEncuentro = document.getElementById('btnAbrirModalEncuentro');
  if (btnAbrirEquipo) btnAbrirEquipo.addEventListener('click', abrirModalNuevoEquipo);
  if (btnAbrirEncuentro) btnAbrirEncuentro.addEventListener('click', abrirModalNuevoEncuentro);

  // Acciones en estados vacíos
  document.querySelectorAll('.btnCrearPrimerEquipo').forEach(btn => {
    btn.addEventListener('click', abrirModalNuevoEquipo);
  });
  document.querySelectorAll('.btnRegistrarPrimerEncuentro').forEach(btn => {
    btn.addEventListener('click', abrirModalNuevoEncuentro);
  });

  // Botón refresco global
  const btnRefrescarTodo = document.getElementById('btnRefrescarTodo');
  if (btnRefrescarTodo) {
    btnRefrescarTodo.addEventListener('click', async () => {
      mostrarToast('Sincronizando datos...', 'info');
      await cargarTodosLosDatos();
      mostrarToast('Datos actualizados', 'success');
    });
  }

  // Confirmar eliminación
  const btnConfirmarEliminar = document.getElementById('btnConfirmarEliminacionAccion');
  if (btnConfirmarEliminar) {
    btnConfirmarEliminar.addEventListener('click', async () => {
      if (typeof accionAEliminar === 'function') {
        await accionAEliminar();
        if (modalEliminarBS) modalEliminarBS.hide();
        accionAEliminar = null;
      }
    });
  }

  // Recarga al cambiar de pestaña
  const tabElements = document.querySelectorAll('button[data-bs-toggle="pill"]');
  tabElements.forEach(tabEl => {
    tabEl.addEventListener('shown.bs.tab', (event) => {
      const targetId = event.target.getAttribute('data-bs-target');
      if (targetId === '#tab-tabla') {
        cargarTablaPosiciones();
      } else if (targetId === '#tab-encuentros') {
        cargarEncuentros();
      } else if (targetId === '#tab-equipos') {
        cargarEquipos();
      } else if (targetId === '#tab-dashboard') {
        if (statsEquiposCache.size > 0) {
          requestAnimationFrame(() => {
            renderGraficoGoles(Array.from(statsEquiposCache.values()));
            renderizarCardsRachas(Array.from(statsEquiposCache.values()));
          });
        } else {
          cargarDashboard();
        }
      }
    });
  });

  // Validación dinámica en formulario de partidos: evitar mismo equipo
  const selLocal = document.getElementById('selectEquipoLocal');
  const selVisitante = document.getElementById('selectEquipoVisitante');
  const alertaMismo = document.getElementById('alertaMismoEquipo');

  function verificarEquiposIguales() {
    if (selLocal && selVisitante && alertaMismo) {
      if (selLocal.value && selVisitante.value && selLocal.value === selVisitante.value) {
        alertaMismo.classList.remove('hidden');
      } else {
        alertaMismo.classList.add('hidden');
      }
    }
  }

  if (selLocal) selLocal.addEventListener('change', verificarEquiposIguales);
  if (selVisitante) selVisitante.addEventListener('change', verificarEquiposIguales);

  // Búsqueda en vivo de equipos (debounce 250ms)
  let debounceEquiposTimer = null;
  const inputBuscar = document.getElementById('inputBuscarEquipo');
  if (inputBuscar) {
    inputBuscar.addEventListener('input', (e) => {
      clearTimeout(debounceEquiposTimer);
      debounceEquiposTimer = setTimeout(() => {
        filtrarEquipos(e.target.value);
      }, 250);
    });
  }

  // Filtros de encuentros
  const btnFiltrarEncuentros = document.getElementById('btnFiltrarEncuentrosFecha');
  if (btnFiltrarEncuentros) {
    btnFiltrarEncuentros.addEventListener('click', filtrarEncuentrosPorFecha);
  }
  const btnLimpiarEncuentros = document.getElementById('btnLimpiarFiltroEncuentros');
  if (btnLimpiarEncuentros) {
    btnLimpiarEncuentros.addEventListener('click', limpiarFiltroEncuentros);
  }

  // Exportar PDF y CSV
  const btnExportarPdf = document.getElementById('btnExportarPosicionesPDF');
  if (btnExportarPdf) {
    btnExportarPdf.addEventListener('click', exportarPosicionesPDF);
  }
  const btnExportarCsv = document.getElementById('btnExportarPosicionesCSV');
  if (btnExportarCsv) {
    btnExportarCsv.addEventListener('click', exportarPosicionesCSV);
  }

  // Botón refresco Dashboard
  const btnRefrescarDashboard = document.getElementById('btnRefrescarDashboard');
  if (btnRefrescarDashboard) {
    btnRefrescarDashboard.addEventListener('click', async () => {
      mostrarToast('Actualizando estadísticas...', 'info');
      statsEquiposCache.clear();
      await cargarDashboard();
      mostrarToast('Estadísticas actualizadas', 'success');
    });
  }

  // Carga inicial de datos
  cargarTodosLosDatos();
});

// =====================================================================
// 4. FUNCIONES DE CARGA Y SERVICIO DE DATOS
// =====================================================================

async function cargarTodosLosDatos() {
  mostrarLoading(true);
  try {
    await Promise.all([
      cargarTablaPosiciones(),
      cargarEncuentros(),
      cargarEquipos()
    ]);
    // Pre-cargar stats en background silenciosamente
    cargarDashboardSilencioso();
  } catch (error) {
    console.error('Error al sincronizar datos:', error);
  } finally {
    mostrarLoading(false);
  }
}

/**
 * GET /api/encuentros/tabla-posiciones
 */
async function cargarTablaPosiciones() {
  try {
    const res = await fetch(API.encuentros.tablaPosiciones());
    if (!res.ok) throw await extraerError(res);
    const data = await res.json();
    tablaPosicionesCache = data;
    renderizarTablaPosiciones(data);
  } catch (error) {
    mostrarToast(`Error al cargar posiciones: ${error.message}`, 'error');
  }
}

/**
 * GET /api/equipos
 */
async function cargarEquipos() {
  try {
    const res = await fetch(API.equipos.listar());
    if (!res.ok) throw await extraerError(res);
    const data = await res.json();
    equiposCache = data;
    renderizarEquipos(data);
    poblarSelectsEquipos(data);
  } catch (error) {
    mostrarToast(`Error al cargar equipos: ${error.message}`, 'error');
  }
}

/**
 * GET /api/encuentros
 */
async function cargarEncuentros() {
  try {
    const res = await fetch(API.encuentros.listar());
    if (!res.ok) throw await extraerError(res);
    const data = await res.json();
    encuentrosCache = data;
    renderizarEncuentros(data);
  } catch (error) {
    mostrarToast(`Error al cargar encuentros: ${error.message}`, 'error');
  }
}

// =====================================================================
// 5. RENDERIZADO VISUAL DEL DOM
// =====================================================================

/**
 * Renderiza la Tabla de Posiciones estilo UEFA / Premier League
 */
function renderizarTablaPosiciones(lista) {
  const tbody = document.getElementById('tablaPosicionesBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!lista || lista.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="11" class="text-center py-8 text-slate-400 text-xs">
          Aún no hay equipos registrados para calcular la tabla.
        </td>
      </tr>
    `;
    return;
  }

  lista.forEach((item) => {
    const tr = document.createElement('tr');
    tr.className = 'transition-colors';

    // Medalla sutil para los primeros 3 puestos
    let badgePosicion = '';
    if (item.posicion === 1) {
      tr.classList.add('row-oro');
      badgePosicion = `<span class="inline-flex items-center justify-center w-6 h-6 rounded-md bg-amber-50 text-amber-700 font-bold border border-amber-200 text-xs">1</span>`;
    } else if (item.posicion === 2) {
      tr.classList.add('row-plata');
      badgePosicion = `<span class="inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-100 text-slate-700 font-bold border border-slate-200 text-xs">2</span>`;
    } else if (item.posicion === 3) {
      tr.classList.add('row-bronce');
      badgePosicion = `<span class="inline-flex items-center justify-center w-6 h-6 rounded-md bg-orange-50 text-orange-700 font-bold border border-orange-200 text-xs">3</span>`;
    } else {
      badgePosicion = `<span class="text-slate-400 font-medium text-xs">${item.posicion}</span>`;
    }

    // Diferencia de goles
    let dgClass = 'text-slate-500 font-medium';
    let dgDisplay = item.diferenciaGoles;
    if (item.diferenciaGoles > 0) {
      dgClass = 'text-emerald-700 font-semibold';
      dgDisplay = `+${item.diferenciaGoles}`;
    } else if (item.diferenciaGoles < 0) {
      dgClass = 'text-rose-600 font-semibold';
    }

    tr.innerHTML = `
      <td class="text-center tabular-nums">${badgePosicion}</td>
      <td class="font-bold text-slate-900 flex items-center gap-2.5">
        <span class="w-7 h-7 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-semibold text-slate-700">
          ${obtenerIniciales(item.equipoNombre)}
        </span>
        <span class="truncate max-w-[180px] sm:max-w-none">${escapeHtml(item.equipoNombre)}</span>
      </td>
      <td class="hidden sm:table-cell text-slate-500 text-xs">
        ${escapeHtml(item.ciudad)}
      </td>
      <td class="text-center tabular-nums text-slate-600 font-medium">${item.partidosJugados}</td>
      <td class="text-center tabular-nums text-slate-700 font-medium">${item.partidosGanados}</td>
      <td class="text-center tabular-nums text-slate-700 font-medium">${item.partidosEmpatados}</td>
      <td class="text-center tabular-nums text-slate-700 font-medium">${item.partidosPerdidos}</td>
      <td class="text-center tabular-nums hidden md:table-cell text-slate-500">${item.golesAFavor}</td>
      <td class="text-center tabular-nums hidden md:table-cell text-slate-500">${item.golesEnContra}</td>
      <td class="text-center tabular-nums ${dgClass}">${dgDisplay}</td>
      <td class="text-center tabular-nums text-sm font-extrabold text-slate-900">
        <span class="inline-block px-2.5 py-0.5 rounded bg-slate-100 text-slate-900 font-bold">
          ${item.puntos}
        </span>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/**
 * Renderiza el listado de Equipos en Cards limpias
 */
function renderizarEquipos(lista) {
  const container = document.getElementById('listaEquiposContainer');
  const sinEquiposMsg = document.getElementById('sinEquiposMsg');
  if (!container) return;
  container.innerHTML = '';

  if (!lista || lista.length === 0) {
    if (sinEquiposMsg) sinEquiposMsg.classList.remove('hidden');
    return;
  }
  if (sinEquiposMsg) sinEquiposMsg.classList.add('hidden');

  lista.forEach(equipo => {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-colors flex flex-col justify-between';

    card.innerHTML = `
      <div>
        <div class="flex items-start justify-between gap-3 mb-3">
          <div class="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-800 text-sm">
            ${obtenerIniciales(equipo.nombre)}
          </div>
          <span class="text-[11px] text-slate-400 font-mono">
            ID #${equipo.id}
          </span>
        </div>

        <h3 class="text-sm sm:text-base font-bold text-slate-900 mb-0.5 truncate" title="${escapeHtml(equipo.nombre)}">
          ${escapeHtml(equipo.nombre)}
        </h3>

        <div class="flex items-center text-xs text-slate-500 mb-3">
          <i class="bi bi-geo-alt text-slate-400 me-1"></i>
          <span>${escapeHtml(equipo.ciudad)}</span>
        </div>
      </div>

      <div class="pt-2.5 border-t border-slate-100 flex items-center justify-end gap-1.5">
        <button onclick="prepararEdicionEquipo(${equipo.id})" class="px-2.5 py-1 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium transition-colors">
          Editar
        </button>
        <button onclick="confirmarEliminarEquipo(${equipo.id}, '${escapeHtml(equipo.nombre)}')" class="px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-medium transition-colors">
          Eliminar
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

/**
 * Renderiza el listado de Encuentros disputados
 */
function renderizarEncuentros(lista) {
  const container = document.getElementById('listaEncuentrosContainer');
  const sinEncuentrosMsg = document.getElementById('sinEncuentrosMsg');
  if (!container) return;
  container.innerHTML = '';

  if (!lista || lista.length === 0) {
    if (sinEncuentrosMsg) sinEncuentrosMsg.classList.remove('hidden');
    return;
  }
  if (sinEncuentrosMsg) sinEncuentrosMsg.classList.add('hidden');

  lista.forEach(enc => {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-colors flex flex-col justify-between';

    let localGana = enc.golesLocal > enc.golesVisitante;
    let visitanteGana = enc.golesVisitante > enc.golesLocal;
    const fechaFormateada = formatearFecha(enc.fecha);

    card.innerHTML = `
      <div>
        <div class="flex items-center justify-between text-xs text-slate-400 mb-3 pb-2 border-b border-slate-100">
          <span class="flex items-center gap-1.5 font-medium text-slate-500">
            <i class="bi bi-calendar3 text-slate-400"></i> ${fechaFormateada}
          </span>
          <span class="font-mono text-[11px] text-slate-400">Partido #${enc.id}</span>
        </div>

        <!-- Scoreboard Fixture Row -->
        <div class="flex items-center justify-between py-1 my-1">
          <!-- Local -->
          <div class="flex-1 flex items-center justify-end gap-2 text-right">
            <span class="text-xs sm:text-sm font-semibold truncate ${localGana ? 'text-slate-900 font-bold' : 'text-slate-600'}" title="${escapeHtml(enc.equipoLocal.nombre)}">
              ${escapeHtml(enc.equipoLocal.nombre)}
            </span>
            <span class="w-6 h-6 rounded bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold flex-shrink-0 flex items-center justify-center">
              ${obtenerIniciales(enc.equipoLocal.nombre)}
            </span>
          </div>

          <!-- Marcador Central -->
          <div class="px-3 py-1 mx-3 rounded bg-slate-100 text-slate-900 font-bold text-sm tabular-nums tracking-wide">
            ${enc.golesLocal} &ndash; ${enc.golesVisitante}
          </div>

          <!-- Visitante -->
          <div class="flex-1 flex items-center justify-start gap-2 text-left">
            <span class="w-6 h-6 rounded bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold flex-shrink-0 flex items-center justify-center">
              ${obtenerIniciales(enc.equipoVisitante.nombre)}
            </span>
            <span class="text-xs sm:text-sm font-semibold truncate ${visitanteGana ? 'text-slate-900 font-bold' : 'text-slate-600'}" title="${escapeHtml(enc.equipoVisitante.nombre)}">
              ${escapeHtml(enc.equipoVisitante.nombre)}
            </span>
          </div>
        </div>
      </div>

      <!-- Acciones -->
      <div class="pt-2.5 mt-3 border-t border-slate-100 flex items-center justify-end gap-1.5">
        <button onclick="prepararEdicionEncuentro(${enc.id})" class="px-2.5 py-1 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium transition-colors">
          Editar
        </button>
        <button onclick="confirmarEliminarEncuentro(${enc.id})" class="px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-medium transition-colors">
          Eliminar
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

/**
 * Llena selects de equipos en modales y filtros
 */
function poblarSelectsEquipos(equipos, selectedLocalId = null, selectedVisitanteId = null) {
  const selLocal = document.getElementById('selectEquipoLocal');
  const selVisitante = document.getElementById('selectEquipoVisitante');
  const selFiltro = document.getElementById('filtroEquipoEncuentro');

  if (selFiltro) {
    const valActual = selFiltro.value;
    selFiltro.innerHTML = '<option value="">Todos los clubes</option>';
    equipos.forEach(eq => {
      const opt = document.createElement('option');
      opt.value = eq.id;
      opt.textContent = `${eq.nombre} (${eq.ciudad})`;
      if (valActual && String(valActual) === String(eq.id)) {
        opt.selected = true;
      }
      selFiltro.appendChild(opt);
    });
  }

  if (selLocal) {
    selLocal.innerHTML = '<option value="" disabled selected>Seleccione local...</option>';
    equipos.forEach(eq => {
      const optLocal = document.createElement('option');
      optLocal.value = eq.id;
      optLocal.textContent = `${eq.nombre} (${eq.ciudad})`;
      if (selectedLocalId && String(selectedLocalId) === String(eq.id)) {
        optLocal.selected = true;
      }
      selLocal.appendChild(optLocal);
    });
  }

  if (selVisitante) {
    selVisitante.innerHTML = '<option value="" disabled selected>Seleccione visitante...</option>';
    equipos.forEach(eq => {
      const optVis = document.createElement('option');
      optVis.value = eq.id;
      optVis.textContent = `${eq.nombre} (${eq.ciudad})`;
      if (selectedVisitanteId && String(selectedVisitanteId) === String(eq.id)) {
        optVis.selected = true;
      }
      selVisitante.appendChild(optVis);
    });
  }
}

// =====================================================================
// 6. CONTROLADORES DE MODALES Y FORMULARIOS (CRUD)
// =====================================================================

function abrirModalNuevoEquipo() {
  document.getElementById('formEquipo').reset();
  document.getElementById('equipoId').value = '';
  document.getElementById('modalEquipoTitulo').textContent = 'Nuevo Club';
  document.getElementById('formEquipo').classList.remove('was-validated');
  if (modalEquipoBS) modalEquipoBS.show();
}

async function prepararEdicionEquipo(id) {
  mostrarLoading(true);
  try {
    const res = await fetch(API.equipos.obtenerPorId(id));
    if (!res.ok) throw await extraerError(res);
    const eq = await res.json();

    document.getElementById('equipoId').value = eq.id;
    document.getElementById('equipoNombre').value = eq.nombre;
    document.getElementById('equipoCiudad').value = eq.ciudad;
    document.getElementById('modalEquipoTitulo').textContent = 'Editar Club';
    document.getElementById('formEquipo').classList.remove('was-validated');
    if (modalEquipoBS) modalEquipoBS.show();
  } catch (error) {
    mostrarToast(`No se pudo obtener el club: ${error.message}`, 'error');
  } finally {
    mostrarLoading(false);
  }
}

async function manejarSubmitEquipo(e) {
  e.preventDefault();
  const form = e.target;

  if (!form.checkValidity()) {
    form.classList.add('was-validated');
    return;
  }

  const id = document.getElementById('equipoId').value;
  const nombre = document.getElementById('equipoNombre').value.trim();
  const ciudad = document.getElementById('equipoCiudad').value.trim();

  const payload = { nombre, ciudad };
  const esEdicion = Boolean(id);
  const url = esEdicion ? API.equipos.actualizar(id) : API.equipos.crear();
  const metodo = esEdicion ? 'PUT' : 'POST';

  mostrarLoading(true);
  try {
    const res = await fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw await extraerError(res);

    if (modalEquipoBS) modalEquipoBS.hide();
    mostrarToast(esEdicion ? 'Club actualizado correctamente' : 'Club registrado correctamente', 'success');
    await cargarTodosLosDatos();
  } catch (error) {
    mostrarToast(error.message, 'error');
  } finally {
    mostrarLoading(false);
  }
}

function confirmarEliminarEquipo(id, nombre) {
  mostrarConfirmacionEliminar(`¿Eliminar el club "${nombre}"?`, async () => {
    mostrarLoading(true);
    try {
      const res = await fetch(API.equipos.eliminar(id), { method: 'DELETE' });
      if (!res.ok) throw await extraerError(res);

      mostrarToast('Club eliminado correctamente', 'success');
      await cargarTodosLosDatos();
    } catch (error) {
      mostrarToast(`No se pudo eliminar: ${error.message}`, 'error');
    } finally {
      mostrarLoading(false);
    }
  });
}

function abrirModalNuevoEncuentro() {
  if (equiposCache.length < 2) {
    mostrarToast('Se requieren al menos 2 clubes registrados para programar un partido.', 'warning');
    abrirModalNuevoEquipo();
    return;
  }

  document.getElementById('formEncuentro').reset();
  document.getElementById('encuentroId').value = '';
  document.getElementById('modalEncuentroTitulo').textContent = 'Registrar Partido';
  document.getElementById('golesLocal').value = 0;
  document.getElementById('golesVisitante').value = 0;
  document.getElementById('alertaMismoEquipo').classList.add('hidden');
  document.getElementById('formEncuentro').classList.remove('was-validated');

  const hoy = new Date().toISOString().split('T')[0];
  document.getElementById('encuentroFecha').value = hoy;

  poblarSelectsEquipos(equiposCache);
  if (modalEncuentroBS) modalEncuentroBS.show();
}

async function prepararEdicionEncuentro(id) {
  mostrarLoading(true);
  try {
    const res = await fetch(API.encuentros.obtenerPorId(id));
    if (!res.ok) throw await extraerError(res);
    const enc = await res.json();

    document.getElementById('encuentroId').value = enc.id;
    document.getElementById('modalEncuentroTitulo').textContent = 'Editar Partido';
    document.getElementById('golesLocal').value = enc.golesLocal;
    document.getElementById('golesVisitante').value = enc.golesVisitante;
    document.getElementById('encuentroFecha').value = enc.fecha;
    document.getElementById('alertaMismoEquipo').classList.add('hidden');
    document.getElementById('formEncuentro').classList.remove('was-validated');

    poblarSelectsEquipos(equiposCache, enc.equipoLocal.id, enc.equipoVisitante.id);
    if (modalEncuentroBS) modalEncuentroBS.show();
  } catch (error) {
    mostrarToast(`No se pudo obtener el partido: ${error.message}`, 'error');
  } finally {
    mostrarLoading(false);
  }
}

async function manejarSubmitEncuentro(e) {
  e.preventDefault();
  const form = e.target;

  const equipoLocalId = document.getElementById('selectEquipoLocal').value;
  const equipoVisitanteId = document.getElementById('selectEquipoVisitante').value;
  const golesLocal = parseInt(document.getElementById('golesLocal').value, 10);
  const golesVisitante = parseInt(document.getElementById('golesVisitante').value, 10);
  const fecha = document.getElementById('encuentroFecha').value;

  if (!equipoLocalId || !equipoVisitanteId) {
    mostrarToast('Selecciona ambos equipos.', 'warning');
    return;
  }
  if (equipoLocalId === equipoVisitanteId) {
    mostrarToast('Regla de negocio: Un equipo no puede enfrentarse a sí mismo.', 'error');
    document.getElementById('alertaMismoEquipo').classList.remove('hidden');
    return;
  }
  if (isNaN(golesLocal) || golesLocal < 0 || isNaN(golesVisitante) || golesVisitante < 0) {
    mostrarToast('Los goles deben ser números enteros mayores o iguales a 0.', 'error');
    return;
  }
  if (!fecha) {
    mostrarToast('La fecha del encuentro es obligatoria.', 'warning');
    return;
  }

  const id = document.getElementById('encuentroId').value;
  const payload = {
    equipoLocalId: Number(equipoLocalId),
    equipoVisitanteId: Number(equipoVisitanteId),
    golesLocal,
    golesVisitante,
    fecha
  };

  const esEdicion = Boolean(id);
  const url = esEdicion ? API.encuentros.actualizar(id) : API.encuentros.crear();
  const metodo = esEdicion ? 'PUT' : 'POST';

  mostrarLoading(true);
  try {
    const res = await fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw await extraerError(res);

    if (modalEncuentroBS) modalEncuentroBS.hide();
    mostrarToast(esEdicion ? 'Partido actualizado correctamente' : 'Partido registrado correctamente', 'success');
    await cargarTodosLosDatos();
  } catch (error) {
    mostrarToast(error.message, 'error');
  } finally {
    mostrarLoading(false);
  }
}

function confirmarEliminarEncuentro(id) {
  mostrarConfirmacionEliminar(`¿Eliminar Partido #${id}?`, async () => {
    mostrarLoading(true);
    try {
      const res = await fetch(API.encuentros.eliminar(id), { method: 'DELETE' });
      if (!res.ok) throw await extraerError(res);

      mostrarToast('Partido eliminado correctamente', 'success');
      await cargarTodosLosDatos();
    } catch (error) {
      mostrarToast(`No se pudo eliminar el encuentro: ${error.message}`, 'error');
    } finally {
      mostrarLoading(false);
    }
  });
}

// =====================================================================
// 7. UTILIDADES (TOASTS, SPINNER, HELPERS)
// =====================================================================

async function extraerError(res) {
  try {
    const json = await res.json();
    const mensaje = json.error || json.message || `Error ${res.status}: ${res.statusText}`;
    return new Error(mensaje);
  } catch {
    return new Error(`Error ${res.status}: ${res.statusText}`);
  }
}

function mostrarToast(mensaje, tipo = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  let icono = 'bi-info-circle text-slate-700';
  let borde = 'border-slate-200';

  if (tipo === 'success') {
    icono = 'bi-check2-circle text-emerald-600';
    borde = 'border-slate-200';
  } else if (tipo === 'error') {
    icono = 'bi-exclamation-circle text-rose-600';
    borde = 'border-rose-200';
  } else if (tipo === 'warning') {
    icono = 'bi-exclamation-triangle text-amber-600';
    borde = 'border-amber-200';
  }

  const toastId = 'toast-' + Date.now();
  const toastHtml = `
    <div id="${toastId}" class="toast align-items-center text-slate-800 bg-white border ${borde} shadow-md rounded-xl mb-2" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="flex items-center px-3.5 py-2.5">
        <i class="bi ${icono} text-base me-2.5 flex-shrink-0"></i>
        <div class="toast-body p-0 text-xs font-medium text-slate-700 flex-1">
          ${escapeHtml(mensaje)}
        </div>
        <button type="button" class="btn-close btn-close-sm ms-2" data-bs-dismiss="toast" aria-label="Cerrar"></button>
      </div>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', toastHtml);
  const toastEl = document.getElementById(toastId);
  const bsToast = new bootstrap.Toast(toastEl, { delay: 4000 });
  bsToast.show();

  toastEl.addEventListener('hidden.bs.toast', () => {
    toastEl.remove();
  });
}

function mostrarLoading(mostrar) {
  const spinner = document.getElementById('loadingIndicator');
  if (!spinner) return;
  if (mostrar) {
    spinner.classList.remove('pointer-events-none', 'opacity-0');
    spinner.classList.add('opacity-100');
  } else {
    spinner.classList.remove('opacity-100');
    spinner.classList.add('opacity-0', 'pointer-events-none');
  }
}

function obtenerIniciales(nombre) {
  if (!nombre) return 'EQ';
  const palabras = nombre.trim().split(/\s+/);
  if (palabras.length === 1) {
    return palabras[0].substring(0, 2).toUpperCase();
  }
  return (palabras[0][0] + palabras[1][0]).toUpperCase();
}

function formatearFecha(fechaStr) {
  if (!fechaStr) return '';
  const [año, mes, dia] = fechaStr.split('-');
  return `${dia}/${mes}/${año}`;
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.innerText = String(text);
  return div.innerHTML;
}

// =====================================================================
// 8. DASHBOARD Y ESTADÍSTICAS
// =====================================================================

async function cargarDashboardSilencioso() {
  try {
    const resResumen = await fetch(API.estadisticas.resumen());
    if (resResumen.ok) {
      const resumen = await resResumen.json();
      actualizarMetricasDashboard(resumen);
    }

    if (equiposCache.length > 0) {
      const promesasStats = equiposCache.map(eq =>
        fetch(API.estadisticas.equipoStats(eq.id))
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
      );
      const statsValidas = (await Promise.all(promesasStats)).filter(st => st !== null);
      statsValidas.forEach(st => statsEquiposCache.set(st.equipoId, st));
      renderizarCardsRachas(statsValidas);
    }
  } catch (e) {
    console.warn('Dashboard background sync:', e);
  }
}

async function cargarDashboard() {
  try {
    mostrarLoading(true);
    const resResumen = await fetch(API.estadisticas.resumen());
    if (resResumen.ok) {
      const resumen = await resResumen.json();
      actualizarMetricasDashboard(resumen);
    }

    let equipos = equiposCache;
    if (!equipos || equipos.length === 0) {
      const resEquipos = await fetch(API.equipos.listar());
      if (resEquipos.ok) {
        equipos = await resEquipos.json();
        equiposCache = equipos;
      }
    }

    if (!equipos || equipos.length === 0) return;

    const promesasStats = equipos.map(eq =>
      fetch(API.estadisticas.equipoStats(eq.id))
        .then(r => r.ok ? r.json() : null)
        .catch(() => null)
    );

    const resultadosStats = await Promise.all(promesasStats);
    const statsValidas = resultadosStats.filter(st => st !== null);
    statsValidas.forEach(st => statsEquiposCache.set(st.equipoId, st));

    renderGraficoGoles(statsValidas);
    renderizarCardsRachas(statsValidas);
  } catch (error) {
    console.error('Error al cargar dashboard:', error);
  } finally {
    mostrarLoading(false);
  }
}

function actualizarMetricasDashboard(resumen) {
  const elTotalGoles = document.getElementById('statTotalGoles');
  const elTotalPartidos = document.getElementById('statTotalPartidos');
  const elPromedio = document.getElementById('statPromedioGoles');
  const elGoleador = document.getElementById('statEquipoGoleador');
  const elGolesLider = document.getElementById('statGolesLider');
  const elMejorDefensa = document.getElementById('statMejorDefensa');
  const elGolesDefensa = document.getElementById('statGolesDefensa');

  if (elTotalGoles) animarContador(elTotalGoles, resumen.totalGoles ?? 0, 800);
  if (elTotalPartidos) animarContador(elTotalPartidos, resumen.totalPartidos ?? 0, 800, ' partidos');
  if (elPromedio) elPromedio.textContent = Number(resumen.promedioGolesPorPartido ?? 0).toFixed(2);
  if (elGoleador) elGoleador.textContent = resumen.equipoMasGoleador || '--';
  if (elGolesLider) elGolesLider.textContent = `${resumen.golesEquipoMasGoleador ?? 0} goles a favor`;
  if (elMejorDefensa) elMejorDefensa.textContent = resumen.equipoMejorDefensa || '--';
  if (elGolesDefensa) elGolesDefensa.textContent = `${resumen.golesRecibidosMejorDefensa ?? 0} goles recibidos`;
}

function renderGraficoGoles(equiposStats) {
  const canvas = document.getElementById('graficoGolesFavorCanvas');
  if (!canvas) return;

  if (typeof Chart === 'undefined') return;

  if (graficoGolesChartInstance) {
    graficoGolesChartInstance.destroy();
  }

  const ctx = canvas.getContext('2d');
  const obtenerGF = (e) => (e.GF ?? e.gf ?? e.golesAFavor ?? 0);
  const obtenerGC = (e) => (e.GC ?? e.gc ?? e.golesEnContra ?? 0);
  const datosOrdenados = [...equiposStats].sort((a, b) => obtenerGF(b) - obtenerGF(a));

  const etiquetas = datosOrdenados.map(e => e.equipoNombre);
  const valoresGF = datosOrdenados.map(e => obtenerGF(e));
  const valoresGC = datosOrdenados.map(e => obtenerGC(e));

  graficoGolesChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: etiquetas,
      datasets: [
        {
          label: 'Goles a Favor',
          data: valoresGF,
          backgroundColor: '#0f172a', // Deep Slate
          borderRadius: 4,
          borderSkipped: false
        },
        {
          label: 'Goles en Contra',
          data: valoresGC,
          backgroundColor: '#cbd5e1', // Slate 300
          borderRadius: 4,
          borderSkipped: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: {
            boxWidth: 12,
            boxHeight: 12,
            color: '#64748b',
            font: { family: '"Plus Jakarta Sans", sans-serif', size: 12, weight: '500' }
          }
        },
        tooltip: {
          backgroundColor: '#0f172a',
          titleColor: '#ffffff',
          bodyColor: '#e2e8f0',
          padding: 10,
          cornerRadius: 8,
          bodyFont: { family: '"Plus Jakarta Sans", sans-serif', size: 12 }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#64748b', font: { family: '"Plus Jakarta Sans", sans-serif', size: 11 } }
        },
        y: {
          beginAtZero: true,
          grid: { color: '#f1f5f9' },
          ticks: { stepSize: 1, color: '#64748b', font: { family: '"Plus Jakarta Sans", sans-serif', size: 11 } }
        }
      }
    }
  });
}

function renderizarCardsRachas(listaStats) {
  const contenedor = document.getElementById('contenedorRachasDetalladas');
  if (!contenedor) return;
  contenedor.innerHTML = '';

  if (!listaStats || listaStats.length === 0) {
    contenedor.innerHTML = `<div class="col-span-full text-center text-slate-400 py-6 text-xs">Sin información de clubes.</div>`;
    return;
  }

  const ordenados = [...listaStats].sort((a, b) => (b.puntos ?? 0) - (a.puntos ?? 0));

  ordenados.forEach(item => {
    const racha = item.racha || [];
    let rachaHtml = '';
    if (racha.length === 0) {
      rachaHtml = '<span class="text-xs text-slate-400 italic">Sin partidos</span>';
    } else {
      rachaHtml = racha.map(res => {
        if (res === 'G') {
          return `<span class="form-dot form-dot-g" title="Victoria">G</span>`;
        } else if (res === 'E') {
          return `<span class="form-dot form-dot-e" title="Empate">E</span>`;
        } else {
          return `<span class="form-dot form-dot-p" title="Derrota">P</span>`;
        }
      }).join(' ');
    }

    const card = document.createElement('div');
    card.className = 'bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-3 hover:border-slate-300 transition-colors';
    card.innerHTML = `
      <div class="flex items-center gap-2.5 min-w-0">
        <span class="w-8 h-8 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700 flex-shrink-0">
          ${obtenerIniciales(item.equipoNombre)}
        </span>
        <div class="min-w-0">
          <div class="font-bold text-slate-900 text-xs sm:text-sm truncate">
            ${escapeHtml(item.equipoNombre)}
          </div>
          <div class="text-[11px] text-slate-500">
            PJ: <span class="font-semibold text-slate-700">${item.PJ ?? item.pj ?? item.partidosJugados ?? 0}</span> &bull; 
            PTS: <span class="font-bold text-slate-900">${item.puntos ?? 0}</span>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-1 flex-shrink-0">
        ${rachaHtml}
      </div>
    `;
    contenedor.appendChild(card);
  });
}

// =====================================================================
// 9. FILTRADO Y BÚSQUEDA
// =====================================================================

function filtrarEquipos(query) {
  const termino = (query || '').trim().toLowerCase();
  if (!termino) {
    renderizarEquipos(equiposCache);
    return;
  }

  if (equiposCache && equiposCache.length > 0) {
    const filtrados = equiposCache.filter(eq =>
      eq.nombre.toLowerCase().includes(termino) ||
      (eq.ciudad && eq.ciudad.toLowerCase().includes(termino))
    );
    renderizarEquipos(filtrados);
  } else {
    fetch(API.equipos.buscar(termino))
      .then(r => r.ok ? r.json() : [])
      .then(data => renderizarEquipos(data))
      .catch(() => renderizarEquipos([]));
  }
}

async function filtrarEncuentrosPorFecha() {
  const equipoId = document.getElementById('filtroEquipoEncuentro')?.value;
  const fechaInicio = document.getElementById('filtroFechaInicio')?.value;
  const fechaFin = document.getElementById('filtroFechaFin')?.value;

  if (!equipoId && !fechaInicio && !fechaFin) {
    mostrarToast('Selecciona un club o rango de fechas.', 'info');
    return;
  }

  try {
    const params = new URLSearchParams();
    if (equipoId) params.append('equipoId', equipoId);
    if (fechaInicio) params.append('fechaInicio', fechaInicio);
    if (fechaFin) params.append('fechaFin', fechaFin);

    const res = await fetch(API.encuentros.listarFiltrado(params.toString()));
    if (!res.ok) throw await extraerError(res);
    const data = await res.json();
    renderizarEncuentros(data);
    mostrarToast(`Se encontraron ${data.length} partido${data.length !== 1 ? 's' : ''}.`, 'success');
  } catch (error) {
    mostrarToast(`Error al filtrar: ${error.message}`, 'error');
  }
}

async function limpiarFiltroEncuentros() {
  const selEquipo = document.getElementById('filtroEquipoEncuentro');
  const inputInicio = document.getElementById('filtroFechaInicio');
  const inputFin = document.getElementById('filtroFechaFin');
  if (selEquipo) selEquipo.value = '';
  if (inputInicio) inputInicio.value = '';
  if (inputFin) inputFin.value = '';

  await cargarEncuentros();
  mostrarToast('Filtros restablecidos', 'info');
}

// =====================================================================
// 10. EXPORTACIÓN (CSV / PDF)
// =====================================================================

function exportarPosicionesCSV() {
  mostrarToast('Generando archivo CSV...', 'info');
  const url = API.estadisticas.exportarCsv();
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'posiciones.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  mostrarToast('Archivo CSV descargado', 'success');
}

function exportarPosicionesPDF() {
  if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
    window.print();
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('Liga Fútbol — Tabla Oficial de Posiciones', 14, 18);

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  const ahora = new Date();
  doc.text(`Generado el ${ahora.toLocaleDateString('es-PE')} a las ${ahora.toLocaleTimeString('es-PE')}`, 14, 24);

  const datos = tablaPosicionesCache.map(item => [
    item.posicion,
    item.equipoNombre,
    item.ciudad || '',
    item.partidosJugados,
    item.partidosGanados,
    item.partidosEmpatados,
    item.partidosPerdidos,
    item.golesAFavor,
    item.golesEnContra,
    (item.diferenciaGoles > 0 ? '+' : '') + item.diferenciaGoles,
    item.puntos
  ]);

  doc.autoTable({
    startY: 28,
    head: [['#', 'Club', 'Ciudad', 'PJ', 'PG', 'PE', 'PP', 'GF', 'GC', 'DG', 'PTS']],
    body: datos,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 3,
      halign: 'center',
      textColor: [15, 23, 42]
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'center', fontStyle: 'bold' },
      1: { halign: 'left' },
      2: { halign: 'left' },
      10: { fontStyle: 'bold' }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Liga Fútbol — Página ${i} de ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 8,
      { align: 'center' }
    );
  }

  doc.save(`tabla_posiciones_${ahora.toISOString().slice(0, 10)}.pdf`);
  mostrarToast('PDF generado correctamente', 'success');
}

// =====================================================================
// 11. CONFIRMACIÓN Y ANIMACIONES
// =====================================================================

function mostrarConfirmacionEliminar(detalle, callback) {
  const modalEl = document.getElementById('modalConfirmarEliminar');
  const tituloEl = document.getElementById('confirmarTitulo');
  const mensajeEl = document.getElementById('confirmarMensaje');

  if (tituloEl) tituloEl.textContent = detalle || '¿Confirmar eliminación?';
  if (mensajeEl) mensajeEl.textContent = 'Esta acción no se puede deshacer.';

  accionAEliminar = typeof callback === 'function' ? callback : null;

  if (modalEliminarBS) {
    modalEliminarBS.show();
  } else if (modalEl && typeof bootstrap !== 'undefined') {
    modalEliminarBS = new bootstrap.Modal(modalEl);
    modalEliminarBS.show();
  }
}

function animarContador(elemento, valorFinal, duracion = 800, sufijo = '') {
  const el = typeof elemento === 'string' ? document.getElementById(elemento) : elemento;
  if (!el) return;

  const target = Number(valorFinal) || 0;
  if (target === 0) {
    el.textContent = `0${sufijo}`;
    return;
  }

  const startTime = performance.now();
  const startVal = 0;

  function actualizar(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duracion, 1);
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const actual = Math.floor(startVal + (target - startVal) * easeOut);
    el.textContent = `${actual}${sufijo}`;

    if (progress < 1) {
      requestAnimationFrame(actualizar);
    } else {
      el.textContent = `${target}${sufijo}`;
    }
  }

  requestAnimationFrame(actualizar);
}
