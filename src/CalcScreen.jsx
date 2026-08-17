import React, { useEffect, useMemo, useState } from 'react';
import {
  ShoppingBag, Plus, Trash2, TrendingUp, TrendingDown, Check,
  Info, Utensils, BookOpen, ChevronDown, ChevronUp,
} from 'lucide-react';
import { supabase } from './supabaseClient';
import { Modal, SpeciesIcon, ConfirmDialog } from './components';
import {
  FOOD_TIERS, PORTION_SIGNALS, SPECIES_WITH_FOOD_FORMULA,
  getSpeciesGroup, getSpeciesMeta, realDailyGrams, daysBetween, formatDate,
} from './lib';

// ============================================================
// 📋 REGISTRO DE CONSUMO REAL
// ============================================================
function ConsumptionForm({ petId, kind, onClose, onSaved }) {
  const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [brand, setBrand] = useState('');
  const [saving, setSaving] = useState(false);

  const dias = startDate && endDate ? daysBetween(startDate, endDate) : 0;
  const preview =
    dias > 0 && amount ? Math.round((parseFloat(amount) * 1000) / dias) : null;

  const handleSave = async () => {
    if (!amount || !startDate || !endDate) {
      window.alert('Completa la cantidad y ambas fechas.');
      return;
    }
    if (dias <= 0) {
      window.alert('La fecha de término debe ser posterior a la de inicio.');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('consumption_logs').insert({
      pet_id: petId,
      kind,
      amount_kg: parseFloat(amount),
      start_date: startDate,
      end_date: endDate,
      brand: brand.trim() || null,
    });
    setSaving(false);
    if (error) {
      window.alert('No se pudo guardar: ' + error.message);
      return;
    }
    await onSaved();
    onClose();
  };

  const esArena = kind === 'arena';

  return (
    <Modal title={esArena ? 'Registrar arena usada' : 'Registrar saco consumido'} onClose={onClose}>
      <p className="confirm-msg">
        Cuéntanos cuánto duró de verdad. Con eso calculamos el consumo real de tu mascota,
        que suele diferir de la recomendación teórica.
      </p>

      <label className="input-label">
        {esArena ? 'Kilos de arena de la bolsa' : 'Kilos del saco'}
      </label>
      <input
        className="text-input"
        type="number"
        step="0.1"
        placeholder="Ej: 15"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      <label className="input-label">¿Cuándo lo abriste?</label>
      <input className="text-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />

      <label className="input-label">¿Cuándo se acabó?</label>
      <input className="text-input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />

      <label className="input-label">Marca (opcional)</label>
      <input
        className="text-input"
        placeholder={esArena ? 'Ej: Cat Litter' : 'Ej: Pro Plan Adulto'}
        value={brand}
        onChange={(e) => setBrand(e.target.value)}
      />

      {preview && (
        <div className="alert-confirm-box" style={{ marginTop: 14 }}>
          Duró <strong>{dias} días</strong> → consumo real de{' '}
          <strong>{esArena ? `${(preview / 1000).toFixed(2)} kg` : `${preview} g`} por día</strong>.
        </div>
      )}

      <button className="save-btn" onClick={handleSave} disabled={saving}>
        {saving ? 'Guardando…' : 'Guardar registro'}
      </button>
    </Modal>
  );
}

// ============================================================
// 📚 GUÍA DE ALIMENTOS RECOMENDADOS
// ============================================================
function FoodGuideModal({ onClose }) {
  const [openTier, setOpenTier] = useState('super');

  return (
    <Modal title="Cómo elegir un buen alimento" onClose={onClose}>
      <p className="confirm-msg">
        La calidad no se mide por el precio del saco, sino por lo que dice la etiqueta.
        Un alimento más digestible rinde más, así que el costo por día puede ser parecido.
      </p>

      {FOOD_TIERS.map((tier) => {
        const open = openTier === tier.id;
        return (
          <div key={tier.id} className="tier-card">
            <button className="tier-head" onClick={() => setOpenTier(open ? null : tier.id)}>
              <span className="tier-dot" style={{ background: tier.color }} />
              <span className="tier-label">{tier.label}</span>
              {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
            {open && (
              <div className="tier-body">
                <p className="tier-why">{tier.why}</p>
                <p className="tier-sub">Qué mirar en la etiqueta:</p>
                <ul className="tier-list">
                  {tier.checklist.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
                <p className="tier-sub">Ejemplos en Chile:</p>
                <p className="tier-examples">{tier.examples}</p>
              </div>
            )}
          </div>
        );
      })}

      <p className="form-note">
        Los ejemplos son referenciales y no son publicidad ni recomendación médica. La mejor
        elección depende de la edad, el peso, la actividad y la salud de cada animal: consúltalo
        con tu veterinario, sobre todo si tiene alguna condición.
      </p>
    </Modal>
  );
}

// ============================================================
// 🧮 PANTALLA DE CALCULADORA
// ============================================================
export default function CalcScreen({ pets, selectedPetId, setSelectedPetId }) {
  const [tierId, setTierId] = useState('premium');
  const [bagSize, setBagSize] = useState('');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formKind, setFormKind] = useState(null); // 'alimento' | 'arena'
  const [guideOpen, setGuideOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [signal, setSignal] = useState(null);
  const [numCats, setNumCats] = useState('1');

  const selectedPet = pets.find((p) => p.id === selectedPetId) || pets[0];
  const tier = FOOD_TIERS.find((t) => t.id === tierId) || FOOD_TIERS[1];
  const group = selectedPet ? getSpeciesGroup(selectedPet) : 'otro';
  const isCat = group === 'gato';
  const hasFormula = SPECIES_WITH_FOOD_FORMULA.includes(group);

  // Carga los registros de consumo de la mascota seleccionada
  const loadLogs = async () => {
    if (!selectedPet) return;
    setLoading(true);
    const { data } = await supabase
      .from('consumption_logs')
      .select('*')
      .eq('pet_id', selectedPet.id)
      .order('end_date', { ascending: false });
    setLogs(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadLogs();
  }, [selectedPet?.id]);

  const foodLogs = useMemo(() => logs.filter((l) => l.kind === 'alimento'), [logs]);
  const litterLogs = useMemo(() => logs.filter((l) => l.kind === 'arena'), [logs]);

  // Recomendado por fórmula
  const recommendedGrams = useMemo(() => {
    if (!selectedPet || !hasFormula) return 0;
    return Math.round(selectedPet.weight * tier.factor);
  }, [selectedPet, tier, hasFormula]);

  // Real según los registros del usuario
  const realGrams = useMemo(() => realDailyGrams(foodLogs), [foodLogs]);
  const realLitterKgWeek = useMemo(() => {
    const g = realDailyGrams(litterLogs);
    return g ? (g * 7) / 1000 : null;
  }, [litterLogs]);

  // La estimación que usamos para proyectar el saco: preferimos el dato real
  const workingGrams = realGrams || recommendedGrams;
  const diffPct =
    realGrams && recommendedGrams
      ? Math.round(((realGrams - recommendedGrams) / recommendedGrams) * 100)
      : null;

  const bagDurationDays = useMemo(() => {
    const bagKg = parseFloat(bagSize);
    if (!bagKg || !workingGrams) return 0;
    return Math.floor(bagKg / (workingGrams / 1000));
  }, [bagSize, workingGrams]);

  const restockDate = useMemo(() => {
    if (bagDurationDays <= 0) return null;
    const d = new Date();
    d.setDate(d.getDate() + bagDurationDays - 3);
    return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long' });
  }, [bagDurationDays]);

  const catCount = Math.max(1, parseInt(numCats) || 1);
  const recommendedLitterWeek = 1.5 * catCount;

  const confirmDelete = async () => {
    await supabase.from('consumption_logs').delete().eq('id', deleting.id);
    setDeleting(null);
    await loadLogs();
  };

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
      <p className="screen-subtitle">Lo recomendado y lo que realmente consume</p>

      <label className="input-label" style={{ marginTop: 0 }}>¿Para quién calculamos?</label>
      <div className="scroll-x" style={{ marginBottom: 8 }}>
        {pets.map((pet) => (
          <button
            key={pet.id}
            className={`pet-pill ${pet.id === selectedPet.id ? 'active' : ''}`}
            onClick={() => setSelectedPetId(pet.id)}
          >
            <SpeciesIcon pet={pet} size={16} />
            {pet.name}
          </button>
        ))}
      </div>

      {!hasFormula ? (
        <div className="info-card" style={{ marginTop: 18 }}>
          <p>
            Todavía no tenemos una fórmula validada de ración para{' '}
            <strong>{getSpeciesMeta(group).label.toLowerCase()}s</strong>. Las necesidades varían
            mucho entre especies y no queremos darte un número inventado.
          </p>
          <p className="info-note">
            Puedes igualmente registrar cuánto dura cada bolsa de alimento para conocer el consumo
            real de {selectedPet.name}.
          </p>
          <button className="btn-ghost" style={{ marginTop: 12 }} onClick={() => setFormKind('alimento')}>
            <Plus size={14} /> Registrar consumo real
          </button>
        </div>
      ) : (
        <>
          {/* Gama de alimento */}
          <div className="section-header-row" style={{ marginTop: 6 }}>
            <label className="input-label" style={{ margin: 0 }}>Gama del alimento</label>
            <button className="link-btn" onClick={() => setGuideOpen(true)}>
              <BookOpen size={13} /> Guía
            </button>
          </div>
          <div className="quality-row">
            {FOOD_TIERS.map((t) => (
              <button
                key={t.id}
                className={`quality-card ${t.id === tierId ? 'active' : ''}`}
                onClick={() => setTierId(t.id)}
              >
                <div className="quality-label">{t.label}</div>
                <div className="quality-factor">{t.factor}g / kg</div>
              </button>
            ))}
          </div>

          {/* Comparación recomendado vs real */}
          <div className="compare-grid">
            <div className="compare-card rec">
              <p className="compare-tag">Recomendado</p>
              <p className="compare-num">{recommendedGrams}<span>g/día</span></p>
              <p className="compare-note">Según peso y gama</p>
            </div>
            <div className={`compare-card ${realGrams ? 'real' : 'empty'}`}>
              <p className="compare-tag">Real</p>
              {realGrams ? (
                <>
                  <p className="compare-num">{realGrams}<span>g/día</span></p>
                  <p className="compare-note">
                    Según {foodLogs.length} {foodLogs.length === 1 ? 'registro' : 'registros'}
                  </p>
                </>
              ) : (
                <>
                  <p className="compare-num muted">—</p>
                  <p className="compare-note">Sin registros aún</p>
                </>
              )}
            </div>
          </div>

          {diffPct !== null && (
            <div className={`diff-banner ${Math.abs(diffPct) <= 10 ? 'ok' : diffPct > 0 ? 'over' : 'under'}`}>
              {Math.abs(diffPct) <= 10 ? (
                <>
                  <Check size={15} />
                  <span>
                    {selectedPet.name} consume prácticamente lo recomendado
                    {diffPct !== 0 && ` (${diffPct > 0 ? '+' : ''}${diffPct}%)`}.
                  </span>
                </>
              ) : diffPct > 0 ? (
                <>
                  <TrendingUp size={15} />
                  <span>
                    Consume <strong>{diffPct}% más</strong> que lo recomendado. Puede ser normal si
                    es muy activo o está en crecimiento; si no, conviene revisar la porción con tu
                    veterinario.
                  </span>
                </>
              ) : (
                <>
                  <TrendingDown size={15} />
                  <span>
                    Consume <strong>{Math.abs(diffPct)}% menos</strong> que lo recomendado. Si mantiene
                    buen peso y energía puede estar bien; si bajó de peso, consulta.
                  </span>
                </>
              )}
            </div>
          )}

          {/* Chequeo de condición corporal */}
          <div className="section-header-row" style={{ marginTop: 22 }}>
            <h2 className="section-title">¿Cómo se ve tu mascota?</h2>
            <Info size={16} color="#78909C" />
          </div>
          <div className="signal-list">
            {PORTION_SIGNALS.map((s) => (
              <button
                key={s.id}
                className={`signal-chip ${signal === s.id ? 'active' : ''}`}
                onClick={() => setSignal(signal === s.id ? null : s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
          {signal && (
            <div className="alert-confirm-box">
              {signal === 'ideal' && '✅ Esa es la condición corporal ideal. Mantén la porción actual.'}
              {signal === 'costillas' &&
                `Considera subir la ración de ${selectedPet.name} entre 10% y 15% y revisar en 3 semanas. Si sigue bajo, consulta al veterinario para descartar parásitos u otra causa.`}
              {signal === 'cintura' &&
                `Considera bajar la ración entre 10% y 15% y aumentar el ejercicio. Pésalo cada 2 semanas: la baja de peso debe ser gradual.`}
              {signal === 'hambre' &&
                'Prueba dividir la misma cantidad en más tomas al día, o usar un plato interactivo. Si mantiene buen peso, la ración probablemente está bien.'}
              {signal === 'sobra' &&
                'Ajusta a lo que realmente come y retira el plato tras 20 minutos. Si dejó de comer de golpe, conviene una consulta veterinaria.'}
            </div>
          )}

          {/* Proyección del saco */}
          <div className="section-header-row" style={{ marginTop: 22 }}>
            <h2 className="section-title">Tu saco actual</h2>
            <Utensils size={16} color="#A5D6A7" />
          </div>
          <label className="input-label" style={{ marginTop: 0 }}>Tamaño del saco (kg)</label>
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
              <span className="result-label">
                Duración estimada
                <span className="result-hint">
                  {realGrams ? ' con tu consumo real' : ' con la recomendación'}
                </span>
              </span>
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
        </>
      )}

      {/* Historial de consumo de alimento */}
      {hasFormula && (
        <>
          <div className="section-header-row" style={{ marginTop: 22 }}>
            <h2 className="section-title">Historial de alimento</h2>
            <button className="mini-btn" onClick={() => setFormKind('alimento')}>
              <Plus size={13} /> Registrar
            </button>
          </div>
          {loading ? (
            <p className="empty-text">Cargando…</p>
          ) : foodLogs.length === 0 ? (
            <p className="empty-text">
              Registra cuánto te duró un saco y sabremos el consumo real de {selectedPet.name}.
            </p>
          ) : (
            foodLogs.map((log) => (
              <LogRow key={log.id} log={log} onDelete={() => setDeleting(log)} />
            ))
          )}
        </>
      )}

      {/* Arena para gatos */}
      {isCat && (
        <>
          <div className="section-header-row" style={{ marginTop: 24 }}>
            <h2 className="section-title">Arena Sanitaria</h2>
            <ShoppingBag size={18} color="#FF8A80" />
          </div>

          <label className="input-label" style={{ marginTop: 0 }}>¿Cuántos gatos usan la arena?</label>
          <input className="text-input" type="number" min="1" value={numCats} onChange={(e) => setNumCats(e.target.value)} />

          <div className="compare-grid">
            <div className="compare-card rec">
              <p className="compare-tag">Recomendado</p>
              <p className="compare-num">{recommendedLitterWeek.toFixed(1)}<span>kg/sem</span></p>
              <p className="compare-note">{catCount} {catCount === 1 ? 'gato' : 'gatos'}</p>
            </div>
            <div className={`compare-card ${realLitterKgWeek ? 'real' : 'empty'}`}>
              <p className="compare-tag">Real</p>
              {realLitterKgWeek ? (
                <>
                  <p className="compare-num">{realLitterKgWeek.toFixed(1)}<span>kg/sem</span></p>
                  <p className="compare-note">Según tus registros</p>
                </>
              ) : (
                <>
                  <p className="compare-num muted">—</p>
                  <p className="compare-note">Sin registros aún</p>
                </>
              )}
            </div>
          </div>

          {realLitterKgWeek && realLitterKgWeek > recommendedLitterWeek * 1.3 && (
            <div className="diff-banner over">
              <TrendingUp size={15} />
              <span>
                Estás gastando bastante más arena de lo típico. Suele deberse a cambiar toda la
                bandeja en vez de retirar solo los grumos, o a una capa demasiado gruesa
                (lo habitual son 5 a 7 cm).
              </span>
            </div>
          )}

          <div className="section-header-row" style={{ marginTop: 18 }}>
            <h2 className="section-title">Historial de arena</h2>
            <button className="mini-btn" onClick={() => setFormKind('arena')}>
              <Plus size={13} /> Registrar
            </button>
          </div>
          {litterLogs.length === 0 ? (
            <p className="empty-text">Registra cuánto te duró una bolsa de arena.</p>
          ) : (
            litterLogs.map((log) => <LogRow key={log.id} log={log} arena onDelete={() => setDeleting(log)} />)
          )}
        </>
      )}

      {formKind && (
        <ConsumptionForm
          petId={selectedPet.id}
          kind={formKind}
          onClose={() => setFormKind(null)}
          onSaved={loadLogs}
        />
      )}
      {guideOpen && <FoodGuideModal onClose={() => setGuideOpen(false)} />}
      {deleting && (
        <ConfirmDialog
          title="Eliminar registro"
          message="Se quitará de tu historial y del cálculo de consumo real."
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

// Fila del historial de consumo
function LogRow({ log, arena, onDelete }) {
  const dias = daysBetween(log.start_date, log.end_date);
  const perDay = dias > 0 ? (Number(log.amount_kg) * 1000) / dias : 0;
  return (
    <div className="log-row">
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="log-title">
          {log.amount_kg} kg · duró {dias} días
        </p>
        <p className="log-meta">
          {formatDate(log.start_date)} → {formatDate(log.end_date)}
          {log.brand ? ` · ${log.brand}` : ''}
        </p>
      </div>
      <span className="log-rate">
        {arena ? `${(perDay / 1000).toFixed(2)} kg/día` : `${Math.round(perDay)} g/día`}
      </span>
      <button onClick={onDelete} aria-label="Eliminar registro">
        <Trash2 size={14} color="#FF3B30" />
      </button>
    </div>
  );
}
