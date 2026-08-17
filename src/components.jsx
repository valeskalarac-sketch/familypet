import React, { useRef, useState } from 'react';
import { Dog, Cat, X, Camera, Loader2 } from 'lucide-react';

// ============================================================
// 🐾 AVATAR DE MASCOTA (usa foto real si existe, si no un ícono)
// ============================================================
export function PetAvatar({ type, size = 56, selected, photoUrl }) {
  const bg = type === 'Gato' ? '#FFE0B2' : '#E8F5E9';
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
      {!photoUrl &&
        (type === 'Gato' ? (
          <Cat size={size * 0.5} color="#8D6E63" />
        ) : (
          <Dog size={size * 0.5} color="#6D4C41" />
        ))}
    </div>
  );
}

// ============================================================
// 🪟 MODAL BASE (hoja inferior reutilizable)
// ============================================================
export function Modal({ title, onClose, children, icon }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-row">
          {icon}
          <h3 className="modal-title">{title}</h3>
          <button onClick={onClose} aria-label="Cerrar">
            <X size={22} color="#78909C" />
          </button>
        </div>
        {children}
      </div>
    </div>
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
