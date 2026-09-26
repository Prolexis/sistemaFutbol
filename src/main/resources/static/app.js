/**
 * Liga Fútbol — Frontend ES6 Application
 * Consume los endpoints REST de Spring Boot usando fetch API.
 * Gestiona Modales, Toasts, Tabla de Posiciones, Encuentros, Equipos y Estadísticas.
 *
 * Features added:
 *  - Dark mode toggle (data-theme attribute + localStorage persistence)
 *  - Scroll-aware header shadow
 *  - Dynamic Chart.js dark mode colors
 */

// =====================================================================
// 0. DARK MODE — Initialize before DOM paint to avoid FOUC
// =====================================================================
(function initTheme() {
  const saved = localStorage.getItem('liga-theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
})();

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

  // Mobile refresh button
  const btnRefrescarMobile = document.getElementById('btnRefrescarTodoMobile');
  if (btnRefrescarMobile) {
    btnRefrescarMobile.addEventListener('click', async () => {
      mostrarToast('Sincronizando datos...', 'info');
      await cargarTodosLosDatos();
      mostrarToast('Datos actualizados', 'success');
    });
  }

  // ── Dark Mode Toggle ────────────────────────────────────────────────
  const btnToggle = document.getElementById('btnToggleDarkMode');
  const iconDM   = document.getElementById('iconDarkMode');

  function aplicarTema(tema) {
    document.documentElement.setAttribute('data-theme', tema);
    localStorage.setItem('liga-theme', tema);
    if (iconDM) {
      iconDM.className = tema === 'dark'
        ? 'bi bi-sun-fill'
        : 'bi bi-moon-stars-fill';
    }
    // Re-render chart with updated palette when theme changes
    if (graficoGolesChartInstance && statsEquiposCache.size > 0) {
      setTimeout(() => renderGraficoGoles(Array.from(statsEquiposCache.values())), 50);
    }
  }

  // Apply icon on load
  aplicarTema(localStorage.getItem('liga-theme') || 'light');

  if (btnToggle) {
    btnToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      aplicarTema(current === 'dark' ? 'light' : 'dark');
    });
  }

  // ── Scroll-aware header shadow ──────────────────────────────────────
  const siteHeader = document.getElementById('siteHeader');
  if (siteHeader) {
    const onScroll = () => {
      if (window.scrollY > 8) {
        siteHeader.classList.add('scrolled');
      } else {
        siteHeader.classList.remove('scrolled');
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
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

  // Validación dinámica en formulario de partidos: evitar mismo equipo y actualizar estadios
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
    actualizarComboboxEstadios();
  }

  if (selLocal) selLocal.addEventListener('change', verificarEquiposIguales);
  if (selVisitante) selVisitante.addEventListener('change', verificarEquiposIguales);

  // Escuchar cambio en combobox de Estadio para mostrar input custom si se elige excepción
  const selEstadio = document.getElementById('encuentroEstadio');
  const contenedorCustom = document.getElementById('contenedorEstadioCustom');
  if (selEstadio) {
    selEstadio.addEventListener('change', () => {
      if (selEstadio.value === '__CUSTOM__') {
        if (contenedorCustom) contenedorCustom.classList.remove('hidden');
        document.getElementById('encuentroEstadioCustom')?.focus();
      } else {
        if (contenedorCustom) contenedorCustom.classList.add('hidden');
      }
    });
  }

  // Botón para habilitar/deshabilitar cambio de sede por excepción
  const btnToggleEstadio = document.getElementById('btnToggleExcepcionEstadio');
  if (btnToggleEstadio) {
    btnToggleEstadio.addEventListener('click', () => {
      const elEstadio = document.getElementById('encuentroEstadio');
      if (!elEstadio) return;
      if (elEstadio.disabled) {
        elEstadio.disabled = false;
        actualizarComboboxEstadios(elEstadio.value, true);
        mostrarToast('Se ha habilitado la selección de estadio por excepción.', 'info');
      } else {
        actualizarComboboxEstadios(null, false);
        mostrarToast('Se ha restablecido la Sede Local automática.', 'info');
      }
    });
  }

  // Posesión de balón complementaria automática (Local + Visitante = 100%)
  const inputPosLocal = document.getElementById('posesionLocal');
  const inputPosVisitante = document.getElementById('posesionVisitante');
  if (inputPosLocal && inputPosVisitante) {
    inputPosLocal.addEventListener('input', () => {
      let val = parseInt(inputPosLocal.value, 10);
      if (isNaN(val)) val = 0;
      if (val < 0) val = 0;
      if (val > 100) val = 100;
      inputPosVisitante.value = 100 - val;
    });

    inputPosVisitante.addEventListener('input', () => {
      let val = parseInt(inputPosVisitante.value, 10);
      if (isNaN(val)) val = 0;
      if (val < 0) val = 0;
      if (val > 100) val = 100;
      inputPosLocal.value = 100 - val;
    });
  }

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

  // Exportar PDF, CSV y Excel
  const btnExportarPdf = document.getElementById('btnExportarPosicionesPDF');
  if (btnExportarPdf) {
    btnExportarPdf.addEventListener('click', exportarPosicionesPDF);
  }
  const btnExportarCsv = document.getElementById('btnExportarPosicionesCSV');
  if (btnExportarCsv) {
    btnExportarCsv.addEventListener('click', exportarPosicionesCSV);
  }
  const btnExportarExcel = document.getElementById('btnExportarPosicionesExcel');
  if (btnExportarExcel) {
    btnExportarExcel.addEventListener('click', exportarPosicionesExcel);
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
        <td colspan="11" class="text-center py-8 text-xs" style="color: var(--text-muted);">
          Aún no hay equipos registrados para calcular la tabla.
        </td>
      </tr>
    `;
    return;
  }

  lista.forEach((item) => {
    const tr = document.createElement('tr');
    tr.className = 'transition-colors';

    // Position badge
    let badgePosicion = '';
    if (item.posicion === 1) {
      tr.classList.add('row-oro');
      badgePosicion = `<span class="inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold" style="background:#fef3c7;color:#b45309;border:1px solid #fde68a;">1</span>`;
    } else if (item.posicion === 2) {
      tr.classList.add('row-plata');
      badgePosicion = `<span class="inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold team-avatar">2</span>`;
    } else if (item.posicion === 3) {
      tr.classList.add('row-bronce');
      badgePosicion = `<span class="inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold" style="background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;">3</span>`;
    } else {
      badgePosicion = `<span class="text-xs font-medium" style="color:var(--text-muted);">${item.posicion}</span>`;
    }

    // Goal difference
    let dgStyle = 'color:var(--text-muted);font-weight:500;';
    let dgDisplay = item.diferenciaGoles;
    if (item.diferenciaGoles > 0) {
      dgStyle = 'color:#10b981;font-weight:600;';
      dgDisplay = `+${item.diferenciaGoles}`;
    } else if (item.diferenciaGoles < 0) {
      dgStyle = 'color:#ef4444;font-weight:600;';
    }

    tr.innerHTML = `
      <td class="text-center tabular-nums">${badgePosicion}</td>
      <td class="font-bold flex items-center gap-2.5" style="color:var(--text-main);">
        <span class="w-7 h-7 rounded-md flex-shrink-0 flex items-center justify-center overflow-hidden">
          ${avatarEquipo(item.equipoNombre, 'w-7 h-7 rounded-md')}
        </span>
        <span class="truncate max-w-[160px] sm:max-w-none">${escapeHtml(item.equipoNombre)}</span>
      </td>
      <td class="hidden sm:table-cell text-xs" style="color:var(--text-muted);">${escapeHtml(item.ciudad)}</td>
      <td class="text-center tabular-nums font-medium" style="color:var(--text-main);">${item.partidosJugados}</td>
      <td class="text-center tabular-nums font-medium" style="color:var(--text-main);">${item.partidosGanados}</td>
      <td class="text-center tabular-nums font-medium" style="color:var(--text-muted);">${item.partidosEmpatados}</td>
      <td class="text-center tabular-nums font-medium" style="color:var(--text-muted);">${item.partidosPerdidos}</td>
      <td class="text-center tabular-nums hidden md:table-cell" style="color:var(--text-muted);">${item.golesAFavor}</td>
      <td class="text-center tabular-nums hidden md:table-cell" style="color:var(--text-muted);">${item.golesEnContra}</td>
      <td class="text-center tabular-nums" style="${dgStyle}">${dgDisplay}</td>
      <td class="text-center tabular-nums text-sm font-extrabold">
        <span class="pts-badge">${item.puntos}</span>
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
    card.className = 'app-card p-4 flex flex-col justify-between animate-slide-up';

    card.innerHTML = `
      <div>
        <div class="flex items-start justify-between gap-3 mb-3">
          <div class="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
            ${avatarEquipo(equipo.nombre, 'w-12 h-12 rounded-lg')}
          </div>
          <span class="text-[11px] font-mono" style="color:var(--text-muted);">
            ID #${equipo.id}
          </span>
        </div>

        <h3 class="text-sm sm:text-base font-bold mb-0.5 truncate" style="color:var(--text-main);" title="${escapeHtml(equipo.nombre)}">
          ${escapeHtml(equipo.nombre)}
        </h3>

        <div class="flex items-center text-xs mb-1" style="color:var(--text-muted);">
          <i class="bi bi-geo-alt me-1"></i>
          <span>${escapeHtml(equipo.ciudad)}</span>
        </div>
        <div class="flex items-center text-xs mb-3" style="color:var(--text-muted);" title="Estadio principal">
          <i class="bi bi-bank me-1 text-slate-400"></i>
          <span class="truncate">${escapeHtml(equipo.estadio || 'Sin estadio registrado')}</span>
        </div>
      </div>

      <div class="pt-2.5 flex items-center justify-end gap-1.5" style="border-top:1px solid var(--border-subtle);">
        <button onclick="prepararEdicionEquipo(${equipo.id})"
                class="btn-action-ghost text-xs px-2.5 py-1">
          Editar
        </button>
        <button onclick="confirmarEliminarEquipo(${equipo.id}, '${escapeHtml(equipo.nombre)}')"
                class="px-2.5 py-1 rounded text-xs font-medium transition-colors"
                style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);color:#ef4444;"
                onmouseover="this.style.background='rgba(239,68,68,0.15)'"
                onmouseout="this.style.background='rgba(239,68,68,0.08)'">
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
    card.className = 'app-card p-4 flex flex-col justify-between animate-slide-up';

    let localGana = enc.golesLocal > enc.golesVisitante;
    let visitanteGana = enc.golesVisitante > enc.golesLocal;
    const fechaFormateada = formatearFecha(enc.fecha);
    const localWeight = localGana ? 'font-bold' : 'font-semibold';
    const visitanteWeight = visitanteGana ? 'font-bold' : 'font-semibold';
    const localColor = localGana ? 'color:var(--text-main);' : 'color:var(--text-muted);';
    const visitanteColor = visitanteGana ? 'color:var(--text-main);' : 'color:var(--text-muted);';

    // Estado Badge
    const estado = (enc.estado || 'FINALIZADO').toUpperCase();
    let badgeEstadoHtml = '';
    if (estado === 'FINALIZADO') {
      badgeEstadoHtml = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Finalizado</span>`;
    } else if (estado === 'EN_JUEGO') {
      badgeEstadoHtml = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-500 border border-rose-500/30 animate-pulse">● En Vivo</span>`;
    } else if (estado === 'PROGRAMADO') {
      badgeEstadoHtml = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/10 text-sky-500 border border-sky-500/20">Programado</span>`;
    } else {
      badgeEstadoHtml = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">${escapeHtml(estado)}</span>`;
    }

    const jornadaBadge = enc.jornada ? `<span class="badge-chip">Jor. ${enc.jornada}</span>` : '';
    const horaText = enc.hora ? ` &bull; ${escapeHtml(enc.hora)}` : '';
    const estadioText = enc.estadio ? `<span class="truncate max-w-[170px]" title="${escapeHtml(enc.estadio)}"><i class="bi bi-geo-alt me-1 text-slate-400"></i>${escapeHtml(enc.estadio)}</span>` : '';
    const arbitroText = enc.arbitro ? `<span class="truncate max-w-[140px]" title="Árbitro: ${escapeHtml(enc.arbitro)}"><i class="bi bi-person-badge me-1 text-slate-400"></i>${escapeHtml(enc.arbitro)}</span>` : '';

    // Disciplina y estadísticas
    const amLoc = enc.tarjetasAmarillasLocal || 0;
    const rojLoc = enc.tarjetasRojasLocal || 0;
    const amVis = enc.tarjetasAmarillasVisitante || 0;
    const rojVis = enc.tarjetasRojasVisitante || 0;
    const tirLoc = enc.tirosLocal || 0;
    const tirVis = enc.tirosVisitante || 0;
    const posLoc = enc.posesionLocal != null ? enc.posesionLocal : 50;
    const posVis = enc.posesionVisitante != null ? enc.posesionVisitante : 50;

    const tieneEstadisticas = (amLoc > 0 || rojLoc > 0 || amVis > 0 || rojVis > 0 || tirLoc > 0 || tirVis > 0);

    let statsRowHtml = '';
    if (tieneEstadisticas) {
      statsRowHtml = `
        <div class="mt-2.5 pt-2 border-t flex items-center justify-between text-[11px]"
             style="border-color: var(--border-subtle); color: var(--text-muted);">
          <div class="flex items-center gap-2">
            ${amLoc > 0 ? `<span title="${amLoc} amarillas local">🟨 ${amLoc}</span>` : ''}
            ${rojLoc > 0 ? `<span title="${rojLoc} rojas local">🟥 ${rojLoc}</span>` : ''}
            ${tirLoc > 0 ? `<span title="${tirLoc} tiros">🎯 ${tirLoc}</span>` : ''}
          </div>
          <div class="text-[10px] font-mono px-2 py-0.5 rounded" style="background: var(--pill-bg);" title="Posesión de balón">
            ${posLoc}% - ${posVis}%
          </div>
          <div class="flex items-center gap-2">
            ${tirVis > 0 ? `<span title="${tirVis} tiros">🎯 ${tirVis}</span>` : ''}
            ${amVis > 0 ? `<span title="${amVis} amarillas visitante">🟨 ${amVis}</span>` : ''}
            ${rojVis > 0 ? `<span title="${rojVis} rojas visitante">🟥 ${rojVis}</span>` : ''}
          </div>
        </div>
      `;
    }

    card.innerHTML = `
      <div>
        <!-- Card Header Info -->
        <div class="flex items-center justify-between text-xs mb-3 pb-2"
             style="border-bottom:1px solid var(--border-subtle); color:var(--text-muted);">
          <div class="flex items-center gap-2 flex-wrap">
            ${badgeEstadoHtml}
            ${jornadaBadge}
            <span class="flex items-center gap-1 font-medium">
              <i class="bi bi-calendar3"></i> ${fechaFormateada}${horaText}
            </span>
          </div>
          <span class="font-mono text-[11px]">#${enc.id}</span>
        </div>

        <!-- Scoreboard Fixture Row -->
        <div class="flex items-center justify-between py-1 my-1">
          <!-- Local -->
          <div class="flex-1 flex items-center justify-end gap-2 text-right">
            <span class="text-xs sm:text-sm ${localWeight} truncate" style="${localColor}" title="${escapeHtml(enc.equipoLocal.nombre)}">
              ${escapeHtml(enc.equipoLocal.nombre)}
            </span>
            <span class="w-8 h-8 rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
              ${avatarEquipo(enc.equipoLocal.nombre, 'w-8 h-8 rounded')}
            </span>
          </div>

          <!-- Score -->
          <div class="score-pill mx-3 flex-shrink-0">
            ${enc.golesLocal} &ndash; ${enc.golesVisitante}
          </div>

          <!-- Visitante -->
          <div class="flex-1 flex items-center justify-start gap-2 text-left">
            <span class="w-8 h-8 rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
              ${avatarEquipo(enc.equipoVisitante.nombre, 'w-8 h-8 rounded')}
            </span>
            <span class="text-xs sm:text-sm ${visitanteWeight} truncate" style="${visitanteColor}" title="${escapeHtml(enc.equipoVisitante.nombre)}">
              ${escapeHtml(enc.equipoVisitante.nombre)}
            </span>
          </div>
        </div>

        ${statsRowHtml}
      </div>

      <!-- Sede, Árbitro y Acciones -->
      <div class="pt-2.5 mt-3 flex items-center justify-between gap-2 flex-wrap"
           style="border-top:1px solid var(--border-subtle);">
        <div class="flex items-center gap-3 text-[11px]" style="color:var(--text-muted);">
          ${estadioText}
          ${arbitroText}
        </div>
        <div class="flex items-center gap-1.5 ms-auto">
          <button onclick="prepararEdicionEncuentro(${enc.id})"
                  class="btn-action-ghost text-xs px-2.5 py-1">
            Editar
          </button>
          <button onclick="confirmarEliminarEncuentro(${enc.id})"
                  class="px-2.5 py-1 rounded text-xs font-medium transition-colors"
                  style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);color:#ef4444;"
                  onmouseover="this.style.background='rgba(239,68,68,0.15)'"
                  onmouseout="this.style.background='rgba(239,68,68,0.08)'">
            Eliminar
          </button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });

}


/**
 * Llena selects de equipos en modales y filtros
 */
function poblarSelectsEquipos(equipos, selectedLocalId = null, selectedVisitanteId = null, selectedEstadio = null) {
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

  actualizarComboboxEstadios(selectedEstadio);
}

/**
 * Llena dinámicamente el combobox de Estadios recuperados de los Equipos registrados.
 * Recupera automáticamente el estadio del equipo Local seleccionado y soporta estadios de excepción.
 */
function actualizarComboboxEstadios(selectedEstadio = null, esExcepcionForzada = false) {
  const selEstadio = document.getElementById('encuentroEstadio');
  const contenedorCustom = document.getElementById('contenedorEstadioCustom');
  const inputCustom = document.getElementById('encuentroEstadioCustom');
  const ayudaTexto = document.getElementById('ayudaEstadioTexto');
  if (!selEstadio) return;

  const selLocal = document.getElementById('selectEquipoLocal');
  const selVisitante = document.getElementById('selectEquipoVisitante');

  const localId = selLocal ? selLocal.value : null;
  const visitanteId = selVisitante ? selVisitante.value : null;

  const localEq = equiposCache.find(e => String(e.id) === String(localId));
  const visitanteEq = equiposCache.find(e => String(e.id) === String(visitanteId));

  let estadiosSet = new Set();
  
  if (localEq && localEq.estadio) estadiosSet.add(localEq.estadio);
  if (visitanteEq && visitanteEq.estadio) estadiosSet.add(visitanteEq.estadio);
  equiposCache.forEach(e => {
    if (e.estadio) estadiosSet.add(e.estadio);
  });

  selEstadio.innerHTML = '<option value="" disabled selected>Seleccione estadio...</option>';
  
  let fueEmparejado = false;

  estadiosSet.forEach(estadio => {
    const opt = document.createElement('option');
    opt.value = estadio;
    let label = estadio;
    if (localEq && localEq.estadio === estadio) {
      label += ` (Sede Local)`;
    } else if (visitanteEq && visitanteEq.estadio === estadio) {
      label += ` (Sede Visitante)`;
    }
    opt.textContent = label;
    if (selectedEstadio && selectedEstadio === estadio) {
      opt.selected = true;
      fueEmparejado = true;
    }
    selEstadio.appendChild(opt);
  });

  // Opción para ingresar otro estadio (Excepción / Sede neutra)
  const optCustom = document.createElement('option');
  optCustom.value = '__CUSTOM__';
  optCustom.textContent = '✏️ Otro estadio (Ingresar manualmente)...';
  selEstadio.appendChild(optCustom);

  // Auto-selección por defecto: Al seleccionar el equipo local, recupera automáticamente su estadio oficial
  if (!selectedEstadio && localEq && localEq.estadio) {
    selEstadio.value = localEq.estadio;
    fueEmparejado = true;
  }

  // Manejo de estadios personalizados (Excepción)
  if (selectedEstadio && !fueEmparejado) {
    selEstadio.value = '__CUSTOM__';
    if (contenedorCustom) contenedorCustom.classList.remove('hidden');
    if (inputCustom) inputCustom.value = selectedEstadio;
    esExcepcionForzada = true;
  } else {
    if (selEstadio.value !== '__CUSTOM__') {
      if (contenedorCustom) contenedorCustom.classList.add('hidden');
      if (inputCustom) inputCustom.value = '';
    }
  }

  // Deshabilitado por defecto al autoseleccionar Sede Local; Habilitado si se activa el botón de excepción
  const esExcepcion = esExcepcionForzada || (selectedEstadio && localEq && selectedEstadio !== localEq.estadio);
  if (esExcepcion) {
    selEstadio.disabled = false;
    if (ayudaTexto) ayudaTexto.innerHTML = '<i class="bi bi-unlock me-1 text-amber-500"></i>Modo excepción activo: Puedes seleccionar otra sede o escribir una nueva.';
  } else {
    selEstadio.disabled = true;
    if (ayudaTexto) ayudaTexto.innerHTML = '<i class="bi bi-info-circle me-1"></i>Asignado automáticamente según la Sede Local. Haz clic en "Cambiar por excepción" para modificarlo.';
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
    document.getElementById('equipoEstadio').value = eq.estadio || '';
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
  const estadio = document.getElementById('equipoEstadio').value.trim();

  const payload = { nombre, ciudad, estadio };
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

  // Valores predeterminados profesionales
  const hoy = new Date().toISOString().split('T')[0];
  document.getElementById('encuentroFecha').value = hoy;
  document.getElementById('encuentroHora').value = '15:30';
  document.getElementById('encuentroJornada').value = (encuentrosCache ? Math.floor(encuentrosCache.length / 2) + 1 : 1);
  document.getElementById('encuentroEstado').value = 'FINALIZADO';
  document.getElementById('encuentroArbitro').value = 'Diego Haro';

  document.getElementById('amarillasLocal').value = 0;
  document.getElementById('rojasLocal').value = 0;
  document.getElementById('tirosLocal').value = 0;
  document.getElementById('posesionLocal').value = 50;

  document.getElementById('amarillasVisitante').value = 0;
  document.getElementById('rojasVisitante').value = 0;
  document.getElementById('tirosVisitante').value = 0;
  document.getElementById('posesionVisitante').value = 50;

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
    document.getElementById('modalEncuentroTitulo').textContent = 'Editar Partido #' + enc.id;
    document.getElementById('golesLocal').value = enc.golesLocal;
    document.getElementById('golesVisitante').value = enc.golesVisitante;
    document.getElementById('encuentroFecha').value = enc.fecha;
    document.getElementById('encuentroHora').value = enc.hora || '15:30';
    document.getElementById('encuentroJornada').value = enc.jornada || 1;
    document.getElementById('encuentroEstado').value = enc.estado || 'FINALIZADO';
    document.getElementById('encuentroArbitro').value = enc.arbitro || 'Diego Haro';

    document.getElementById('amarillasLocal').value = enc.tarjetasAmarillasLocal ?? 0;
    document.getElementById('rojasLocal').value = enc.tarjetasRojasLocal ?? 0;
    document.getElementById('tirosLocal').value = enc.tirosLocal ?? 0;
    document.getElementById('posesionLocal').value = enc.posesionLocal ?? 50;

    document.getElementById('amarillasVisitante').value = enc.tarjetasAmarillasVisitante ?? 0;
    document.getElementById('rojasVisitante').value = enc.tarjetasRojasVisitante ?? 0;
    document.getElementById('tirosVisitante').value = enc.tirosVisitante ?? 0;
    document.getElementById('posesionVisitante').value = enc.posesionVisitante ?? 50;

    document.getElementById('alertaMismoEquipo').classList.add('hidden');
    document.getElementById('formEncuentro').classList.remove('was-validated');

    poblarSelectsEquipos(equiposCache, enc.equipoLocal.id, enc.equipoVisitante.id, enc.estadio);
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

  let estadioFinal = document.getElementById('encuentroEstadio').value;
  if (estadioFinal === '__CUSTOM__') {
    estadioFinal = document.getElementById('encuentroEstadioCustom').value.trim();
    if (!estadioFinal) {
      mostrarToast('Por favor ingresa el nombre del estadio de excepción.', 'warning');
      document.getElementById('encuentroEstadioCustom')?.focus();
      return;
    }
  }

  const id = document.getElementById('encuentroId').value;
  const payload = {
    equipoLocalId: Number(equipoLocalId),
    equipoVisitanteId: Number(equipoVisitanteId),
    golesLocal,
    golesVisitante,
    fecha,
    hora: document.getElementById('encuentroHora').value || '15:30',
    jornada: parseInt(document.getElementById('encuentroJornada').value, 10) || 1,
    estado: document.getElementById('encuentroEstado').value || 'FINALIZADO',
    estadio: estadioFinal,
    arbitro: document.getElementById('encuentroArbitro').value.trim(),
    tarjetasAmarillasLocal: parseInt(document.getElementById('amarillasLocal').value, 10) || 0,
    tarjetasAmarillasVisitante: parseInt(document.getElementById('amarillasVisitante').value, 10) || 0,
    tarjetasRojasLocal: parseInt(document.getElementById('rojasLocal').value, 10) || 0,
    tarjetasRojasVisitante: parseInt(document.getElementById('rojasVisitante').value, 10) || 0,
    tirosLocal: parseInt(document.getElementById('tirosLocal').value, 10) || 0,
    tirosVisitante: parseInt(document.getElementById('tirosVisitante').value, 10) || 0,
    posesionLocal: parseInt(document.getElementById('posesionLocal').value, 10) || 50,
    posesionVisitante: parseInt(document.getElementById('posesionVisitante').value, 10) || 50
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

  let iconColor = 'color:#64748b;';
  let borderStyle = 'border-color:var(--border-subtle);';
  let iconClass = 'bi-info-circle';

  if (tipo === 'success') {
    iconClass = 'bi-check2-circle';
    iconColor = 'color:#10b981;';
  } else if (tipo === 'error') {
    iconClass = 'bi-exclamation-circle';
    iconColor = 'color:#ef4444;';
    borderStyle = 'border-color:rgba(239,68,68,0.3);';
  } else if (tipo === 'warning') {
    iconClass = 'bi-exclamation-triangle';
    iconColor = 'color:#f59e0b;';
    borderStyle = 'border-color:rgba(245,158,11,0.3);';
  }

  const toastId = 'toast-' + Date.now();
  const toastHtml = `
    <div id="${toastId}" class="toast align-items-center shadow-md rounded-xl mb-2" role="alert" aria-live="assertive" aria-atomic="true"
         style="background:var(--toast-bg);border:1px solid;${borderStyle}color:var(--toast-color);">
      <div class="flex items-center px-3.5 py-2.5">
        <i class="bi ${iconClass} text-base me-2.5 flex-shrink-0" style="${iconColor}"></i>
        <div class="toast-body p-0 text-xs font-medium flex-1" style="color:var(--toast-color);">
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

/**
 * Mapea el nombre de un equipo a su archivo de logo.
 * Retorna la ruta relativa del logo o null si no existe.
 */
function obtenerLogoEquipo(nombre) {
  if (!nombre) return null;
  const n = nombre.toLowerCase();
  if (n.includes('universitario')) return '/logos/universitario.jpg';
  if (n.includes('alianza lima'))  return '/logos/alianza_lima.jpg';
  if (n.includes('cristal'))       return '/logos/sporting_cristal.jpg';
  if (n.includes('melgar'))        return '/logos/melgar.jpg';
  if (n.includes('cienciano'))     return '/logos/cienciano.jpg';
  if (n.includes('vallejo') || n.includes('ucv')) return '/logos/ucv.jpg';
  return null;
}

/**
 * Genera el HTML del avatar de equipo: logo si existe, iniciales si no.
 * @param {string} nombre - Nombre del equipo
 * @param {string} [extraClass] - Clases CSS adicionales (size, border-radius, etc.)
 */
function avatarEquipo(nombre, extraClass = '') {
  const logo = obtenerLogoEquipo(nombre);
  const iniciales = obtenerIniciales(nombre);
  if (logo) {
    return `<img src="${logo}" alt="${iniciales}" title="${escapeHtml(nombre)}"
      class="team-avatar object-contain ${extraClass}"
      onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
    <span class="team-avatar items-center justify-center font-bold text-xs ${extraClass}" style="display:none;">${iniciales}</span>`;
  }
  return `<span class="team-avatar flex items-center justify-center font-bold text-xs ${extraClass}">${iniciales}</span>`;
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

  // Dynamic palette based on active theme
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const barGF = isDark ? '#3b82f6' : '#0f172a';
  const barGC = isDark ? '#334155' : '#cbd5e1';
  const gridColor = isDark ? '#1e2a3b' : '#f1f5f9';
  const labelColor = '#64748b';
  const tooltipBg = isDark ? '#1e293b' : '#0f172a';
  const tooltipTitle = isDark ? '#e2e8f0' : '#ffffff';
  const tooltipBody = isDark ? '#94a3b8' : '#e2e8f0';

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
          backgroundColor: barGF,
          borderRadius: 4,
          borderSkipped: false
        },
        {
          label: 'Goles en Contra',
          data: valoresGC,
          backgroundColor: barGC,
          borderRadius: 4,
          borderSkipped: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: {
            boxWidth: 12,
            boxHeight: 12,
            color: labelColor,
            font: { family: '"Plus Jakarta Sans", sans-serif', size: 12, weight: '500' }
          }
        },
        tooltip: {
          backgroundColor: tooltipBg,
          titleColor: tooltipTitle,
          bodyColor: tooltipBody,
          padding: 10,
          cornerRadius: 8,
          bodyFont: { family: '"Plus Jakarta Sans", sans-serif', size: 12 }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: labelColor, font: { family: '"Plus Jakarta Sans", sans-serif', size: 11 } }
        },
        y: {
          beginAtZero: true,
          grid: { color: gridColor },
          ticks: { stepSize: 1, color: labelColor, font: { family: '"Plus Jakarta Sans", sans-serif', size: 11 } }
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
    contenedor.innerHTML = `<div class="col-span-full text-center py-6 text-xs" style="color:var(--text-muted);">Sin información de clubes.</div>`;
    return;
  }

  const ordenados = [...listaStats].sort((a, b) => (b.puntos ?? 0) - (a.puntos ?? 0));

  ordenados.forEach(item => {
    const racha = item.racha || [];
    let rachaHtml = '';
    if (racha.length === 0) {
      rachaHtml = `<span class="text-xs italic" style="color:var(--text-muted);">Sin partidos</span>`;
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
    card.className = 'app-card p-3.5 flex items-center justify-between gap-3 animate-slide-up';
    card.innerHTML = `
      <div class="flex items-center gap-2.5 min-w-0">
        <span class="w-8 h-8 rounded-md flex-shrink-0 overflow-hidden flex items-center justify-center">
          ${avatarEquipo(item.equipoNombre, 'w-8 h-8 rounded-md')}
        </span>
        <div class="min-w-0">
          <div class="font-bold text-xs sm:text-sm truncate" style="color:var(--text-main);">
            ${escapeHtml(item.equipoNombre)}
          </div>
          <div class="text-[11px]" style="color:var(--text-muted);">
            PJ: <span class="font-semibold" style="color:var(--text-main);">${item.PJ ?? item.pj ?? item.partidosJugados ?? 0}</span> &bull;
            PTS: <span class="font-bold" style="color:var(--text-main);">${item.puntos ?? 0}</span>
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
// 10. EXPORTACIÓN (CSV / PDF / EXCEL)
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

function exportarPosicionesExcel() {
  mostrarToast('Generando reporte Excel...', 'info');
  if (!tablaPosicionesCache || tablaPosicionesCache.length === 0) {
    mostrarToast('No hay datos en la tabla para exportar.', 'warning');
    return;
  }

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Header">
   <Font ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0F172A" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center"/>
  </Style>
  <Style ss:ID="Bold">
   <Font ss:Bold="1"/>
   <Alignment ss:Horizontal="Center"/>
  </Style>
  <Style ss:ID="Center">
   <Alignment ss:Horizontal="Center"/>
  </Style>
  <Style ss:ID="Left">
   <Alignment ss:Horizontal="Left"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Tabla de Posiciones">
  <Table>
   <Column ss:Width="40"/>
   <Column ss:Width="160"/>
   <Column ss:Width="100"/>
   <Column ss:Width="40"/>
   <Column ss:Width="40"/>
   <Column ss:Width="40"/>
   <Column ss:Width="40"/>
   <Column ss:Width="40"/>
   <Column ss:Width="40"/>
   <Column ss:Width="40"/>
   <Column ss:Width="50"/>
   <Row ss:StyleID="Header">
    <Cell><Data ss:Type="String">Pos</Data></Cell>
    <Cell><Data ss:Type="String">Club</Data></Cell>
    <Cell><Data ss:Type="String">Ciudad</Data></Cell>
    <Cell><Data ss:Type="String">PJ</Data></Cell>
    <Cell><Data ss:Type="String">PG</Data></Cell>
    <Cell><Data ss:Type="String">PE</Data></Cell>
    <Cell><Data ss:Type="String">PP</Data></Cell>
    <Cell><Data ss:Type="String">GF</Data></Cell>
    <Cell><Data ss:Type="String">GC</Data></Cell>
    <Cell><Data ss:Type="String">DG</Data></Cell>
    <Cell><Data ss:Type="String">PTS</Data></Cell>
   </Row>`;

  tablaPosicionesCache.forEach(item => {
    xml += `
   <Row>
    <Cell ss:StyleID="Bold"><Data ss:Type="Number">${item.posicion}</Data></Cell>
    <Cell ss:StyleID="Left"><Data ss:Type="String">${escapeHtml(item.equipoNombre)}</Data></Cell>
    <Cell ss:StyleID="Left"><Data ss:Type="String">${escapeHtml(item.ciudad || '')}</Data></Cell>
    <Cell ss:StyleID="Center"><Data ss:Type="Number">${item.partidosJugados}</Data></Cell>
    <Cell ss:StyleID="Center"><Data ss:Type="Number">${item.partidosGanados}</Data></Cell>
    <Cell ss:StyleID="Center"><Data ss:Type="Number">${item.partidosEmpatados}</Data></Cell>
    <Cell ss:StyleID="Center"><Data ss:Type="Number">${item.partidosPerdidos}</Data></Cell>
    <Cell ss:StyleID="Center"><Data ss:Type="Number">${item.golesAFavor}</Data></Cell>
    <Cell ss:StyleID="Center"><Data ss:Type="Number">${item.golesEnContra}</Data></Cell>
    <Cell ss:StyleID="Center"><Data ss:Type="Number">${item.diferenciaGoles}</Data></Cell>
    <Cell ss:StyleID="Bold"><Data ss:Type="Number">${item.puntos}</Data></Cell>
   </Row>`;
  });

  xml += `
  </Table>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tabla_posiciones_${new Date().toISOString().slice(0, 10)}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  mostrarToast('Archivo Excel descargado', 'success');
}

function exportarPosicionesPDF() {
  const jsPDFClass = (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : (typeof window.jsPDF === 'function' ? window.jsPDF : null);

  if (!jsPDFClass) {
    mostrarToast('Librería PDF externa no disponible. Abriendo impresión nativa...', 'info');
    setTimeout(() => { window.print(); }, 500);
    return;
  }

  const doc = new jsPDFClass({ orientation: 'landscape', unit: 'mm', format: 'a4' });

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
