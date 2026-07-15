const API_BASE = '/api';

export async function getPacientes() {
    const res = await fetch(`${API_BASE}/pacientes`);
    if (!res.ok) throw new Error('Error al obtener pacientes');
    return res.json();
}

export async function savePacientes(lista) {
    const res = await fetch(`${API_BASE}/pacientes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lista)
    });
    if (!res.ok) throw new Error('Error al guardar pacientes');
    return res.json();
}

export async function deletePaciente(id) {
    const res = await fetch(`${API_BASE}/pacientes/${id}`, {
        method: 'DELETE'
    });
    if (!res.ok) throw new Error('Error al eliminar paciente');
    return res.json();
}