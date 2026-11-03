import { useEffect, useState } from "react";
import { api } from "../api";
import "./coding.css";

const empty = {
  languages: ["python"], max_points: 100, cpu_time_limit: 2, memory_limit_kb: 128000,
  example: { stdin: "", expected_output: "" }, starter_code: { python: "" },
  tests: [{ stdin: "", expected_output: "" }],
};

export default function CodingSettings({ challenge, onClose, onSaved, readOnly = false }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editable, setEditable] = useState(false);
  const [lockReason, setLockReason] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api(`/challenges/${challenge._id}/coding/config`).then(({ config, editable: canEdit, lock_reason }) => {
      if (active) {
        setText(JSON.stringify(config || empty, null, 2));
        setEditable(canEdit === true);
        setLockReason(lock_reason || "");
      }
    }).catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [challenge._id]);
  async function save(event) {
    event.preventDefault();
    if (readOnly || !editable || loading) return;
    setSaving(true); setError("");
    try {
      let config;
      try { config = JSON.parse(text); } catch { throw new Error("O JSON não é válido. Confira aspas, vírgulas e quebras de linha."); }
      await api(`/challenges/${challenge._id}/coding/config`, { method: "PUT", body: JSON.stringify(config) });
      await onSaved?.(); onClose();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }
  const canEdit = editable && !readOnly;
  return <div className="modal-backdrop"><section className="modal coding-settings" role="dialog" aria-modal="true" aria-labelledby="coding-settings-title" onKeyDown={(event) => { if (event.key === "Escape") onClose(); }}>
    <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar configuração">×</button>
    <div className="eyebrow">AVALIAÇÃO AUTOMÁTICA</div><h2 id="coding-settings-title">{challenge.title}</h2>
    <p>Cadastre o exemplo público, as linguagens e os casos privados de avaliação. A pontuação é proporcional aos acertos, com o mesmo peso para cada caso.</p>
    <p className="code-hint">Linguagens: python, javascript, cpp. O campo example aparece para o candidato; tests fica restrito à empresa responsável e à administração. A configuração só pode ser alterada em rascunho, antes de receber tentativas.</p>
    {loading ? <p role="status">Carregando configuração...</p> : <form onSubmit={save}>
      {!canEdit && <p className="review-note">{lockReason || "Consulta da avaliação por código. Os casos privados estão disponíveis para revisão, sem alteração."}</p>}
      <label>Configuração dos testes (JSON)<textarea className="config-json" aria-label="Configuração dos testes" value={text} onChange={(event) => setText(event.target.value)} rows="18" spellCheck="false" readOnly={!canEdit} required /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      {canEdit && <button className="primary-button" disabled={saving || !text}>{saving ? "SALVANDO..." : "SALVAR AVALIAÇÃO POR CÓDIGO"}</button>}
    </form>}
    {loading && error && <p className="form-error" role="alert">{error}</p>}
  </section></div>;
}
