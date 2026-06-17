import { useState, useRef } from "react";
import emailjs from "@emailjs/browser";
import { PaperClipIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";

export default function App() {
  const formRef = useRef();

  const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || "SERVICE_ID";
  const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || "TEMPLATE_ID";
  const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || "PUBLIC_KEY";
  const DRIVE_UPLOAD_URL = import.meta.env.VITE_DRIVE_UPLOAD_URL || "";
  const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY || "";
  const IMGBB_EXPIRATION = 14 * 24 * 60 * 60; // 14 jours en secondes

  const [form, setForm] = useState({
    title: "",
    zone: "",
    type: "",
    description: "",
    attachments: [], // { file, name, previewUrl, url }
  });

  const [status, setStatus] = useState("");
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    // clear error for this field as soon as user types at least one character
    if (name && value != null && String(value).trim().length > 0) {
      setErrors((prev) => ({ ...prev, [name]: false }));
    }
  };

  const handleFile = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setForm((prev) => {
      const existing = prev.attachments || [];
      const spaceLeft = Math.max(0, 5 - existing.length);
      const toAdd = files.slice(0, spaceLeft).map((file) => ({
        file,
        name: file.name,
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
        url: '',
        uploading: !!DRIVE_UPLOAD_URL,
      }));

      return { ...prev, attachments: [...existing, ...toAdd] };
    });

    // upload files sequentially if IMGBB_API_KEY or DRIVE_UPLOAD_URL set
    if (IMGBB_API_KEY || DRIVE_UPLOAD_URL) {
      files.slice(0, 5).forEach(async (file) => {
        try {
          setStatus(`Téléversement ${file.name} ...`);

          if (IMGBB_API_KEY) {
            const fd = new FormData();
            fd.append('image', file);
            fd.append('name', file.name);

            const url = `https://api.imgbb.com/1/upload?expiration=${IMGBB_EXPIRATION}&key=${IMGBB_API_KEY}`;
            const resp = await fetch(url, {
              method: 'POST',
              body: fd,
            });

            if (!resp.ok) throw new Error('Imgbb upload failed');
            const json = await resp.json();
            const fileUrl = json?.data?.url || json?.data?.display_url || json?.data?.image?.url || '';
            setForm((prev) => ({
              ...prev,
              attachments: prev.attachments.map((a) => (a.name === file.name ? { ...a, url: fileUrl, uploading: false } : a)),
            }));
            setStatus('');
          } else {
            // fallback to DRIVE_UPLOAD_URL logic (base64 JSON)
            const reader = new FileReader();
            const payload = await new Promise((resolve, reject) => {
              reader.onload = () => {
                const dataUrl = reader.result;
                const match = dataUrl.match(/^data:(.*);base64,(.*)$/);
                const mimeType = match?.[1] || file.type || 'application/octet-stream';
                const base64 = match?.[2] || '';
                resolve({ filename: file.name, mimeType, contentBase64: base64 });
              };
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });

            const resp = await fetch(DRIVE_UPLOAD_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            if (!resp.ok) throw new Error('Upload failed');
            const json = await resp.json();
            const fileUrl = json.fileUrl || '';
            setForm((prev) => ({
              ...prev,
              attachments: prev.attachments.map((a) => (a.name === file.name ? { ...a, url: fileUrl, uploading: false } : a)),
            }));
            setStatus('');
          }
        } catch (err) {
          console.error(err);
          setForm((prev) => ({
            ...prev,
            attachments: prev.attachments.map((a) => (a.name === file.name ? { ...a, url: '', uploading: false } : a)),
          }));
          setStatus('Erreur lors du téléversement de certains fichiers.');
        }
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate required fields (title, zone, type, description)
    const newErrors = {};
    if (!form.title || String(form.title).trim().length === 0) newErrors.title = true;
    if (!form.zone || String(form.zone).trim().length === 0) newErrors.zone = true;
    if (!form.type || String(form.type).trim().length === 0) newErrors.type = true;
    if (!form.description || String(form.description).trim().length === 0) newErrors.description = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setStatus("Veuillez remplir les champs obligatoires.");
      return;
    }

    // Prevent submit while attachments are still uploading
    if ((form.attachments || []).some((a) => a.uploading)) {
      setStatus("Veuillez attendre la fin des téléversements avant d'envoyer.");
      return;
    }

    setStatus("Envoi en cours...");

    emailjs
      .sendForm(SERVICE_ID, TEMPLATE_ID, formRef.current, PUBLIC_KEY)
      .then((response) => {
        console.log('EmailJS response:', response);
        setStatus("Feedback envoyé.");
        // redirect to confirmation page
        window.location.href = '/validation';
      })
      .catch((err) => {
        console.error('EmailJS send error:', err);
        let msg = "Erreur lors de l'envoi.";
        if (err && err.text) msg += ` ${err.text}`;
        else if (err && err.status) msg += ` code: ${err.status}`;
        else if (err && err.message) msg += ` ${err.message}`;
        setStatus(msg);
      });
  };

  const removeAttachment = (index) => {
    setForm((prev) => {
      const next = [...(prev.attachments || [])];
      const [removed] = next.splice(index, 1);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return { ...prev, attachments: next };
    });
  };

  // Render confirmation page when path is /validation
  if (typeof window !== 'undefined' && window.location.pathname === '/validation') {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="mx-0 max-w-3xl px-5 py-10">
          <header className="mb-10">
            <div className="flex items-baseline gap-3 flex-nowrap">
              <h1 className="text-5xl font-medium whitespace-nowrap leading-none">Evaluation</h1>
              <span className="text-gray-500 text-lg whitespace-nowrap">GreLines Beta Developer Version</span>
            </div>

            <p className="mt-2 text-gray-500">V3.0.1</p>
          </header>

          <div className="rounded-[28px] bg-zinc-900 p-8 text-center">
            <h2 className="text-2xl font-medium">Évaluation enregistrée</h2>
            <p className="mt-4 text-gray-400">Merci — votre feedback a été envoyé et enregistré.</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="w-full bg-zinc-900">
        <a
          href="https://grelines-beta.vercel.app/"
          target="_self"
          rel="noopener noreferrer"
          className="mx-0 max-w-3xl px-5 py-2 flex items-center gap-2 text-sm text-white cursor-pointer"
        >
          <ArrowLeftIcon className="h-4 w-4 text-white" />
          <span>Retournez vers</span>
          <img src="/assets/GreLinesLOGO.png" alt="GreLines" className="h-4 ml-2" />
        </a>
      </div>

      <div className="mx-0 max-w-3xl px-5 py-10">

        {/* HEADER */}

        <header className="mb-10">
          <div className="flex items-baseline gap-3 flex-nowrap">
            <h1 className="text-5xl font-medium whitespace-nowrap leading-none">
              Evaluation
            </h1>

            <span className="text-gray-500 text-lg whitespace-nowrap">
              GreLines Beta Developer Version
            </span>
          </div>

          <p className="mt-2 text-gray-500">
            V3.0.1
          </p>
        </header>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
          <input type="hidden" name="subject" value="GreLines Website" />
          <input type="hidden" name="to_email" value="ant.adam468@gmail.com" />
          <input type="hidden" name="attachment_name" value={(form.attachments || []).map(a=>a.name).join(', ') } />
          <input type="hidden" name="attachment_url" value={(form.attachments || []).map(a=>a.url).filter(Boolean).join('\n') } />
          {/* SUJET */}

          <section>
            <h2 className="mb-3 text-lg font-medium">
              Sujet
            </h2>

            <div className="rounded-[28px] bg-zinc-900 p-5">
              <p className="text-lg font-medium">
                GreLines Website
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Fonctionnalités globales et
                fonctionnement du site
              </p>
            </div>
          </section>

          {/* INFOS */}

          <section>
            <h2 className="mb-3 text-lg font-medium">
              Informations de base
            </h2>

            <div className="rounded-[28px] bg-zinc-900 overflow-hidden">
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="Veuillez saisir un titre descriptif pour votre évaluation"
                className={`w-full bg-transparent px-5 py-5 border-b ${errors.title ? 'border-red-500' : 'border-zinc-800'} outline-none`}
              />
              {errors.title && <p className="text-red-500 text-sm mt-1">Ce champ est requis.</p>}

              <input
                name="zone"
                value={form.zone}
                onChange={handleChange}
                placeholder="Dans quelle zone constatez-vous un problème ?"
                className={`w-full bg-transparent px-5 py-5 border-b ${errors.zone ? 'border-red-500' : 'border-zinc-800'} outline-none`}
              />
              {errors.zone && <p className="text-red-500 text-sm mt-1">Ce champ est requis.</p>}

              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                className={`w-full bg-transparent px-5 py-5 outline-none text-gray-300 ${errors.type ? 'border-b border-red-500' : ''}`}
              >
                <option value="">
                  Quel type d'évaluation voulez-vous envoyer ?
                </option>

                <option>
                  Bug
                </option>

                <option>
                  Suggestion
                </option>

                <option>
                  Amélioration
                </option>
              </select>
              {errors.type && <p className="text-red-500 text-sm mt-1">Veuillez sélectionner un type.</p>}
            </div>
          </section>

          {/* DESCRIPTION */}

          <section>
            <h2 className="mb-3 text-lg font-medium">
              Description
            </h2>

            <textarea
              rows={8}
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Veuillez décrire le problème et les étapes à suivre pour le reproduire"
              className={`w-full rounded-[28px] bg-zinc-900 p-5 outline-none resize-none ${errors.description ? 'border-2 border-red-500' : ''}`}
            />
            {errors.description && <p className="text-red-500 text-sm mt-1">Ce champ est requis.</p>}
          </section>

          {/* PIECE JOINTE */}

          <section>
            <h2 className="mb-3 text-lg font-medium">
              Pièce jointe
            </h2>

              <label className="flex cursor-pointer items-center gap-3 rounded-[28px] bg-zinc-900 px-5 py-5 transition hover:bg-zinc-800">
                <PaperClipIcon className="h-5 w-5 text-blue-400" />

                <span className="text-blue-400 font-medium">
                  Ajouter une pièce jointe (png, jpg) — max 5
                </span>

                <input
                  type="file"
                  {...(IMGBB_API_KEY ? {} : { name: 'attachment' })}
                  className="hidden"
                  onChange={handleFile}
                  multiple
                  accept="image/png,image/jpeg"
                  disabled={(form.attachments || []).length >= 5}
                />
              </label>

              {(form.attachments || []).length > 0 && (
                <div className="mt-3 space-y-2">
                  {(form.attachments || []).map((att, i) => (
                    <div key={i} className="flex items-center gap-3 bg-zinc-900 p-3 rounded-lg">
                      {att.previewUrl ? (
                        <img src={att.previewUrl} alt={att.name} className="w-12 h-12 rounded object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded bg-zinc-800 flex items-center justify-center text-sm">F</div>
                      )}

                      <div className="flex-1">
                        <div className="font-medium">{att.name}</div>
                        {att.uploading ? (
                          <div className="text-sm text-gray-400">Téléversement...</div>
                        ) : att.url ? (
                          <a href={att.url} className="text-sm text-blue-400" target="_blank" rel="noreferrer">Ouvrir</a>
                        ) : (
                          <div className="text-sm text-gray-500">Prêt à être joint</div>
                        )}
                      </div>

                      <button type="button" onClick={() => removeAttachment(i)} className="text-gray-400 hover:text-white">
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
          </section>

          {/* SUBMIT */}

          <button
            type="submit"
            className={`
              w-full
              rounded-full
              py-4
              font-semibold
              text-white
              transition-all
              duration-300
              ${ (form.attachments || []).some(a=>a.uploading) ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-400 hover:shadow-lg hover:shadow-blue-500/20' }
            `}
            disabled={(form.attachments || []).some(a=>a.uploading)}
          >
            Envoyer
          </button>

          {status && (
            <p className="text-center text-gray-400">
              {status}
            </p>
          )}
        </form>
      </div>
    </main>
  );
}