import { getPacientes, savePacientes, deletePaciente } from './api.js';

// ===== Variables globales =====
let pacientes = [];
let viewMode = 'grid';
let filtro = '';

// ===== DOM references =====
const container = document.getElementById('pacientesContainer');
const modal = document.getElementById('modalPaciente');
const modalTitulo = document.getElementById('modalTitulo');
const formPaciente = document.getElementById('formPaciente');
const btnCerrarModal = document.getElementById('btnCerrarModal');
const btnNuevo = document.getElementById('btnNuevoPaciente');
const btnCambiarVista = document.getElementById('btnCambiarVista');
const inputBuscar = document.getElementById('inputBuscar');
const btnLimpiarBusqueda = document.getElementById('btnLimpiarBusqueda');
const toastContainer = document.getElementById('toastContainer');

let pacienteEditandoId = null;

// ===== Funciones auxiliares =====
function generarId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

function fechaAhoraArgentina() {
    const now = new Date();
    return now.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour12: false });
}

function escapeHtml(text) {
    if (!text) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// ===== Toast =====
function mostrarToast(mensaje, tipo = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    toast.textContent = mensaje;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ===== Renderizado =====
function renderPacientes() {
    let lista = pacientes;
    if (filtro.trim() !== '') {
        const q = filtro.trim().toLowerCase();
        lista = lista.filter(p =>
            p.nombre.toLowerCase().includes(q) ||
            p.apellido.toLowerCase().includes(q) ||
            p.dni.includes(q)
        );
    }
    lista.sort((a, b) => (a.cama || Infinity) - (b.cama || Infinity));

    if (lista.length === 0) {
        container.innerHTML = `<div class="empty-message"><i class="fas fa-user-plus"></i> No hay pacientes ${filtro ? 'que coincidan' : 'ingresados'}.</div>`;
        return;
    }

    let html = '';
    const cardClass = viewMode === 'grid' ? 'paciente-card' : 'paciente-card list-item';

    lista.forEach(p => {
        const nombreCompleto = `${p.nombre} ${p.apellido}`;
        const ultima = p.ultimaactualizacion || p.fechaingreso;
        const camaDisplay = p.cama ? `Cama ${p.cama}` : 'Sin cama';

        html += `
            <div class="${cardClass}" data-id="${p.id}">
                <div class="paciente-header" onclick="toggleFicha('${p.id}')">
                    <div class="info">
                        <span class="nombre"><i class="fas fa-user-circle"></i> ${escapeHtml(nombreCompleto)}</span>
                        <span class="cama-badge">${camaDisplay}</span>
                        <span class="dni"><i class="far fa-id-card"></i> ${escapeHtml(p.dni)}</span>
                        <span class="badge"><i class="far fa-clock"></i> ${ultima}</span>
                    </div>
                    <span class="toggle-icon"><i class="fas fa-chevron-down" id="icon-${p.id}"></i></span>
                </div>
                <div class="paciente-ficha" id="ficha-${p.id}">
                    ${renderFicha(p)}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ===== Función para renderizar la ficha editable =====
function renderFicha(p) {
    const otrosHtml = (p.otros || []).map((otro, idx) => `
        <div class="otro-item" data-otro-idx="${idx}">
            <input type="text" class="otro-nombre" value="${escapeHtml(otro.nombre)}" placeholder="Nombre" />
            <input type="text" class="otro-valor" value="${escapeHtml(otro.valor)}" placeholder="Valor" />
            <button type="button" class="btn btn-danger btn-sm" onclick="eliminarOtroFicha('${p.id}', ${idx})"><i class="fas fa-times"></i></button>
        </div>
    `).join('');

    const fechaIngresoDisplay = p.fechaingreso || 'No registrada';

    return `
        <div class="ficha-header">
            <div><strong>${escapeHtml(p.nombre)} ${escapeHtml(p.apellido)}</strong> · DNI ${escapeHtml(p.dni)}</div>
            <div class="ult-act"><i class="fas fa-sync-alt"></i> ${p.ultimaactualizacion || p.fechaingreso}</div>
        </div>
        <div class="ficha-grid" id="fichaGrid-${p.id}">
            <div class="ficha-group">
                <label>Fecha ingreso</label>
                <input type="text" readonly value="${escapeHtml(fechaIngresoDisplay)}" />
            </div>
            <div class="ficha-group">
                <label>N° cama</label>
                <input type="number" class="ficha-input" data-field="cama" value="${p.cama ?? ''}" min="1" step="1" />
            </div>
            <div class="ficha-group">
                <label>Nombre</label>
                <input type="text" class="ficha-input" data-field="nombre" value="${escapeHtml(p.nombre)}" />
            </div>
            <div class="ficha-group">
                <label>Apellido</label>
                <input type="text" class="ficha-input" data-field="apellido" value="${escapeHtml(p.apellido)}" />
            </div>
            <div class="ficha-group">
                <label>DNI</label>
                <input type="text" class="ficha-input" data-field="dni" value="${escapeHtml(p.dni)}" />
            </div>
            <div class="ficha-group">
                <label>Obra Social</label>
                <input type="text" class="ficha-input" data-field="obrasocial" value="${escapeHtml(p.obrasocial)}" />
            </div>
            <div class="ficha-group">
                <label>Motivo Ingreso</label>
                <input type="text" class="ficha-input" data-field="motivoingreso" value="${escapeHtml(p.motivoingreso)}" />
            </div>
            <div class="ficha-group">
                <label>Sedación</label>
                <input type="text" class="ficha-input" data-field="sedacion" value="${escapeHtml(p.sedacion)}" />
            </div>
            <div class="ficha-group">
                <label>Estudios Pendientes</label>
                <input type="text" class="ficha-input" data-field="estudiospendientes" value="${escapeHtml(p.estudiospendientes)}" />
            </div>
            <div class="ficha-group ficha-check">
                <label>Vía Central</label>
                <input type="checkbox" class="ficha-checkbox" data-field="viacentral" ${p.viacentral ? 'checked' : ''} />
                <input type="text" class="ficha-text-date" data-field="fechaviacentral" value="${escapeHtml(p.fechaviacentral)}" placeholder="dd/mm/aaaa" />
            </div>
            <div class="ficha-group ficha-check">
                <label>Sonda Vesical</label>
                <input type="checkbox" class="ficha-checkbox" data-field="sondavesical" ${p.sondavesical ? 'checked' : ''} />
                <input type="text" class="ficha-text-date" data-field="fechasondavesical" value="${escapeHtml(p.fechasondavesical)}" placeholder="dd/mm/aaaa" />
            </div>
            <div class="ficha-group">
                <label>Drenajes</label>
                <input type="text" class="ficha-input" data-field="drenajes" value="${escapeHtml(p.drenajes)}" />
            </div>
            <div class="ficha-group">
                <label>Cirugías</label>
                <input type="text" class="ficha-input" data-field="cirugias" value="${escapeHtml(p.cirugias)}" />
            </div>
            <div class="ficha-group">
                <label>Cultivos</label>
                <input type="text" class="ficha-input" data-field="cultivos" value="${escapeHtml(p.cultivos)}" />
            </div>
            <div class="ficha-group">
                <label>Catarsis</label>
                <input type="text" class="ficha-input" data-field="catarsis" value="${escapeHtml(p.catarsis)}" />
            </div>
            <div class="ficha-group">
                <label>Alim. Oral</label>
                <input type="text" class="ficha-input" data-field="alimentacionoral" value="${escapeHtml(p.alimentacionoral)}" />
            </div>
            <div class="ficha-group">
                <label>Alim. Enteral</label>
                <input type="text" class="ficha-input" data-field="alimentacionenteral" value="${escapeHtml(p.alimentacionenteral)}" />
            </div>
            <div class="ficha-group">
                <label>Alim. Parenteral</label>
                <input type="text" class="ficha-input" data-field="alimentacionparenteral" value="${escapeHtml(p.alimentacionparenteral)}" />
            </div>
            <div class="ficha-group">
                <label>Alergias</label>
                <input type="text" class="ficha-input" data-field="alergias" value="${escapeHtml(p.alergias)}" />
            </div>
            <div class="otros-container">
                <div class="otros-header">
                    <i class="fas fa-ellipsis-h"></i>
                    <label>Otros</label>
                </div>
                <div id="otrosFicha-${p.id}">
                    ${otrosHtml}
                </div>
                <button type="button" class="btn btn-soft btn-sm" onclick="agregarOtroFicha('${p.id}')" style="margin-top:4px;">
                    <i class="fas fa-plus"></i> Agregar
                </button>
            </div>
            <div class="ficha-actions">
                <button class="btn btn-success btn-sm" onclick="guardarFicha('${p.id}')"><i class="fas fa-save"></i> Guardar</button>
                <button class="btn btn-danger btn-sm" onclick="eliminarPaciente('${p.id}')"><i class="fas fa-user-times"></i> Alta</button>
            </div>
        </div>
    `;
}

// ===== Funciones globales para el onclick =====
window.toggleFicha = function(id) {
    const ficha = document.getElementById(`ficha-${id}`);
    const icon = document.getElementById(`icon-${id}`);
    if (!ficha) return;
    const isOpen = ficha.classList.contains('open');
    if (isOpen) {
        ficha.classList.remove('open');
        icon.className = 'fas fa-chevron-down';
    } else {
        ficha.classList.add('open');
        icon.className = 'fas fa-chevron-up';
    }
};

window.guardarFicha = async function(id) {
    const index = pacientes.findIndex(p => p.id === id);
    if (index === -1) { mostrarToast('Paciente no encontrado', 'error'); return; }
    const p = pacientes[index];
    const grid = document.getElementById(`fichaGrid-${id}`);
    if (!grid) return;

    // Recolectar datos
    const inputs = grid.querySelectorAll('.ficha-input');
    inputs.forEach(input => {
        const field = input.dataset.field;
        if (field) {
            if (field === 'cama') {
                p[field] = input.value ? parseInt(input.value) : null;
            } else {
                p[field] = input.value.trim();
            }
        }
    });

    const checkboxes = grid.querySelectorAll('.ficha-checkbox');
    checkboxes.forEach(cb => {
        const field = cb.dataset.field;
        if (field) p[field] = cb.checked;
    });

    const textDates = grid.querySelectorAll('.ficha-text-date');
    textDates.forEach(td => {
        const field = td.dataset.field;
        if (field) p[field] = td.value.trim();
    });

    // Otros
    const otrosContainer = document.getElementById(`otrosFicha-${id}`);
    if (otrosContainer) {
        const items = otrosContainer.querySelectorAll('.otro-item');
        const nuevosOtros = [];
        items.forEach(item => {
            const nombreInput = item.querySelector('.otro-nombre');
            const valorInput = item.querySelector('.otro-valor');
            if (nombreInput && valorInput && nombreInput.value.trim()) {
                nuevosOtros.push({ nombre: nombreInput.value.trim(), valor: valorInput.value.trim() });
            }
        });
        p.otros = nuevosOtros;
    }

    p.ultimaactualizacion = fechaAhoraArgentina();
    pacientes[index] = p;

    try {
        await savePacientes(pacientes);
        const ultSpan = document.getElementById(`ultAct-${id}`);
        if (ultSpan) ultSpan.textContent = p.ultimaactualizacion;
        mostrarToast('Cambios guardados correctamente', 'success');
        renderPacientes();
        setTimeout(() => {
            const ficha = document.getElementById(`ficha-${id}`);
            if (ficha) ficha.classList.add('open');
        }, 50);
    } catch (error) {
        mostrarToast('Error al guardar: ' + error.message, 'error');
    }
};

window.eliminarPaciente = async function(id) {
    if (!confirm('¿Dar de alta / eliminar este paciente?')) return;
    try {
        await deletePaciente(id);
        pacientes = pacientes.filter(p => p.id !== id);
        renderPacientes();
        mostrarToast('Paciente eliminado', 'info');
    } catch (error) {
        mostrarToast('Error al eliminar: ' + error.message, 'error');
    }
};

window.agregarOtroFicha = function(id) {
    const container = document.getElementById(`otrosFicha-${id}`);
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'otro-item';
    div.innerHTML = `
        <input type="text" class="otro-nombre" placeholder="Nombre" />
        <input type="text" class="otro-valor" placeholder="Valor" />
        <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
    `;
    container.appendChild(div);
};

window.eliminarOtroFicha = function(id, idx) {
    const p = pacientes.find(p => p.id === id);
    if (!p) return;
    p.otros.splice(idx, 1);
    const fichaDiv = document.getElementById(`ficha-${id}`);
    if (fichaDiv) {
        fichaDiv.innerHTML = renderFicha(p);
        fichaDiv.classList.add('open');
    }
};

// ===== Modal =====
function abrirModal(paciente = null) {
    pacienteEditandoId = paciente ? paciente.id : null;
    if (paciente) {
        modalTitulo.innerHTML = '<i class="fas fa-edit"></i> Editar paciente';
        formPaciente.innerHTML = generarFormulario(paciente);
    } else {
        modalTitulo.innerHTML = '<i class="fas fa-user-plus"></i> Nuevo ingreso';
        formPaciente.innerHTML = generarFormulario(null);
    }
    modal.classList.add('active');
}

function cerrarModal() {
    modal.classList.remove('active');
    formPaciente.innerHTML = '';
    pacienteEditandoId = null;
}

function generarFormulario(paciente) {
    const p = paciente || {};
    const fechaHora = p.fechaingreso ? new Date(p.fechaingreso).toISOString().slice(0,16) : '';
    return `
        <div class="form-grid">
            <div class="form-group">
                <label>Fecha y hora de ingreso</label>
                <input type="datetime-local" id="fechaIngresoModal" value="${fechaHora}" required />
            </div>
            <div class="form-group">
                <label>Número de cama</label>
                <input type="number" id="camaModal" value="${p.cama || ''}" min="1" step="1" />
            </div>
            <div class="form-group">
                <label>Nombre</label>
                <input type="text" id="nombreModal" value="${escapeHtml(p.nombre || '')}" required />
            </div>
            <div class="form-group">
                <label>Apellido</label>
                <input type="text" id="apellidoModal" value="${escapeHtml(p.apellido || '')}" required />
            </div>
            <div class="form-group">
                <label>DNI</label>
                <input type="text" id="dniModal" value="${escapeHtml(p.dni || '')}" required />
            </div>
            <div class="form-group">
                <label>Obra Social</label>
                <input type="text" id="obraSocialModal" value="${escapeHtml(p.obrasocial || '')}" />
            </div>
            <div class="form-group">
                <label>Motivo de Ingreso</label>
                <input type="text" id="motivoIngresoModal" value="${escapeHtml(p.motivoingreso || '')}" />
            </div>
            <div class="form-group">
                <label>Sedación</label>
                <input type="text" id="sedacionModal" value="${escapeHtml(p.sedacion || '')}" />
            </div>
            <div class="form-group">
                <label>Estudios Pendientes</label>
                <input type="text" id="estudiosModal" value="${escapeHtml(p.estudiospendientes || '')}" />
            </div>
            <div class="form-group checkbox-group">
                <label>Vía Central</label>
                <input type="checkbox" id="viaCentralModal" ${p.viacentral ? 'checked' : ''} />
                <input type="text" id="fechaViaCentralModal" value="${escapeHtml(p.fechaviacentral || '')}" placeholder="dd/mm/aaaa" />
            </div>
            <div class="form-group checkbox-group">
                <label>Sonda Vesical</label>
                <input type="checkbox" id="sondaVesicalModal" ${p.sondavesical ? 'checked' : ''} />
                <input type="text" id="fechaSondaVesicalModal" value="${escapeHtml(p.fechasondavesical || '')}" placeholder="dd/mm/aaaa" />
            </div>
            <div class="form-group">
                <label>Drenajes</label>
                <input type="text" id="drenajesModal" value="${escapeHtml(p.drenajes || '')}" />
            </div>
            <div class="form-group">
                <label>Cirugías</label>
                <input type="text" id="cirugiasModal" value="${escapeHtml(p.cirugias || '')}" />
            </div>
            <div class="form-group">
                <label>Cultivos</label>
                <input type="text" id="cultivosModal" value="${escapeHtml(p.cultivos || '')}" />
            </div>
            <div class="form-group">
                <label>Catarsis</label>
                <input type="text" id="catarsisModal" value="${escapeHtml(p.catarsis || '')}" />
            </div>
            <div class="form-group">
                <label>Alimentación Oral</label>
                <input type="text" id="alimOralModal" value="${escapeHtml(p.alimentacionoral || '')}" />
            </div>
            <div class="form-group">
                <label>Alimentación Enteral</label>
                <input type="text" id="alimEnteralModal" value="${escapeHtml(p.alimentacionenteral || '')}" />
            </div>
            <div class="form-group">
                <label>Alimentación Parenteral</label>
                <input type="text" id="alimParenteralModal" value="${escapeHtml(p.alimentacionparenteral || '')}" />
            </div>
            <div class="form-group">
                <label>Alergias</label>
                <input type="text" id="alergiasModal" value="${escapeHtml(p.alergias || '')}" />
            </div>
            <div class="form-group full-width">
                <label>Otros (nombre · valor)</label>
                <div id="otrosModalContainer">
                    ${(p.otros || []).map((o, i) => `
                        <div class="otro-item">
                            <input type="text" class="otro-nombre-modal" value="${escapeHtml(o.nombre)}" placeholder="Nombre" />
                            <input type="text" class="otro-valor-modal" value="${escapeHtml(o.valor)}" placeholder="Valor" />
                            <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
                        </div>
                    `).join('')}
                </div>
                <button type="button" class="btn btn-soft btn-sm" onclick="agregarOtroModal()"><i class="fas fa-plus"></i> Agregar otro</button>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-outline" onclick="cerrarModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Guardar</button>
            </div>
        </div>
    `;
}

window.agregarOtroModal = function() {
    const container = document.getElementById('otrosModalContainer');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'otro-item';
    div.innerHTML = `
        <input type="text" class="otro-nombre-modal" placeholder="Nombre" />
        <input type="text" class="otro-valor-modal" placeholder="Valor" />
        <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
    `;
    container.appendChild(div);
};

// ===== Evento submit del formulario modal =====
formPaciente.addEventListener('submit', async function(e) {
    e.preventDefault();
    // Recolectar datos del modal
    const fechaHora = document.getElementById('fechaIngresoModal').value;
    if (!fechaHora) { mostrarToast('Complete la fecha y hora de ingreso', 'warning'); return; }
    const fechaObj = new Date(fechaHora);
    const fechaHoraStr = fechaObj.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });

    const nombre = document.getElementById('nombreModal').value.trim();
    const apellido = document.getElementById('apellidoModal').value.trim();
    const dni = document.getElementById('dniModal').value.trim();
    if (!nombre || !apellido || !dni) {
        mostrarToast('Nombre, Apellido y DNI son obligatorios', 'warning');
        return;
    }

    const cama = parseInt(document.getElementById('camaModal').value) || null;
    const obraSocial = document.getElementById('obraSocialModal').value.trim();
    const motivoIngreso = document.getElementById('motivoIngresoModal').value.trim();
    const sedacion = document.getElementById('sedacionModal').value.trim();
    const estudios = document.getElementById('estudiosModal').value.trim();
    const viaCentral = document.getElementById('viaCentralModal').checked;
    const fechaViaCentral = document.getElementById('fechaViaCentralModal').value.trim();
    const sondaVesical = document.getElementById('sondaVesicalModal').checked;
    const fechaSondaVesical = document.getElementById('fechaSondaVesicalModal').value.trim();
    const drenajes = document.getElementById('drenajesModal').value.trim();
    const cirugias = document.getElementById('cirugiasModal').value.trim();
    const cultivos = document.getElementById('cultivosModal').value.trim();
    const catarsis = document.getElementById('catarsisModal').value.trim();
    const alimOral = document.getElementById('alimOralModal').value.trim();
    const alimEnteral = document.getElementById('alimEnteralModal').value.trim();
    const alimParenteral = document.getElementById('alimParenteralModal').value.trim();
    const alergias = document.getElementById('alergiasModal').value.trim();

    const otros = [];
    document.querySelectorAll('#otrosModalContainer .otro-item').forEach(item => {
        const nombreInput = item.querySelector('.otro-nombre-modal');
        const valorInput = item.querySelector('.otro-valor-modal');
        if (nombreInput && valorInput && nombreInput.value.trim()) {
            otros.push({ nombre: nombreInput.value.trim(), valor: valorInput.value.trim() });
        }
    });

    const pacienteData = {
        id: pacienteEditandoId || generarId(),
        cama,
        nombre,
        apellido,
        dni,
        obrasocial: obraSocial,
        motivoingreso: motivoIngreso,
        sedacion,
        fechaingreso: fechaHoraStr,
        estudiospendientes: estudios,
        viacentral: viaCentral,
        fechaviacentral: fechaViaCentral,
        sondavesical: sondaVesical,
        fechasondavesical: fechaSondaVesical,
        drenajes,
        cirugias,
        cultivos,
        catarsis,
        alimentacionoral: alimOral,
        alimentacionenteral: alimEnteral,
        alimentacionparenteral: alimParenteral,
        alergias,
        otros,
        ultimaactualizacion: fechaHoraStr
    };

    if (pacienteEditandoId) {
        const index = pacientes.findIndex(p => p.id === pacienteEditandoId);
        if (index !== -1) {
            pacientes[index] = pacienteData;
        } else {
            mostrarToast('Paciente no encontrado', 'error');
            return;
        }
    } else {
        pacientes.push(pacienteData);
    }

    try {
        await savePacientes(pacientes);
        mostrarToast(`Paciente ${nombre} ${apellido} guardado con éxito`, 'success');
        cerrarModal();
        renderPacientes();
    } catch (error) {
        mostrarToast('Error al guardar: ' + error.message, 'error');
    }
});

// ===== Eventos =====
btnNuevo.addEventListener('click', () => abrirModal(null));
btnCerrarModal.addEventListener('click', cerrarModal);
modal.addEventListener('click', (e) => { if (e.target === modal) cerrarModal(); });

btnCambiarVista.addEventListener('click', () => {
    viewMode = (viewMode === 'grid') ? 'list' : 'grid';
    btnCambiarVista.innerHTML = viewMode === 'grid' ? '<i class="fas fa-th-large"></i> Vista' : '<i class="fas fa-list-ul"></i> Vista';
    renderPacientes();
});

inputBuscar.addEventListener('input', (e) => {
    filtro = e.target.value;
    renderPacientes();
});
btnLimpiarBusqueda.addEventListener('click', () => {
    inputBuscar.value = '';
    filtro = '';
    renderPacientes();
});

// ===== Exponer funciones globales =====
window.cerrarModal = cerrarModal;
window.abrirModal = abrirModal;
window.agregarOtroModal = agregarOtroModal;

// ===== Inicialización =====
async function init() {
    try {
        pacientes = await getPacientes();
        renderPacientes();
        console.log('Aplicación iniciada correctamente');
    } catch (error) {
        mostrarToast('Error al cargar los pacientes: ' + error.message, 'error');
        pacientes = [];
        renderPacientes();
    }
}

init();