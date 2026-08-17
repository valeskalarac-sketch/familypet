import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus, Pencil, Trash2, Syringe, Check, Calendar,
  ChevronDown, ChevronUp, AlertTriangle,
} from 'lucide-react';
import { supabase } from './supabaseClient';
import { PetAvatar, Modal, ImagePicker, ConfirmDialog, MultiImagePicker, SpeciesIcon } from './components';
import { formatAge, formatDate, daysUntil, uploadImage, SPECIES_GROUPS, getSpeciesGroup, getSpeciesMeta, VACCINE_BY_GROUP } from './lib';

// ============================================================
// 📝 FORMULARIO DE MASCOTA (sirve para crear y editar)
// ============================================================
function PetForm({ pet, onClose, onSave, userId }) {
  const isEdit = !!pet;
  const [name, setName] = useState(pet?.name || '');
  const [group, setGroup] = useState(pet ? getSpeciesGroup(pet) : 'perro');
  const [type, setType] = useState(pet?.type || 'Perro');
  const [breed, setBreed] = useState(pet?.breed || '');
  const [weight, setWeight] = useState(pet?.weight?.toString() || '');
  const [age, setAge] = useState(pet?.age?.toString() || '');
  const [ageUnit, setAgeUnit] = useState(pet?.age_unit || 'años');
  const [microchip, setMicrochip] = useState(pet?.microchip || '');
  const [notes, setNotes] = useState(pet?.notes || '');
  const [photoFile, setPhotoFile] = useState(null);
  const [galleryExisting, setGalleryExisting] = useState(pet?.gallery || []);
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !weight || !age) {
      window.alert('Completa al menos nombre, peso y edad.');
      return;
    }
    setSaving(true);
    try {
      let photo_url = pet?.photo_url || null;
      // Solo subimos si el usuario eligió una foto nueva
      if (photoFile) photo_url = await uploadImage(photoFile, userId, 'pet');

      // Subimos las fotos nuevas de la galería y las unimos a las ya guardadas
      const uploaded = [];
      for (const f of galleryFiles) {
        uploaded.push(await uploadImage(f, userId, 'gallery'));
      }

      await onSave({
        gallery: [...galleryExisting, ...uploaded],
        name: name.trim(),
        type: type.trim() || getSpeciesMeta(group).label,
        species_group: group,
        breed: breed.trim() || 'Sin raza definida',
        weight: parseFloat(weight),
        age: parseFloat(age),
        age_unit: ageUnit,
        microchip: microchip.trim() || null,
        notes: notes.trim() || null,
        photo_url,
      });
      onClose();
    } catch (err) {
      window.alert('No se pudo guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? `Editar a ${pet.name}` : 'Agregar mascota'} onClose={onClose}>
      <ImagePicker value={pet?.photo_url} onChange={setPhotoFile} label="Foto principal" round />

      <MultiImagePicker
        existing={galleryExisting}
        onChangeFiles={setGalleryFiles}
        onRemoveExisting={(i) => setGalleryExisting((prev) => prev.filter((_, idx) => idx !== i))}
        max={4}
        label="Fotos adicionales (se usan en el afiche)"
      />

      <label className="input-label">Nombre</label>
      <input className="text-input" placeholder="Ej: Firulais" value={name} onChange={(e) => setName(e.target.value)} />

      <label className="input-label">Categoría</label>
      <div className="species-grid">
        {SPECIES_GROUPS.map((g) => (
          <button
            key={g.id}
            className={`species-chip ${group === g.id ? 'active' : ''}`}
            onClick={() => {
              setGroup(g.id);
              // Prellenamos el tipo con la etiqueta si el campo aún no fue personalizado
              const labels = SPECIES_GROUPS.map((x) => x.label);
              if (!type || labels.includes(type)) setType(g.label);
            }}
          >
            <SpeciesIcon group={g.id} size={18} />
            <span>{g.label}</span>
          </button>
        ))}
      </div>

      <label className="input-label">Especie <span className="label-hint">(puedes escribirla)</span></label>
      <input
        className="text-input"
        placeholder={`Ej: ${getSpeciesMeta(group).label}`}
        value={type}
        onChange={(e) => setType(e.target.value)}
      />

      <label className="input-label">Raza o variedad</label>
      <input
        className="text-input"
        placeholder={`Ej: ${getSpeciesMeta(group).examples}`}
        value={breed}
        onChange={(e) => setBreed(e.target.value)}
      />

      <label className="input-label">Peso (kg) <span className="label-hint">usa decimales si es pequeño, ej: 0.3</span></label>
      <input className="text-input" type="number" step="0.1" placeholder="Ej: 10" value={weight} onChange={(e) => setWeight(e.target.value)} />

      <label className="input-label">Edad</label>
      <div className="age-row">
        <input
          className="text-input"
          type="number"
          step="1"
          placeholder="Ej: 8"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          style={{ flex: 1 }}
        />
        <div className="unit-toggle">
          {['años', 'meses'].map((u) => (
            <button key={u} className={`unit-btn ${ageUnit === u ? 'active' : ''}`} onClick={() => setAgeUnit(u)}>
              {u}
            </button>
          ))}
        </div>
      </div>

      <label className="input-label">N° de microchip (opcional)</label>
      <input className="text-input" placeholder="Ej: 990001234567890" value={microchip} onChange={(e) => setMicrochip(e.target.value)} />

      <label className="input-label">Notas (alergias, medicamentos, temperamento…)</label>
      <textarea className="text-input textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />

      <button className="save-btn" onClick={handleSubmit} disabled={saving}>
        {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Agregar mascota'}
      </button>
    </Modal>
  );
}

// ============================================================
// 💉 FORMULARIO DE VACUNA (crear y editar)
// ============================================================
function VaccineForm({ vaccine, petGroup, petLabel, onClose, onSave }) {
  const isEdit = !!vaccine;
  const [name, setName] = useState(vaccine?.name || '');
  const [appliedDate, setAppliedDate] = useState(vaccine?.applied_date || '');
  const [nextDate, setNextDate] = useState(vaccine?.next_date || '');
  const [notes, setNotes] = useState(vaccine?.notes || '');
  const [done, setDone] = useState(vaccine?.done || false);
  const [saving, setSaving] = useState(false);

  const templates = VACCINE_BY_GROUP[petGroup] || VACCINE_BY_GROUP.otro;

  const handleSubmit = async () => {
    if (!name.trim()) {
      window.alert('Ponle un nombre a la vacuna.');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        applied_date: appliedDate || null,
        next_date: nextDate || null,
        notes: notes.trim() || null,
        done,
      });
      onClose();
    } catch (err) {
      window.alert('No se pudo guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? 'Editar vacuna' : 'Agregar vacuna'} onClose={onClose}>
      {!isEdit && templates.length > 0 && (
        <>
          <label className="input-label">Sugerencias para {petLabel.toLowerCase()}</label>
          <div className="template-row">
            {templates.map((t) => (
              <button key={t} className="template-chip" onClick={() => setName(t)}>
                {t}
              </button>
            ))}
          </div>
        </>
      )}

      <label className="input-label">Nombre de la vacuna</label>
      <input className="text-input" placeholder="Ej: Antirrábica" value={name} onChange={(e) => setName(e.target.value)} />

      <label className="input-label">Fecha de aplicación</label>
      <input className="text-input" type="date" value={appliedDate} onChange={(e) => setAppliedDate(e.target.value)} />

      <label className="input-label">Próxima dosis / refuerzo</label>
      <input className="text-input" type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />

      <label className="input-label">Notas (veterinario, lote, reacciones…)</label>
      <textarea className="text-input textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />

      <div className="switch-row" style={{ marginTop: 16 }}>
        <div style={{ flex: 1 }}>
          <p className="switch-label">Ya está aplicada</p>
          <p className="switch-sub-label">Marca el check verde en la lista</p>
        </div>
        <button className={`toggle ${done ? 'on' : ''}`} onClick={() => setDone((v) => !v)} aria-label="Aplicada">
          <div className="toggle-knob" />
        </button>
      </div>

      <button className="save-btn" onClick={handleSubmit} disabled={saving}>
        {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Agregar vacuna'}
      </button>
    </Modal>
  );
}

// ============================================================
// 💉 SECCIÓN DE VACUNAS DE UNA MASCOTA
// ============================================================
function VaccineSection({ pet, userId }) {
  const [vaccines, setVaccines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('pet_vaccines')
      .select('*')
      .eq('pet_id', pet.id)
      .order('created_at', { ascending: true });
    setVaccines(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [pet.id]);

  const handleSave = async (payload) => {
    if (editing) {
      const { error } = await supabase.from('pet_vaccines').update(payload).eq('id', editing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('pet_vaccines').insert({ ...payload, pet_id: pet.id });
      if (error) throw error;
    }
    await load();
  };

  const toggleDone = async (v) => {
    setVaccines((prev) => prev.map((x) => (x.id === v.id ? { ...x, done: !x.done } : x)));
    await supabase.from('pet_vaccines').update({ done: !v.done }).eq('id', v.id);
  };

  const confirmDelete = async () => {
    await supabase.from('pet_vaccines').delete().eq('id', deleting.id);
    setDeleting(null);
    await load();
  };

  return (
    <div className="vaccine-block">
      <div className="section-header-row">
        <h3 className="subsection-title">
          <Syringe size={15} color="#FF8A80" /> Vacunas
        </h3>
        <button
          className="mini-btn"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus size={13} /> Agregar
        </button>
      </div>

      {loading ? (
        <p className="empty-text">Cargando vacunas…</p>
      ) : vaccines.length === 0 ? (
        <p className="empty-text">Sin vacunas registradas. Agrega la primera.</p>
      ) : (
        <div className="vaccine-list">
          {vaccines.map((v) => {
            const dias = daysUntil(v.next_date);
            const vencida = dias !== null && dias < 0 && !v.done;
            const proxima = dias !== null && dias >= 0 && dias <= 30;
            return (
              <div key={v.id} className="vaccine-item">
                <button
                  className={`vaccine-check ${v.done ? 'done' : ''}`}
                  onClick={() => toggleDone(v)}
                  aria-label={v.done ? 'Marcar pendiente' : 'Marcar como aplicada'}
                >
                  {v.done && <Check size={14} color="#fff" />}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="vaccine-name">{v.name}</p>
                  <div className="vaccine-meta">
                    {v.applied_date && <span>Aplicada {formatDate(v.applied_date)}</span>}
                    {v.next_date && (
                      <span className={vencida ? 'badge-danger' : proxima ? 'badge-warn' : ''}>
                        {vencida ? <AlertTriangle size={11} /> : <Calendar size={11} />}
                        {vencida ? `Vencida hace ${Math.abs(dias)} d` : `Próxima ${formatDate(v.next_date)}`}
                      </span>
                    )}
                  </div>
                  {v.notes && <p className="vaccine-notes">{v.notes}</p>}
                </div>
                <div className="row-actions">
                  <button
                    onClick={() => {
                      setEditing(v);
                      setFormOpen(true);
                    }}
                    aria-label="Editar vacuna"
                  >
                    <Pencil size={15} color="#78909C" />
                  </button>
                  <button onClick={() => setDeleting(v)} aria-label="Eliminar vacuna">
                    <Trash2 size={15} color="#FF3B30" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {formOpen && (
        <VaccineForm
          vaccine={editing}
          petGroup={getSpeciesGroup(pet)}
          petLabel={getSpeciesMeta(getSpeciesGroup(pet)).label}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSave={handleSave}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Eliminar vacuna"
          message={`¿Seguro que quieres eliminar "${deleting.name}"? Esta acción no se puede deshacer.`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

// ============================================================
// 🐕 PANTALLA PRINCIPAL: MIS MASCOTAS
// ============================================================
export default function PetsScreen({ pets, userId, onCreate, onUpdate, onDelete }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [expanded, setExpanded] = useState(pets[0]?.id || null);

  const handleSave = async (payload) => {
    if (editing) await onUpdate(editing.id, payload);
    else await onCreate(payload);
  };

  return (
    <div className="screen">
      <h1 className="screen-title">Mis Mascotas</h1>
      <p className="screen-subtitle">Gestiona el bienestar de tu familia peluda</p>

      {pets.length === 0 && (
        <p className="empty-text">Todavía no tienes mascotas registradas.</p>
      )}

      {pets.map((pet) => {
        const open = expanded === pet.id;
        return (
          <div key={pet.id} className="pet-panel">
            <div className="pet-panel-head">
              <PetAvatar pet={pet} size={52} photoUrl={pet.photo_url} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="pet-panel-name">{pet.name}</p>
                <p className="pet-panel-meta">
                  {pet.type} • {pet.breed}
                </p>
                <p className="pet-panel-meta">
                  {pet.weight} kg • {formatAge(pet)}
                </p>
              </div>
              <div className="row-actions">
                <button
                  onClick={() => {
                    setEditing(pet);
                    setFormOpen(true);
                  }}
                  aria-label={`Editar a ${pet.name}`}
                >
                  <Pencil size={16} color="#78909C" />
                </button>
                <button onClick={() => setDeleting(pet)} aria-label={`Eliminar a ${pet.name}`}>
                  <Trash2 size={16} color="#FF3B30" />
                </button>
              </div>
            </div>

            {pet.notes && <p className="pet-notes">{pet.notes}</p>}
            {pet.microchip && <p className="pet-chip-id">Microchip: {pet.microchip}</p>}

            <button className="expand-btn" onClick={() => setExpanded(open ? null : pet.id)}>
              {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              {open ? 'Ocultar vacunas' : 'Ver vacunas'}
            </button>

            {open && <VaccineSection pet={pet} userId={userId} />}
          </div>
        );
      })}

      <button
        className="add-pet-wide"
        onClick={() => {
          setEditing(null);
          setFormOpen(true);
        }}
      >
        <Plus size={20} />
        Añadir mascota
      </button>

      {formOpen && (
        <PetForm
          pet={editing}
          userId={userId}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSave={handleSave}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={`Eliminar a ${deleting.name}`}
          message="Se borrarán también sus vacunas y registros. Esta acción no se puede deshacer."
          onConfirm={async () => {
            await onDelete(deleting.id);
            setDeleting(null);
          }}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
