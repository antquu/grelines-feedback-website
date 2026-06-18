import { useState, useRef, useEffect } from "react";
import { sendEmailAPI } from '../sendEmailClient';
import { ArrowLeftIcon, PaperClipIcon } from "@heroicons/react/24/outline";

export default function GreGoApp() {
  const formRef = useRef();

  const DRIVE_UPLOAD_URL = import.meta.env.VITE_DRIVE_UPLOAD_URL || "";
  const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY || "";
  const IMGBB_EXPIRATION = 14 * 24 * 60 * 60;

  const [form, setForm] = useState({ title: "", zone: "", type: "", description: "", contact_email: "", attachments: [] });
  const [status, setStatus] = useState("");
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
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
        file, name: file.name,
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
        url: '', uploading: !!DRIVE_UPLOAD_URL,
      }));
      return { ...prev, attachments: [...existing, ...toAdd] };
    });
    if (IMGBB_API_KEY || DRIVE_UPLOAD_URL) {
      files.slice(0, 5).forEach(async (file) => {
        try {
          setStatus(`Téléversement ${file.name} ...`);
          if (IMGBB_API_KEY) {
            const fd = new FormData();
            fd.append('image', file); fd.append('name', file.name);
            const url = `https://api.imgbb.com/1/upload?expiration=${IMGBB_EXPIRATION}&key=${IMGBB_API_KEY}`;
            const resp = await fetch(url, { method: 'POST', body: fd });
            if (!resp.ok) throw new Error('Imgbb upload failed');
            const json = await resp.json();
            const fileUrl = json?.data?.url || json?.data?.display_url || '';
            setForm((prev) => ({ ...prev, attachments: prev.attachments.map((a) => a.name === file.name ? { ...a, url: fileUrl, uploading: false } : a) }));
            setStatus('');
          } else {
            const reader = new FileReader();
            const payload = await new Promise((resolve, reject) => {
              reader.onload = () => {
                const dataUrl = reader.result;
                const match = dataUrl.match(/^data:(.*);base64,(.*)$/);
                resolve({ filename: file.name, mimeType: match?.[1] || file.type, contentBase64: match?.[2] || '' });
              };
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
            const resp = await fetch(DRIVE_UPLOAD_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!resp.ok) throw new Error('Upload failed');
            const json = await resp.json();
            setForm((prev) => ({ ...prev, attachments: prev.attachments.map((a) => a.name === file.name ? { ...a, url: json.fileUrl || '', uploading: false } : a) }));
            setStatus('');
          }
        } catch (err) {
          setForm((prev) => ({ ...prev, attachments: prev.attachments.map((a) => a.name === file.name ? { ...a, url: '', uploading: false } : a) }));
          setStatus('Erreur lors du téléversement de certains fichiers.');
        }
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!form.title?.trim()) newErrors.title = true;
    if (!form.zone?.trim()) newErrors.zone = true;
    if (!form.type?.trim()) newErrors.type = true;
    if (!form.description?.trim()) newErrors.description = true;
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); setStatus("Veuillez remplir les champs obligatoires."); return; }
    if ((form.attachments || []).some((a) => a.uploading)) { setStatus("Veuillez attendre la fin des téléversements."); return; }
    setStatus("Envoi en cours...");
    try {
      const toEmailInput = formRef.current?.querySelector('input[name="to_email"]')?.value || '';
      const subjectInput = formRef.current?.querySelector('input[name="subject"]')?.value || '';
      const payload = {
        to_email: toEmailInput,
        subject: subjectInput,
        title: form.title,
        zone: form.zone,
        type: form.type,
        description: form.description,
        contact_email: form.contact_email || '',
        attachment_name: (form.attachments || []).map(a => a.name).join(', '),
        attachment_url: (form.attachments || []).map(a => a.url).filter(Boolean)[0] || '',
        created_at: new Date().toISOString(),
        from_name: '',
        from_email: form.contact_email || ''
      };
      await sendEmailAPI(payload);
      setStatus('Feedback envoyé.');
      window.location.href = '/grego/validation';
    } catch (err) {
      setStatus(err.message || "Erreur lors de l'envoi.");
    }
  };

  const removeAttachment = (index) => {
    setForm((prev) => {
      const next = [...(prev.attachments || [])];
      const [removed] = next.splice(index, 1);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return { ...prev, attachments: next };
    });
  };

  const isValidation = typeof window !== 'undefined' && window.location.pathname === '/grego/validation';

  useEffect(() => {
    if (!isValidation) return;
    const t = setTimeout(() => { window.location.href = 'https://gre-go.vercel.app/'; }, 5000);
    return () => clearTimeout(t);
  }, [isValidation]);

  if (isValidation) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-white">
        <div className="bg-[#111] border-b border-[#222]">
          <a href="/" onClick={(e) => { e.preventDefault(); window.location.href = '/'; }} className="px-6 py-2.5 flex items-center gap-2 text-sm text-[#aaa] hover:text-white transition-colors relative z-20 cursor-pointer">
            <ArrowLeftIcon className="h-4 w-4" />
            <span>Retour à l'accueil</span>
          </a>
        </div>
        <div className="max-w-2xl px-6 py-10">
          <header className="mb-10">
            <div className="flex items-baseline gap-3 flex-wrap">
              <h1 className="text-[38px] font-medium tracking-tight leading-none">GreGo</h1>
              <span className="text-[#555] text-sm">User feedback</span>
            </div>
            <p className="mt-1.5 text-xs text-[#444]">V2.0</p>
          </header>
          <div className="rounded-[20px] bg-[#141414] border border-[#222] p-8 text-center">
            <h2 className="text-xl font-medium">Évaluation enregistrée</h2>
            <p className="mt-3 text-sm text-[#555]">Merci — votre feedback a été envoyé et enregistré.</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="bg-[#111] border-b border-[#222] relative z-10">
        <a href="https://gre-go.vercel.app/" className="px-6 py-2.5 flex items-center gap-2 text-sm text-[#aaa] hover:text-white transition-colors relative z-20 cursor-pointer">
          <ArrowLeftIcon className="h-4 w-4" />
          <span>Retour vers</span>
          <img src="/assets/GreGoLOGO.png" alt="GreGo" className="h-4 ml-1" />
        </a>
      </div>

      <div className="max-w-2xl px-6 py-9 pb-16">
        <header className="mb-9">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h1 className="text-[38px] font-medium tracking-tight leading-none">GreGo</h1>
            <span className="text-[#555] text-sm">User feedback</span>
          </div>
          <p className="mt-1.5 text-xs text-[#444]">V2.0</p>
        </header>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-7" autoComplete="off">
          <input type="hidden" name="subject" value="GreGo Website" />
          <input type="hidden" name="to_email" value="ant.adam468@gmail.com" />
          <input type="hidden" name="attachment_name" value={(form.attachments || []).map(a => a.name).join(', ')} />
          <input type="hidden" name="attachment_url" value={(form.attachments || []).map(a => a.url).filter(Boolean).join('\n')} />

          <section>
            <p className="mb-2.5 text-[11px] font-medium text-[#555] uppercase tracking-widest">Sujet</p>
            <div className="rounded-[20px] bg-[#141414] border border-[#222] px-5 py-4">
              <p className="text-[15px] font-medium text-white">GreGo Website</p>
              <p className="mt-1 text-xs text-[#555]">Fonctionnalités globales et fonctionnement du site</p>
            </div>
          </section>

          <section>
            <p className="mb-2.5 text-[11px] font-medium text-[#555] uppercase tracking-widest">Informations de base</p>
            <div className="rounded-[20px] bg-[#141414] border border-[#222] overflow-hidden">
              <div className={errors.title ? 'border-b border-red-900' : 'border-b border-[#1e1e1e]'}>
                <input name="title" value={form.title} onChange={handleChange} placeholder="Titre descriptif de votre évaluation" className="w-full bg-transparent px-5 py-4 outline-none text-sm text-white placeholder-[#444]" autoComplete="off" />
                {errors.title && <p className="text-red-500 text-xs px-5 pb-3">Ce champ est requis.</p>}
              </div>
              <div className={errors.zone ? 'border-b border-red-900' : 'border-b border-[#1e1e1e]'}>
                <input name="zone" value={form.zone} onChange={handleChange} placeholder="Zone concernée par le problème" className="w-full bg-transparent px-5 py-4 outline-none text-sm text-white placeholder-[#444]" autoComplete="off" />
                {errors.zone && <p className="text-red-500 text-xs px-5 pb-3">Ce champ est requis.</p>}
              </div>
              <div className="relative">
                <select name="type" value={form.type} onChange={handleChange} className={`w-full bg-transparent px-5 py-4 outline-none text-sm appearance-none cursor-pointer ${form.type ? 'text-white' : 'text-[#444]'}`} autoComplete="off">
                  <option value="">Type d'évaluation</option>
                  <option value="Bug">Bug</option>
                  <option value="Suggestion">Suggestion</option>
                  <option value="Amélioration">Amélioration</option>
                </select>
                <svg className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#333]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                </svg>
                {errors.type && <p className="text-red-500 text-xs px-5 pb-3">Veuillez sélectionner un type.</p>}
              </div>
            </div>
          </section>

          <section>
            <p className="mb-2.5 text-[11px] font-medium text-[#555] uppercase tracking-widest">Description</p>
            <div className={`rounded-[20px] bg-[#141414] border overflow-hidden ${errors.description ? 'border-red-900' : 'border-[#222]'}`}>
              <textarea rows={7} name="description" value={form.description} onChange={handleChange} placeholder="Décrivez le problème et les étapes pour le reproduire" className="w-full bg-transparent px-5 py-4 outline-none resize-none text-sm text-white placeholder-[#444] leading-relaxed" autoComplete="off" />
              {errors.description && <p className="text-red-500 text-xs px-5 pb-3">Ce champ est requis.</p>}
            </div>
          </section>

          <section>
            <p className="mb-2.5 text-[11px] font-medium text-[#555] uppercase tracking-widest">Pièce jointe</p>
            <div className="mb-3">
              <input
                name="contact_email"
                value={form.contact_email}
                onChange={handleChange}
                placeholder="Votre adresse e-mail de contact (optionnel)"
                className="w-full bg-[#141414] border border-[#222] rounded-[12px] px-4 py-3 text-sm text-white placeholder-[#666] outline-none"
                autoComplete="off"
              />
            </div>
            <label className={`flex items-center gap-3 rounded-[20px] bg-[#141414] border border-[#222] px-5 py-4 transition hover:bg-[#191919] ${(form.attachments || []).length >= 5 ? 'opacity-40 pointer-events-none' : 'cursor-pointer'}`}>
              <PaperClipIcon className="h-5 w-5 text-blue-500 flex-shrink-0" />
              <span className="text-sm font-medium text-blue-500">Ajouter une pièce jointe</span>
              <span className="ml-auto text-xs text-[#444]">png, jpg — max 5</span>
              <input type="file" {...(IMGBB_API_KEY ? {} : { name: 'attachment' })} className="hidden" onChange={handleFile} multiple accept="image/png,image/jpeg" disabled={(form.attachments || []).length >= 5} />
            </label>
            {(form.attachments || []).length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {(form.attachments || []).map((att, i) => (
                  <div key={i} className="relative aspect-square rounded-[14px] bg-[#141414] border border-[#222] overflow-hidden flex items-center justify-center">
                    {att.previewUrl ? <img src={att.previewUrl} alt={att.name} className="w-full h-full object-cover" /> : <span className="text-2xl text-[#444]">F</span>}
                    {att.uploading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><span className="text-xs text-white">...</span></div>}
                    <button type="button" onClick={() => removeAttachment(i)} className="absolute top-1.5 right-1.5 w-5 h-5 bg-[#222] rounded-full flex items-center justify-center text-[#aaa] hover:text-white text-xs">✕</button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <button type="submit" disabled={(form.attachments || []).some(a => a.uploading)} className={`w-full rounded-full py-4 text-sm font-medium text-white transition-all ${(form.attachments || []).some(a => a.uploading) ? 'bg-[#333] cursor-not-allowed opacity-50' : 'bg-blue-600 hover:bg-blue-500'}`}>
            Envoyer l'évaluation
          </button>
          {status && <p className="text-center text-xs text-[#555]">{status}</p>}
        </form>
      </div>
    </main>
  );
}