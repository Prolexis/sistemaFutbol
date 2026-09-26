/**
 * Liga Futbol Pro — Frontend ES6 Application
 * Consume los 11 endpoints REST de Spring Boot usando fetch API.
 * Gestiona Modales, Toasts, Tabla de Posiciones, Encuentros y Equipos.
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
  },
  encuentros: {
    listar: () => `${API_BASE}/encuentros`,                   // GET /api/encuentros
    crear: () => `${API_BASE}/encuentros`,                    // POST /api/encuentros
    obtenerPorId: (id) => `${API_BASE}/encuentros/${id}`,     // GET /api/encuentros/{id}
    actualizar: (id) => `${API_BASE}/encuentros/${id}`,       // PUT /api/encuentros/{id}
    eliminar: (id) => `${API_BASE}/encuentros/${id}`,         // DELETE /api/encuentros/{id}
    tablaPosiciones: () => `${API_BASE}/encuentros/tabla-posiciones` // GET /api/encuentros/tabla-posiciones
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

// =====================================================================
// 3. INICIALIZACIÓN AL CARGAR EL DOM
// =====================================================================
document.addEventListener('DOMContentLoaded', () => {
  // Inicializar componentes de Bootstrap
  modalEquipoBS = new bootstrap.Modal(document.getElementById('modalEquipo'));
  modalEncuentroBS = new bootstrap.Modal(document.getElementById('modalEncuentro'));
  modalEliminarBS = new bootstrap.Modal(document.getElementById('modalConfirmarEliminar'));

  // Registrar listeners de formularios
  document.getElementById('formEquipo').addEventListener('submit', manejarSubmitEquipo);
  document.getElementById('formEncuentro').addEventListener('submit', manejarSubmitEncuentro);

  // Botones de apertura de modales
  document.getElementById('btnAbrirModalEquipo').addEventListener('click', abrirModalNuevoEquipo);
  document.getElementById('btnAbrirModalEncuentro').addEventListener('click', abrirModalNuevoEncuentro);

  // Botones de llamada a la acción en estados vacíos
  document.querySelectorAll('.btnCrearPrimerEquipo').forEach(btn => {
    btn.addEventListener('click', abrirModalNuevoEquipo);
  });
  document.querySelectorAll('.btnRegistrarPrimerEncuentro').forEach(btn => {
    btn.addEventListener('click', abrirModalNuevoEncuentro);
  });

  // Botón de refresco global
  document.getElementById('btnRefrescarTodo').addEventListener('click', async () => {
    mostrarToast('Actualizando datos...', 'info');
    await cargarTodosLosDatos();
    mostrarToast('Datos sincronizados correctamente', 'success');
  });

  // Botón de confirmación de eliminación
  document.getElementById('btnConfirmarEliminacionAccion').addEventListener('click', async () => {
    if (typeof accionAEliminar === 'function') {
      await accionAEliminar();
      modalEliminarBS.hide();
      accionAEliminar = null;
    }
  });

  // Recarga automática al cambiar de pestaña en Bootstrap
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
      }
    });
  });

  // Validación dinámica en formulario de encuentros: evitar mismo equipo
  const selLocal = document.getElementById('selectEquipoLocal');
  const selVisitante = document.getElementById('selectEquipoVisitante');
  const alertaMismo = document.getElementById('alertaMismoEquipo');

  function verificarEquiposIguales() {
    if (selLocal.value && selVisitante.value && selLocal.value === selVisitante.value) {
      alertaMismo.classList.remove('hidden');
    } else {
      alertaMismo.classList.add('hidden');
    }
  }

  selLocal.addEventListener('change', verificarEquiposIguales);
  selVisitante.addEventListener('change', verificarEquiposIguales);

  // Carga inicial
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
  } catch (error) {
    console.error('Error al sincronizar datos generales:', error);
  } finally {
    mostrarLoading(false);
  }
}

/**
 * 11. GET /api/encuentros/tabla-posiciones
 */
async function cargarTablaPosiciones() {
  try {
    const res = await fetch(API.encuentros.tablaPosiciones());
    if (!res.ok) throw await extraerError(res);
    const data = await res.json();
    tablaPosicionesCache = data;
    renderizarTablaPosiciones(data);
  } catch (error) {
    mostrarToast(`Error al cargar tabla de posiciones: ${error.message}`, 'error');
  }
}

/**
 * 2. GET /api/equipos
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
 * 7. GET /api/encuentros
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
 * Renderiza la Tabla de Posiciones estilo Scoreboard Profesional
 */
function renderizarTablaPosiciones(lista) {
  const tbody = document.getElementById('tablaPosicionesBody');
  tbody.innerHTML = '';

  if (!lista || lista.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="11" class="text-center py-8 text-slate-500">
          <i class="bi bi-info-circle me-1"></i> Aún no hay equipos registrados para calcular la tabla.
        </td>
      </tr>
    `;
    return;
  }

  lista.forEach((item) => {
    const tr = document.createElement('tr');
    tr.className = 'transition-colors';

    // Clases especiales de medalla para los primeros 3 puestos
    let badgePosicion = '';
    if (item.posicion === 1) {
      tr.classList.add('row-oro');
      badgePosicion = `<span class="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-yellow-500/20 text-yellow-400 font-black border border-yellow-500/40">1 👑</span>`;
    } else if (item.posicion === 2) {
      tr.classList.add('row-plata');
      badgePosicion = `<span class="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-400/20 text-slate-200 font-bold border border-slate-400/40">2 🥈</span>`;
    } else if (item.posicion === 3) {
      tr.classList.add('row-bronce');
      badgePosicion = `<span class="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-700/20 text-amber-400 font-bold border border-amber-600/40">3 🥉</span>`;
    } else {
      badgePosicion = `<span class="inline-block text-slate-400 font-semibold">${item.posicion}</span>`;
    }

    // Diferencia de goles formateada con signo + o -
    let dgClass = 'text-slate-400';
    let dgDisplay = item.diferenciaGoles;
    if (item.diferenciaGoles > 0) {
      dgClass = 'text-emerald-400 font-bold';
      dgDisplay = `+${item.diferenciaGoles}`;
    } else if (item.diferenciaGoles < 0) {
      dgClass = 'text-rose-400 font-bold';
    }

    tr.innerHTML = `
      <td class="text-center font-score">${badgePosicion}</td>
      <td class="font-bold text-white flex items-center gap-2">
        <span class="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-black text-emerald-400">
          ${obtenerIniciales(item.equipoNombre)}
        </span>
        <span>${escapeHtml(item.equipoNombre)}</span>
      </td>
      <td class="hidden sm:table-cell text-slate-400 text-xs">
        <i class="bi bi-geo-alt text-emerald-400/70 me-1"></i>${escapeHtml(item.ciudad)}
      </td>
      <td class="text-center font-score text-slate-300 font-semibold">${item.partidosJugados}</td>
      <td class="text-center font-score text-emerald-400 font-semibold">${item.partidosGanados}</td>
      <td class="text-center font-score text-amber-400 font-semibold">${item.partidosEmpatados}</td>
      <td class="text-center font-score text-rose-400 font-semibold">${item.partidosPerdidos}</td>
      <td class="text-center font-score hidden md:table-cell text-slate-400">${item.golesAFavor}</td>
      <td class="text-center font-score hidden md:table-cell text-slate-400">${item.golesEnContra}</td>
      <td class="text-center font-score ${dgClass}">${dgDisplay}</td>
      <td class="text-center font-score text-base font-extrabold text-white">
        <span class="inline-block px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
          ${item.puntos}
        </span>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/**
 * Renderiza el listado de Equipos en Cards con Tailwind CSS
 */
function renderizarEquipos(lista) {
  const container = document.getElementById('listaEquiposContainer');
  const sinEquiposMsg = document.getElementById('sinEquiposMsg');
  container.innerHTML = '';

  if (!lista || lista.length === 0) {
    sinEquiposMsg.classList.remove('hidden');
    return;
  }
  sinEquiposMsg.classList.add('hidden');

  lista.forEach(equipo => {
    const card = document.createElement('div');
    card.className = 'group bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-5 shadow-lg hover:shadow-emerald-500/10 hover:border-emerald-500/40 transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between';

    card.innerHTML = `
      <div>
        <div class="flex items-start justify-between gap-3 mb-4">
          <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-400/20 border border-emerald-500/30 flex items-center justify-center font-extrabold text-emerald-400 text-lg shadow-sm">
            ${obtenerIniciales(equipo.nombre)}
          </div>
          <span class="text-xs px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400 flex items-center gap-1">
            <i class="bi bi-tag"></i> ID: ${equipo.id}
          </span>
        </div>

        <h3 class="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors mb-1 truncate" title="${escapeHtml(equipo.nombre)}">
          ${escapeHtml(equipo.nombre)}
        </h3>

        <div class="flex items-center text-xs text-slate-400 mb-4">
          <i class="bi bi-geo-alt-fill text-emerald-400 me-1.5"></i>
          <span>${escapeHtml(equipo.ciudad)}</span>
        </div>
      </div>

      <div class="pt-3 border-t border-slate-800/80 flex items-center justify-end gap-2">
        <button onclick="prepararEdicionEquipo(${equipo.id})" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors">
          <i class="bi bi-pencil-square"></i> Editar
        </button>
        <button onclick="confirmarEliminarEquipo(${equipo.id}, '${escapeHtml(equipo.nombre)}')" class="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-600 border border-rose-500/30 hover:border-rose-600 text-rose-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors">
          <i class="bi bi-trash3"></i> Eliminar
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
  container.innerHTML = '';

  if (!lista || lista.length === 0) {
    sinEncuentrosMsg.classList.remove('hidden');
    return;
  }
  sinEncuentrosMsg.classList.add('hidden');

  lista.forEach(enc => {
    const card = document.createElement('div');
    card.className = 'bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-5 shadow-lg hover:border-slate-700 transition-all';

    // Determinar resultado
    let estadoResultado = 'Empate';
    let claseResultado = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    let localGana = false;
    let visitanteGana = false;

    if (enc.golesLocal > enc.golesVisitante) {
      estadoResultado = `Victoria ${escapeHtml(enc.equipoLocal.nombre)}`;
      claseResultado = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      localGana = true;
    } else if (enc.golesLocal < enc.golesVisitante) {
      estadoResultado = `Victoria ${escapeHtml(enc.equipoVisitante.nombre)}`;
      claseResultado = 'text-teal-400 bg-teal-500/10 border-teal-500/30';
      visitanteGana = true;
    }

    const fechaFormateada = formatearFecha(enc.fecha);

    card.innerHTML = `
      <div class="flex items-center justify-between text-xs text-slate-400 mb-3 pb-2 border-b border-slate-800">
        <span class="flex items-center gap-1.5">
          <i class="bi bi-calendar3 text-emerald-400"></i> ${fechaFormateada}
        </span>
        <span class="px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${claseResultado}">
          ${estadoResultado}
        </span>
      </div>

      <!-- Fila de Scoreboard del Partido -->
      <div class="grid grid-cols-7 items-center gap-2 my-4">
        
        <!-- Local -->
        <div class="col-span-3 text-right">
          <div class="font-bold text-sm sm:text-base ${localGana ? 'text-emerald-300 font-extrabold' : 'text-slate-200'} truncate" title="${escapeHtml(enc.equipoLocal.nombre)}">
            ${escapeHtml(enc.equipoLocal.nombre)}
          </div>
          <div class="text-[11px] text-slate-500 truncate">${escapeHtml(enc.equipoLocal.ciudad)} (Local)</div>
        </div>

        <!-- Marcador Central -->
        <div class="col-span-1 text-center">
          <div class="inline-flex items-center justify-center font-score text-xl sm:text-2xl font-black bg-slate-950 px-3 py-1 rounded-xl border border-slate-800 text-white shadow-inner">
            <span class="${localGana ? 'text-emerald-400' : ''}">${enc.golesLocal}</span>
            <span class="text-slate-500 mx-1">-</span>
            <span class="${visitanteGana ? 'text-teal-400' : ''}">${enc.golesVisitante}</span>
          </div>
        </div>

        <!-- Visitante -->
        <div class="col-span-3 text-left">
          <div class="font-bold text-sm sm:text-base ${visitanteGana ? 'text-teal-300 font-extrabold' : 'text-slate-200'} truncate" title="${escapeHtml(enc.equipoVisitante.nombre)}">
            ${escapeHtml(enc.equipoVisitante.nombre)}
          </div>
          <div class="text-[11px] text-slate-500 truncate">${escapeHtml(enc.equipoVisitante.ciudad)} (Visita)</div>
        </div>

      </div>

      <!-- Acciones de Encuentro -->
      <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
        <span class="text-slate-500 font-mono">Match #${enc.id}</span>
        <div class="flex items-center gap-2">
          <button onclick="prepararEdicionEncuentro(${enc.id})" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors">
            <i class="bi bi-pencil-square me-1"></i> Editar
          </button>
          <button onclick="confirmarEliminarEncuentro(${enc.id})" class="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-600 text-rose-300 hover:text-white transition-colors">
            <i class="bi bi-trash3 me-1"></i> Eliminar
          </button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

/**
 * Llena los selects de equipos en el modal de nuevo encuentro
 */
function poblarSelectsEquipos(equipos, selectedLocalId = null, selectedVisitanteId = null) {
  const selLocal = document.getElementById('selectEquipoLocal');
  const selVisitante = document.getElementById('selectEquipoVisitante');

  selLocal.innerHTML = '<option value="" disabled selected>Seleccione equipo local...</option>';
  selVisitante.innerHTML = '<option value="" disabled selected>Seleccione equipo visitante...</option>';

  equipos.forEach(eq => {
    const optLocal = document.createElement('option');
    optLocal.value = eq.id;
    optLocal.textContent = `${eq.nombre} (${eq.ciudad})`;
    if (selectedLocalId && String(selectedLocalId) === String(eq.id)) {
      optLocal.selected = true;
    }
    selLocal.appendChild(optLocal);

    const optVis = document.createElement('option');
    optVis.value = eq.id;
    optVis.textContent = `${eq.nombre} (${eq.ciudad})`;
    if (selectedVisitanteId && String(selectedVisitanteId) === String(eq.id)) {
      optVis.selected = true;
    }
    selVisitante.appendChild(optVis);
  });
}

// =====================================================================
// 6. CONTROLADORES DE MODALES Y FORMULARIOS (CRUD COMPLETO)
// =====================================================================

function abrirModalNuevoEquipo() {
  document.getElementById('formEquipo').reset();
  document.getElementById('equipoId').value = '';
  document.getElementById('modalEquipoTitulo').textContent = 'Nuevo Equipo';
  document.getElementById('formEquipo').classList.remove('was-validated');
  modalEquipoBS.show();
}

/**
 * 3. GET /api/equipos/{id}
 */
async function prepararEdicionEquipo(id) {
  mostrarLoading(true);
  try {
    const res = await fetch(API.equipos.obtenerPorId(id));
    if (!res.ok) throw await extraerError(res);
    const eq = await res.json();

    document.getElementById('equipoId').value = eq.id;
    document.getElementById('equipoNombre').value = eq.nombre;
    document.getElementById('equipoCiudad').value = eq.ciudad;
    document.getElementById('modalEquipoTitulo').textContent = 'Editar Equipo';
    document.getElementById('formEquipo').classList.remove('was-validated');
    modalEquipoBS.show();
  } catch (error) {
    mostrarToast(`No se pudo obtener el equipo: ${error.message}`, 'error');
  } finally {
    mostrarLoading(false);
  }
}

/**
 * 1. POST /api/equipos  o  4. PUT /api/equipos/{id}
 */
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

    modalEquipoBS.hide();
    mostrarToast(esEdicion ? '¡Equipo actualizado con éxito!' : '¡Equipo creado con éxito!', 'success');
    await cargarTodosLosDatos();
  } catch (error) {
    mostrarToast(error.message, 'error');
  } finally {
    mostrarLoading(false);
  }
}

/**
 * 5. DELETE /api/equipos/{id}
 */
function confirmarEliminarEquipo(id, nombre) {
  document.getElementById('confirmarTitulo').textContent = `¿Eliminar "${nombre}"?`;
  document.getElementById('confirmarMensaje').textContent = 'Si el equipo posee encuentros disputados, el sistema impedirá su eliminación para proteger las estadísticas.';

  accionAEliminar = async () => {
    mostrarLoading(true);
    try {
      const res = await fetch(API.equipos.eliminar(id), { method: 'DELETE' });
      if (!res.ok) throw await extraerError(res);

      mostrarToast('Equipo eliminado exitosamente', 'success');
      await cargarTodosLosDatos();
    } catch (error) {
      mostrarToast(`No se pudo eliminar: ${error.message}`, 'error');
    } finally {
      mostrarLoading(false);
    }
  };

  modalEliminarBS.show();
}

function abrirModalNuevoEncuentro() {
  if (equiposCache.length < 2) {
    mostrarToast('Se requieren al menos 2 equipos para poder registrar un partido.', 'warning');
    abrirModalNuevoEquipo();
    return;
  }

  document.getElementById('formEncuentro').reset();
  document.getElementById('encuentroId').value = '';
  document.getElementById('modalEncuentroTitulo').textContent = 'Registrar Encuentro';
  document.getElementById('golesLocal').value = 0;
  document.getElementById('golesVisitante').value = 0;
  document.getElementById('alertaMismoEquipo').classList.add('hidden');
  document.getElementById('formEncuentro').classList.remove('was-validated');

  // Fecha de hoy por defecto
  const hoy = new Date().toISOString().split('T')[0];
  document.getElementById('encuentroFecha').value = hoy;

  poblarSelectsEquipos(equiposCache);
  modalEncuentroBS.show();
}

/**
 * 8. GET /api/encuentros/{id}
 */
async function prepararEdicionEncuentro(id) {
  mostrarLoading(true);
  try {
    const res = await fetch(API.encuentros.obtenerPorId(id));
    if (!res.ok) throw await extraerError(res);
    const enc = await res.json();

    document.getElementById('encuentroId').value = enc.id;
    document.getElementById('modalEncuentroTitulo').textContent = 'Editar Encuentro';
    document.getElementById('golesLocal').value = enc.golesLocal;
    document.getElementById('golesVisitante').value = enc.golesVisitante;
    document.getElementById('encuentroFecha').value = enc.fecha;
    document.getElementById('alertaMismoEquipo').classList.add('hidden');
    document.getElementById('formEncuentro').classList.remove('was-validated');

    poblarSelectsEquipos(equiposCache, enc.equipoLocal.id, enc.equipoVisitante.id);
    modalEncuentroBS.show();
  } catch (error) {
    mostrarToast(`No se pudo obtener el encuentro: ${error.message}`, 'error');
  } finally {
    mostrarLoading(false);
  }
}

/**
 * 6. POST /api/encuentros  o  9. PUT /api/encuentros/{id}
 */
async function manejarSubmitEncuentro(e) {
  e.preventDefault();
  const form = e.target;

  const equipoLocalId = document.getElementById('selectEquipoLocal').value;
  const equipoVisitanteId = document.getElementById('selectEquipoVisitante').value;
  const golesLocal = parseInt(document.getElementById('golesLocal').value, 10);
  const golesVisitante = parseInt(document.getElementById('golesVisitante').value, 10);
  const fecha = document.getElementById('encuentroFecha').value;

  // Validación de Reglas de Negocio en Frontend
  if (!equipoLocalId || !equipoVisitanteId) {
    mostrarToast('Debe seleccionar ambos equipos.', 'warning');
    return;
  }
  if (equipoLocalId === equipoVisitanteId) {
    mostrarToast('Regla de negocio: Un equipo no puede enfrentarse a sí mismo.', 'error');
    document.getElementById('alertaMismoEquipo').classList.remove('hidden');
    return;
  }
  if (isNaN(golesLocal) || golesLocal < 0 || isNaN(golesVisitante) || golesVisitante < 0) {
    mostrarToast('Regla de negocio: Los goles deben ser mayores o iguales a 0.', 'error');
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

    modalEncuentroBS.hide();
    mostrarToast(esEdicion ? '¡Encuentro actualizado con éxito!' : '¡Encuentro registrado con éxito!', 'success');
    await cargarTodosLosDatos();
  } catch (error) {
    mostrarToast(error.message, 'error');
  } finally {
    mostrarLoading(false);
  }
}

/**
 * 10. DELETE /api/encuentros/{id}
 */
function confirmarEliminarEncuentro(id) {
  document.getElementById('confirmarTitulo').textContent = `¿Eliminar Encuentro #${id}?`;
  document.getElementById('confirmarMensaje').textContent = 'La tabla de posiciones se recalculará automáticamente tras eliminar este partido.';

  accionAEliminar = async () => {
    mostrarLoading(true);
    try {
      const res = await fetch(API.encuentros.eliminar(id), { method: 'DELETE' });
      if (!res.ok) throw await extraerError(res);

      mostrarToast('Encuentro eliminado exitosamente', 'success');
      await cargarTodosLosDatos();
    } catch (error) {
      mostrarToast(`No se pudo eliminar el encuentro: ${error.message}`, 'error');
    } finally {
      mostrarLoading(false);
    }
  };

  modalEliminarBS.show();
}

// =====================================================================
// 7. UTILIDADES (TOASTS, SPINNER, HELPERS)
// =====================================================================

/**
 * Extrae mensaje de error estructurado devuelto por GlobalExceptionHandler
 */
async function extraerError(res) {
  try {
    const json = await res.json();
    return new Error(json.message || json.error || `Error ${res.status}: ${res.statusText}`);
  } catch {
    return new Error(`Error ${res.status}: ${res.statusText}`);
  }
}

/**
 * Muestra un Toast de Bootstrap con estilos adaptados al tema
 * tipos: 'success', 'error', 'warning', 'info'
 */
function mostrarToast(mensaje, tipo = 'info') {
  const container = document.getElementById('toastContainer');

  let icono = 'bi-info-circle-fill text-cyan-400';
  let borde = 'border-cyan-500/40';
  let titulo = 'Información';

  if (tipo === 'success') {
    icono = 'bi-check-circle-fill text-emerald-400';
    borde = 'border-emerald-500/50';
    titulo = 'Éxito';
  } else if (tipo === 'error') {
    icono = 'bi-exclamation-octagon-fill text-rose-400';
    borde = 'border-rose-500/50';
    titulo = 'Atención';
  } else if (tipo === 'warning') {
    icono = 'bi-exclamation-triangle-fill text-amber-400';
    borde = 'border-amber-500/50';
    titulo = 'Advertencia';
  }

  const toastId = 'toast-' + Date.now();
  const toastHtml = `
    <div id="${toastId}" class="toast align-items-center text-white bg-slate-900 border ${borde} shadow-2xl rounded-2xl mb-2" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="toast-header bg-slate-950 text-white border-b border-slate-800 rounded-t-2xl">
        <i class="bi ${icono} me-2 text-base"></i>
        <strong class="me-auto text-xs uppercase tracking-wider">${titulo}</strong>
        <small class="text-slate-500">ahora</small>
        <button type="button" class="btn-close btn-close-white ms-2 mb-1" data-bs-dismiss="toast" aria-label="Cerrar"></button>
      </div>
      <div class="toast-body text-xs text-slate-200">
        ${escapeHtml(mensaje)}
      </div>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', toastHtml);
  const toastEl = document.getElementById(toastId);
  const bsToast = new bootstrap.Toast(toastEl, { delay: 4500 });
  bsToast.show();

  toastEl.addEventListener('hidden.bs.toast', () => {
    toastEl.remove();
  });
}

function mostrarLoading(mostrar) {
  const spinner = document.getElementById('loadingIndicator');
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
// 10. MÓDULO DE ESTADÍSTICAS Y DASHBOARD (NUEVO)
// =====================================================================

// Endpoints adicionales para estadísticas
API.estadisticas = {
  resumen: () => `${API_BASE}/estadisticas/resumen`,
  equipoStats: (id) => `${API_BASE}/equipos/${id}/estadisticas`
};

let graficoGolesChartInstance = null;
let statsEquiposCache = new Map();

/**
 * Calcula el badge de racha (🔥 positiva, ❄️ negativa, ➖ neutral)
 * a partir de la lista de los últimos resultados (ej. ["G", "E", "P", "G", "G"]).
 * 
 * @param {Array<string>} racha Array con los últimos resultados
 * @returns {Object} Objeto con emoji, texto, clase CSS y formato HTML
 */
function calcularBadgeRacha(racha) {
  if (!racha || !Array.isArray(racha) || racha.length === 0) {
    return {
      emoji: '➖',
      tipo: 'neutral',
      texto: 'Sin partidos jugados aún',
      clase: 'bg-slate-800 text-slate-400 border border-slate-700/60',
      html: `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700/60 cursor-help" title="Sin encuentros disputados">➖</span>`
    };
  }

  const victorias = racha.filter(r => r === 'G').length;
  const derrotas = racha.filter(r => r === 'P').length;

  if (victorias > derrotas) {
    return {
      emoji: '🔥',
      tipo: 'positiva',
      texto: `En racha positiva (${victorias}V / ${derrotas}D en últimos ${racha.length})`,
      clase: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
      html: `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 cursor-help" title="En racha positiva: ${racha.join(' - ')}">🔥</span>`
    };
  } else if (derrotas > victorias) {
    return {
      emoji: '❄️',
      tipo: 'negativa',
      texto: `En racha negativa (${derrotas}D / ${victorias}V en últimos ${racha.length})`,
      clase: 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30',
      html: `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 cursor-help" title="En racha negativa: ${racha.join(' - ')}">❄️</span>`
    };
  } else {
    return {
      emoji: '➖',
      tipo: 'neutral',
      texto: `Racha equilibrada (${victorias}V / ${derrotas}D en últimos ${racha.length})`,
      clase: 'bg-slate-800 text-slate-300 border border-slate-700/60',
      html: `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700/60 cursor-help" title="Racha neutral: ${racha.join(' - ')}">➖</span>`
    };
  }
}

/**
 * Renderiza el gráfico de barras comparativo de Goles a Favor usando Chart.js
 * 
 * @param {Array<Object>} equiposStats Lista de estadísticas de equipos
 */
function renderGraficoGoles(equiposStats) {
  const canvas = document.getElementById('graficoGolesFavorCanvas');
  if (!canvas) return;

  if (typeof Chart === 'undefined') {
    console.warn('Chart.js aún no está disponible.');
    return;
  }

  // Destruir instancia previa si existe para evitar superposiciones
  if (graficoGolesChartInstance) {
    graficoGolesChartInstance.destroy();
  }

  const ctx = canvas.getContext('2d');

  // Preparar datos ordenados por goles a favor descendente
  const obtenerGF = (e) => (e.GF ?? e.gf ?? e.golesAFavor ?? 0);
  const obtenerGC = (e) => (e.GC ?? e.gc ?? e.golesEnContra ?? 0);
  const datosOrdenados = [...equiposStats].sort((a, b) => obtenerGF(b) - obtenerGF(a));
  const etiquetas = datosOrdenados.map(e => e.equipoNombre);
  const valoresGF = datosOrdenados.map(e => obtenerGF(e));
  const valoresGC = datosOrdenados.map(e => obtenerGC(e));

  // Crear gradientes para las barras
  const gradienteGF = ctx.createLinearGradient(0, 0, 0, 300);
  gradienteGF.addColorStop(0, '#10b981'); // Emerald 500
  gradienteGF.addColorStop(1, '#064e3b'); // Emerald 900

  const gradienteGC = ctx.createLinearGradient(0, 0, 0, 300);
  gradienteGC.addColorStop(0, '#f43f5e'); // Rose 500
  gradienteGC.addColorStop(1, '#881337'); // Rose 900

  graficoGolesChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: etiquetas,
      datasets: [
        {
          label: 'Goles a Favor (GF)',
          data: valoresGF,
          backgroundColor: gradienteGF,
          borderColor: '#34d399',
          borderWidth: 1.5,
          borderRadius: 8,
          borderSkipped: false
        },
        {
          label: 'Goles en Contra (GC)',
          data: valoresGC,
          backgroundColor: gradienteGC,
          borderColor: '#fb7185',
          borderWidth: 1.5,
          borderRadius: 8,
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
          labels: {
            color: '#cbd5e1',
            font: {
              family: 'Outfit, sans-serif',
              size: 13,
              weight: '600'
            },
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 20
          }
        },
        tooltip: {
          backgroundColor: '#0f172a',
          titleColor: '#ffffff',
          bodyColor: '#e2e8f0',
          borderColor: '#334155',
          borderWidth: 1,
          padding: 12,
          boxPadding: 6,
          usePointStyle: true,
          titleFont: {
            family: 'Outfit, sans-serif',
            weight: 'bold',
            size: 14
          },
          bodyFont: {
            family: 'Outfit, sans-serif',
            size: 13
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: '#94a3b8',
            font: {
              family: 'Outfit, sans-serif',
              size: 12,
              weight: '500'
            }
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(255, 255, 255, 0.05)',
            lineWidth: 1
          },
          ticks: {
            stepSize: 1,
            color: '#94a3b8',
            font: {
              family: 'Chakra Petch, monospace',
              size: 12
            }
          }
        }
      }
    }
  });
}

/**
 * Inyecta el badge de racha junto a cada equipo en la tabla de posiciones ya existente,
 * sin romper su estructura HTML original.
 * 
 * @param {Array<Object>} equiposStats Lista de estadísticas de equipos
 */
function inyectarBadgesRachaEnTabla(equiposStats) {
  const tbody = document.getElementById('tablaPosicionesBody');
  if (!tbody) return;

  const filas = tbody.querySelectorAll('tr');
  if (!filas || filas.length === 0) return;

  const mapaStats = new Map();
  equiposStats.forEach(st => {
    mapaStats.set(st.equipoId, st);
    mapaStats.set(st.equipoNombre.trim().toLowerCase(), st);
  });

  filas.forEach((fila, idx) => {
    // La celda 2 contiene el nombre del equipo: <td class="font-bold text-white flex items-center gap-2">
    const celdaEquipo = fila.querySelector('td:nth-child(2)');
    if (!celdaEquipo) return;

    // Obtener el nombre del equipo
    const spanNombre = celdaEquipo.querySelector('span:not(.w-8)');
    if (!spanNombre) return;

    const nombreTexto = spanNombre.textContent.trim().toLowerCase();
    const st = mapaStats.get(nombreTexto);
    if (!st) return;

    const racha = st.racha || [];
    const badgeObj = calcularBadgeRacha(racha);

    // Evitar duplicar el badge si ya existe
    let badgeExistente = celdaEquipo.querySelector('.badge-racha-tag');
    if (!badgeExistente) {
      const nuevoBadge = document.createElement('span');
      nuevoBadge.className = `badge-racha-tag ms-1.5 transition-transform hover:scale-110`;
      nuevoBadge.innerHTML = badgeObj.html;
      celdaEquipo.appendChild(nuevoBadge);
    } else {
      badgeExistente.innerHTML = badgeObj.html;
    }
  });
}

/**
 * Carga todos los datos del nuevo Dashboard:
 * 1. Resumen general del torneo (/api/estadisticas/resumen)
 * 2. Estadísticas individuales por equipo (/api/equipos + /api/equipos/{id}/estadisticas)
 * 3. Renderiza tarjetas Tailwind, gráfico Chart.js y badges de racha en tabla de posiciones.
 */
async function cargarDashboard() {
  try {
    // 1. Obtener Resumen Global del Torneo
    const resResumen = await fetch(API.estadisticas.resumen());
    if (resResumen.ok) {
      const resumen = await resResumen.json();

      // Actualizar Tarjetas con Tailwind
      const elTotalGoles = document.getElementById('statTotalGoles');
      const elTotalPartidos = document.getElementById('statTotalPartidos');
      const elPromedio = document.getElementById('statPromedioGoles');
      const elGoleador = document.getElementById('statEquipoGoleador');
      const elGolesLider = document.getElementById('statGolesLider');
      const elMejorDefensa = document.getElementById('statMejorDefensa');
      const elGolesDefensa = document.getElementById('statGolesDefensa');

      if (elTotalGoles) elTotalGoles.textContent = resumen.totalGoles ?? 0;
      if (elTotalPartidos) elTotalPartidos.textContent = `${resumen.totalPartidos ?? 0} partidos`;
      if (elPromedio) elPromedio.textContent = Number(resumen.promedioGolesPorPartido ?? 0).toFixed(2);
      if (elGoleador) elGoleador.textContent = resumen.equipoMasGoleador || '--';
      if (elGolesLider) elGolesLider.textContent = `${resumen.golesEquipoMasGoleador ?? 0} goles a favor`;
      if (elMejorDefensa) elMejorDefensa.textContent = resumen.equipoMejorDefensa || '--';
      if (elGolesDefensa) elGolesDefensa.textContent = `${resumen.golesRecibidosMejorDefensa ?? 0} goles en contra`;
    }

    // 2. Obtener lista de equipos para consultar estadísticas individuales
    let equipos = equiposCache;
    if (!equipos || equipos.length === 0) {
      const resEquipos = await fetch(API.equipos.listar());
      if (resEquipos.ok) {
        equipos = await resEquipos.json();
        equiposCache = equipos;
      }
    }

    if (!equipos || equipos.length === 0) return;

    // 3. Consultar estadísticas de cada equipo en paralelo (/api/equipos/{id}/estadisticas)
    const promesasStats = equipos.map(eq =>
      fetch(API.estadisticas.equipoStats(eq.id))
        .then(r => r.ok ? r.json() : null)
        .catch(err => {
          console.warn(`Error al consultar estadísticas para equipo ${eq.id}:`, err);
          return null;
        })
    );

    const resultadosStats = await Promise.all(promesasStats);
    const statsValidas = resultadosStats.filter(st => st !== null);

    // Guardar en caché
    statsValidas.forEach(st => statsEquiposCache.set(st.equipoId, st));

    // 4. Renderizar gráfico Chart.js
    renderGraficoGoles(statsValidas);

    // 5. Inyectar badges de racha en la tabla de posiciones
    inyectarBadgesRachaEnTabla(statsValidas);

    // 6. Renderizar panel detallado de rachas en el Dashboard
    renderizarCardsRachas(statsValidas);

  } catch (error) {
    console.error('Error al cargar datos del dashboard:', error);
  }
}

/**
 * Renderiza cards detalladas de la racha de los últimos 5 resultados en el dashboard
 * 
 * @param {Array<Object>} listaStats Lista de estadísticas de equipos
 */
function renderizarCardsRachas(listaStats) {
  const contenedor = document.getElementById('contenedorRachasDetalladas');
  if (!contenedor) return;

  contenedor.innerHTML = '';

  if (!listaStats || listaStats.length === 0) {
    contenedor.innerHTML = `<div class="col-span-full text-center text-slate-500 py-6 text-sm">No hay información de equipos disponible.</div>`;
    return;
  }

  // Ordenar por puntos y diferencia de goles
  const ordenados = [...listaStats].sort((a, b) => (b.puntos ?? 0) - (a.puntos ?? 0));

  ordenados.forEach(item => {
    const racha = item.racha || [];
    const badgeObj = calcularBadgeRacha(racha);

    // Construir círculos para cada partido de la racha
    let rachaHtml = '';
    if (racha.length === 0) {
      rachaHtml = '<span class="text-xs text-slate-500 italic">Sin partidos disputados</span>';
    } else {
      rachaHtml = racha.map(res => {
        if (res === 'G') {
          return `<span class="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold flex items-center justify-center" title="Victoria">G</span>`;
        } else if (res === 'E') {
          return `<span class="w-6 h-6 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-bold flex items-center justify-center" title="Empate">E</span>`;
        } else {
          return `<span class="w-6 h-6 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/40 text-xs font-bold flex items-center justify-center" title="Derrota">P</span>`;
        }
      }).join('');
    }

    const card = document.createElement('div');
    card.className = 'bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors';
    card.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-black text-emerald-400">
          ${obtenerIniciales(item.equipoNombre)}
        </span>
        <div>
          <div class="font-bold text-white text-sm flex items-center gap-2">
            <span>${escapeHtml(item.equipoNombre)}</span>
            <span class="text-base" title="${badgeObj.texto}">${badgeObj.emoji}</span>
          </div>
          <div class="text-xs text-slate-400 mt-0.5">
            PJ: <b class="text-slate-300 font-score">${item.PJ ?? item.pj ?? item.partidosJugados ?? 0}</b> | 
            PTS: <b class="text-emerald-400 font-score">${item.puntos ?? 0}</b> | 
            GF: <b class="text-slate-300 font-score">${item.GF ?? item.gf ?? item.golesAFavor ?? 0}</b>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-1.5 flex-shrink-0">
        ${rachaHtml}
      </div>
    `;
    contenedor.appendChild(card);
  });
}

// =====================================================================
// 11. INICIALIZACIÓN DE EVENTOS DEL NUEVO MÓDULO DASHBOARD
// =====================================================================
document.addEventListener('DOMContentLoaded', () => {

  // --- Al cambiar a la pestaña Dashboard: cargar datos y renderizar gráfico
  //     Chart.js necesita que el canvas sea visible (dimensiones > 0) antes de renderizar.
  //     Por eso llamamos a renderGraficoGoles dentro del evento shown.bs.tab.
  const tabDashboardBtn = document.getElementById('tab-dashboard-btn');
  if (tabDashboardBtn) {
    tabDashboardBtn.addEventListener('shown.bs.tab', () => {
      if (statsEquiposCache.size > 0) {
        // Los datos ya están listos, solo re-renderizamos el gráfico ahora que el canvas es visible
        requestAnimationFrame(() => {
          renderGraficoGoles(Array.from(statsEquiposCache.values()));
          renderizarCardsRachas(Array.from(statsEquiposCache.values()));
        });
      } else {
        cargarDashboard();
      }
    });
  }

  // Listener para el botón de refrescar Dashboard
  const btnRefrescarDashboard = document.getElementById('btnRefrescarDashboard');
  if (btnRefrescarDashboard) {
    btnRefrescarDashboard.addEventListener('click', async () => {
      mostrarToast('Actualizando métricas del dashboard...', 'info');
      statsEquiposCache.clear();
      await cargarDashboard();
      mostrarToast('Dashboard actualizado correctamente', 'success');
    });
  }

  // Al mostrar la Tabla de Posiciones, inyectar badges si ya tenemos stats
  const tabTablaBtn = document.getElementById('tab-tabla-btn');
  if (tabTablaBtn) {
    tabTablaBtn.addEventListener('shown.bs.tab', async () => {
      if (statsEquiposCache.size > 0) {
        inyectarBadgesRachaEnTabla(Array.from(statsEquiposCache.values()));
      } else {
        // Cargar estadísticas en background, sin bloquear
        cargarDashboard();
      }
    });
  }

  // Pre-carga silenciosa del dashboard al iniciar la app:
  // Obtiene datos y actualiza tarjetas + badges en la tabla, pero NO renderiza el
  // gráfico aquí (el canvas está en una pestaña oculta y tendría dimensiones = 0).
  setTimeout(async () => {
    try {
      const resResumen = await fetch(API.estadisticas.resumen());
      if (resResumen.ok) {
        const resumen = await resResumen.json();
        const elTotalGoles = document.getElementById('statTotalGoles');
        const elTotalPartidos = document.getElementById('statTotalPartidos');
        const elPromedio = document.getElementById('statPromedioGoles');
        const elGoleador = document.getElementById('statEquipoGoleador');
        const elGolesLider = document.getElementById('statGolesLider');
        const elMejorDefensa = document.getElementById('statMejorDefensa');
        const elGolesDefensa = document.getElementById('statGolesDefensa');
        if (elTotalGoles) elTotalGoles.textContent = resumen.totalGoles ?? 0;
        if (elTotalPartidos) elTotalPartidos.textContent = `${resumen.totalPartidos ?? 0} partidos`;
        if (elPromedio) elPromedio.textContent = Number(resumen.promedioGolesPorPartido ?? 0).toFixed(2);
        if (elGoleador) elGoleador.textContent = resumen.equipoMasGoleador || '--';
        if (elGolesLider) elGolesLider.textContent = `${resumen.golesEquipoMasGoleador ?? 0} goles a favor`;
        if (elMejorDefensa) elMejorDefensa.textContent = resumen.equipoMejorDefensa || '--';
        if (elGolesDefensa) elGolesDefensa.textContent = `${resumen.golesRecibidosMejorDefensa ?? 0} goles en contra`;
      }

      let equipos = equiposCache;
      if (!equipos || equipos.length === 0) {
        const resEquipos = await fetch(API.equipos.listar());
        if (resEquipos.ok) { equipos = await resEquipos.json(); equiposCache = equipos; }
      }
      if (!equipos || equipos.length === 0) return;

      const promesasStats = equipos.map(eq =>
        fetch(API.estadisticas.equipoStats(eq.id))
          .then(r => r.ok ? r.json() : null).catch(() => null)
      );
      const statsValidas = (await Promise.all(promesasStats)).filter(st => st !== null);
      statsValidas.forEach(st => statsEquiposCache.set(st.equipoId, st));

      // Inyectar badges en tabla de posiciones (visible desde el inicio)
      inyectarBadgesRachaEnTabla(statsValidas);
      // Precargar cards de rachas (están en el DOM pero ocultas)
      renderizarCardsRachas(statsValidas);
      // El gráfico NO se renderiza aquí, lo hará cuando se abra el tab Dashboard
    } catch (e) {
      console.warn('Pre-carga dashboard silenciosa falló:', e);
    }
  }, 600);
});

