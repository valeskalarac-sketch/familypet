import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell, LogOut, PawPrint, Siren, Home as HomeIcon, Calculator as CalculatorIcon,
  User, Users, Mail, Lock, Syringe, ChevronRight,
  Calendar, AlertTriangle, Utensils, Heart, MapPin, Pencil,
} from 'lucide-react';
import { supabase } from './supabaseClient';
import { PetAvatar, Modal, ConfirmDialog } from './components';
import { formatAge, formatDate, daysUntil, COMUNAS, getComuna, saveComuna, firstName } from './lib';
import PetsScreen from './PetsScreen';
import CalcScreen from './CalcScreen';
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
// 📍 SELECTOR DE COMUNA
// ============================================================
function ComunaModal({ current, onClose, onSaved }) {
  const [value, setValue] = useState(current || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!value.trim()) {
      window.alert('Escribe o elige tu comuna.');
      return;
    }
    setSaving(true);
    try {
      await saveComuna(value.trim());
      onSaved(value.trim());
      onClose();
    } catch (err) {
      window.alert('No se pudo guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Mi comuna" onClose={onClose}>
      <p className="confirm-msg">
        La usamos para mostrarte veterinarias y urgencias cercanas en el mapa.
      </p>

      <label className="input-label">Escribe tu comuna o ciudad</label>
      <input
        className="text-input"
        list="comunas-list"
        placeholder="Ej: Ñuñoa"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <datalist id="comunas-list">
        {COMUNAS.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <label className="input-label">O elige una frecuente</label>
      <div className="comuna-grid">
        {COMUNAS.slice(0, 18).map((c) => (
          <button
            key={c}
            className={`comuna-chip ${value === c ? 'active' : ''}`}
            onClick={() => setValue(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <button className="save-btn" onClick={handleSave} disabled={saving}>
        {saving ? 'Guardando…' : 'Guardar comuna'}
      </button>
    </Modal>
  );
}

// ============================================================
// 🔔 PANEL DE NOTIFICACIONES
// ============================================================
function NotificationsModal({ alerts, onClose, onGoToPets }) {
  return (
    <Modal title="Notificaciones" onClose={onClose}>
      {alerts.length === 0 ? (
        <div className="notif-empty">
          <Bell size={30} color="#CFD8DC" />
          <p>Todo al día. No tienes vacunas próximas ni vencidas.</p>
        </div>
      ) : (
        <div className="alert-list">
          {alerts.map((a) => {
            const vencida = a.dias < 0;
            return (
              <button key={a.id} className={`alert-item ${vencida ? 'danger' : 'warn'}`} onClick={onGoToPets}>
                {vencida ? <AlertTriangle size={16} /> : <Calendar size={16} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="alert-title">{a.name} — {a.petName}</p>
                  <p className="alert-sub">
                    {vencida
                      ? `Vencida hace ${Math.abs(a.dias)} días`
                      : a.dias === 0
                      ? 'Corresponde hoy'
                      : `En ${a.dias} días · ${formatDate(a.next_date)}`}
                  </p>
                </div>
                <ChevronRight size={15} />
              </button>
            );
          })}
        </div>
      )}
      <p className="form-note">
        Los recordatorios se calculan a partir de las fechas de refuerzo que registras en cada vacuna.
        Agrega la próxima dosis al crear o editar una vacuna para recibir avisos aquí.
      </p>
    </Modal>
  );
}

// ============================================================
// 🏠 PANTALLA DE INICIO (resumen y accesos rápidos)
// ============================================================
function HomeScreen({ userName, pets, alerts, setActiveTab }) {
  const proximas = alerts.filter((a) => a.dias >= 0).slice(0, 3);
  const vencidas = alerts.filter((a) => a.dias < 0).slice(0, 3);
  const [bellOpen, setBellOpen] = useState(false);

  return (
    <div className="screen">
      {/* Barra de marca */}
      <div className="brand-bar">
        <img className="brand-mark" src="/logo-mark.png" alt="" aria-hidden="true" />
        <span className="brand-name">FamiliaPet</span>
        <button className="icon-btn" onClick={() => setBellOpen(true)} aria-label="Notificaciones">
          <Bell size={20} />
          {alerts.length > 0 && <span className="bell-badge">{alerts.length}</span>}
        </button>
      </div>

      <div className="header-row">
        <div>
          <h1 className="greeting">¡Hola, {userName}! 🐾</h1>
          <p className="sub-greeting">
            {pets.length > 0
              ? `Hoy es un gran día para cuidar a ${pets.map((p) => p.name).slice(0, 2).join(' y ')}`
              : 'Registra tu primera mascota para empezar'}
          </p>
        </div>
      </div>

      {bellOpen && (
        <NotificationsModal
          alerts={alerts}
          onClose={() => setBellOpen(false)}
          onGoToPets={() => {
            setBellOpen(false);
            setActiveTab('pets');
          }}
        />
      )}

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
              <PetAvatar pet={pet} size={64} photoUrl={pet.photo_url} />
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
// 👤 PANTALLA DE PERFIL
// ============================================================
function ProfileScreen({ session, pets, alerts, comuna, onEditComuna, onSignOut }) {
  const user = session.user;
  const name = user.user_metadata?.full_name || user.email;
  const avatar = user.user_metadata?.avatar_url;
  const memberSince = formatDate(user.created_at?.slice(0, 10));
  const [confirmOut, setConfirmOut] = useState(false);

  return (
    <div className="screen">
      <div className="profile-header">
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="screen-title">Mi Perfil</h1>
          <p className="screen-subtitle" style={{ marginBottom: 0 }}>Tu cuenta en FamiliaPet</p>
        </div>
        {/* Acceso rápido a cerrar sesión, siempre visible arriba */}
        <button className="logout-icon-btn" onClick={() => setConfirmOut(true)} aria-label="Cerrar sesión">
          <LogOut size={18} />
        </button>
      </div>

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

      <button className="setting-row" onClick={onEditComuna}>
        <div className="setting-icon">
          <MapPin size={17} color="#43A047" />
        </div>
        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
          <p className="setting-title">Mi comuna</p>
          <p className="setting-value">{comuna}</p>
        </div>
        <Pencil size={15} color="#78909C" />
      </button>

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

      <button className="signout-btn" onClick={() => setConfirmOut(true)}>
        <LogOut size={16} /> Cerrar sesión
      </button>

      <div className="section-header-row" style={{ marginTop: 24 }}>
        <h2 className="section-title">Sobre FamiliaPet</h2>
      </div>
      <div className="info-card">
        <img className="info-logo" src="/logo.png" alt="FamiliaPet" />
        <p>
          FamiliaPet te ayuda a llevar el control de vacunas, alimentación y emergencias de tus mascotas,
          además de conectarte con la comunidad para reportar mascotas perdidas o en adopción.
        </p>
        <p className="info-note">
          Los cálculos de alimento son estimaciones referenciales. Consulta siempre a tu médico veterinario
          para las necesidades específicas de tu mascota.
        </p>
      </div>

      {confirmOut && (
        <ConfirmDialog
          title="Cerrar sesión"
          message={`¿Quieres cerrar la sesión de ${user.email}? Tus mascotas y registros quedan guardados en tu cuenta.`}
          confirmLabel="Cerrar sesión"
          onConfirm={onSignOut}
          onCancel={() => setConfirmOut(false)}
        />
      )}
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
      <img className="auth-logo-img" src="/logo.png" alt="FamiliaPet" />
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
  const [comuna, setComuna] = useState(null);
  const [comunaOpen, setComunaOpen] = useState(false);

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
    setComuna(getComuna(session));
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

  if (session === undefined)
    return (
      <div className="center-loading">
        <img className="loading-logo" src="/logo-mark.png" alt="FamiliaPet" />
        <p>Cargando FamiliaPet…</p>
      </div>
    );
  if (!session) return <AuthScreen />;

  const userName = firstName(session.user);

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
      {activeTab === 'community' && (
        <CommunityScreen userId={session.user.id} authorName={userName} />
      )}
      {activeTab === 'sos' && (
        <SosScreen pets={pets} comuna={comuna} onEditComuna={() => setComunaOpen(true)} />
      )}
      {activeTab === 'profile' && (
        <ProfileScreen
          session={session}
          pets={pets}
          alerts={alerts}
          comuna={comuna}
          onEditComuna={() => setComunaOpen(true)}
          onSignOut={handleSignOut}
        />
      )}

      {comunaOpen && (
        <ComunaModal current={comuna} onClose={() => setComunaOpen(false)} onSaved={setComuna} />
      )}

      <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
