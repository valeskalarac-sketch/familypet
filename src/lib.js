import { supabase } from './supabaseClient';

// ============================================================
// 📦 CONSTANTES COMPARTIDAS
// ============================================================

/** Vacunas sugeridas según normativa chilena, usadas como plantillas rápidas */
export const VACCINE_TEMPLATES = [
  { name: 'Antirrábica', species: ['Perro', 'Gato'] },
  { name: 'Óctuple Canina', species: ['Perro'] },
  { name: 'Séxtuple Canina', species: ['Perro'] },
  { name: 'Tos de las Perreras (KC)', species: ['Perro'] },
  { name: 'Triple Felina', species: ['Gato'] },
  { name: 'Leucemia Felina', species: ['Gato'] },
];

export const FOOD_QUALITY = [
  { id: 'super', label: 'Súper Premium', factor: 12 },
  { id: 'premium', label: 'Premium', factor: 15 },
  { id: 'economico', label: 'Económico', factor: 18 },
];

export const PLACES = [
  { id: 'p1', name: 'Clínica Veterinaria Antupirén', subtitle: 'Urgencia 24/7', address: 'Butacura 8789, Peñalolén', category: 'Urgencias' },
  { id: 'p2', name: 'Club Animal', subtitle: 'Urgencia 24/7', address: 'Av. Los Presidentes 7674, Peñalolén', category: 'Urgencias' },
  { id: 'p3', name: 'La Granja Pet', subtitle: 'Pet Shop', address: 'Antupiren 8340, Peñalolén', category: 'Tiendas' },
  { id: 'p4', name: 'Suki Pet Food', subtitle: 'Pet Shop', address: 'Av. Grecia 6708, Peñalolén', category: 'Tiendas' },
  { id: 'p5', name: 'Veterinaria Portal Mayor', subtitle: 'Veterinario', address: 'Av. Grecia 8311, Peñalolén', category: 'Veterinarios' },
];

export const CATEGORY_COLOR = {
  Urgencias: '#FF3B30',
  Tiendas: '#FF8A80',
  Veterinarios: '#43A047',
};

export const POST_TYPE_LABEL = {
  perdida: 'Perdida',
  encontrada: 'Encontrada',
  adopcion: 'En adopción',
};

export const POST_TYPE_COLOR = {
  perdida: '#FF3B30',
  encontrada: '#FB8C00',
  adopcion: '#43A047',
};

// ============================================================
// 🛠️ UTILIDADES
// ============================================================

/** Muestra la edad respetando la unidad elegida (años o meses) */
export function formatAge(pet) {
  if (pet.age == null) return '';
  const unit = pet.age_unit || 'años';
  const n = Number(pet.age);
  if (unit === 'meses') return `${n} ${n === 1 ? 'mes' : 'meses'}`;
  return `${n} ${n === 1 ? 'año' : 'años'}`;
}

/** Convierte la edad a años para cálculos internos (ej: cachorro vs adulto) */
export function ageInYears(pet) {
  const n = Number(pet.age) || 0;
  return (pet.age_unit || 'años') === 'meses' ? n / 12 : n;
}

/** Formatea una fecha ISO a formato chileno legible */
export function formatDate(iso) {
  if (!iso) return null;
  const d = new Date(iso + (iso.length === 10 ? 'T12:00:00' : ''));
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Días que faltan para una fecha (negativo = ya pasó) */
export function daysUntil(iso) {
  if (!iso) return null;
  const target = new Date(iso + 'T12:00:00');
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}

/**
 * Sube una imagen al bucket de Supabase Storage y devuelve su URL pública.
 * Las imágenes se guardan bajo la carpeta del usuario para respetar las políticas RLS.
 */
export async function uploadImage(file, userId, folder = 'pets') {
  if (!file) return null;
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('La imagen no puede superar 5 MB.');
  }
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${userId}/${folder}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage.from('pet-photos').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from('pet-photos').getPublicUrl(path);
  return data.publicUrl;
}
