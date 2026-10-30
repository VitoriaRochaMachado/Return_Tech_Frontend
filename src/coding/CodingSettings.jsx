import { useEffect, useState } from "react";
import { api } from "../api";
import "./coding.css";

const empty = {
  languages: ["python"], max_points: 100, cpu_time_limit: 2, memory_limit_kb: 128000,
  example: { stdin: "", expected_output: "" }, starter_code: { python: "" },
  tests: [{ stdin: "", expected_output: "" }],
};

export default function CodingSettings({ challenge, onClose, onSaved }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let active = true;
    api(`/challenges/${challenge._id}/coding/config`).then(({ config }) => {
      if (active) setText(JSON.stringify(config || empty, null, 2));
    }).catch((err) => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [challenge._id]);
  async function save(event) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      let config;
      try { config = JSON.parse(text); } catch { throw new Error("O JSON não é válido. Confira aspas, vírgulas e quebras de linha."); }
      await api(`/challenges/${challenge._id}/coding/config`, { method: "PUT", body: JSON.stringify(config) });
      onSaved(); onClose();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }
  return <div className="modal-backdrop"><section className="modal coding-settings" role="dialog" aria-modal="true" aria-labelledby="coding-settings-title">
    <button className="modal-close" onClick={onClose} aria-label="Fechar configuração">×</button>
    <div className="eyebrow">AVALIAÇÃO AUTOMÁTICA</div><h2 id="coding-settings-title">{challenge.title}</h2>
    <p>Cadastre o exemplo público, as linguagens e os testes privados. Os pontos são concedidos quando todos os testes passam.</p>
    <p className="code-hint">Linguagens: python, javascript, cpp. O campo example aparece para o candidato; tests fica restrito à empresa. A configuração fica bloqueada após a publicação.</p>
    <form onSubmit={save}><label>Configuração dos testes (JSON)<textarea className="config-json" aria-label="Configuração dos testes" value={text} onChange={(event) => setText(event.target.value)} rows="18" spellCheck="false" required /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-button" disabled={saving || !text}>{saving ? "SALVANDO..." : "SALVAR AVALIAÇÃO POR CÓDIGO"}</button>
    </form>
  </section></div>;
}
