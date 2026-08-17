import React, { useMemo, useRef, useState } from 'react';
import { Phone, MapPin, Navigation, QrCode, Siren, Share2, Printer, LayoutGrid } from 'lucide-react';
import { PetAvatar, Modal } from './components';
import { PLACES, CATEGORY_COLOR, formatAge } from './lib';

const FILTERS = ['Todos', 'Urgencias 24/7', 'Pet Shops / Tiendas', 'Veterinarios'];
const FILTER_TO_CATEGORY = {
  Todos: null,
  'Urgencias 24/7': 'Urgencias',
  'Pet Shops / Tiendas': 'Tiendas',
  Veterinarios: 'Veterinarios',
};

// ============================================================
// 🪧 AFICHE DE MASCOTA PERDIDA (con foto y datos completos)
// ============================================================
function PosterModal({ pets, onClose }) {
  const [petId, setPetId] = useState(pets[0]?.id || null);
  const [contact, setContact] = useState('');
  const [lastSeen, setLastSeen] = useState('');
  const [reward, setReward] = useState('');
  const posterRef = useRef(null);

  const pet = pets.find((p) => p.id === petId);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const text = `🐾 ¡MASCOTA PERDIDA! ${pet?.name || ''} — ${pet?.type}, ${pet?.breed}, ${formatAge(pet || {})}. ${
      lastSeen ? `Visto por última vez: ${lastSeen}. ` : ''
    }Contacto: ${contact || '(agrega tu contacto)'}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Mascota perdida', text });
      } catch {
        /* el usuario canceló */
      }
    } else {
      await navigator.clipboard.writeText(text);
      window.alert('Texto del afiche copiado al portapapeles.');
    }
  };

  if (!pet) {
    return (
      <Modal title="Afiche de mascota perdida" onClose={onClose}>
        <p className="empty-text">Primero registra una mascota para generar su afiche.</p>
      </Modal>
    );
  }

  return (
    <Modal title="Afiche de mascota perdida" onClose={onClose}>
      <label className="input-label">¿Cuál mascota?</label>
      <div className="scroll-x">
        {pets.map((p) => (
          <button
            key={p.id}
            className={`pet-pill ${p.id === petId ? 'active' : ''}`}
            onClick={() => setPetId(p.id)}
          >
            {p.name}
          </button>
        ))}
      </div>

      <label className="input-label">Visto por última vez</label>
      <input
        className="text-input"
        placeholder="Ej: Plaza Peñalolén, 12 de agosto"
        value={lastSeen}
        onChange={(e) => setLastSeen(e.target.value)}
      />

      <label className="input-label">Tu contacto</label>
      <input
        className="text-input"
        placeholder="Ej: +56 9 1234 5678"
        value={contact}
        onChange={(e) => setContact(e.target.value)}
      />

      <label className="input-label">Recompensa (opcional)</label>
      <input className="text-input" placeholder="Ej: $50.000" value={reward} onChange={(e) => setReward(e.target.value)} />

      {/* Afiche imprimible */}
      <div className="poster" ref={posterRef} id="poster-print">
        <p className="poster-title">¡MASCOTA PERDIDA!</p>

        {pet.photo_url ? (
          <img className="poster-photo" src={pet.photo_url} alt={pet.name} />
        ) : (
          <PetAvatar type={pet.type} size={110} photoUrl={null} />
        )}

        <p className="poster-name">{pet.name}</p>
        <div className="poster-data">
          <div><strong>Especie:</strong> {pet.type}</div>
          <div><strong>Raza:</strong> {pet.breed}</div>
          <div><strong>Edad:</strong> {formatAge(pet)}</div>
          <div><strong>Peso:</strong> {pet.weight} kg</div>
          {pet.microchip && <div><strong>Microchip:</strong> {pet.microchip}</div>}
          {pet.notes && <div><strong>Señas:</strong> {pet.notes}</div>}
          {lastSeen && <div><strong>Visto por última vez:</strong> {lastSeen}</div>}
          {reward && <div className="poster-reward"><strong>Recompensa:</strong> {reward}</div>}
        </div>

        <div className="poster-contact">
          <Phone size={14} /> {contact || 'Agrega tu contacto arriba'}
        </div>

        {/* Código QR simulado (patrón determinista según el id de la mascota) */}
        <div className="qr-box">
          {Array.from({ length: 25 }).map((_, i) => {
            const seed = pet.id.charCodeAt(i % pet.id.length) + i * 7;
            return <div key={i} className="qr-dot" style={{ opacity: seed % 3 === 0 ? 0.12 : 1 }} />;
          })}
        </div>
        <p className="poster-footer">Escanea para ver la ficha completa en FamiliaPet</p>
      </div>

      <div className="poster-actions">
        <button className="btn-ghost" onClick={handleShare}>
          <Share2 size={15} /> Compartir
        </button>
        <button className="btn-ghost" onClick={handlePrint}>
          <Printer size={15} /> Imprimir
        </button>
      </div>
    </Modal>
  );
}

// ============================================================
// 🚨 PANTALLA SOS
// ============================================================
export default function SosScreen({ pets }) {
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [posterOpen, setPosterOpen] = useState(false);

  const filteredPlaces = useMemo(() => {
    const category = FILTER_TO_CATEGORY[activeFilter];
    if (!category) return PLACES;
    return PLACES.filter((p) => p.category === category);
  }, [activeFilter]);

  const mapQuery = useMemo(() => {
    if (activeFilter === 'Urgencias 24/7') return 'urgencias veterinarias 24 horas Peñalolén Santiago Chile';
    if (activeFilter === 'Pet Shops / Tiendas') return 'pet shops Peñalolén Santiago Chile';
    if (activeFilter === 'Veterinarios') return 'veterinarias Peñalolén Santiago Chile';
    return 'veterinarias y pet shops Peñalolén Santiago Chile';
  }, [activeFilter]);

  const handleRoute = (place) => {
    const dest = encodeURIComponent(`${place.name}, ${place.address}, Chile`);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, '_blank', 'noopener,noreferrer');
  };

  const handleSearchPhone = (place) => {
    const q = encodeURIComponent(`${place.name} ${place.address} teléfono`);
    window.open(`https://www.google.com/search?q=${q}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="screen">
      <h1 className="screen-title">Emergencias</h1>
      <p className="screen-subtitle">
        <MapPin size={13} /> Peñalolén, Santiago
      </p>

      <button className="sos-button" onClick={() => window.alert('📞 Contacta directamente a la clínica más cercana desde la lista de abajo.')}>
        <div>
          <p className="sos-title">Urgencia veterinaria</p>
          <p className="sos-subtitle">Clínicas 24/7 cerca de ti</p>
        </div>
        <div className="sos-icon-circle-lg">
          <Siren size={26} color="#fff" />
        </div>
      </button>

      <button className="poster-toggle-btn" onClick={() => setPosterOpen(true)}>
        <QrCode size={18} /> Generar afiche de mascota perdida
      </button>

      <div className="filter-scroll flush" style={{ marginTop: 22 }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            className={`filter-chip ${f === activeFilter ? 'active' : ''}`}
            onClick={() => setActiveFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="map-frame-wrap">
        <iframe
          title="Mapa de servicios veterinarios cercanos"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=14&output=embed`}
        />
      </div>

      <div className="section-header-row">
        <h2 className="section-title">Lugares cercanos</h2>
        <LayoutGrid size={18} color="#A5D6A7" />
      </div>

      {filteredPlaces.map((place) => (
        <div key={place.id} className="place-card">
          <span className="place-dot" style={{ background: CATEGORY_COLOR[place.category] }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="place-name">{place.name}</p>
            <p className="place-subtitle">{place.subtitle}</p>
            <p className="place-address">{place.address}</p>
          </div>
          <div className="place-actions">
            <button className="place-action-btn" onClick={() => handleSearchPhone(place)} aria-label="Buscar teléfono">
              <Phone size={15} />
            </button>
            <button className="place-action-btn route" onClick={() => handleRoute(place)} aria-label="Cómo llegar">
              <Navigation size={15} />
            </button>
          </div>
        </div>
      ))}

      {posterOpen && <PosterModal pets={pets} onClose={() => setPosterOpen(false)} />}
    </div>
  );
}
