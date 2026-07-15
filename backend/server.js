const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== CONFIGURACIÓN DE SUPABASE (variables de entorno) =====
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Faltan variables de entorno: SUPABASE_URL y SUPABASE_ANON_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());

// Servir archivos estáticos del frontend (desde la carpeta 'frontend')
app.use(express.static(path.join(__dirname, '../frontend')));

// ===== FUNCIONES DE ACCESO A DATOS =====
async function getPacientes() {
    const { data, error } = await supabase
        .from('pacientes')
        .select('*')
        .order('cama', { ascending: true, nullsFirst: false });
    if (error) throw error;
    return data || [];
}

async function savePacientes(pacientes) {
    const { error } = await supabase
        .from('pacientes')
        .upsert(pacientes, { onConflict: 'id' });
    if (error) throw error;
    return true;
}

async function deletePaciente(id) {
    const { error } = await supabase
        .from('pacientes')
        .delete()
        .eq('id', id);
    if (error) throw error;
    return true;
}

// ===== API REST =====
app.get('/api/pacientes', async (req, res) => {
    try {
        const pacientes = await getPacientes();
        res.json(pacientes);
    } catch (error) {
        console.error('Error GET /api/pacientes:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/pacientes', async (req, res) => {
    try {
        const nuevos = req.body;
        if (!Array.isArray(nuevos)) {
            return res.status(400).json({ error: 'Se espera un array de pacientes' });
        }
        await savePacientes(nuevos);
        res.json({ message: 'Guardado correctamente' });
    } catch (error) {
        console.error('Error POST /api/pacientes:', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/pacientes/:id', async (req, res) => {
    try {
        const id = req.params.id;
        await deletePaciente(id);
        res.json({ message: 'Eliminado' });
    } catch (error) {
        console.error('Error DELETE /api/pacientes/:id:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== RUTA PRINCIPAL (opcional, para redirigir a index.html) =====
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ===== INICIAR SERVIDOR =====
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Servidor corriendo en http://0.0.0.0:${PORT}`);
    console.log(`   Frontend: http://localhost:${PORT}`);
    console.log(`   API: http://localhost:${PORT}/api/pacientes`);
});