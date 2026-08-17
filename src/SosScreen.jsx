import React, { useMemo, useState } from 'react';
import {
  Phone, MapPin, Navigation, QrCode, Siren, Share2, Printer,
  LayoutGrid, Crosshair, ExternalLink, Pencil, MessageCircle,
} from 'lucide-react';
import { PetAvatar, Modal } from './components';
import { PLACES, CATEGORY_COLOR, formatAge, DEFAULT_COMUNA } from './lib';

const FILTERS = ['Todos', 'Urgencias 24/7', 'Pet Shops / Tiendas', 'Veterinarios'];
const FILTER_TO_CATEGORY = {
  Todos: null,
  'Urgencias 24/7': 'Urgencias',
  'Pet Shops / Tiendas': 'Tiendas',
  Veterinarios: 'Veterinarios',
};

// Términos de búsqueda para el mapa según el filtro activo
const FILTER_QUERY = {
  Todos: 'veterinarias y pet shops',
  'Urgencias 24/7': 'urgencias veterinarias 24 horas',
  'Pet Shops / Tiendas': 'pet shops tiendas de mascotas',
  Veterinarios: 'veterinarias',
};

// ============================================================
// 🪧 AFICHE DE MASCOTA PERDIDA
// ============================================================
function PosterModal({ pets, comuna, onClose }) {
  const [petId, setPetId] = useState(pets[0]?.id || null);
  const [contact, setContact] = useState('');
  const [lastSeen, setLastSeen] = useState('');
  const [reward, setReward] = useState('');

  const pet = pets.find((p) => p.id === petId);

  const handleShare = async () => {
    const text = `🐾 ¡MASCOTA PERDIDA! ${pet?.name || ''} — ${pet?.type}, ${pet?.breed}, ${formatAge(
      pet || {}
    )}. ${lastSeen ? `Visto por última vez: ${lastSeen}. ` : ''}${
      comuna ? `Zona: ${comuna}. ` : ''
    }Contacto: ${contact || '(agrega tu contacto)'}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Mascota perdida', text });
      } catch {
        /* cancelado por el usuario */
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
          <button key={p.id} className={`pet-pill ${p.id === petId ? 'active' : ''}`} onClick={() => setPetId(p.id)}>
            {p.name}
          </button>
        ))}
      </div>

      <label className="input-label">Visto por última vez</label>
      <input
        className="text-input"
        placeholder={`Ej: Plaza ${comuna}, 12 de agosto`}
        value={lastSeen}
        onChange={(e) => setLastSeen(e.target.value)}
      />

      <label className="input-label">Tu contacto</label>
      <input className="text-input" placeholder="Ej: +56 9 1234 5678" value={contact} onChange={(e) => setContact(e.target.value)} />

      <label className="input-label">Recompensa (opcional)</label>
      <input className="text-input" placeholder="Ej: $50.000" value={reward} onChange={(e) => setReward(e.target.value)} />

      {/* Afiche imprimible */}
      <div className="poster" id="poster-print">
        <p className="poster-title">¡MASCOTA PERDIDA!</p>

        {pet.photo_url ? (
          <img className="poster-photo" src={pet.photo_url} alt={pet.name} />
        ) : (
          <PetAvatar pet={pet} size={110} photoUrl={null} />
        )}

        {pet.gallery?.length > 0 && (
          <div className="poster-gallery">
            {pet.gallery.slice(0, 4).map((url, i) => (
              <img key={i} src={url} alt={`${pet.name} foto ${i + 2}`} />
            ))}
          </div>
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
          {comuna && <div><strong>Zona:</strong> {comuna}</div>}
          {reward && <div className="poster-reward"><strong>Recompensa:</strong> {reward}</div>}
        </div>

        <div className="poster-contact">
          <Phone size={14} /> {contact || 'Agrega tu contacto arriba'}
        </div>

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
        <button className="btn-ghost" onClick={() => window.print()}>
          <Printer size={15} /> Imprimir
        </button>
      </div>
    </Modal>
  );
}

// ============================================================
// 🚨 PANTALLA SOS
// ============================================================
export default function SosScreen({ pets, comuna, onEditComuna }) {
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [posterOpen, setPosterOpen] = useState(false);
  const [coords, setCoords] = useState(null); // ubicación GPS si el usuario la activa
  const [locating, setLocating] = useState(false);

  const zona = comuna || DEFAULT_COMUNA;
  // La lista curada solo aplica a Peñalolén; en otras comunas usamos el mapa
  const showCurated = zona === 'Peñalolén';

  const filteredPlaces = useMemo(() => {
    const category = FILTER_TO_CATEGORY[activeFilter];
    if (!category) return PLACES;
    return PLACES.filter((p) => p.category === category);
  }, [activeFilter]);

  // El mapa se arma con la comuna del usuario, o con sus coordenadas si activó el GPS
  const mapSrc = useMemo(() => {
    const term = FILTER_QUERY[activeFilter];
    if (coords) {
      return `https://maps.google.com/maps?q=${encodeURIComponent(term)}&ll=${coords.lat},${coords.lng}&z=14&output=embed`;
    }
    return `https://maps.google.com/maps?q=${encodeURIComponent(`${term} ${zona} Chile`)}&z=14&output=embed`;
  }, [activeFilter, zona, coords]);

  const mapsLink = useMemo(() => {
    const term = encodeURIComponent(`${FILTER_QUERY[activeFilter]} ${coords ? '' : zona + ' Chile'}`);
    return coords
      ? `https://www.google.com/maps/search/${term}/@${coords.lat},${coords.lng},14z`
      : `https://www.google.com/maps/search/${term}`;
  }, [activeFilter, zona, coords]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      window.alert('Tu navegador no permite obtener la ubicación.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocating(false);
        window.alert('No pudimos obtener tu ubicación. Revisa los permisos del navegador.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleRoute = (place) => {
    const dest = encodeURIComponent(`${place.name}, ${place.address}, Chile`);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, '_blank', 'noopener,noreferrer');
  };

  // Llamada directa si tenemos el número verificado; si no, buscamos en Google
  const handleCall = (place) => {
    if (place.phone) {
      window.location.href = `tel:${place.phone}`;
      return;
    }
    const q = encodeURIComponent(`${place.name} ${place.address} teléfono`);
    window.open(`https://www.google.com/search?q=${q}`, '_blank', 'noopener,noreferrer');
  };

  const handleWhatsapp = (place) => {
    window.open(`https://wa.me/${place.whatsapp}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="screen">
      <h1 className="screen-title">Emergencias</h1>

      <button className="location-bar" onClick={onEditComuna}>
        <MapPin size={14} color="#FF8A80" />
        <span>{coords ? 'Ubicación actual (GPS)' : zona}</span>
        <Pencil size={12} color="#78909C" />
      </button>

      <button className="sos-button" onClick={() => window.open(mapsLink, '_blank', 'noopener,noreferrer')}>
        <div>
          <p className="sos-title">Urgencia veterinaria</p>
          <p className="sos-subtitle">Buscar clínicas 24/7 cerca de ti</p>
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
          <button key={f} className={`filter-chip ${f === activeFilter ? 'active' : ''}`} onClick={() => setActiveFilter(f)}>
            {f}
          </button>
        ))}
      </div>

      <div className="map-tools">
        <button className="btn-ghost small" onClick={useMyLocation} disabled={locating}>
          <Crosshair size={13} /> {locating ? 'Ubicando…' : 'Usar mi ubicación'}
        </button>
        {coords && (
          <button className="btn-ghost small" onClick={() => setCoords(null)}>
            Volver a {zona}
          </button>
        )}
        <a className="btn-ghost small" href={mapsLink} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={13} /> Abrir en Maps
        </a>
      </div>

      <div className="map-frame-wrap">
        <iframe
          title="Mapa de servicios veterinarios cercanos"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src={mapSrc}
        />
      </div>

      {showCurated ? (
        <>
          <div className="section-header-row">
            <h2 className="section-title">Lugares en {zona}</h2>
            <LayoutGrid size={18} color="#A5D6A7" />
          </div>

          {filteredPlaces.map((place) => (
            <div key={place.id} className="place-card">
              <span className="place-dot" style={{ background: CATEGORY_COLOR[place.category] }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="place-name">{place.name}</p>
                <p className="place-subtitle">{place.subtitle}</p>
                <p className="place-address">{place.address}</p>
                {place.phoneLabel && <p className="place-phone">{place.phoneLabel}</p>}
              </div>
              <div className="place-actions">
                <button
                  className="place-action-btn"
                  onClick={() => handleCall(place)}
                  aria-label={place.phone ? `Llamar a ${place.name}` : 'Buscar teléfono'}
                  title={place.phoneLabel || 'Buscar teléfono'}
                >
                  <Phone size={15} />
                </button>
                {place.whatsapp && (
                  <button
                    className="place-action-btn wa"
                    onClick={() => handleWhatsapp(place)}
                    aria-label="WhatsApp de urgencias"
                    title="WhatsApp de urgencias"
                  >
                    <MessageCircle size={15} />
                  </button>
                )}
                <button className="place-action-btn route" onClick={() => handleRoute(place)} aria-label="Cómo llegar">
                  <Navigation size={15} />
                </button>
              </div>
            </div>
          ))}
        </>
      ) : (
        <div className="info-card" style={{ marginTop: 4 }}>
          <p>
            Mostrando resultados para <strong>{zona}</strong>. Toca los marcadores del mapa para ver
            horarios, teléfonos y cómo llegar.
          </p>
          <p className="info-note">
            Aún no tenemos una lista curada para tu comuna. Si conoces clínicas de urgencia que deberían
            estar aquí, cuéntanos en la sección Comunidad.
          </p>
        </div>
      )}

      {posterOpen && <PosterModal pets={pets} comuna={zona} onClose={() => setPosterOpen(false)} />}
    </div>
  );
}
