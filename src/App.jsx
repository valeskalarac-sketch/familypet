import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Bell,
  LogOut,
  PawPrint,
  Siren,
  X,
  Phone,
  MapPin,
  Home as HomeIcon,
  Calculator as CalculatorIcon,
  Navigation,
  Check,
  Dog,
  Cat,
  QrCode,
  Syringe,
  Weight,
  Cake,
  ShoppingBag,
  LayoutGrid,
  Mail,
  Lock,
} from 'lucide-react';
import { supabase } from './supabaseClient';

// ============================================================
// 📦 DATOS ESTÁTICOS
// ============================================================
const VACCINE_CATALOG = [
  { id: 'v1', name: 'Antirrábica', species: ['Perro', 'Gato'], obligatory: true },
  { id: 'v2', name: 'Óctuple Canina', species: ['Perro'], obligatory: true },
  { id: 'v3', name: 'Triple Felina', species: ['Gato'], obligatory: true },
];

const FOOD_QUALITY = [
  { id: 'super', label: 'Súper Premium', factor: 12 },
  { id: 'premium', label: 'Premium', factor: 15 },
  { id: 'economico', label: 'Económico', factor: 18 },
];

const PLACES = [
  {
    id: 'p1',
    name: 'Clínica Veterinaria Antupirén',
    subtitle: 'Urgencia 24/7',
    address: 'Butacura 8789, Peñalolén',
    category: 'Urgencias',
  },
  {
    id: 'p2',
    name: 'Club Animal',
    subtitle: 'Urgencia 24/7',
    address: 'Av. Los Presidentes 7674, Peñalolén',
    category: 'Urgencias',
  },
  {
    id: 'p3',
    name: 'La Granja Pet',
    subtitle: 'Pet Shop',
    address: 'Antupiren 8340, Peñalolén',
    category: 'Tiendas',
  },
  {
    id: 'p4',
    name: 'Suki Pet Food',
    subtitle: 'Pet Shop',
    address: 'Av. Grecia 6708, Peñalolén',
    category: 'Tiendas',
  },
  {
    id: 'p5',
    name: 'Veterinaria Portal Mayor',
    subtitle: 'Veterinario',
    address: 'Av. Grecia 8311, Peñalolén',
    category: 'Veterinarios',
  },
];

const FILTERS = ['Todos', 'Urgencias 24/7', 'Pet Shops / Tiendas', 'Veterinarios'];
const FILTER_TO_CATEGORY = {
  Todos: null,
  'Urgencias 24/7': 'Urgencias',
  'Pet Shops / Tiendas': 'Tiendas',
  Veterinarios: 'Veterinarios',
};
const CATEGORY_COLOR = {
  Urgencias: '#FF3B30',
  Tiendas: '#FF8A80',
  Veterinarios: '#43A047',
};

const SEED_PETS = [
  { name: 'Rocky', type: 'Perro', breed: 'Mestizo', weight: 15, age: 4 },
  { name: 'Luna', type: 'Gato', breed: 'Siamés', weight: 4, age: 2 },
];

// ============================================================
// 🧩 COMPONENTES REUTILIZABLES
// ============================================================
function PetAvatar({ type, size = 56, selected }) {
  const bg = type === 'Gato' ? '#FFE0B2' : '#E8F5E9';
  return (
    <div
      className="pet-avatar"
      style={{
        width: size,
        height: size,
        background: bg,
        border: selected ? '3px solid #A5D6A7' : 'none',
      }}
    >
      {type === 'Gato' ? (
        <Cat size={size * 0.5} color="#8D6E63" />
      ) : (
        <Dog size={size * 0.5} color="#6D4C41" />
      )}
    </div>
  );
}

function PetCard({ pet, selected, onClick }) {
  return (
    <button className={`pet-card ${selected ? 'selected' : ''}`} onClick={onClick}>
      <PetAvatar type={pet.type} size={64} selected={selected} />
      <p className="pet-card-name">{pet.name}</p>
      <p className="pet-card-meta">
        {pet.type} • {pet.breed}
      </p>
      <div className="pet-card-chips">
        <span className="pet-chip">
          <Weight size={12} /> {pet.weight}kg
        </span>
        <span className="pet-chip">
          <Cake size={12} /> {pet.age} años
        </span>
      </div>
    </button>
  );
}

function TabBar({ activeTab, setActiveTab }) {
  const tabs = [
    { key: 'home', label: 'Inicio', Icon: HomeIcon },
    { key: 'calc', label: 'Calculadora', Icon: CalculatorIcon },
    { key: 'map', label: 'Cerca de mí', Icon: Navigation },
  ];
  return (
    <div className="tab-bar-wrapper">
      <div className="tab-bar">
        {tabs.map(({ key, label, Icon }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              className={`tab-item ${active ? 'active' : ''}`}
              onClick={() => setActiveTab(key)}
              aria-label={label}
            >
              <Icon size={20} color={active ? '#fff' : '#78909C'} />
              {active && <span className="tab-item-label">{label}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SosModal({ onClose, pet }) {
  const [showPoster, setShowPoster] = useState(false);

  const handleCall = () => {
    window.alert('📞 Conectando con la clínica de urgencias 24/7 más cercana...');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-row">
          <div className="sos-icon-circle">
            <Siren size={20} color="#fff" />
          </div>
          <h3 className="modal-title">Emergencia SOS</h3>
          <button onClick={onClose} aria-label="Cerrar">
            <X size={22} color="#78909C" />
          </button>
        </div>

        <button className="sos-call-btn" onClick={handleCall}>
          <Phone size={18} /> Llamada rápida a urgencias
        </button>

        <button className="poster-toggle-btn" onClick={() => setShowPoster((v) => !v)}>
          <QrCode size={18} />
          {showPoster ? 'Ocultar afiche' : 'Generar afiche de mascota perdida'}
        </button>

        {showPoster && pet && (
          <div className="poster">
            <p className="poster-title">¡MASCOTA PERDIDA!</p>
            <PetAvatar type={pet.type} size={90} />
            <p className="poster-name">{pet.name}</p>
            <p className="poster-meta">
              {pet.type} • {pet.breed} • {pet.weight}kg • {pet.age} años
            </p>
            <div className="qr-box">
              {Array.from({ length: 25 }).map((_, i) => (
                <div
                  key={i}
                  className="qr-dot"
                  style={{ opacity: (i * 37) % 5 === 0 ? 1 : i % 3 === 0 ? 0.15 : 1 }}
                />
              ))}
            </div>
            <p className="poster-meta">Escanea para contactar a la familia</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AddPetModal({ onClose, onSave, saving }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('Perro');
  const [weight, setWeight] = useState('');
  const [age, setAge] = useState('');

  const handleSave = () => {
    if (!name.trim() || !weight || !age) {
      window.alert('Por favor completa nombre, peso y edad.');
      return;
    }
    onSave({ name: name.trim(), type, breed: 'Sin raza definida', weight: parseFloat(weight), age: parseFloat(age) });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-row">
          <h3 className="modal-title">Agregar mascota</h3>
          <button onClick={onClose} aria-label="Cerrar">
            <X size={22} color="#78909C" />
          </button>
        </div>

        <label className="input-label">Nombre</label>
        <input className="text-input" placeholder="Ej: Firulais" value={name} onChange={(e) => setName(e.target.value)} />

        <label className="input-label">Tipo</label>
        <div className="type-selector-row">
          {['Perro', 'Gato'].map((t) => (
            <button
              key={t}
              className={`type-chip ${type === t ? 'active' : ''}`}
              onClick={() => setType(t)}
            >
              {t === 'Gato' ? <Cat size={16} /> : <Dog size={16} />}
              {t}
            </button>
          ))}
        </div>

        <label className="input-label">Peso (kg)</label>
        <input
          className="text-input"
          type="number"
          placeholder="Ej: 10"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
        />

        <label className="input-label">Edad (años)</label>
        <input
          className="text-input"
          type="number"
          placeholder="Ej: 2"
          value={age}
          onChange={(e) => setAge(e.target.value)}
        />

        <button className="save-btn" onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar mascota'}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// 🏠 PANTALLA 1: INICIO
// ============================================================
function HomeScreen({ userName, pets, selectedPetId, setSelectedPetId, addPet, vaccineStatus, toggleVaccine, addingPet }) {
  const [sosVisible, setSosVisible] = useState(false);
  const [addPetVisible, setAddPetVisible] = useState(false);

  const selectedPet = pets.find((p) => p.id === selectedPetId) || pets[0];

  const petVaccines = useMemo(() => {
    if (!selectedPet) return [];
    return VACCINE_CATALOG.filter((v) => v.species.includes(selectedPet.type));
  }, [selectedPet]);

  const handleSavePet = async (petData) => {
    const newPet = await addPet(petData);
    if (newPet) setAddPetVisible(false);
  };

  return (
    <div className="screen">
      <div className="header-row">
        <div>
          <h1 className="greeting">¡Hola, {userName}! 🐾</h1>
          <p className="sub-greeting">Cuidemos juntos a tu familia peluda</p>
        </div>
        <div className="header-icons">
          <div className="icon-btn">
            <Bell size={20} />
          </div>
          <div className="avatar-circle">
            <PawPrint size={18} />
          </div>
        </div>
      </div>

      <button className="sos-button" onClick={() => setSosVisible(true)}>
        <div>
          <p className="sos-title">Botón SOS</p>
          <p className="sos-subtitle">Emergencia veterinaria 24/7</p>
        </div>
        <div className="sos-icon-circle-lg">
          <Siren size={26} color="#fff" />
        </div>
      </button>

      <div className="section-header-row">
        <h2 className="section-title">Mis Mascotas</h2>
        <PawPrint size={18} color="#A5D6A7" />
      </div>

      <div className="scroll-x">
        {pets.map((pet) => (
          <PetCard key={pet.id} pet={pet} selected={pet.id === selectedPet?.id} onClick={() => setSelectedPetId(pet.id)} />
        ))}
        <button className="add-pet-card" onClick={() => setAddPetVisible(true)}>
          <Plus size={26} />
          Agregar
        </button>
      </div>

      <div className="section-header-row" style={{ marginTop: 24 }}>
        <h2 className="section-title">Calendario de Vacunas (Chile)</h2>
        <Syringe size={18} color="#FF8A80" />
      </div>

      {selectedPet ? (
        <div className="vaccine-list">
          {petVaccines.map((vaccine) => {
            const done = !!vaccineStatus[`${selectedPet.id}_${vaccine.id}`];
            return (
              <div key={vaccine.id} className="vaccine-item">
                <div>
                  <p className="vaccine-name">{vaccine.name}</p>
                  <p className="vaccine-tag">
                    {vaccine.obligatory ? 'Obligatoria' : 'Sugerida'} • {selectedPet.name}
                  </p>
                </div>
                <button
                  className={`vaccine-btn ${done ? 'done' : ''}`}
                  onClick={() => toggleVaccine(selectedPet.id, vaccine.id, !done)}
                >
                  {done ? (
                    <>
                      <Check size={16} /> Lista
                    </>
                  ) : (
                    'Recordar'
                  )}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="empty-text">Agrega una mascota para ver su calendario.</p>
      )}

      {sosVisible && <SosModal onClose={() => setSosVisible(false)} pet={selectedPet} />}
      {addPetVisible && (
        <AddPetModal onClose={() => setAddPetVisible(false)} onSave={handleSavePet} saving={addingPet} />
      )}
    </div>
  );
}

// ============================================================
// 🧮 PANTALLA 2: CALCULADORA INTELIGENTE
// ============================================================
function CalcScreen({ pets, selectedPetId, setSelectedPetId }) {
  const [qualityId, setQualityId] = useState('premium');
  const [bagSize, setBagSize] = useState('');
  const [alertOn, setAlertOn] = useState(false);

  const selectedPet = pets.find((p) => p.id === selectedPetId) || pets[0];
  const quality = FOOD_QUALITY.find((q) => q.id === qualityId) || FOOD_QUALITY[1];

  const dailyPortionGrams = useMemo(() => {
    if (!selectedPet) return 0;
    return Math.round(selectedPet.weight * quality.factor);
  }, [selectedPet, quality]);

  const bagDurationDays = useMemo(() => {
    const bagKg = parseFloat(bagSize);
    if (!bagKg || dailyPortionGrams === 0) return 0;
    return Math.floor(bagKg / (dailyPortionGrams / 1000));
  }, [bagSize, dailyPortionGrams]);

  const isCat = selectedPet?.type === 'Gato';
  const weeklyLitterKg = 1.5;

  return (
    <div className="screen">
      <h1 className="screen-title">Calculadora Inteligente</h1>
      <p className="screen-subtitle">Alimento y arena sanitaria</p>

      <label className="input-label" style={{ marginTop: 0 }}>
        ¿Para quién calculamos?
      </label>
      <div className="scroll-x" style={{ marginBottom: 8 }}>
        {pets.map((pet) => {
          const active = pet.id === selectedPet?.id;
          return (
            <button
              key={pet.id}
              className={`pet-pill ${active ? 'active' : ''}`}
              onClick={() => setSelectedPetId(pet.id)}
            >
              {pet.type === 'Gato' ? <Cat size={16} /> : <Dog size={16} />}
              {pet.name}
            </button>
          );
        })}
      </div>

      <label className="input-label">Calidad del alimento</label>
      <div className="quality-row">
        {FOOD_QUALITY.map((q) => (
          <button
            key={q.id}
            className={`quality-card ${q.id === qualityId ? 'active' : ''}`}
            onClick={() => setQualityId(q.id)}
          >
            <div className="quality-label">{q.label}</div>
            <div className="quality-factor">{q.factor}g / kg</div>
          </button>
        ))}
      </div>

      <label className="input-label">Tamaño del saco actual (kg)</label>
      <input
        className="text-input"
        type="number"
        placeholder="Ej: 15"
        value={bagSize}
        onChange={(e) => setBagSize(e.target.value)}
      />

      <div className="result-card">
        <div className="result-row">
          <span className="result-label">Porción diaria recomendada</span>
          <span className="result-value">{dailyPortionGrams} g/día</span>
        </div>
        <div className="result-divider" />
        <div className="result-row">
          <span className="result-label">Duración estimada del saco</span>
          <span className="result-value">{bagDurationDays > 0 ? `${bagDurationDays} días` : '—'}</span>
        </div>
      </div>

      <div className="switch-row">
        <div style={{ flex: 1 }}>
          <p className="switch-label">Alerta de desabastecimiento</p>
          <p className="switch-sub-label">Te avisamos antes de que se acabe</p>
        </div>
        <button
          className={`toggle ${alertOn ? 'on' : ''}`}
          onClick={() => setAlertOn((v) => !v)}
          aria-label="Alerta de desabastecimiento"
        >
          <div className="toggle-knob" />
        </button>
      </div>
      {alertOn && (
        <div className="alert-confirm-box">
          ✅ Listo, te notificaremos 3 días antes de que se acabe el alimento de {selectedPet?.name}.
        </div>
      )}

      {isCat && (
        <>
          <div className="section-header-row" style={{ marginTop: 24 }}>
            <h2 className="section-title">Cálculo de Arena Sanitaria</h2>
            <ShoppingBag size={18} color="#FF8A80" />
          </div>
          <div className="result-card sand">
            <div className="result-row">
              <span className="result-label">Consumo semanal estimado</span>
              <span className="result-value">{weeklyLitterKg} kg</span>
            </div>
            <div className="result-divider" />
            <div className="result-row">
              <span className="result-label">Consumo mensual estimado</span>
              <span className="result-value">{(weeklyLitterKg * 4).toFixed(1)} kg</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// 🗺️ PANTALLA 3: SERVICIOS CERCANOS (Google Maps real)
// ============================================================
function MapScreen() {
  const [activeFilter, setActiveFilter] = useState('Todos');

  const filteredPlaces = useMemo(() => {
    const category = FILTER_TO_CATEGORY[activeFilter];
    if (!category) return PLACES;
    return PLACES.filter((p) => p.category === category);
  }, [activeFilter]);

  const mapQuery = useMemo(() => {
    if (activeFilter === 'Todos') return 'veterinarias y pet shops en Peñalolén, Santiago, Chile';
    if (activeFilter === 'Urgencias 24/7') return 'urgencias veterinarias 24 horas en Peñalolén, Santiago, Chile';
    if (activeFilter === 'Pet Shops / Tiendas') return 'pet shops en Peñalolén, Santiago, Chile';
    return 'veterinarias en Peñalolén, Santiago, Chile';
  }, [activeFilter]);

  const handleCall = (place) => {
    window.alert(`📞 Llamando a ${place.name}\n${place.address}`);
  };

  const handleRoute = (place) => {
    const dest = encodeURIComponent(`${place.name}, ${place.address}, Chile`);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="screen" style={{ padding: '0 0 110px' }}>
      <div className="gps-header">
        <MapPin size={16} color="#FF8A80" />
        Ubicación: Peñalolén, Santiago
      </div>

      <div className="filter-scroll">
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

      <div style={{ padding: '0 20px' }}>
        <div className="map-frame-wrap">
          <iframe
            title="Mapa de servicios cercanos"
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
            <div style={{ flex: 1 }}>
              <p className="place-name">{place.name}</p>
              <p className="place-subtitle">{place.subtitle}</p>
              <p className="place-address">{place.address}</p>
            </div>
            <div className="place-actions">
              <button className="place-action-btn" onClick={() => handleCall(place)} aria-label="Llamar">
                <Phone size={15} />
              </button>
              <button className="place-action-btn route" onClick={() => handleRoute(place)} aria-label="Cómo llegar">
                <Navigation size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// 🔐 PANTALLA DE AUTENTICACIÓN
// ============================================================
function AuthScreen() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleGoogle = async () => {
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) setError(error.message);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setInfo('¡Cuenta creada! Revisa tu correo para confirmar tu cuenta e inicia sesión.');
    }
    setLoading(false);
  };

  return (
    <div className="auth-screen">
      <div className="auth-logo">🐾</div>
      <h1 className="auth-title">FamiliaPet</h1>
      <p className="auth-subtitle">Cuida a tu familia peluda desde un solo lugar</p>

      <div className="auth-toggle-row">
        <button className={`auth-toggle-btn ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>
          Iniciar sesión
        </button>
        <button className={`auth-toggle-btn ${mode === 'signup' ? 'active' : ''}`} onClick={() => setMode('signup')}>
          Crear cuenta
        </button>
      </div>

      <button className="google-btn" onClick={handleGoogle} type="button">
        <svg width="18" height="18" viewBox="0 0 48 48">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.5 5.3 29.5 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.7-.4-3.5z" />
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.5 18.9 12 24 12c3.1 0 5.8 1.1 8 3l6-6C34.5 5.3 29.5 3 24 3 16.1 3 9.3 7.5 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 45c5.3 0 10.2-2 13.9-5.4l-6.4-5.4C29.4 35.9 26.8 37 24 37c-5.3 0-9.7-3.3-11.3-8l-6.6 5C9.2 40.5 16 45 24 45z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.4 5.4C39.9 37 43 31.1 43 24c0-1.4-.1-2.7-.4-3.5z" />
        </svg>
        Continuar con Google
      </button>

      <div className="auth-divider">o con tu correo</div>

      <form onSubmit={handleSubmit}>
        <label className="input-label" style={{ marginTop: 0 }}>
          <Mail size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          Correo
        </label>
        <input
          className="text-input"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tucorreo@ejemplo.com"
        />

        <label className="input-label">
          <Lock size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          Contraseña
        </label>
        <input
          className="text-input"
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 6 caracteres"
        />

        {error && <div className="auth-error">{error}</div>}
        {info && <div className="auth-note">{info}</div>}

        <button className="save-btn" type="submit" disabled={loading} style={{ marginTop: 20 }}>
          {loading ? 'Un momento…' : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
        </button>
      </form>
    </div>
  );
}

// ============================================================
// 🚀 APP PRINCIPAL
// ============================================================
export default function App() {
  const [session, setSession] = useState(undefined); // undefined = cargando, null = sin sesión
  const [activeTab, setActiveTab] = useState('home');
  const [pets, setPets] = useState([]);
  const [selectedPetId, setSelectedPetId] = useState(null);
  const [vaccineStatus, setVaccineStatus] = useState({});
  const [addingPet, setAddingPet] = useState(false);

  // Escucha el estado de autenticación de Supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Carga las mascotas y vacunas del usuario cuando inicia sesión
  useEffect(() => {
    if (!session?.user) return;
    (async () => {
      let { data: petRows } = await supabase
        .from('pets')
        .select('*')
        .order('created_at', { ascending: true });

      if (!petRows || petRows.length === 0) {
        const seeds = SEED_PETS.map((p) => ({ ...p, user_id: session.user.id }));
        const { data: inserted } = await supabase.from('pets').insert(seeds).select();
        petRows = inserted || [];
      }

      setPets(petRows);
      setSelectedPetId(petRows[0]?.id || null);

      const petIds = petRows.map((p) => p.id);
      if (petIds.length > 0) {
        const { data: vaccineRows } = await supabase
          .from('vaccine_status')
          .select('*')
          .in('pet_id', petIds);
        const statusMap = {};
        (vaccineRows || []).forEach((row) => {
          statusMap[`${row.pet_id}_${row.vaccine_id}`] = row.done;
        });
        setVaccineStatus(statusMap);
      }
    })();
  }, [session?.user?.id]);

  const addPet = async (petData) => {
    if (!session?.user) return null;
    setAddingPet(true);
    const { data, error } = await supabase
      .from('pets')
      .insert({ ...petData, user_id: session.user.id })
      .select()
      .single();
    setAddingPet(false);
    if (error) {
      window.alert('No se pudo guardar la mascota: ' + error.message);
      return null;
    }
    setPets((prev) => [...prev, data]);
    setSelectedPetId(data.id);
    return data;
  };

  const toggleVaccine = async (petId, vaccineId, done) => {
    // Actualiza la UI de inmediato (reactividad) y luego sincroniza con Supabase
    setVaccineStatus((prev) => ({ ...prev, [`${petId}_${vaccineId}`]: done }));
    await supabase.from('vaccine_status').upsert(
      { pet_id: petId, vaccine_id: vaccineId, done, updated_at: new Date().toISOString() },
      { onConflict: 'pet_id,vaccine_id' }
    );
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setPets([]);
    setVaccineStatus({});
    setSelectedPetId(null);
  };

  if (session === undefined) {
    return <div className="center-loading">Cargando FamiliaPet…</div>;
  }

  if (!session) {
    return <AuthScreen />;
  }

  const userName = session.user.user_metadata?.full_name?.split(' ')[0] || session.user.email?.split('@')[0] || 'DogLover';

  return (
    <div className="app-shell">
      {activeTab === 'home' && (
        <HomeScreen
          userName={userName}
          pets={pets}
          selectedPetId={selectedPetId}
          setSelectedPetId={setSelectedPetId}
          addPet={addPet}
          addingPet={addingPet}
          vaccineStatus={vaccineStatus}
          toggleVaccine={toggleVaccine}
        />
      )}
      {activeTab === 'calc' && (
        <CalcScreen pets={pets} selectedPetId={selectedPetId} setSelectedPetId={setSelectedPetId} />
      )}
      {activeTab === 'map' && <MapScreen />}

      <button
        onClick={handleSignOut}
        style={{
          position: 'fixed',
          top: 14,
          right: 14,
          zIndex: 45,
          background: 'rgba(255,255,255,0.9)',
          borderRadius: 20,
          padding: '6px 10px',
          fontSize: 11,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          color: '#78909C',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}
      >
        <LogOut size={12} /> Salir
      </button>

      <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
