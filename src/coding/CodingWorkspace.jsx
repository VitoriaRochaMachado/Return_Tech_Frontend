import { Component, lazy, Suspense, useEffect, useRef, useState } from "react";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import "./coding.css";

const CodeEditor = lazy(() => import("./CodeEditor"));
const pending = (job) => job && ["creating", "processing"].includes(job.status);

class EditorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export default function CodingWorkspace({ challenge, onClose, onUpdated }) {
  const { user } = useAuth();
  const [detail, setDetail] = useState(null);
  const [language, setLanguage] = useState("");
  const [source, setSource] = useState("");
  const [stdin, setStdin] = useState("");
  const [job, setJob] = useState(null);
  const [best, setBest] = useState(0);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [simple, setSimple] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const close = useRef(null);
  const draftKey = (key) => `return_tech_code_${user._id}_${challenge._id}_${key}`;
  const savedCode = (key, config) => {
    try { return sessionStorage.getItem(draftKey(key)) ?? config.starter_code[key] ?? ""; }
    catch { return config.starter_code[key] ?? ""; }
  };
  useEffect(() => {
    let cancelled = false;
    api(`/challenges/${challenge._id}/coding`).then((data) => {
      if (cancelled) return;
      setDetail(data);
      const first = data.config.languages[0];
      setLanguage(first);
      setSource(savedCode(first, data.config));
      setStdin(data.config.example.stdin);
      setJob(data.latest_job);
      setBest(data.best_score);
      setError(data.warning || "");
    }).catch((err) => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [challenge._id, refresh]);
  useEffect(() => {
    if (!language) return;
    try { sessionStorage.setItem(draftKey(language), source); } catch { /* Storage may be disabled. */ }
  }, [source, language]);
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    close.current?.focus();
    const keydown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        const dialog = document.querySelector(".coding-dialog");
        const items = [...dialog.querySelectorAll('button:not(:disabled), select, textarea, input, [tabindex="0"]')].filter((el) => el.offsetParent !== null);
        const first = items[0], last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", keydown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", keydown); previous?.focus(); };
  }, [onClose]);
  useEffect(() => {
    if (!pending(job)) return;
    let cancelled = false;
    let timer;
    const poll = async () => {
      try {
        const data = await api(`/code-jobs/${job._id}`);
        if (cancelled) return;
        setJob(data.job);
        setBest(data.best_score);
        setError("");
        if (!pending(data.job)) { onUpdated?.(); return; }
      } catch (err) { if (!cancelled) setError(`${err.message} A consulta será repetida automaticamente.`); }
      if (!cancelled) timer = setTimeout(poll, 2500);
    };
    timer = setTimeout(poll, 1200);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [job?._id, job?.status]);

  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown(false), 3000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function execute(mode) {
    setSending(true);
    setError("");
    try {
      const data = await api(`/challenges/${challenge._id}/code-jobs`, {
        method: "POST", body: JSON.stringify({ mode, language, source_code: source, stdin }),
      });
      setJob(data.job);
      setCooldown(true);
    } catch (err) {
      if (err.data?.job) setJob(err.data.job);
      setError(err.message);
    } finally { setSending(false); }
  }
  const fallback = <textarea className="code-fallback" aria-label="Editor de código" spellCheck="false" value={source} onChange={(event) => setSource(event.target.value)} />;
  const busy = Boolean(sending || pending(job));
  const disabled = busy || cooldown || !detail?.can_submit || !detail?.runner_configured || !source.trim();
  return <div className="coding-backdrop"><section className="coding-dialog" role="dialog" aria-modal="true" aria-labelledby="coding-title">
    <header className="coding-header"><div><div className="eyebrow">DESAFIO DE CÓDIGO</div><h2 id="coding-title">{challenge.title}</h2></div><button ref={close} className="outline-button small" onClick={onClose}>FECHAR ×</button></header>
    {!detail ? <div className="coding-loading">{error ? <><p role="alert">{error}</p><button className="outline-button" onClick={() => setRefresh((x) => x + 1)}>TENTAR NOVAMENTE</button></> : "Carregando editor..."}</div> : <>
      <div className="coding-body"><aside className="coding-instructions">
        <span className="code-points">{detail.config.max_points} PONTOS</span>
        <h3>O desafio</h3><p className="preserve-lines">{challenge.description}</p>
        <h3>O que entregar</h3><p className="preserve-lines">{challenge.deliverables}</p>
        <h3>Exemplo de entrada</h3><pre>{detail.config.example.stdin || "(entrada vazia)"}</pre>
        <h3>Saída esperada</h3><pre>{detail.config.example.expected_output || "(saída vazia)"}</pre>
        <div className="code-score"><span>Sua melhor pontuação</span><strong>{best}<small> / {detail.config.max_points}</small></strong></div>
        <p className="code-hint">Todos os testes precisam passar para conquistar os pontos. Reenvios não somam pontos repetidos. Limite de {detail.config.cpu_time_limit}s de CPU por teste.</p>
      </aside><div className="coding-main">
        <div className="code-toolbar"><label>Linguagem<select value={language} onChange={(event) => { const key = event.target.value; setSource(savedCode(key, detail.config)); setLanguage(key); }}>{detail.language_options.map((item) => <option key={item.key} value={item.key}>{item.name}</option>)}</select></label><button className="text-button" onClick={() => setSimple(!simple)}>{simple ? "Usar editor completo" : "Usar editor simples"}</button></div>
        {simple ? fallback : <EditorBoundary fallback={fallback}><Suspense fallback={<div className="code-editor">Carregando editor...</div>}><CodeEditor value={source} language={detail.language_options.find((x) => x.key === language)?.editor} onChange={setSource} /></Suspense></EditorBoundary>}
        <div className="code-console"><label>Entrada para experimentar<textarea aria-label="Entrada para experimentar" value={stdin} onChange={(event) => setStdin(event.target.value)} rows="3" spellCheck="false" /></label>
          <div className="code-actions"><button className="outline-button small" disabled={disabled} aria-busy={busy} aria-describedby={!detail.runner_configured ? "coding-executor-warning" : undefined} onClick={() => execute("run")}>{sending ? "ENVIANDO..." : "EXECUTAR"}</button><button className="primary-button small" disabled={disabled} aria-busy={busy} aria-describedby={!detail.runner_configured ? "coding-executor-warning" : undefined} onClick={() => execute("submit")}>ENVIAR SOLUÇÃO →</button></div>
          {!detail.runner_configured && <p id="coding-executor-warning" className="form-error" role="alert">A execução está indisponível: o serviço de correção ainda não foi configurado pela equipe. Você pode continuar editando seu rascunho.</p>}
          {!detail.can_submit && <p className="form-error">O período de envio terminou. Você pode consultar seus resultados.</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="code-result" aria-live="polite">
            {!job && <p>Execute para testar uma entrada. Envie a solução para receber a correção.</p>}
            {pending(job) && <p className="code-running">{job.mode === "submit" ? "Corrigindo sua solução..." : "Executando seu código..."} Você pode fechar o editor e voltar depois.</p>}
            {job?.status === "service_error" && <p className="form-error">{job.error}</p>}
            {job?.status === "completed" && <>
              <h3>{job.mode === "submit" ? `${job.score} / ${job.max_points} pontos · ${job.passed} de ${job.total} testes passaram` : job.results?.[0]?.passed ? "Execução concluída" : job.results?.[0]?.status}</h3>
              {job.mode === "run" && <>{job.output?.stdout && <><h4>Saída</h4><pre>{job.output.stdout}</pre></>}{(job.output?.stderr || job.output?.compile_output) && <><h4>Detalhes da execução</h4><pre>{job.output.compile_output || job.output.stderr}</pre></>}{!job.output?.stdout && !job.output?.stderr && !job.output?.compile_output && <p>O programa não produziu saída.</p>}</>}
              {job.mode === "submit" && <ul className="code-test-list">{job.results.map((item) => <li key={item.number} className={item.passed ? "passed" : "failed"}><span>{item.passed ? "✓" : "×"} Teste {item.number}</span><span>{item.status}</span></li>)}</ul>}
            </>}
          </div>
        </div>
      </div></div>
    </>}
  </section></div>;
}
