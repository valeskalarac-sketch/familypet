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

// ============================================================
// 📍 UBICACIÓN DEL USUARIO
// ============================================================

/** Comunas frecuentes (sugerencias; el usuario puede escribir cualquiera) */
export const COMUNAS = [
  'Cerrillos', 'Cerro Navia', 'Conchalí', 'El Bosque', 'Estación Central', 'Huechuraba',
  'Independencia', 'La Cisterna', 'La Florida', 'La Granja', 'La Pintana', 'La Reina',
  'Las Condes', 'Lo Barnechea', 'Lo Espejo', 'Lo Prado', 'Macul', 'Maipú', 'Ñuñoa',
  'Pedro Aguirre Cerda', 'Peñalolén', 'Providencia', 'Pudahuel', 'Quilicura',
  'Quinta Normal', 'Recoleta', 'Renca', 'San Joaquín', 'San Miguel', 'San Ramón',
  'Santiago Centro', 'Vitacura', 'Puente Alto', 'San Bernardo', 'Colina', 'Melipilla',
  'Valparaíso', 'Viña del Mar', 'Concepción', 'La Serena', 'Antofagasta', 'Temuco',
  'Rancagua', 'Talca', 'Puerto Montt', 'Iquique', 'Arica', 'Chillán', 'Valdivia', 'Osorno',
];

export const DEFAULT_COMUNA = 'Peñalolén';

/** Lee la comuna guardada en el perfil del usuario */
export function getComuna(session) {
  return session?.user?.user_metadata?.comuna || DEFAULT_COMUNA;
}

/** Guarda la comuna en el perfil (metadata del usuario en Supabase Auth) */
export async function saveComuna(comuna) {
  const { data, error } = await supabase.auth.updateUser({ data: { comuna } });
  if (error) throw error;
  return data.user;
}

/**
 * Obtiene un nombre de pila limpio.
 * Toma solo el primer nombre y descarta apellidos; si viene de un correo
 * como "valeska.lara.c@gmail.com", se queda con "Valeska".
 */
export function firstName(user) {
  const full = user?.user_metadata?.full_name || user?.user_metadata?.name;
  if (full) return capitalize(full.trim().split(/\s+/)[0]);

  const local = user?.email?.split('@')[0] || '';
  const first = local.split(/[._\-0-9]+/).filter(Boolean)[0];
  return first ? capitalize(first) : 'DogLover';
}

function capitalize(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

// ============================================================
// 🦜 CATEGORÍAS DE ESPECIES
// ============================================================

/**
 * Grupos de especies soportados.
 * `group` decide el ícono y las reglas de cálculo; `type` es el texto libre
 * que escribe el usuario (ej: "Loro choroy", "Hámster ruso", "Tarántula").
 */
export const SPECIES_GROUPS = [
  { id: 'perro',   label: 'Perro',    icon: 'Dog',      examples: 'Mestizo, Labrador, Quiltro' },
  { id: 'gato',    label: 'Gato',     icon: 'Cat',      examples: 'Siamés, Común Europeo' },
  { id: 'ave',     label: 'Ave',      icon: 'Bird',     examples: 'Loro, Catita, Canario, Cacatúa' },
  { id: 'roedor',  label: 'Roedor',   icon: 'Rat',      examples: 'Hámster, Cobayo, Chinchilla, Ratón' },
  { id: 'conejo',  label: 'Conejo',   icon: 'Rabbit',   examples: 'Belier, Cabeza de León' },
  { id: 'reptil',  label: 'Reptil',   icon: 'Turtle',   examples: 'Tortuga, Iguana, Gecko, Serpiente' },
  { id: 'pez',     label: 'Pez',      icon: 'Fish',     examples: 'Betta, Goldfish, Guppy' },
  { id: 'otro',    label: 'Otro',     icon: 'Bug',      examples: 'Araña, Insecto palo, Erizo' },
];

/** Especies para las que tenemos fórmulas de alimento validadas */
export const SPECIES_WITH_FOOD_FORMULA = ['perro', 'gato'];

export function getSpeciesGroup(pet) {
  // Compatibilidad: las mascotas antiguas solo tienen `type` con "Perro"/"Gato"
  if (pet?.species_group) return pet.species_group;
  if (pet?.type === 'Gato') return 'gato';
  if (pet?.type === 'Perro') return 'perro';
  return 'otro';
}

export function getSpeciesMeta(groupId) {
  return SPECIES_GROUPS.find((g) => g.id === groupId) || SPECIES_GROUPS[SPECIES_GROUPS.length - 1];
}

/** Vacunas sugeridas según el grupo de especie */
export const VACCINE_BY_GROUP = {
  perro: ['Antirrábica', 'Óctuple Canina', 'Séxtuple Canina', 'Tos de las Perreras (KC)'],
  gato: ['Antirrábica', 'Triple Felina', 'Leucemia Felina'],
  conejo: ['Mixomatosis', 'Enfermedad Hemorrágica Vírica'],
  ave: ['Control veterinario anual', 'Desparasitación'],
  roedor: ['Control veterinario anual', 'Desparasitación'],
  reptil: ['Control veterinario anual', 'Examen parasitológico'],
  pez: ['Control de calidad del agua'],
  otro: ['Control veterinario anual'],
};
