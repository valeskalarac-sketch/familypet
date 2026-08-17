import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, MapPin, Phone, CheckCircle2, Clock, Pencil } from 'lucide-react';
import { supabase } from './supabaseClient';
import { Modal, ImagePicker, ConfirmDialog } from './components';
import { POST_TYPE_LABEL, POST_TYPE_COLOR, uploadImage, formatDate } from './lib';

const FILTERS = [
  { id: 'todos', label: 'Todos' },
  { id: 'perdida', label: 'Perdidas' },
  { id: 'encontrada', label: 'Encontradas' },
  { id: 'adopcion', label: 'Adopción' },
];

// ============================================================
// 📝 FORMULARIO DE AVISO
// ============================================================
function PostForm({ post, userId, onClose, onSaved }) {
  const isEdit = !!post;
  const [type, setType] = useState(post?.type || 'perdida');
  const [petName, setPetName] = useState(post?.pet_name || '');
  const [species, setSpecies] = useState(post?.species || 'Perro');
  const [description, setDescription] = useState(post?.description || '');
  const [comuna, setComuna] = useState(post?.comuna || '');
  const [contact, setContact] = useState(post?.contact || '');
  const [photoFile, setPhotoFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim() || !contact.trim()) {
      window.alert('La descripción y un contacto son obligatorios.');
      return;
    }
    setSaving(true);
    try {
      let photo_url = post?.photo_url || null;
      if (photoFile) photo_url = await uploadImage(photoFile, userId, 'post');

      const payload = {
        type,
        pet_name: petName.trim() || null,
        species,
        description: description.trim(),
        comuna: comuna.trim() || null,
        contact: contact.trim(),
        photo_url,
      };

      if (isEdit) {
        const { error } = await supabase.from('community_posts').update(payload).eq('id', post.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('community_posts').insert({ ...payload, user_id: userId });
        if (error) throw error;
      }
      await onSaved();
      onClose();
    } catch (err) {
      window.alert('No se pudo publicar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? 'Editar aviso' : 'Publicar aviso'} onClose={onClose}>
      <label className="input-label">Tipo de aviso</label>
      <div className="type-selector-row wrap">
        {Object.entries(POST_TYPE_LABEL).map(([key, label]) => (
          <button
            key={key}
            className={`type-chip ${type === key ? 'active' : ''}`}
            onClick={() => setType(key)}
            style={type === key ? { background: POST_TYPE_COLOR[key], borderColor: POST_TYPE_COLOR[key] } : {}}
          >
            {label}
          </button>
        ))}
      </div>

      <ImagePicker onChange={setPhotoFile} value={post?.photo_url} label="Foto de la mascota" />

      <label className="input-label">Nombre (si lo sabes)</label>
      <input className="text-input" placeholder="Ej: Rocky" value={petName} onChange={(e) => setPetName(e.target.value)} />

      <label className="input-label">Especie</label>
      <div className="type-selector-row">
        {['Perro', 'Gato', 'Otro'].map((s) => (
          <button key={s} className={`type-chip ${species === s ? 'active' : ''}`} onClick={() => setSpecies(s)}>
            {s}
          </button>
        ))}
      </div>

      <label className="input-label">Descripción</label>
      <textarea
        className="text-input textarea"
        rows={4}
        placeholder="Color, tamaño, señas particulares, dónde y cuándo se vio por última vez…"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <label className="input-label">Comuna / sector</label>
      <input className="text-input" placeholder="Ej: Peñalolén, cerca de Av. Grecia" value={comuna} onChange={(e) => setComuna(e.target.value)} />

      <label className="input-label">Contacto (teléfono, correo o Instagram)</label>
      <input className="text-input" placeholder="Ej: +56 9 1234 5678" value={contact} onChange={(e) => setContact(e.target.value)} />

      <p className="form-note">
        Tu aviso será visible para todos los usuarios de FamiliaPet. No publiques datos que no quieras compartir.
      </p>

      <button className="save-btn" onClick={handleSubmit} disabled={saving}>
        {saving ? 'Publicando…' : isEdit ? 'Guardar cambios' : 'Publicar aviso'}
      </button>
    </Modal>
  );
}

// ============================================================
// 🏘️ PANTALLA DE COMUNIDAD
// ============================================================
export default function CommunityScreen({ userId }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todos');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('community_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) console.error(error);
    setPosts(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'todos') return posts;
    return posts.filter((p) => p.type === filter);
  }, [posts, filter]);

  const toggleResolved = async (post) => {
    setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, resolved: !p.resolved } : p)));
    await supabase.from('community_posts').update({ resolved: !post.resolved }).eq('id', post.id);
  };

  const confirmDelete = async () => {
    await supabase.from('community_posts').delete().eq('id', deleting.id);
    setDeleting(null);
    await load();
  };

  return (
    <div className="screen">
      <h1 className="screen-title">Comunidad</h1>
      <p className="screen-subtitle">Avisos de mascotas perdidas y en adopción</p>

      <div className="filter-scroll flush">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={`filter-chip ${filter === f.id ? 'active' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <button
        className="add-pet-wide"
        style={{ marginTop: 4, marginBottom: 20 }}
        onClick={() => {
          setEditing(null);
          setFormOpen(true);
        }}
      >
        <Plus size={20} />
        Publicar un aviso
      </button>

      {loading ? (
        <p className="empty-text">Cargando avisos…</p>
      ) : filtered.length === 0 ? (
        <p className="empty-text">
          Aún no hay avisos en esta categoría. ¡Sé el primero en publicar!
        </p>
      ) : (
        filtered.map((post) => {
          const mine = post.user_id === userId;
          return (
            <article key={post.id} className={`post-card ${post.resolved ? 'resolved' : ''}`}>
              {post.photo_url && (
                <img className="post-photo" src={post.photo_url} alt={post.pet_name || 'Mascota'} loading="lazy" />
              )}
              <div className="post-body">
                <div className="post-head">
                  <span className="post-tag" style={{ background: POST_TYPE_COLOR[post.type] }}>
                    {POST_TYPE_LABEL[post.type]}
                  </span>
                  {post.resolved && (
                    <span className="post-tag resolved-tag">
                      <CheckCircle2 size={12} /> Resuelto
                    </span>
                  )}
                  <span className="post-date">
                    <Clock size={11} /> {formatDate(post.created_at.slice(0, 10))}
                  </span>
                </div>

                {post.pet_name && <h3 className="post-name">{post.pet_name}</h3>}
                <p className="post-species">{post.species}</p>
                <p className="post-desc">{post.description}</p>

                {post.comuna && (
                  <p className="post-meta">
                    <MapPin size={12} /> {post.comuna}
                  </p>
                )}
                <p className="post-meta">
                  <Phone size={12} /> {post.contact}
                </p>

                {mine && (
                  <div className="post-actions">
                    <button className="btn-ghost small" onClick={() => toggleResolved(post)}>
                      {post.resolved ? 'Reabrir' : 'Marcar resuelto'}
                    </button>
                    <button
                      className="btn-ghost small"
                      onClick={() => {
                        setEditing(post);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil size={13} /> Editar
                    </button>
                    <button className="btn-ghost small danger" onClick={() => setDeleting(post)}>
                      <Trash2 size={13} /> Borrar
                    </button>
                  </div>
                )}
              </div>
            </article>
          );
        })
      )}

      {formOpen && (
        <PostForm
          post={editing}
          userId={userId}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSaved={load}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Eliminar aviso"
          message="El aviso se borrará de la comunidad permanentemente."
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
