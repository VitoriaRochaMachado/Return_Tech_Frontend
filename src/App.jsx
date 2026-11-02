import { useCallback, useEffect, useMemo, useState } from "react";
import { api, downloadSubmission } from "./api";
import { useAuth } from "./AuthContext";
import {
  demoStorageKey,
  getDemoChallenges,
  getDemoSubmissions,
  isDemoChallenge,
  loadDemoState,
  saveDemoState,
} from "./demoChallenges";

const icons = {
  student: "⌁",
  company: "◇",
  shield: "⬡",
  arrow: "→",
  check: "✓",
};

function routeFromHash() {
  return window.location.hash.replace(/^#/, "") || "/";
}

function useHashRoute() {
  const [route, setRoute] = useState(routeFromHash);
  useEffect(() => {
    const update = () => setRoute(routeFromHash());
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  return route;
}

function go(path) {
  window.location.hash = `#${path}`;
}

function homeForRole(role) {
  return role === "admin" ? "/admin" : role === "company" ? "/empresas" : "/talentos";
}

function challengePath(id) {
  return `/desafios/${encodeURIComponent(id)}`;
}

function Brand({ compact = false }) {
  return (
    <button className="brand" onClick={() => go("/")} aria-label="Ir para o início">
      <span className="brand-mark">R</span>
      {!compact && <span>RETURN<span className="lime">_TECH</span></span>}
    </button>
  );
}

function Landing() {
  return (
    <main className="landing">
      <header className="public-header">
        <Brand />
        <button className="text-button" onClick={() => go("/login")}>Já tenho uma conta <span>→</span></button>
      </header>

      <section className="hero">
        <div className="eyebrow"><span className="pulse" /> ECOSSISTEMA DE CIBERSEGURANÇA</div>
        <h1>Onde desafios reais<br />revelam <span>talentos reais.</span></h1>
        <p>Conectamos estudantes e profissionais a empresas por meio de processos seletivos práticos em cibersegurança.</p>
        <div className="terminal-line"><span>&gt;</span> escolha como entrar na plataforma<span className="cursor">_</span></div>
      </section>

      <section className="choice-grid" aria-label="Escolha o seu perfil">
        <button className="choice-card talent" onClick={() => go("/cadastro/talent")}>
          <span className="card-number">01</span>
          <span className="choice-icon">{icons.student}</span>
          <span className="choice-copy">
            <strong>Estudante / Profissional</strong>
            <small>Encare desafios, demonstre suas habilidades e construa um portfólio validado.</small>
          </span>
          <span className="choice-link">QUERO PARTICIPAR {icons.arrow}</span>
        </button>
        <button className="choice-card company" onClick={() => go("/cadastro/company")}>
          <span className="card-number">02</span>
          <span className="choice-icon">{icons.company}</span>
          <span className="choice-copy">
            <strong>Empresa</strong>
            <small>Crie processos seletivos por desafios e encontre profissionais de cibersegurança.</small>
          </span>
          <span className="choice-link">SOU UMA EMPRESA {icons.arrow}</span>
        </button>
      </section>

      <footer className="public-footer"><span>© 2026 RETURN_TECH</span><a href="#/admin">ADMINISTRAÇÃO</a><span>CONEXÕES BASEADAS EM COMPETÊNCIA</span></footer>
    </main>
  );
}

function AuthPage({ mode, role, returnTo }) {
  const { authenticate } = useAuth();
  const isLogin = mode === "login";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [talentType, setTalentType] = useState("student");

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    if (!isLogin) {
      fields.role = role;
      fields.skills = fields.skills ? fields.skills.split(",").map((item) => item.trim()).filter(Boolean) : [];
      if (role === "talent") fields.talent_type = talentType;
    }
    try {
      const data = await api(isLogin ? "/auth/login" : "/auth/register", {
        method: "POST",
        body: JSON.stringify(fields),
      });
      authenticate(data);
      go(returnTo?.startsWith("/desafios/") ? returnTo : homeForRole(data.user.role));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={`auth-page ${role === "company" ? "company-theme" : ""}`}>
      <header className="public-header"><Brand /><button className="text-button" onClick={() => go("/")}>← Voltar</button></header>
      <section className="auth-shell">
        <div className="auth-intro">
          <div className="eyebrow">{isLogin ? role === "admin" ? "ADMINISTRAÇÃO RETURN TECH" : "ACESSO SEGURO" : role === "company" ? "ÁREA DA EMPRESA" : "ÁREA DE TALENTOS"}</div>
          <h1>{isLogin ? "Bem-vindo de volta." : role === "company" ? "Encontre quem sabe fazer." : "Mostre do que você é capaz."}</h1>
          <p>{isLogin ? role === "admin" ? "Acesso exclusivo à equipe responsável pela administração dos CTFs." : "Entre para continuar de onde parou." : role === "company" ? "Publique desafios técnicos, avalie entregas e forme sua shortlist." : "Participe de desafios reais e transforme competência em oportunidade."}</p>
        </div>
        <form className="auth-card" onSubmit={submit}>
          <div className="form-heading"><span>{isLogin ? "LOGIN" : "CRIAR CONTA"}</span><i /></div>
          {!isLogin && <>
            <label>Nome completo<input name="name" required placeholder="Seu nome" /></label>
            {role === "company" && <label>Empresa<input name="organization_name" required placeholder="Nome da organização" /></label>}
            {role === "talent" && <div className="segmented">
              <button type="button" className={talentType === "student" ? "active" : ""} onClick={() => setTalentType("student")}>Estudante</button>
              <button type="button" className={talentType === "professional" ? "active" : ""} onClick={() => setTalentType("professional")}>Profissional</button>
            </div>}
          </>}
          <label>E-mail<input type="email" name="email" required placeholder="voce@email.com" /></label>
          <label>Senha<input type="password" name="password" required minLength="8" placeholder="Mínimo de 8 caracteres" /></label>
          {!isLogin && <>
            <label>{role === "company" ? "Cargo" : "Título profissional"}<input name="headline" placeholder={role === "company" ? "Ex.: Tech Recruiter" : "Ex.: Analista de Segurança"} /></label>
            <label>Cidade<input name="city" placeholder="São Paulo, SP" /></label>
            {role === "talent" && <label>Competências<input name="skills" placeholder="SOC, Python, Cloud, LGPD" /></label>}
          </>}
          {error && <div className="form-error">{error}</div>}
          <button className="primary-button" disabled={loading}>{loading ? "PROCESSANDO..." : isLogin ? "ENTRAR NA PLATAFORMA" : "CRIAR MINHA CONTA"} <span>→</span></button>
          {role !== "admin" && <p className="auth-switch">{isLogin ? "Ainda não tem conta?" : "Já tem uma conta?"} <button type="button" onClick={() => go(isLogin ? "/" : "/login")}>{isLogin ? "Escolher perfil" : "Fazer login"}</button></p>}
        </form>
      </section>
    </main>
  );
}

function EmptyState({ title, text }) {
  return <div className="empty-state"><span>{icons.shield}</span><strong>{title}</strong><p>{text}</p></div>;
}

function Status({ value }) {
  const labels = { draft: "Rascunho", published: "Publicado", closed: "Encerrado", joined: "Inscrito", submitted: "Entregue", shortlisted: "Shortlist", rejected: "Não selecionado" };
  return <span className={`status status-${value}`}>{labels[value] || value}</span>;
}

function Toast({ message, kind = "success", onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3800);
    return () => clearTimeout(timer);
  }, [onClose]);
  return <div className={`toast ${kind}`}>{message}<button onClick={onClose}>×</button></div>;
}

function DashboardLayout({ role, active, setActive, children }) {
  const { user, logout } = useAuth();
  const talentItems = [["explore", "Explorar"], ["participations", "Participações"], ["portfolio", "Portfólio"], ["profile", "Perfil"]];
  const companyItems = [["overview", "Visão geral"], ["publish", "Publicar desafio"], ["evaluations", "Avaliações"], ["shortlist", "Shortlist"], ["profile", "Empresa"]];
  const adminItems = [["challenges", "Administrar CTFs"]];
  const items = role === "admin" ? adminItems : role === "company" ? companyItems : talentItems;
  return (
    <div className={`dashboard ${role === "company" ? "company-theme" : ""}`}>
      <aside className="sidebar">
        <Brand />
        <nav>{items.map(([key, label]) => <button key={key} className={active === key ? "active" : ""} onClick={() => setActive(key)}><span>0{items.findIndex((x) => x[0] === key) + 1}</span>{label}</button>)}</nav>
        <div className="sidebar-user"><div className="avatar">{(user?.name || "U").slice(0, 2).toUpperCase()}</div><div><strong>{user?.name}</strong><small>{role === "admin" ? "Administração Return Tech" : role === "company" ? user?.organization_name : user?.headline || "Talento"}</small></div></div>
        <button className="logout" onClick={logout}>Sair da conta →</button>
      </aside>
      <section className="dashboard-main">{children}</section>
    </div>
  );
}

function PageHeader({ eyebrow, title, description, action }) {
  return <header className="page-header"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</header>;
}

function Metric({ number, label, detail }) {
  return <article className="metric"><span>{label}</span><strong>{number}</strong><small>{detail}</small></article>;
}

function ChallengeCard({ challenge, role, onJoin, onSubmit, onAction }) {
  return (
    <article className="challenge-card">
      <div className="challenge-top"><Status value={challenge.status} /><span>{challenge.level || "Intermediário"}</span></div>
      <h3>{challenge.title}</h3>
      {challenge.company_name && <p className="challenge-company">{challenge.company_name}</p>}
      <p>{challenge.description}</p>
      <div className="tag-row">{(challenge.skills || []).map((skill) => <span key={skill}>{skill}</span>)}</div>
      <dl>
        <div><dt>Prazo</dt><dd>{challenge.deadline ? new Date(`${challenge.deadline.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "A definir"}</dd></div>
        <div><dt>Formato</dt><dd>{challenge.work_mode || "Remoto"}</dd></div>
        <div><dt>Participantes</dt><dd>{challenge.participant_count ?? 0}</dd></div>
      </dl>
      <div className="card-actions">
        <a className="outline-button small" href={`#${challengePath(challenge._id)}`}>VER DESAFIO →</a>
        {role === "talent" && challenge.status === "published" && !challenge.participation && <button className="primary-button small" onClick={() => onJoin(challenge._id)}>PARTICIPAR →</button>}
        {role === "talent" && challenge.status === "published" && ["joined", "submitted"].includes(challenge.participation?.status) && <button className="primary-button small" onClick={() => onSubmit(challenge)}>ENVIAR SOLUÇÃO →</button>}
        {role === "talent" && challenge.participation && <Status value={challenge.participation.status} />}
        {["company", "admin"].includes(role) && challenge.status === "draft" && <button className="primary-button small" onClick={() => onAction(challenge._id, "publish")}>PUBLICAR →</button>}
        {["company", "admin"].includes(role) && challenge.status === "published" && <button className="outline-button small" onClick={() => onAction(challenge._id, "close")}>ENCERRAR</button>}
      </div>
    </article>
  );
}

function SubmissionModal({ challenge, onClose, onDone, onDemoSubmit }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (isDemoChallenge(challenge._id)) {
        await onDemoSubmit(challenge, new FormData(event.currentTarget));
      } else {
        await api(`/challenges/${challenge._id}/submissions`, { method: "POST", body: new FormData(event.currentTarget) });
      }
      onDone("Solução enviada com sucesso.", isDemoChallenge(challenge._id));
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={(e) => e.stopPropagation()}><button className="modal-close" onClick={onClose}>×</button><div className="eyebrow">NOVA ENTREGA</div><h2>{challenge.title}</h2><p><a className="inline-link" href={`#${challengePath(challenge._id)}`} onClick={onClose}>Ver o enunciado completo do desafio →</a></p>{isDemoChallenge(challenge._id) && <p>Desafio demonstrativo: resumo e link ficam salvos somente neste navegador.</p>}<form onSubmit={submit}><label>Resumo da solução<textarea name="summary" required rows="5" placeholder="Explique sua abordagem, decisões e resultados..." /></label><label>Link complementar<input type="url" name="report_url" placeholder="https://github.com/..." /></label>{!isDemoChallenge(challenge._id) && <label>Arquivo do relatório<input type="file" name="file" /></label>}{error && <div className="form-error">{error}</div>}<button className="primary-button" disabled={loading}>{loading ? "ENVIANDO..." : "ENVIAR SOLUÇÃO →"}</button></form></div></div>;
}

function TalentDashboard({ initialActive = "explore" }) {
  const { user } = useAuth();
  const [active, setActive] = useState(initialActive);
  useEffect(() => { setActive(initialActive); }, [initialActive]);
  const [data, setData] = useState({ challenges: [], submissions: [], profile: {} });
  const [demoState, setDemoState] = useState({});
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const storageKey = demoStorageKey(user);

  useEffect(() => {
    try {
      setDemoState(loadDemoState(storageKey));
    } catch (err) {
      setToast({ message: err.message, kind: "error" });
    }
  }, [storageKey]);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await api("/dashboard")); }
    catch (err) { setToast({ message: err.message, kind: "error" }); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function join(id) {
    if (isDemoChallenge(id)) {
      try {
        const nextState = { ...demoState, [id]: { ...demoState[id], participation: { status: "joined" } } };
        saveDemoState(storageKey, nextState);
        setDemoState(nextState);
        setToast({ message: "Inscrição demonstrativa confirmada neste navegador." });
      } catch (err) {
        setToast({ message: err.message, kind: "error" });
      }
      return;
    }
    try { await api(`/challenges/${id}/join`, { method: "POST" }); setToast({ message: "Inscrição confirmada!" }); await load(); }
    catch (err) { setToast({ message: err.message, kind: "error" }); }
  }

  const demoChallenges = useMemo(() => getDemoChallenges(demoState), [demoState]);
  const demoSubmissions = useMemo(() => getDemoSubmissions(demoState), [demoState]);
  const allChallenges = useMemo(() => [...data.challenges, ...demoChallenges], [data.challenges, demoChallenges]);
  const openChallenges = useMemo(() => allChallenges.filter((item) => item.status === "published"), [allChallenges]);
  const participations = useMemo(() => allChallenges.filter((item) => item.participation), [allChallenges]);
  const approved = useMemo(() => data.submissions.filter((item) => item.evaluation?.decision === "shortlisted"), [data]);

  function submitDemoSolution(challenge, formData) {
    const summary = String(formData.get("summary") || "").trim();
    if (!summary) throw new Error("Informe o resumo da solução.");
    const nextState = {
      ...demoState,
      [challenge._id]: {
        ...demoState[challenge._id],
        participation: { status: "submitted" },
        submission: {
          summary,
          report_url: String(formData.get("report_url") || "").trim(),
        },
      },
    };
    saveDemoState(storageKey, nextState);
    setDemoState(nextState);
  }

  return <DashboardLayout role="talent" active={active} setActive={setActive}>
    {loading && <div className="loader">CARREGANDO DADOS<span>_</span></div>}
    {!loading && active === "explore" && <>
      <PageHeader eyebrow="OPORTUNIDADES ABERTAS" title="Desafios para provar na prática." description="Escolha um processo seletivo e mostre como você resolve problemas reais." />
      <p>Os exemplos fictícios continuam disponíveis. Neles, inscrições, resumos e links ficam salvos somente neste navegador.</p>
      <div className="metrics"><Metric number={openChallenges.length} label="Desafios abertos" detail="Agora" /><Metric number={participations.length} label="Participações" detail="No total" /><Metric number={approved.length} label="Shortlists" detail="Conquistadas" /></div>
      <div className="card-grid">{openChallenges.map((challenge) => <ChallengeCard key={challenge._id} challenge={challenge} role="talent" onJoin={join} onSubmit={setModal} />)}</div>
    </>}
    {!loading && active === "participations" && <><PageHeader eyebrow="MINHA JORNADA" title="Participações" description="Acompanhe cada etapa dos desafios em que você entrou." /><div className="card-grid">{participations.length ? participations.map((challenge) => <ChallengeCard key={challenge._id} challenge={challenge} role="talent" onJoin={join} onSubmit={setModal} />) : <EmptyState title="Você ainda não participa de desafios" text="Acesse Explorar e encontre uma oportunidade." />}</div></>}
    {!loading && active === "portfolio" && <><PageHeader eyebrow="EVIDÊNCIAS DE COMPETÊNCIA" title="Portfólio validado" description="Suas entregas e avaliações ficam reunidas aqui." /><div className="submission-list">{data.submissions.length || demoSubmissions.length ? [...demoSubmissions, ...data.submissions].map((item) => <article className="submission" key={item._id}><div><Status value={item.participation?.status || "submitted"} /><h3>{item.challenge?.title}</h3><p>{item.summary}</p><div className="tag-row">{(item.challenge?.skills || []).map((x) => <span key={x}>{x}</span>)}</div></div><div className="submission-side">{item.evaluation ? <><strong>{item.evaluation.score}/100</strong><small>{item.evaluation.feedback}</small></> : <small>Aguardando avaliação</small>}{item.file_name && <button className="outline-button small" onClick={() => downloadSubmission(item._id, item.file_name)}>BAIXAR ARQUIVO</button>}{item.report_url && <a className="outline-button small" href={item.report_url} target="_blank" rel="noreferrer">ABRIR LINK</a>}</div></article>) : <EmptyState title="Portfólio vazio" text="Envie uma solução para começar a construir suas evidências." />}</div></>}
    {!loading && active === "profile" && <ProfileForm profile={data.profile} role="talent" onSaved={load} />}
    {modal && <SubmissionModal challenge={modal} onClose={() => setModal(null)} onDemoSubmit={submitDemoSolution} onDone={(message, isDemo) => { setToast({ message }); if (!isDemo) load(); }} />}
    {toast && <Toast {...toast} onClose={() => setToast(null)} />}
  </DashboardLayout>;
}

function ChallengeForm({ onCreated, challenge, onCancel }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(null);
  async function submit(event) {
    event.preventDefault();

    const form = event.currentTarget;

    setLoading(true);
    setError("");

    const fields = Object.fromEntries(new FormData(form));

    fields.skills = fields.skills
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean);

    try {
      const result = await api(challenge ? `/challenges/${challenge._id}` : "/challenges", {
        method: challenge ? "PATCH" : "POST",
        body: JSON.stringify(fields),
      });

      if (!challenge) {
        form.reset();
        setCreated(result.challenge);
      }
      await onCreated(result.challenge);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  return <form className="editor-form" onSubmit={submit}>
    {created && <div className="form-success" role="status">Desafio salvo como rascunho. <a className="inline-link" href={`#${challengePath(created._id)}`}>Abrir a página do desafio para conferir e publicar →</a></div>}
    <div className="form-grid">
      <label className="wide">Título do desafio<input name="title" required defaultValue={challenge?.title} placeholder="Ex.: Investigação de incidente em ambiente cloud" /></label>
      <label>Nível<select name="level" defaultValue={challenge?.level || "Intermediário"}><option>Júnior</option><option>Intermediário</option><option>Sênior</option></select></label>
      <label>Modelo<select name="work_mode" defaultValue={challenge?.work_mode || "Remoto"}><option>Remoto</option><option>Híbrido</option><option>Presencial</option></select></label>
      <label className="wide">Enunciado do desafio<textarea name="description" required rows="8" defaultValue={challenge?.description} placeholder="Digite o enunciado: contexto, objetivo, instruções e escopo do desafio..." /></label>
      <label className="wide">Entregáveis<textarea name="deliverables" required rows="4" defaultValue={challenge?.deliverables} placeholder="Relatório, recomendações, evidências..." /></label>
      <label>Competências<input name="skills" required defaultValue={(challenge?.skills || []).join(", ")} placeholder="SOC, AWS, Python" /></label>
      <label>Prazo<input type="date" name="deadline" required defaultValue={challenge?.deadline?.slice(0, 10)} /></label>
    </div>
    {error && <div className="form-error">{error}</div>}
    <div className="card-actions"><button className="primary-button" disabled={loading}>{loading ? "SALVANDO..." : challenge ? "SALVAR ALTERAÇÕES →" : "SALVAR COMO RASCUNHO →"}</button>{onCancel && <button type="button" className="outline-button" onClick={onCancel}>CANCELAR</button>}</div>
  </form>;
}

function EvaluationCard({ submission, onEvaluated }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    fields.score = Number(fields.score);
    try { await api(`/submissions/${submission._id}/evaluate`, { method: "POST", body: JSON.stringify(fields) }); setOpen(false); onEvaluated(); }
    catch (err) { setError(err.message); }
  }
  return <article className="evaluation-card"><div className="evaluation-main"><div className="avatar">{(submission.talent?.name || "T").slice(0, 2).toUpperCase()}</div><div><div className="evaluation-meta"><Status value={submission.participation?.status || "submitted"} /><span>Versão {submission.version}</span></div><h3>{submission.talent?.name}</h3><strong>{submission.challenge?.title}</strong><p>{submission.summary}</p><div className="tag-row">{(submission.talent?.skills || []).map((skill) => <span key={skill}>{skill}</span>)}</div></div></div><div className="evaluation-actions">{submission.file_name && <button className="outline-button small" onClick={() => downloadSubmission(submission._id, submission.file_name)}>BAIXAR</button>}{submission.report_url && <a className="outline-button small" href={submission.report_url} target="_blank" rel="noreferrer">ABRIR LINK</a>}<button className="primary-button small" onClick={() => setOpen(!open)}>{submission.evaluation ? "REAVALIAR" : "AVALIAR →"}</button></div>{open && <form className="inline-evaluation" onSubmit={submit}><label>Nota (0 a 100)<input type="number" name="score" min="0" max="100" defaultValue={submission.evaluation?.score || 80} required /></label><label>Decisão<select name="decision" defaultValue={submission.evaluation?.decision || "shortlisted"}><option value="shortlisted">Adicionar à shortlist</option><option value="rejected">Não selecionar</option></select></label><label className="wide">Feedback<textarea name="feedback" required rows="3" defaultValue={submission.evaluation?.feedback} placeholder="Registre os pontos fortes e oportunidades de melhoria..." /></label>{error && <div className="form-error wide">{error}</div>}<button className="primary-button small">SALVAR AVALIAÇÃO</button></form>}</article>;
}

function CompanyDashboard({ initialActive = "overview" }) {
  const [active, setActive] = useState(initialActive);
  useEffect(() => { setActive(initialActive); }, [initialActive]);
  const [data, setData] = useState({ challenges: [], submissions: [], profile: {} });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const load = useCallback(async () => { setLoading(true); try { setData(await api("/dashboard")); } catch (err) { setToast({ message: err.message, kind: "error" }); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  async function challengeAction(id, action) { try { await api(`/challenges/${id}/status`, { method: "PATCH", body: JSON.stringify({ action }) }); setToast({ message: action === "publish" ? "Desafio publicado." : "Desafio encerrado." }); await load(); } catch (err) { setToast({ message: err.message, kind: "error" }); } }
  const pending = data.submissions.filter((x) => !x.evaluation);
  const shortlisted = data.submissions.filter((x) => x.evaluation?.decision === "shortlisted");
  const totalParticipants = data.challenges.reduce((sum, x) => sum + (x.participant_count || 0), 0);
  return <DashboardLayout role="company" active={active} setActive={setActive}>
    {loading && <div className="loader">CARREGANDO DADOS<span>_</span></div>}
    {!loading && active === "overview" && <><PageHeader eyebrow="PAINEL DA EMPRESA" title={`Olá, ${data.profile.organization_name || data.profile.name}.`} description="Acompanhe seus processos seletivos em cibersegurança." action={<button className="primary-button small" onClick={() => setActive("publish")}>+ NOVO DESAFIO</button>} /><div className="metrics"><Metric number={data.challenges.filter((x) => x.status === "published").length} label="Processos ativos" detail="Publicados" /><Metric number={totalParticipants} label="Participantes" detail="Em desafios" /><Metric number={pending.length} label="Para avaliar" detail="Entregas pendentes" /><Metric number={shortlisted.length} label="Shortlist" detail="Talentos" /></div><h2 className="section-title">Seus desafios</h2><div className="card-grid">{data.challenges.length ? data.challenges.map((challenge) => <ChallengeCard key={challenge._id} challenge={challenge} role="company" onAction={challengeAction} />) : <EmptyState title="Nenhum desafio criado" text="Publique seu primeiro processo seletivo técnico." />}</div></>}
    {!loading && active === "publish" && <><PageHeader eyebrow="NOVO PROCESSO SELETIVO" title="Crie um desafio técnico." description="Apresente um cenário real e defina as evidências que deseja receber." /><ChallengeForm onCreated={(challenge) => { setToast({ message: "Rascunho criado. Abra a página do desafio para publicá-lo." }); setData((current) => ({ ...current, challenges: [challenge, ...current.challenges] })); }} /></>}
    {!loading && active === "evaluations" && <><PageHeader eyebrow="ANÁLISE TÉCNICA" title="Avalie as entregas." description="Dê uma nota, deixe feedback e escolha quem avança." /><div className="evaluation-list">{data.submissions.length ? data.submissions.map((item) => <EvaluationCard key={item._id} submission={item} onEvaluated={() => { setToast({ message: "Avaliação salva." }); load(); }} />) : <EmptyState title="Nenhuma entrega recebida" text="As soluções enviadas pelos participantes aparecerão aqui." />}</div></>}
    {!loading && active === "shortlist" && <><PageHeader eyebrow="TALENTOS SELECIONADOS" title="Sua shortlist." description="Perfis que se destacaram nos desafios técnicos." /><div className="talent-grid">{shortlisted.length ? shortlisted.map((item) => <article className="talent-card" key={item._id}><div className="avatar large">{item.talent?.name?.slice(0, 2).toUpperCase()}</div><h3>{item.talent?.name}</h3><p>{item.talent?.headline}</p><div className="score">{item.evaluation.score}<small>/100</small></div><strong>{item.challenge?.title}</strong><div className="tag-row">{(item.talent?.skills || []).map((skill) => <span key={skill}>{skill}</span>)}</div><a href={`mailto:${item.talent?.email}`} className="primary-button small">ENTRAR EM CONTATO →</a></article>) : <EmptyState title="Shortlist vazia" text="Avalie uma entrega como aprovada para adicionar o talento." />}</div></>}
    {!loading && active === "profile" && <ProfileForm profile={data.profile} role="company" onSaved={load} />}
    {toast && <Toast {...toast} onClose={() => setToast(null)} />}
  </DashboardLayout>;
}

function ChallengeDetail({ challengeId }) {
  const { user } = useAuth();
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [modal, setModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const storageKey = demoStorageKey(user);
  const isDemo = isDemoChallenge(challengeId);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (isDemoChallenge(challengeId)) {
        const item = getDemoChallenges(loadDemoState(storageKey)).find((row) => row._id === challengeId);
        if (!item) throw new Error("Desafio não encontrado.");
        setChallenge(item);
      } else {
        const result = await api(`/challenges/${challengeId}`);
        setChallenge(result.challenge);
      }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [challengeId, storageKey]);
  useEffect(() => { load(); }, [load]);

  const canManage = !isDemo && (user.role === "admin" || (user.role === "company" && challenge?.owner_id === user._id));
  const canSubmit = user.role === "talent" && challenge?.status === "published" && ["joined", "submitted"].includes(challenge?.participation?.status);
  async function join() {
    setBusy(true);
    setError("");
    try {
      if (isDemo) {
        const state = loadDemoState(storageKey);
        saveDemoState(storageKey, { ...state, [challengeId]: { ...state[challengeId], participation: { status: "joined" } } });
      } else {
        await api(`/challenges/${challengeId}/join`, { method: "POST" });
      }
      setMessage("Inscrição confirmada! Você já pode enviar sua solução.");
      await load();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  async function changeStatus(action) {
    setBusy(true);
    setError("");
    try {
      await api(`/challenges/${challengeId}/status`, { method: "PATCH", body: JSON.stringify({ action }) });
      setMessage(action === "publish" ? "Desafio publicado e disponível para os talentos." : action === "close" ? "Desafio encerrado." : "Desafio retirado da publicação e salvo como rascunho.");
      await load();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  function submitDemo(challengeToSubmit, formData) {
    const summary = String(formData.get("summary") || "").trim();
    if (!summary) throw new Error("Informe o resumo da solução.");
    const state = loadDemoState(storageKey);
    saveDemoState(storageKey, {
      ...state,
      [challengeToSubmit._id]: {
        ...state[challengeToSubmit._id],
        participation: { status: "submitted" },
        submission: { summary, report_url: String(formData.get("report_url") || "").trim() },
      },
    });
  }

  return <DashboardLayout role={user.role} active="" setActive={(section) => go(`${homeForRole(user.role)}?aba=${section}`)}>
    <a className="text-button challenge-back" href={`#${homeForRole(user.role)}`}>← VOLTAR AOS DESAFIOS</a>
    {loading && <div className="loader">CARREGANDO DESAFIO<span>_</span></div>}
    {error && <div className="form-error" role="alert">{error} <button className="text-button" onClick={load}>TENTAR NOVAMENTE</button></div>}
    {message && <div className="form-success" role="status">{message}</div>}
    {!loading && challenge && <>
      <PageHeader eyebrow={isDemo ? "DESAFIO DEMONSTRATIVO" : "DESAFIO / CTF"} title={editing ? "Editar enunciado" : challenge.title} description={challenge.company_name} />
      {editing ? <ChallengeForm challenge={challenge} onCancel={() => setEditing(false)} onCreated={(saved) => { setChallenge(saved); setEditing(false); setMessage("Enunciado atualizado."); }} /> : <article className="challenge-card challenge-detail">
        <div className="challenge-top"><Status value={challenge.status} /><span>{challenge.level}</span></div>
        <dl><div><dt>Prazo</dt><dd>{challenge.deadline ? new Date(`${challenge.deadline.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "A definir"}</dd></div><div><dt>Formato</dt><dd>{challenge.work_mode || "Remoto"}</dd></div><div><dt>Participantes</dt><dd>{challenge.participant_count ?? 0}</dd></div></dl>
        <h2>Enunciado do desafio</h2><p className="challenge-content">{challenge.description}</p>
        <h2>Entregáveis</h2><p className="challenge-content">{challenge.deliverables || "Apresente sua análise, as evidências e as recomendações para o cenário descrito."}</p>
        <div className="tag-row">{(challenge.skills || []).map((skill) => <span key={skill}>{skill}</span>)}</div>
        {isDemo && <p>Este é um exemplo fictício. A participação e a solução ficam salvas somente neste navegador.</p>}
        {challenge.status !== "published" && user.role === "talent" && <p>Este desafio não está recebendo novas soluções.</p>}
        <div className="card-actions">
          {user.role === "talent" && challenge.status === "published" && !challenge.participation && <button className="primary-button" disabled={busy} onClick={join}>PARTICIPAR →</button>}
          {canSubmit && <button className="primary-button" onClick={() => setModal(true)}>ENVIAR SOLUÇÃO →</button>}
          {user.role === "talent" && challenge.participation && <Status value={challenge.participation.status} />}
          {canManage && <>
            <button className="outline-button" disabled={busy} onClick={() => setEditing(true)}>EDITAR ENUNCIADO</button>
            {challenge.status !== "published" && <button className="primary-button" disabled={busy} onClick={() => changeStatus("publish")}>{challenge.status === "closed" ? "REABRIR DESAFIO →" : "PUBLICAR DESAFIO →"}</button>}
            {challenge.status === "published" && <button className="outline-button" disabled={busy} onClick={() => changeStatus("close")}>ENCERRAR DESAFIO</button>}
            {user.role === "admin" && challenge.status !== "draft" && <button className="outline-button" disabled={busy} onClick={() => changeStatus("draft")}>VOLTAR A RASCUNHO</button>}
          </>}
        </div>
      </article>}
    </>}
    {modal && challenge && <SubmissionModal challenge={challenge} onClose={() => setModal(false)} onDemoSubmit={submitDemo} onDone={(text) => { setMessage(text); load(); }} />}
  </DashboardLayout>;
}

function AdminDashboard() {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [toast, setToast] = useState(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try { const result = await api("/admin/challenges"); setChallenges(result.challenges); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  async function challengeAction(id, action) {
    try {
      await api(`/challenges/${id}/status`, { method: "PATCH", body: JSON.stringify({ action }) });
      setToast({ message: action === "publish" ? "Desafio publicado." : "Desafio encerrado." });
      await load();
    } catch (err) { setToast({ message: err.message, kind: "error" }); }
  }
  const filtered = challenges.filter((item) => (!status || item.status === status) && `${item.title} ${item.company_name}`.toLocaleLowerCase("pt-BR").includes(query.trim().toLocaleLowerCase("pt-BR")));
  return <DashboardLayout role="admin" active="challenges" setActive={() => {}}>
    <PageHeader eyebrow="ADMINISTRAÇÃO RETURN TECH" title="Administração de CTFs" description="Gerencie os desafios cadastrados pelas empresas. Abra um desafio para editar o enunciado ou alterar sua publicação." />
    {error && <div className="form-error" role="alert">{error} <button className="text-button" onClick={load}>TENTAR NOVAMENTE</button></div>}
    {loading ? <div className="loader">CARREGANDO CTFS<span>_</span></div> : <>
      <div className="metrics"><Metric number={challenges.length} label="Total de desafios" detail="Todas as empresas" /><Metric number={challenges.filter((item) => item.status === "published").length} label="Publicados" detail="Disponíveis para talentos" /><Metric number={challenges.filter((item) => item.status === "draft").length} label="Rascunhos" detail="Em preparação" /><Metric number={challenges.filter((item) => item.status === "closed").length} label="Encerrados" detail="Sem novas entregas" /></div>
      <div className="form-grid challenge-filters">
        <label>Buscar desafio ou empresa<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Digite o título ou a empresa..." /></label>
        <label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Todos</option><option value="draft">Rascunhos</option><option value="published">Publicados</option><option value="closed">Encerrados</option>
        </select></label>
      </div>
      <div className="card-grid">{filtered.length ? filtered.map((challenge) => <ChallengeCard key={challenge._id} challenge={challenge} role="admin" onAction={challengeAction} />) : <EmptyState title="Nenhum desafio encontrado" text={challenges.length ? "Ajuste os filtros para encontrar o desafio." : "Os desafios cadastrados pelas empresas aparecerão aqui."} />}</div>
    </>}
    {toast && <Toast {...toast} onClose={() => setToast(null)} />}
  </DashboardLayout>;
}

function ProfileForm({ profile, role, onSaved }) {
  const { setUser } = useAuth();
  const [message, setMessage] = useState("");
  async function submit(event) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    fields.skills = fields.skills ? fields.skills.split(",").map((x) => x.trim()).filter(Boolean) : [];
    try { const result = await api("/profile", { method: "PUT", body: JSON.stringify(fields) }); setUser(result.profile); localStorage.setItem("return_tech_user", JSON.stringify(result.profile)); setMessage("Perfil atualizado."); onSaved(); } catch (err) { setMessage(err.message); }
  }
  return <><PageHeader eyebrow="CONFIGURAÇÕES" title={role === "company" ? "Perfil da empresa" : "Seu perfil"} description="Mantenha seus dados atualizados na plataforma." /><form className="editor-form" onSubmit={submit}><div className="form-grid"><label>Nome<input name="name" defaultValue={profile.name} required /></label>{role === "company" && <label>Organização<input name="organization_name" defaultValue={profile.organization_name} required /></label>}<label>Título / cargo<input name="headline" defaultValue={profile.headline} /></label><label>Cidade<input name="city" defaultValue={profile.city} /></label>{role === "talent" && <label className="wide">Competências<input name="skills" defaultValue={(profile.skills || []).join(", ")} /></label>}<label className="wide">Sobre<textarea name="bio" rows="5" defaultValue={profile.bio} placeholder="Conte um pouco sobre sua atuação..." /></label></div>{message && <div className={message.includes("atualizado") ? "form-success" : "form-error"}>{message}</div>}<button className="primary-button">SALVAR ALTERAÇÕES →</button></form></>;
}

function App() {
  const route = useHashRoute();
  const [path, search = ""] = route.split("?");
  const section = new URLSearchParams(search).get("aba");
  const { user, checking } = useAuth();
  if (checking) return <div className="app-loading"><Brand /><div className="loader">VALIDANDO SESSÃO<span>_</span></div></div>;
  if (route === "/login") return <AuthPage mode="login" />;
  if (route === "/cadastro/talent") return <AuthPage mode="register" role="talent" />;
  if (route === "/cadastro/company") return <AuthPage mode="register" role="company" />;
  if (path === "/admin") {
    if (!user) return <AuthPage mode="login" role="admin" />;
    return user.role === "admin" ? <AdminDashboard /> : <main className="auth-page"><header className="public-header"><Brand /><a className="text-button" href={`#${homeForRole(user.role)}`}>VOLTAR AO MEU PAINEL</a></header><section className="auth-shell"><EmptyState title="Acesso restrito à administração" text="Entre com uma conta de administrador fornecida pela equipe Return Tech." /></section></main>;
  }
  if (path.startsWith("/desafios/")) {
    if (!user) return <AuthPage mode="login" returnTo={route} />;
    const challengeId = path.slice("/desafios/".length);
    return <ChallengeDetail key={challengeId} challengeId={challengeId} />;
  }
  if (path === "/talentos") return user?.role === "talent" ? <TalentDashboard initialActive={["explore", "participations", "portfolio", "profile"].includes(section) ? section : "explore"} /> : <AuthPage mode="login" />;
  if (path === "/empresas") return user?.role === "company" ? <CompanyDashboard initialActive={["overview", "publish", "evaluations", "shortlist", "profile"].includes(section) ? section : "overview"} /> : <AuthPage mode="login" />;
  if (user) { go(homeForRole(user.role)); return null; }
  return <Landing />;
}

export default App;
