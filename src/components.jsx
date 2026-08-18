import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Dog, Cat, Bird, Rabbit, Fish, Turtle, Bug, Rat, X, Camera, Loader2 } from 'lucide-react';
import { getSpeciesGroup, getSpeciesMeta } from './lib';

// Mapa de nombre de ícono -> componente, para pintar cada especie
export const SPECIES_ICONS = { Dog, Cat, Bird, Rabbit, Fish, Turtle, Bug, Rat };

/** Devuelve el componente de ícono correspondiente a una mascota */
export function SpeciesIcon({ pet, group, size = 24, color }) {
  const g = group || getSpeciesGroup(pet);
  const Icon = SPECIES_ICONS[getSpeciesMeta(g).icon] || Bug;
  return <Icon size={size} color={color} />;
}

// ============================================================
// 🐾 AVATAR DE MASCOTA (usa foto real si existe, si no un ícono)
// ============================================================
const GROUP_BG = {
  perro: '#E8F5E9',
  gato: '#FFE0B2',
  ave: '#E1F5FE',
  roedor: '#FFF3E0',
  conejo: '#F3E5F5',
  reptil: '#E0F2F1',
  pez: '#E3F2FD',
  otro: '#ECEFF1',
};

export function PetAvatar({ pet, type, group, size = 56, selected, photoUrl }) {
  // Aceptamos la mascota completa o solo su grupo/tipo, para no romper llamadas antiguas
  const g = group || getSpeciesGroup(pet || { type });
  const bg = GROUP_BG[g] || GROUP_BG.otro;
  return (
    <div
      className="pet-avatar"
      style={{
        width: size,
        height: size,
        background: photoUrl ? `center/cover url(${photoUrl})` : bg,
        border: selected ? '3px solid #A5D6A7' : 'none',
      }}
    >
      {!photoUrl && <SpeciesIcon group={g} size={size * 0.5} color="#6D4C41" />}
    </div>
  );
}

// ============================================================
// 🪟 MODAL BASE (hoja inferior reutilizable)
// ============================================================
export function Modal({ title, onClose, children, icon }) {
  // En iOS, un position:fixed dentro de un contenedor con scroll se ancla mal.
  // Renderizamos el modal directamente en <body> con un portal para evitarlo.
  useEffect(() => {
    // Bloqueamos el scroll del fondo y ocultamos la barra de pestañas
    document.body.classList.add('modal-open');
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('modal-open');
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return createPortal(
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-row">
          {icon}
          <h3 className="modal-title">{title}</h3>
          <button onClick={onClose} aria-label="Cerrar">
            <X size={22} color="#78909C" />
          </button>
        </div>
        <div className="modal-scroll">{children}</div>
      </div>
    </div>,
    document.body
  );
}

// ============================================================
// 📷 SELECTOR DE IMAGEN (previsualiza antes de subir)
// ============================================================
export function ImagePicker({ value, onChange, label = 'Foto', round = false }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(value || null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      window.alert('Selecciona un archivo de imagen.');
      return;
    }
    setPreview(URL.createObjectURL(file));
    onChange(file);
  };

  const clear = () => {
    setPreview(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      <label className="input-label">{label}</label>
      <div className="image-picker">
        <button
          type="button"
          className={`image-drop ${round ? 'round' : ''}`}
          onClick={() => inputRef.current?.click()}
        >
          {preview ? (
            <img src={preview} alt="Vista previa" />
          ) : (
            <>
              <Camera size={22} color="#A5D6A7" />
              <span>Subir foto</span>
            </>
          )}
        </button>
        {preview && (
          <button type="button" className="image-clear" onClick={clear}>
            Quitar
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        style={{ display: 'none' }}
      />
    </div>
  );
}

// ============================================================
// ⏳ INDICADOR DE CARGA
// ============================================================
export function Spinner({ label = 'Cargando…' }) {
  return (
    <div className="spinner-row">
      <Loader2 size={16} className="spin" />
      {label}
    </div>
  );
}

// ============================================================
// ❓ CONFIRMACIÓN DE ACCIÓN DESTRUCTIVA
// ============================================================
export function ConfirmDialog({ title, message, confirmLabel = 'Eliminar', onConfirm, onCancel }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="confirm-msg">{message}</p>
      <div className="confirm-actions">
        <button className="btn-ghost" onClick={onCancel}>
          Cancelar
        </button>
        <button className="btn-danger" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

// ============================================================
// 🖼️ GALERÍA: subir varias fotos (para el afiche y la ficha)
// ============================================================
export function MultiImagePicker({ existing = [], onChangeFiles, onRemoveExisting, max = 4, label = 'Fotos adicionales' }) {
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);

  const total = existing.length + files.length;

  const handleFiles = (e) => {
    const picked = Array.from(e.target.files || []);
    if (picked.length === 0) return;
    const room = max - total;
    if (room <= 0) {
      window.alert(`Máximo ${max} fotos adicionales.`);
      return;
    }
    const accepted = picked.slice(0, room).filter((f) => f.type.startsWith('image/'));
    const nextFiles = [...files, ...accepted];
    setFiles(nextFiles);
    setPreviews((prev) => [...prev, ...accepted.map((f) => URL.createObjectURL(f))]);
    onChangeFiles(nextFiles);
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeNew = (idx) => {
    const nextFiles = files.filter((_, i) => i !== idx);
    setFiles(nextFiles);
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
    onChangeFiles(nextFiles);
  };

  return (
    <div>
      <label className="input-label">
        {label} <span className="label-hint">({total}/{max})</span>
      </label>
      <div className="gallery-grid">
        {existing.map((url, i) => (
          <div key={`ex-${i}`} className="gallery-thumb">
            <img src={url} alt={`Foto ${i + 1}`} />
            <button type="button" className="thumb-remove" onClick={() => onRemoveExisting(i)} aria-label="Quitar foto">
              <X size={12} />
            </button>
          </div>
        ))}
        {previews.map((url, i) => (
          <div key={`new-${i}`} className="gallery-thumb">
            <img src={url} alt={`Nueva ${i + 1}`} />
            <button type="button" className="thumb-remove" onClick={() => removeNew(i)} aria-label="Quitar foto">
              <X size={12} />
            </button>
          </div>
        ))}
        {total < max && (
          <button type="button" className="gallery-add" onClick={() => inputRef.current?.click()}>
            <Camera size={18} />
            <span>Añadir</span>
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleFiles} style={{ display: 'none' }} />
    </div>
  );
}
