import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus, Trash2, MapPin, Phone, CheckCircle2, Clock, Pencil,
  MessageCircle, Send, User,
} from 'lucide-react';
import { supabase } from './supabaseClient';
import { Modal, ImagePicker, ConfirmDialog } from './components';
import { POST_TYPE_LABEL, POST_TYPE_COLOR, POST_IS_ALERT, uploadImage, formatDate } from './lib';

const FILTERS = [
  { id: 'todos', label: 'Todos' },
  { id: 'perdida', label: 'Perdidas' },
  { id: 'encontrada', label: 'Encontradas' },
  { id: 'adopcion', label: 'Adopción' },
  { id: 'consulta', label: 'Consultas' },
  { id: 'tip', label: 'Consejos' },
];

// ============================================================
// 📝 FORMULARIO DE PUBLICACIÓN
// ============================================================
function PostForm({ post, userId, authorName, onClose, onSaved }) {
  const isEdit = !!post;
  const [type, setType] = useState(post?.type || 'consulta');
  const [title, setTitle] = useState(post?.title || '');
  const [petName, setPetName] = useState(post?.pet_name || '');
  const [species, setSpecies] = useState(post?.species || 'Perro');
  const [description, setDescription] = useState(post?.description || '');
  const [comuna, setComuna] = useState(post?.comuna || '');
  const [contact, setContact] = useState(post?.contact || '');
  const [photoFile, setPhotoFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const esAviso = POST_IS_ALERT[type];

  const handleSubmit = async () => {
    if (!description.trim()) {
      window.alert('Escribe el contenido de tu publicación.');
      return;
    }
    if (esAviso && !contact.trim()) {
      window.alert('Los avisos necesitan un contacto para que puedan ubicarte.');
      return;
    }
    setSaving(true);
    try {
      let photo_url = post?.photo_url || null;
      if (photoFile) photo_url = await uploadImage(photoFile, userId, 'post');

      const payload = {
        type,
        title: title.trim() || null,
        pet_name: petName.trim() || null,
        species,
        description: description.trim(),
        comuna: comuna.trim() || null,
        // El contacto solo es obligatorio en avisos; en consultas puede ir vacío
        contact: contact.trim() || 'Responder en los comentarios',
        photo_url,
        author_name: authorName,
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
    <Modal title={isEdit ? 'Editar publicación' : 'Nueva publicación'} onClose={onClose}>
      <label className="input-label" style={{ marginTop: 0 }}>Tipo</label>
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

      <label className="input-label">Título</label>
      <input
        className="text-input"
        placeholder={esAviso ? 'Ej: Se perdió en Plaza Ñuñoa' : 'Ej: Mi gato dejó de comer, ¿qué hago?'}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <ImagePicker onChange={setPhotoFile} value={post?.photo_url} label="Foto (opcional)" />

      {esAviso && (
        <>
          <label className="input-label">Nombre de la mascota (si lo sabes)</label>
          <input className="text-input" placeholder="Ej: Rocky" value={petName} onChange={(e) => setPetName(e.target.value)} />
        </>
      )}

      <label className="input-label">Especie</label>
      <div className="type-selector-row wrap">
        {['Perro', 'Gato', 'Ave', 'Roedor', 'Conejo', 'Reptil', 'Otro'].map((s) => (
          <button key={s} className={`type-chip ${species === s ? 'active' : ''}`} onClick={() => setSpecies(s)}>
            {s}
          </button>
        ))}
      </div>

      <label className="input-label">{esAviso ? 'Descripción' : 'Cuéntanos con detalle'}</label>
      <textarea
        className="text-input textarea"
        rows={5}
        placeholder={
          esAviso
            ? 'Color, tamaño, señas particulares, dónde y cuándo se vio por última vez…'
            : 'Mientras más contexto des (edad, síntomas, hace cuánto, qué has probado), mejores respuestas recibirás.'
        }
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <label className="input-label">Comuna / sector</label>
      <input className="text-input" placeholder="Ej: Ñuñoa" value={comuna} onChange={(e) => setComuna(e.target.value)} />

      <label className="input-label">
        Contacto {esAviso ? '' : <span className="label-hint">(opcional)</span>}
      </label>
      <input
        className="text-input"
        placeholder={esAviso ? '+56 9 1234 5678' : 'Déjalo vacío para responder solo por comentarios'}
        value={contact}
        onChange={(e) => setContact(e.target.value)}
      />

      {!esAviso && (
        <div className="info-card" style={{ marginTop: 14, fontSize: 11 }}>
          <p className="info-note" style={{ margin: 0 }}>
            La comunidad puede orientarte con su experiencia, pero no reemplaza a un veterinario.
            Si tu mascota tiene síntomas graves —no come hace más de un día, dificultad para
            respirar, sangrado, convulsiones o decaimiento fuerte— acude a una urgencia ahora.
          </p>
        </div>
      )}

      <p className="form-note">
        Tu publicación será visible para todos los usuarios de FamiliaPet.
      </p>

      <button className="save-btn" onClick={handleSubmit} disabled={saving}>
        {saving ? 'Publicando…' : isEdit ? 'Guardar cambios' : 'Publicar'}
      </button>
    </Modal>
  );
}

// ============================================================
// 💬 HILO DE COMENTARIOS
// ============================================================
function CommentThread({ post, userId, authorName, onCountChange }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('community_comments')
      .select('*')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });
    setComments(data || []);
    setLoading(false);
    onCountChange?.(post.id, (data || []).length);
  };

  useEffect(() => {
    load();
  }, [post.id]);

  const send = async () => {
    if (!body.trim()) return;
    setSending(true);
    const { error } = await supabase.from('community_comments').insert({
      post_id: post.id,
      user_id: userId,
      author_name: authorName,
      body: body.trim(),
    });
    setSending(false);
    if (error) {
      window.alert('No se pudo comentar: ' + error.message);
      return;
    }
    setBody('');
    await load();
  };

  const confirmDelete = async () => {
    await supabase.from('community_comments').delete().eq('id', deleting.id);
    setDeleting(null);
    await load();
  };

  return (
    <div className="thread">
      {loading ? (
        <p className="empty-text" style={{ marginTop: 8 }}>Cargando respuestas…</p>
      ) : comments.length === 0 ? (
        <p className="thread-empty">Sé el primero en responder.</p>
      ) : (
        comments.map((c) => (
          <div key={c.id} className="comment">
            <div className="comment-avatar">
              <User size={13} color="#fff" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="comment-head">
                <strong>{c.author_name || 'Usuario'}</strong>
                <span className="comment-date">{formatDate(c.created_at.slice(0, 10))}</span>
              </p>
              <p className="comment-body">{c.body}</p>
            </div>
            {c.user_id === userId && (
              <button onClick={() => setDeleting(c)} aria-label="Eliminar comentario">
                <Trash2 size={13} color="#B0BEC5" />
              </button>
            )}
          </div>
        ))
      )}

      <div className="comment-box">
        <textarea
          className="text-input textarea"
          rows={2}
          placeholder="Escribe tu respuesta o experiencia…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <button className="comment-send" onClick={send} disabled={sending || !body.trim()} aria-label="Enviar">
          <Send size={16} />
        </button>
      </div>

      {deleting && (
        <ConfirmDialog
          title="Eliminar comentario"
          message="Tu respuesta se borrará del hilo."
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

// ============================================================
// 🏘️ PANTALLA DE COMUNIDAD
// ============================================================
export default function CommunityScreen({ userId, authorName }) {
  const [posts, setPosts] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todos');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [openThread, setOpenThread] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('community_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) console.error(error);
    setPosts(data || []);

    // Contamos las respuestas de cada publicación
    const ids = (data || []).map((p) => p.id);
    if (ids.length > 0) {
      const { data: cs } = await supabase.from('community_comments').select('post_id').in('post_id', ids);
      const map = {};
      (cs || []).forEach((c) => {
        map[c.post_id] = (map[c.post_id] || 0) + 1;
      });
      setCounts(map);
    }
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
      <p className="screen-subtitle">Avisos, consultas y consejos entre tutores</p>

      <div className="filter-scroll flush">
        {FILTERS.map((f) => (
          <button key={f.id} className={`filter-chip ${filter === f.id ? 'active' : ''}`} onClick={() => setFilter(f.id)}>
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
        Publicar
      </button>

      {loading ? (
        <p className="empty-text">Cargando publicaciones…</p>
      ) : filtered.length === 0 ? (
        <p className="empty-text">Aún no hay publicaciones aquí. ¡Sé el primero!</p>
      ) : (
        filtered.map((post) => {
          const mine = post.user_id === userId;
          const esAviso = POST_IS_ALERT[post.type];
          const abierto = openThread === post.id;
          const n = counts[post.id] || 0;
          return (
            <article key={post.id} className={`post-card ${post.resolved ? 'resolved' : ''}`}>
              {post.photo_url && (
                <img className="post-photo" src={post.photo_url} alt={post.title || post.pet_name || 'Publicación'} loading="lazy" />
              )}
              <div className="post-body">
                <div className="post-head">
                  <span className="post-tag" style={{ background: POST_TYPE_COLOR[post.type] }}>
                    {POST_TYPE_LABEL[post.type]}
                  </span>
                  {post.resolved && (
                    <span className="post-tag resolved-tag">
                      <CheckCircle2 size={12} /> {esAviso ? 'Resuelto' : 'Cerrado'}
                    </span>
                  )}
                  <span className="post-date">
                    <Clock size={11} /> {formatDate(post.created_at.slice(0, 10))}
                  </span>
                </div>

                {post.title && <h3 className="post-name">{post.title}</h3>}
                {post.pet_name && <p className="post-species">{post.pet_name} · {post.species}</p>}
                {!post.pet_name && post.species && <p className="post-species">{post.species}</p>}

                <p className="post-desc">{post.description}</p>

                {post.comuna && (
                  <p className="post-meta">
                    <MapPin size={12} /> {post.comuna}
                  </p>
                )}
                {esAviso && post.contact && (
                  <p className="post-meta">
                    <Phone size={12} /> {post.contact}
                  </p>
                )}
                {post.author_name && <p className="post-author">Publicado por {post.author_name}</p>}

                <div className="post-actions">
                  <button
                    className="btn-ghost small"
                    onClick={() => setOpenThread(abierto ? null : post.id)}
                  >
                    <MessageCircle size={13} />
                    {n > 0 ? `${n} ${n === 1 ? 'respuesta' : 'respuestas'}` : 'Responder'}
                  </button>

                  {mine && (
                    <>
                      <button className="btn-ghost small" onClick={() => toggleResolved(post)}>
                        {post.resolved ? 'Reabrir' : esAviso ? 'Marcar resuelto' : 'Cerrar'}
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
                    </>
                  )}
                </div>

                {abierto && (
                  <CommentThread
                    post={post}
                    userId={userId}
                    authorName={authorName}
                    onCountChange={(id, count) => setCounts((prev) => ({ ...prev, [id]: count }))}
                  />
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
          authorName={authorName}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSaved={load}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Eliminar publicación"
          message="Se borrará junto con todas sus respuestas."
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
