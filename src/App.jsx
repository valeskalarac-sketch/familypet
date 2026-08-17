import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell, LogOut, PawPrint, Siren, Home as HomeIcon, Calculator as CalculatorIcon,
  User, Users, Dog, Cat, Mail, Lock, ShoppingBag, Syringe, ChevronRight,
  Calendar, AlertTriangle, Utensils, Heart,
} from 'lucide-react';
import { supabase } from './supabaseClient';
import { PetAvatar } from './components';
import { FOOD_QUALITY, formatAge, formatDate, daysUntil } from './lib';
import PetsScreen from './PetsScreen';
import CommunityScreen from './CommunityScreen';
import SosScreen from './SosScreen';

const SEED_PETS = [
  { name: 'Rocky', type: 'Perro', breed: 'Mestizo', weight: 15, age: 4, age_unit: 'años' },
  { name: 'Luna', type: 'Gato', breed: 'Siamés', weight: 4, age: 2, age_unit: 'años' },
];

// ============================================================
// 🧭 BARRA DE NAVEGACIÓN INFERIOR (6 secciones)
// ============================================================
function TabBar({ activeTab, setActiveTab }) {
  const tabs = [
    { key: 'home', label: 'Inicio', Icon: HomeIcon },
    { key: 'pets', label: 'Mascotas', Icon: PawPrint },
    { key: 'calc', label: 'Calc', Icon: CalculatorIcon },
    { key: 'community', label: 'Comunidad', Icon: Users },
    { key: 'sos', label: 'SOS', Icon: Siren },
    { key: 'profile', label: 'Perfil', Icon: User },
  ];
  return (
    <nav className="tab-bar-wrapper">
      <div className="tab-bar">
        {tabs.map(({ key, label, Icon }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              className={`tab-item ${active ? 'active' : ''}`}
              onClick={() => setActiveTab(key)}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={19} />
              <span className="tab-item-label">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ============================================================
// 🏠 PANTALLA DE INICIO (resumen y accesos rápidos)
// ============================================================
function HomeScreen({ userName, pets, alerts, setActiveTab }) {
  const proximas = alerts.filter((a) => a.dias >= 0).slice(0, 3);
  const vencidas = alerts.filter((a) => a.dias < 0).slice(0, 3);

  return (
    <div className="screen">
      <div className="header-row">
        <div>
          <h1 className="greeting">¡Hola, {userName}! 🐾</h1>
          <p className="sub-greeting">
            {pets.length > 0
              ? `Hoy es un gran día para cuidar a ${pets.map((p) => p.name).slice(0, 2).join(' y ')}`
              : 'Registra tu primera mascota para empezar'}
          </p>
        </div>
        <div className="header-icons">
          <div className="icon-btn">
            <Bell size={20} />
          </div>
        </div>
      </div>

      <button className="sos-button" onClick={() => setActiveTab('sos')}>
        <div>
          <p className="sos-title">Botón SOS</p>
          <p className="sos-subtitle">Emergencia veterinaria 24/7</p>
        </div>
        <div className="sos-icon-circle-lg">
          <Siren size={26} color="#fff" />
        </div>
      </button>

      {(vencidas.length > 0 || proximas.length > 0) && (
        <>
          <div className="section-header-row">
            <h2 className="section-title">Recordatorios</h2>
            <Syringe size={18} color="#FF8A80" />
          </div>
          <div className="alert-list">
            {vencidas.map((a) => (
              <button key={a.id} className="alert-item danger" onClick={() => setActiveTab('pets')}>
                <AlertTriangle size={16} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="alert-title">{a.name} — {a.petName}</p>
                  <p className="alert-sub">Vencida hace {Math.abs(a.dias)} días</p>
                </div>
                <ChevronRight size={15} />
              </button>
            ))}
            {proximas.map((a) => (
              <button key={a.id} className="alert-item warn" onClick={() => setActiveTab('pets')}>
                <Calendar size={16} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="alert-title">{a.name} — {a.petName}</p>
                  <p className="alert-sub">
                    {a.dias === 0 ? 'Es hoy' : `En ${a.dias} días`} · {formatDate(a.next_date)}
                  </p>
                </div>
                <ChevronRight size={15} />
              </button>
            ))}
          </div>
        </>
      )}

      <div className="section-header-row">
        <h2 className="section-title">Tus Mascotas</h2>
        <button className="link-btn" onClick={() => setActiveTab('pets')}>
          Ver todas <ChevronRight size={13} />
        </button>
      </div>

      {pets.length === 0 ? (
        <button className="add-pet-wide" onClick={() => setActiveTab('pets')}>
          Registrar mi primera mascota
        </button>
      ) : (
        <div className="scroll-x">
          {pets.map((pet) => (
            <button key={pet.id} className="pet-card" onClick={() => setActiveTab('pets')}>
              <PetAvatar type={pet.type} size={64} photoUrl={pet.photo_url} />
              <p className="pet-card-name">{pet.name}</p>
              <p className="pet-card-meta">{pet.type} • {pet.breed}</p>
              <div className="pet-card-chips">
                <span className="pet-chip">{pet.weight}kg</span>
                <span className="pet-chip">{formatAge(pet)}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="section-header-row" style={{ marginTop: 24 }}>
        <h2 className="section-title">Gestión y Cuidados</h2>
      </div>
      <div className="quick-grid">
        <button className="quick-card mint" onClick={() => setActiveTab('calc')}>
          <Utensils size={20} />
          <p className="quick-title">Alimentación</p>
          <p className="quick-sub">Ración y stock</p>
        </button>
        <button className="quick-card coral" onClick={() => setActiveTab('pets')}>
          <Syringe size={20} />
          <p className="quick-title">Vacunas</p>
          <p className="quick-sub">Próximas citas</p>
        </button>
        <button className="quick-card gray" onClick={() => setActiveTab('community')}>
          <Users size={20} />
          <p className="quick-title">Comunidad</p>
          <p className="quick-sub">Perdidas y adopción</p>
        </button>
        <button className="quick-card gray" onClick={() => setActiveTab('sos')}>
          <Siren size={20} />
          <p className="quick-title">Mapa SOS</p>
          <p className="quick-sub">Clínicas cerca</p>
        </button>
      </div>

      <div className="tip-card">
        <Heart size={16} color="#43A047" />
        <div>
          <p className="tip-title">Consejo del día</p>
          <p className="tip-text">
            Dividir la ración diaria en dos tomas ayuda a la digestión y mantiene los niveles de energía
            estables durante el día.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 🧮 CALCULADORA (alimento y arena)
// ============================================================
function CalcScreen({ pets, selectedPetId, setSelectedPetId }) {
  const [qualityId, setQualityId] = useState('premium');
  const [bagSize, setBagSize] = useState('');
  const [alertOn, setAlertOn] = useState(false);
  const [numCats, setNumCats] = useState('1');

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

  const restockDate = useMemo(() => {
    if (bagDurationDays <= 0) return null;
    const d = new Date();
    d.setDate(d.getDate() + bagDurationDays - 3);
    return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long' });
  }, [bagDurationDays]);

  const isCat = selectedPet?.type === 'Gato';
  const catCount = Math.max(1, parseInt(numCats) || 1);
  const weeklyLitterKg = 1.5 * catCount;

  if (!selectedPet) {
    return (
      <div className="screen">
        <h1 className="screen-title">Calculadora</h1>
        <p className="empty-text">Registra una mascota para usar la calculadora.</p>
      </div>
    );
  }

  return (
    <div className="screen">
      <h1 className="screen-title">Calculadora Inteligente</h1>
      <p className="screen-subtitle">Alimento y arena sanitaria</p>

      <label className="input-label" style={{ marginTop: 0 }}>¿Para quién calculamos?</label>
      <div className="scroll-x" style={{ marginBottom: 8 }}>
        {pets.map((pet) => {
          const active = pet.id === selectedPet.id;
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
        step="0.5"
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
        {bagDurationDays > 0 && (
          <>
            <div className="result-divider" />
            <div className="result-row">
              <span className="result-label">Sugerimos recomprar el</span>
              <span className="result-value">{restockDate}</span>
            </div>
          </>
        )}
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
          ✅ Listo, te notificaremos 3 días antes de que se acabe el alimento de {selectedPet.name}
          {restockDate ? ` (alrededor del ${restockDate})` : ''}.
        </div>
      )}

      {isCat && (
        <>
          <div className="section-header-row" style={{ marginTop: 24 }}>
            <h2 className="section-title">Arena Sanitaria</h2>
            <ShoppingBag size={18} color="#FF8A80" />
          </div>
          <label className="input-label" style={{ marginTop: 0 }}>¿Cuántos gatos usan la arena?</label>
          <input
            className="text-input"
            type="number"
            min="1"
            value={numCats}
            onChange={(e) => setNumCats(e.target.value)}
          />
          <div className="result-card sand">
            <div className="result-row">
              <span className="result-label">Consumo semanal estimado</span>
              <span className="result-value">{weeklyLitterKg.toFixed(1)} kg</span>
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
// 👤 PANTALLA DE PERFIL
// ============================================================
function ProfileScreen({ session, pets, alerts, onSignOut }) {
  const user = session.user;
  const name = user.user_metadata?.full_name || user.email;
  const avatar = user.user_metadata?.avatar_url;
  const memberSince = formatDate(user.created_at?.slice(0, 10));

  return (
    <div className="screen">
      <h1 className="screen-title">Mi Perfil</h1>
      <p className="screen-subtitle">Tu cuenta en FamiliaPet</p>

      <div className="profile-card">
        <div className="profile-avatar">
          {avatar ? <img src={avatar} alt={name} /> : <User size={30} color="#fff" />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="profile-name">{name}</p>
          <p className="profile-email">{user.email}</p>
          {memberSince && <p className="profile-since">Miembro desde {memberSince}</p>}
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <p className="stat-num">{pets.length}</p>
          <p className="stat-label">Mascotas</p>
        </div>
        <div className="stat-card">
          <p className="stat-num">{alerts.filter((a) => a.dias >= 0).length}</p>
          <p className="stat-label">Vacunas próximas</p>
        </div>
        <div className="stat-card">
          <p className="stat-num">{alerts.filter((a) => a.dias < 0).length}</p>
          <p className="stat-label">Vencidas</p>
        </div>
      </div>

      <div className="section-header-row" style={{ marginTop: 24 }}>
        <h2 className="section-title">Sobre FamiliaPet</h2>
      </div>
      <div className="info-card">
        <p>
          FamiliaPet te ayuda a llevar el control de vacunas, alimentación y emergencias de tus mascotas,
          además de conectarte con la comunidad para reportar mascotas perdidas o en adopción.
        </p>
        <p className="info-note">
          Los cálculos de alimento son estimaciones referenciales. Consulta siempre a tu médico veterinario
          para las necesidades específicas de tu mascota.
        </p>
      </div>

      <button className="signout-btn" onClick={onSignOut}>
        <LogOut size={16} /> Cerrar sesión
      </button>
    </div>
  );
}

// ============================================================
// 🔐 PANTALLA DE AUTENTICACIÓN
// ============================================================
function AuthScreen() {
  const [mode, setMode] = useState('login');
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
      else setInfo('¡Cuenta creada! Revisa tu correo para confirmar y luego inicia sesión.');
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
          <Mail size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Correo
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
          <Lock size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Contraseña
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
  const [session, setSession] = useState(undefined);
  const [activeTab, setActiveTab] = useState('home');
  const [pets, setPets] = useState([]);
  const [selectedPetId, setSelectedPetId] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  const loadPets = async (userId) => {
    let { data: rows } = await supabase.from('pets').select('*').order('created_at', { ascending: true });
    if (!rows || rows.length === 0) {
      const seeds = SEED_PETS.map((p) => ({ ...p, user_id: userId }));
      const { data: inserted } = await supabase.from('pets').insert(seeds).select();
      rows = inserted || [];
    }
    setPets(rows);
    setSelectedPetId((prev) => (rows.find((p) => p.id === prev) ? prev : rows[0]?.id || null));
    return rows;
  };

  const loadAlerts = async (petRows) => {
    const ids = petRows.map((p) => p.id);
    if (ids.length === 0) {
      setAlerts([]);
      return;
    }
    const { data } = await supabase
      .from('pet_vaccines')
      .select('*')
      .in('pet_id', ids)
      .eq('done', false)
      .not('next_date', 'is', null);
    const mapped = (data || [])
      .map((v) => ({
        ...v,
        dias: daysUntil(v.next_date),
        petName: petRows.find((p) => p.id === v.pet_id)?.name || '',
      }))
      .filter((v) => v.dias !== null && v.dias <= 60)
      .sort((a, b) => a.dias - b.dias);
    setAlerts(mapped);
  };

  useEffect(() => {
    if (!session?.user) return;
    (async () => {
      setLoadingData(true);
      const rows = await loadPets(session.user.id);
      await loadAlerts(rows);
      setLoadingData(false);
    })();
  }, [session?.user?.id]);

  const createPet = async (payload) => {
    const { data, error } = await supabase
      .from('pets')
      .insert({ ...payload, user_id: session.user.id })
      .select()
      .single();
    if (error) throw error;
    setPets((prev) => [...prev, data]);
    setSelectedPetId(data.id);
  };

  const updatePet = async (id, payload) => {
    const { data, error } = await supabase.from('pets').update(payload).eq('id', id).select().single();
    if (error) throw error;
    setPets((prev) => prev.map((p) => (p.id === id ? data : p)));
  };

  const deletePet = async (id) => {
    const { error } = await supabase.from('pets').delete().eq('id', id);
    if (error) {
      window.alert('No se pudo eliminar: ' + error.message);
      return;
    }
    const remaining = pets.filter((p) => p.id !== id);
    setPets(remaining);
    if (selectedPetId === id) setSelectedPetId(remaining[0]?.id || null);
    await loadAlerts(remaining);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setPets([]);
    setAlerts([]);
    setSelectedPetId(null);
    setActiveTab('home');
  };

  if (session === undefined) return <div className="center-loading">Cargando FamiliaPet…</div>;
  if (!session) return <AuthScreen />;

  const userName =
    session.user.user_metadata?.full_name?.split(' ')[0] ||
    session.user.email?.split('@')[0] ||
    'DogLover';

  return (
    <div className="app-shell">
      {loadingData && <div className="top-loading">Sincronizando…</div>}

      {activeTab === 'home' && (
        <HomeScreen userName={userName} pets={pets} alerts={alerts} setActiveTab={setActiveTab} />
      )}
      {activeTab === 'pets' && (
        <PetsScreen
          pets={pets}
          userId={session.user.id}
          onCreate={createPet}
          onUpdate={updatePet}
          onDelete={deletePet}
        />
      )}
      {activeTab === 'calc' && (
        <CalcScreen pets={pets} selectedPetId={selectedPetId} setSelectedPetId={setSelectedPetId} />
      )}
      {activeTab === 'community' && <CommunityScreen userId={session.user.id} />}
      {activeTab === 'sos' && <SosScreen pets={pets} />}
      {activeTab === 'profile' && (
        <ProfileScreen session={session} pets={pets} alerts={alerts} onSignOut={handleSignOut} />
      )}

      <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
