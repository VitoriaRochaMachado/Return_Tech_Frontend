import { useEffect, useState } from "react";
import { api } from "../api";
import "./coding.css";

export default function CodingResults({ challenges }) {
  const available = challenges.filter((item) => item.coding_enabled);
  const [selected, setSelected] = useState(available[0]?._id || "");
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setLoading(true);
    api(`/challenges/${selected}/coding/results`).then(({ results, warning }) => {
      if (!cancelled) { setRows(results); setError(warning || ""); }
    }).catch((err) => { if (!cancelled) setError(err.message); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selected, refresh]);
  const challenge = available.find((item) => item._id === selected);
  if (!available.length) return <div className="empty-state"><strong>Nenhum desafio de código</strong><p>Crie uma demonstração ou configure a avaliação por código em um rascunho.</p></div>;
  return <section className="coding-results"><div className="code-toolbar"><label>Desafio<select value={selected} onChange={(event) => { setRows([]); setSelected(event.target.value); }}>{available.map((item) => <option key={item._id} value={item._id}>{item.title}</option>)}</select></label><button className="outline-button small" onClick={() => setRefresh((x) => x + 1)} disabled={loading}>ATUALIZAR RESULTADOS</button></div>
    <p className="code-hint">A pontuação automática mostra a melhor solução de cada candidato. A decisão de seleção continua na avaliação da empresa.</p>
    {error && <p className="form-error" role="alert">{error}</p>}
    {loading ? <p>Carregando resultados...</p> : !rows.length ? <div className="empty-state"><strong>Nenhum participante ainda</strong></div> : rows.map((row, index) => <article className="code-ranking-row" key={row.talent_id}><div className="code-ranking-heading"><div><span className="eyebrow">POSIÇÃO {index + 1}</span><h3>{row.name}</h3><small>{row.attempts} envio(s) para correção</small></div><strong>{row.score}<small> / {challenge?.coding_max_points || 100}</small></strong></div>
      {row.latest_job && <p>{row.latest_job.status === "processing" || row.latest_job.status === "creating" ? "Correção em andamento. Atualize em alguns instantes." : row.latest_job.status === "service_error" ? "Última tentativa sem nota por falha no executor." : `Última tentativa: ${row.latest_job.passed}/${row.latest_job.total} testes · ${row.latest_job.language}`}</p>}
      {row.source_code && <details><summary>Ver código da última tentativa</summary><pre>{row.source_code}</pre></details>}
    </article>)}
  </section>;
}
