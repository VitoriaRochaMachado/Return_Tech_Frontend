import { useCallback, useEffect, useMemo, useState } from "react";
import { api, downloadSubmission } from "./api";
import { useAuth } from "./AuthContext";
import CodingWorkspace from "./coding/CodingWorkspace";
import CodingSettings from "./coding/CodingSettings";
import CodingChallengeFields, { createCodingChallengeConfig } from "./coding/CodingChallengeFields";
import { formatPoints } from "./coding/points";
import {
  demoStorageKey,
  getDemoChallenges,
  isDemoChallenge,
  loadDemoState,
} from "./demoChallenges";

const icons = {
  student: (
    <svg viewBox="0 0 48 48" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M24 3 3 11l21 8 21-8L24 3Z" />
      <path d="M42 12v14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="40" y="25" width="4" height="6" rx="1" />
      <circle cx="24" cy="25" r="7" />
      <path d="m14 33-10 6v7h40v-7l-10-6-10 7-10-7Z" />
    </svg>
  ),
  company: (
    <svg viewBox="0 0 48 48" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M18 8h12a4 4 0 0 1 4 4v4h-4v-4H18v4h-4v-4a4 4 0 0 1 4-4Z" />
      <path d="M7 17h34a3 3 0 0 1 3 3v8H28v-3h-8v3H4v-8a3 3 0 0 1 3-3Z" />
      <path d="M4 31h16v4h8v-4h16v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V31Z" />
      <rect x="22" y="27" width="4" height="6" rx="1" />
    </svg>
  ),
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

async function syncLegacyParticipations(user) {
  if (user?.role !== "talent") return;
  const state = loadDemoState(demoStorageKey(user));
  const snapshot = JSON.stringify(state);
  const identity = user._id || user.id || user.email;
  const markerKey = `return_tech_legacy_imported:${identity}`;
  if (localStorage.getItem(markerKey) === snapshot) return;
  const items = getDemoChallenges({}).flatMap((challenge) => {
    const saved = state[challenge._id];
    if (!saved?.participation && !saved?.submission) return [];
    return [{ legacy_id: challenge._id, summary: saved.submission?.summary || "", report_url: saved.submission?.report_url || "" }];
  });
  if (!items.length) return;
  await api("/legacy-participations/import", { method: "POST", body: JSON.stringify({ items }) });
  localStorage.setItem(markerKey, snapshot);
}

function canSubmitReport(challenge) {
  if (!challenge || challenge.coding_enabled || challenge.status !== "published" || !challenge.participation) return false;
  const endsAt = challenge.ends_at || (challenge.deadline ? `${challenge.deadline.slice(0, 10)}T23:59:59.999-03:00` : null);
  return !endsAt || new Date(endsAt).getTime() > Date.now();
}

function canConfigureCoding(challenge, user) {
  return user?.role === "company" && challenge?.owner_id === user._id &&
    challenge.status === "draft" && challenge.coding_editable === true &&
    !isDemoChallenge(challenge._id);
}

function Brand({ compact = false }) {
  return (
    <button className="brand" onClick={() => go("/")} aria-label="Ir para o início">
      <span className="brand-mark">R</span>
      {!compact && <span>RETURN<span className="lime">_TECH</span></span>}
    </button>
  );
}

function Landing({ register = false }) {
  return (
    <main className="landing">
      <header className="public-header">
        <Brand />
        {register && <button className="text-button" onClick={() => go("/login")}>Já tenho uma conta <span>→</span></button>}
      </header>

      <section className="hero">
        <div className="eyebrow"><span className="pulse" /> ECOSSISTEMA DE CIBERSEGURANÇA</div>
        <h1>Onde desafios reais<br />revelam <span>talentos reais.</span></h1>
        <p>Conectamos estudantes e profissionais a empresas por meio de processos seletivos práticos em cibersegurança.</p>
        <div className="terminal-line"><span>&gt;</span> {register ? "escolha seu perfil para criar uma conta" : "escolha como entrar na plataforma"}<span className="cursor">_</span></div>
      </section>

      <section className="choice-grid" aria-label="Escolha o seu perfil">
        <button className="choice-card talent" onClick={() => go(register ? "/cadastro/talent" : "/login/talent")}>
          <span className="card-number">01</span>
          <span className="choice-icon">{icons.student}</span>
          <span className="choice-copy">
            <strong>Estudante / Profissional</strong>
            <small>Encare desafios, demonstre suas habilidades e construa um portfólio validado.</small>
          </span>
          <span className="choice-link">QUERO PARTICIPAR {icons.arrow}</span>
        </button>
        <button className="choice-card company" onClick={() => go(register ? "/cadastro/company" : "/login/company")}>
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
  const registerPath = role ? `/cadastro/${role}` : "/cadastro";
  const loginPath = role ? `/login/${role}` : "/login";
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
          {role !== "admin" && <p className="auth-switch">{isLogin ? "Ainda não tem conta?" : "Já tem uma conta?"} <button type="button" onClick={() => go(isLogin ? registerPath : loginPath)}>{isLogin ? "Criar conta" : "Fazer login"}</button></p>}
        </form>
      </section>
    </main>
  );
}

function EmptyState({ title, text }) {
  return <div className="empty-state"><span>{icons.shield}</span><strong>{title}</strong><p>{text}</p></div>;
}

function Status({ value }) {
  const labels = { draft: "Rascunho", pending_review: "Aguardando aprovação", changes_requested: "Ajustes solicitados", published: "Publicado", closed: "Encerrado", joined: "Inscrito", submitted: "Entregue", shortlisted: "Shortlist", rejected: "Não selecionado" };
  return <span className={`status status-${value}`}>{labels[value] || value}</span>;
}

function challengeActionMessage(action) {
  const messages = {
    submit_review: "Desafio enviado para aprovação. Aguarde a análise da administração.",
    approve: "Desafio aprovado e publicado para os talentos.",
    request_changes: "Solicitação de ajustes enviada para a empresa.",
    close: "Desafio encerrado.",
    draft: "Desafio retirado da publicação e salvo como rascunho.",
  };
  return messages[action] || "Status do desafio atualizado.";
}

function Toast({ message, kind = "success", onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3800);
    return () => clearTimeout(timer);
  }, [onClose]);
  return <div className={`toast ${kind}`} role={kind === "error" ? "alert" : "status"} aria-label={kind === "error" ? "Erro na operação" : "Operação concluída"}>{message}<button aria-label="Fechar aviso" onClick={onClose}>×</button></div>;
}

function DashboardLayout({ role, active, setActive, children }) {
  const { user, logout } = useAuth();
  const talentItems = [["explore", "Explorar"], ["participations", "Participações"], ["portfolio", "Portfólio"], ["profile", "Perfil"]];
  const companyItems = [["overview", "Visão geral"], ["publish", "Criar desafio"], ["evaluations", "Avaliações"], ["shortlist", "Shortlist"], ["profile", "Empresa"]];
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

function ChallengeCard({ challenge, role, onJoin, onSubmit, onAction, onConfigureCoding }) {
  return (
    <article className="challenge-card">
      <div className="challenge-top"><Status value={challenge.status} /><span>{challenge.level || "Intermediário"}</span></div>
      <h3>{challenge.title}</h3>
      {challenge.company_name && <p className="challenge-company">{challenge.company_name}</p>}
      <p>{challenge.description}</p>
      {role === "company" && challenge.review_feedback && <div className="review-note"><strong>Ajustes solicitados pela administração</strong><p className="challenge-content">{challenge.review_feedback}</p></div>}
      <div className="tag-row">{(challenge.skills || []).map((skill) => <span key={skill}>{skill}</span>)}</div>
      {challenge.coding_enabled && <p className="code-tag">Avaliação por código · {formatPoints(challenge.coding_max_points ?? 100)} pontos</p>}
      <dl>
        <div><dt>Prazo</dt><dd>{challenge.deadline ? new Date(`${challenge.deadline.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "A definir"}</dd></div>
        <div><dt>Formato</dt><dd>{challenge.work_mode || "Remoto"}</dd></div>
        <div><dt>Participantes</dt><dd>{challenge.participant_count ?? 0}</dd></div>
      </dl>
      <div className="card-actions">
        <a className="outline-button small" href={`#${challengePath(challenge._id)}`}>{role === "admin" && challenge.status === "pending_review" ? "REVISAR DESAFIO →" : "VER DESAFIO →"}</a>
        {role === "talent" && challenge.status === "published" && !challenge.participation && <button className="primary-button small" onClick={() => onJoin(challenge._id)}>PARTICIPAR →</button>}
        {role === "talent" && challenge.coding_enabled && challenge.participation && ["published", "closed"].includes(challenge.status) && <button className="primary-button small" onClick={() => onSubmit(challenge)}>{challenge.status === "closed" ? "CONSULTAR CÓDIGO E RESULTADOS →" : "ABRIR EDITOR →"}</button>}
        {role === "talent" && canSubmitReport(challenge) && <button className="primary-button small" onClick={() => onSubmit(challenge)}>{challenge.latest_submission ? "EDITAR ENTREGA →" : "ENVIAR SOLUÇÃO →"}</button>}
        {role === "talent" && challenge.participation && <Status value={challenge.participation.status} />}
        {role === "company" && onConfigureCoding && <button className="outline-button small" onClick={() => onConfigureCoding(challenge)}>CONFIGURAR CÓDIGO</button>}
        {role === "company" && ["draft", "changes_requested", "closed"].includes(challenge.status) && <button className="primary-button small" onClick={() => onAction(challenge._id, "submit_review")}>ENVIAR PARA APROVAÇÃO →</button>}
        {["company", "admin"].includes(role) && challenge.status === "published" && <button className="outline-button small" onClick={() => onAction(challenge._id, "close")}>ENCERRAR</button>}
      </div>
    </article>
  );
}

function SubmissionModal({ challenge, submission = challenge.latest_submission, onClose, onDone }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (!canSubmitReport(challenge)) throw new Error("Este desafio não está recebendo novas soluções ou alterações.");
      const formData = new FormData(event.currentTarget);
      if (submission?._id) formData.set("previous_submission_id", submission._id);
      await api(`/challenges/${challenge._id}/submissions`, { method: "POST", body: formData });
      onDone(submission ? "Entrega atualizada com sucesso." : "Solução enviada com sucesso.");
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={(e) => e.stopPropagation()}><button className="modal-close" onClick={onClose}>×</button><div className="eyebrow">{submission ? "EDITAR ENTREGA" : "NOVA ENTREGA"}</div><h2>{challenge.title}</h2><p><a className="inline-link" href={`#${challengePath(challenge._id)}`} onClick={onClose}>Ver o enunciado completo do desafio →</a></p><form onSubmit={submit}><label>Resumo da solução<textarea name="summary" required rows="5" defaultValue={submission?.summary || ""} placeholder="Explique sua abordagem, decisões e resultados..." /></label><label>Link complementar<input type="url" name="report_url" defaultValue={submission?.report_url || ""} placeholder="https://github.com/..." /></label><label>Arquivo do relatório<input type="file" name="file" /></label>{submission?.file_name && <p>Arquivo atual: <strong>{submission.file_name}</strong>. Se não selecionar outro arquivo, ele será mantido.</p>}{error && <div className="form-error">{error}</div>}<button className="primary-button" disabled={loading || !canSubmitReport(challenge)}>{loading ? "SALVANDO..." : submission ? "SALVAR ALTERAÇÕES →" : "ENVIAR SOLUÇÃO →"}</button></form></div></div>;
}

function PortfolioSubmission({ item, isLatestReport }) {
  const isCode = item.kind === "code";
  const [downloadError, setDownloadError] = useState("");
  async function download() {
    setDownloadError("");
    try { await downloadSubmission(item._id, item.file_name); }
    catch (err) { setDownloadError(err.message); }
  }
  return <article className="submission">
    <div>
      <Status value={isCode ? "submitted" : item.participation?.status || "submitted"} />
      <h3>{item.challenge?.title || "Desafio indisponível"}</h3>
      {isCode ? <>
        <p>Resposta em {({ python: "Python", javascript: "JavaScript", cpp: "C++" })[item.language] || item.language}.</p>
        <details><summary>VER CÓDIGO ENVIADO</summary><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{item.source_code}</pre></details>
      </> : <p className="challenge-content">{item.summary}</p>}
      <div className="tag-row">{(item.challenge?.skills || []).map((skill) => <span key={skill}>{skill}</span>)}</div>
    </div>
    <div className="submission-side">
      {isCode ? item.status === "completed" ? <><strong>{formatPoints(item.score ?? 0)} / {formatPoints(item.max_points ?? 100)}</strong><small>pontos</small></>
        : item.status === "service_error" ? <small>{item.error || "Não foi possível corrigir esta resposta. O código enviado continua disponível."}</small>
        : <small>Corrigindo sua solução...</small>
        : item.evaluation ? <><strong>{item.evaluation.score}/100</strong><small>{item.evaluation.feedback}</small></> : <small>Aguardando avaliação</small>}
      {item.challenge?._id && <a className="outline-button small" href={`#${challengePath(item.challenge._id)}`}>VER DESAFIO →</a>}
      {!isCode && isLatestReport && canSubmitReport({ ...item.challenge, participation: item.participation }) && <a className="primary-button small" href={`#${challengePath(item.challenge._id)}`}>EDITAR ENTREGA →</a>}
      {item.file_name && <button className="outline-button small" onClick={download}>BAIXAR ARQUIVO</button>}
      {downloadError && <p className="form-error" role="alert">{downloadError}</p>}
      {item.report_url && <a className="outline-button small" href={item.report_url} target="_blank" rel="noreferrer">ABRIR LINK</a>}
    </div>
  </article>;
}

function TalentDashboard({ initialActive = "explore" }) {
  const { user } = useAuth();
  const [active, setActive] = useState(initialActive);
  useEffect(() => { setActive(initialActive); }, [initialActive]);
  const [data, setData] = useState({ challenges: [], submissions: [], profile: {} });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const load = useCallback(async () => {
    setLoading(true);
    try { await syncLegacyParticipations(user); }
    catch (err) { setToast({ message: err.message, kind: "error" }); }
    try { setData(await api("/dashboard")); }
    catch (err) { setToast({ message: err.message, kind: "error" }); }
    finally { setLoading(false); }
  }, [user._id]);
  useEffect(() => { load(); }, [load, active]);

  async function join(id) {
    try { await api(`/challenges/${id}/join`, { method: "POST" }); setToast({ message: "Inscrição confirmada!" }); await load(); }
    catch (err) { setToast({ message: err.message, kind: "error" }); }
  }

  const portfolioSubmissions = useMemo(() => [...data.submissions, ...(data.coding_submissions || [])], [data.submissions, data.coding_submissions]);
  const latestReports = useMemo(() => {
    const latest = new Map();
    for (const item of portfolioSubmissions) {
      if (item.kind === "code" || !item.challenge?._id) continue;
      const previous = latest.get(item.challenge._id);
      const version = Number(item.version || 0);
      const previousVersion = Number(previous?.version || 0);
      if (!previous || version > previousVersion || (version === previousVersion && (item.created_at || "") > (previous.created_at || ""))) latest.set(item.challenge._id, item);
    }
    return latest;
  }, [portfolioSubmissions]);
  const allChallenges = data.challenges;
  const openChallenges = useMemo(() => allChallenges.filter((item) => item.status === "published"), [allChallenges]);
  const participations = useMemo(() => allChallenges.filter((item) => item.participation), [allChallenges]);
  const approved = useMemo(() => {
    const selected = new Set();
    function add(challengeId, participation, evaluation) {
      if (!["shortlisted", "approved"].includes(participation?.status) && evaluation?.decision !== "shortlisted") return;
      const key = challengeId || participation?.challenge_id || participation?._id;
      if (key) selected.add(key);
    }
    for (const item of data.challenges) add(item._id, item.participation);
    for (const item of [...data.submissions, ...(data.coding_submissions || [])]) add(item.challenge?._id || item.challenge_id, item.participation, item.evaluation);
    return [...selected];
  }, [data]);

  return <DashboardLayout role="talent" active={active} setActive={setActive}>
    {loading && <div className="loader">CARREGANDO DADOS<span>_</span></div>}
    {!loading && active === "explore" && <>
      <PageHeader eyebrow="OPORTUNIDADES ABERTAS" title="Desafios para provar na prática." description="Escolha um processo seletivo e mostre como você resolve problemas reais." />
      <div className="metrics"><Metric number={openChallenges.length} label="Desafios abertos" detail="Agora" /><Metric number={participations.length} label="Participações" detail="No total" /><Metric number={approved.length} label="Shortlists" detail="Conquistadas" /></div>
      <div className="card-grid">{openChallenges.map((challenge) => <ChallengeCard key={challenge._id} challenge={challenge} role="talent" onJoin={join} onSubmit={setModal} />)}</div>
    </>}
    {!loading && active === "participations" && <><PageHeader eyebrow="MINHA JORNADA" title="Participações" description="Acompanhe cada etapa dos desafios em que você entrou." /><div className="card-grid">{participations.length ? participations.map((challenge) => <ChallengeCard key={challenge._id} challenge={challenge} role="talent" onJoin={join} onSubmit={setModal} />) : <EmptyState title="Você ainda não participa de desafios" text="Acesse Explorar e encontre uma oportunidade." />}</div></>}
    {!loading && active === "portfolio" && <><PageHeader eyebrow="EVIDÊNCIAS DE COMPETÊNCIA" title="Portfólio validado" description="Suas respostas, entregas e avaliações ficam reunidas aqui para consulta." /><div className="submission-list">{portfolioSubmissions.length ? portfolioSubmissions.map((item) => <PortfolioSubmission key={`${item.kind || "report"}_${item._id}`} item={item} isLatestReport={latestReports.get(item.challenge?._id)?._id === item._id} />) : <EmptyState title="Portfólio vazio" text="Envie uma solução para começar a construir suas evidências." />}</div></>}
    {!loading && active === "profile" && <ProfileForm profile={data.profile} role="talent" onSaved={load} />}
    {modal && (modal.coding_enabled ? <CodingWorkspace key={`${user._id}_${modal._id}`} challenge={modal} onClose={() => setModal(null)} onUpdated={load} /> : <SubmissionModal challenge={modal} onClose={() => setModal(null)} onDone={(message) => { setToast({ message }); load(); }} />)}
    {toast && <Toast {...toast} onClose={() => setToast(null)} />}
  </DashboardLayout>;
}


function ChallengeForm({ onCreated, challenge, onCancel }) {
  const { user } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(null);
  const [challengeType, setChallengeType] = useState("report");
  const [codingConfig, setCodingConfig] = useState(createCodingChallengeConfig);
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
      if (!challenge && challengeType === "code") {
        if (!codingConfig.languages.length) throw new Error("Selecione pelo menos uma linguagem permitida.");
        fields.coding_config = { ...codingConfig, max_points: Number(codingConfig.max_points) };
      }
      const result = await api(challenge ? `/challenges/${challenge._id}` : "/challenges", {
        method: challenge ? "PATCH" : "POST",
        body: JSON.stringify(fields),
      });

      if (!challenge) {
        form.reset();
        setChallengeType("report");
        setCodingConfig(createCodingChallengeConfig());
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
    {created && <div className="form-success" role="status">Desafio salvo como rascunho. <a className="inline-link" href={`#${challengePath(created._id)}`}>Abrir a página do desafio para conferir e enviar para aprovação →</a></div>}
    {challenge && user.role === "company" && ["published", "pending_review"].includes(challenge.status) && <p className="review-note">Ao alterar o enunciado, o desafio volta a ser rascunho e precisa de uma nova aprovação antes de aparecer para os talentos.</p>}
    <div className="form-grid">
      {!challenge && <label className="wide">Tipo de desafio<select value={challengeType} onChange={(event) => setChallengeType(event.target.value)}><option value="report">Relatório, link ou arquivo</option><option value="code">Código com correção automática (Judge0)</option></select></label>}
      <label className="wide">Título do desafio<input name="title" required defaultValue={challenge?.title} placeholder="Ex.: Investigação de incidente em ambiente cloud" /></label>
      <label>Nível<select name="level" defaultValue={challenge?.level || "Intermediário"}><option>Júnior</option><option>Intermediário</option><option>Sênior</option></select></label>
      <label>Modelo<select name="work_mode" defaultValue={challenge?.work_mode || "Remoto"}><option>Remoto</option><option>Híbrido</option><option>Presencial</option></select></label>
      <label className="wide">Enunciado do desafio<textarea name="description" required rows="8" defaultValue={challenge?.description} placeholder="Digite o enunciado: contexto, objetivo, instruções e escopo do desafio..." /></label>
      <label className="wide">Entregáveis<textarea name="deliverables" required rows="4" defaultValue={challenge?.deliverables} placeholder="Relatório, recomendações, evidências..." /></label>
      <label>Competências<input name="skills" required defaultValue={(challenge?.skills || []).join(", ")} placeholder="SOC, AWS, Python" /></label>
      <label>Prazo<input type="date" name="deadline" required defaultValue={challenge?.deadline?.slice(0, 10)} /></label>
    </div>
    {!challenge && challengeType === "code" && <CodingChallengeFields value={codingConfig} onChange={setCodingConfig} />}
    {error && <div className="form-error">{error}</div>}
    <div className="card-actions"><button className="primary-button" disabled={loading}>{loading ? "SALVANDO..." : challenge ? "SALVAR ALTERAÇÕES →" : "SALVAR COMO RASCUNHO →"}</button>{onCancel && <button type="button" className="outline-button" onClick={onCancel}>CANCELAR</button>}</div>
  </form>;
}

function EvaluationCard({ submission, onEvaluated, onShortlisted }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [shortlisting, setShortlisting] = useState(false);
  const isCode = submission.kind === "code";
  async function download() {
    setError("");
    try { await downloadSubmission(submission._id, submission.file_name); }
    catch (err) { setError(err.message); }
  }
  async function addToShortlist() {
    if (shortlisting || submission.shortlisted || !submission.participation?._id) return;
    setShortlisting(true);
    setError("");
    try {
      await api(`/participations/${submission.participation._id}/shortlist`, { method: "POST" });
      await onShortlisted();
    } catch (err) { setError(err.message); }
    finally { setShortlisting(false); }
  }
  async function submit(event) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    fields.score = Number(fields.score);
    try { await api(`/submissions/${submission._id}/evaluate`, { method: "POST", body: JSON.stringify(fields) }); setOpen(false); onEvaluated(); }
    catch (err) { setError(err.message); }
  }
  return <article className="evaluation-card">
    <div className="evaluation-main">
      <div className="avatar">{(submission.talent?.name || "T").slice(0, 2).toUpperCase()}</div>
      <div>
        <div className="evaluation-meta"><Status value={submission.participation?.status || "submitted"} /><span>{isCode ? "Código" : `Relatório · Versão ${submission.version || 1}`}</span></div>
        <h3>{submission.talent?.name}</h3>
        <p>{submission.talent?.email}</p>
        <strong>{submission.challenge?.title}</strong>
        {isCode ? <>
          <p>{({ python: "Python", javascript: "JavaScript", cpp: "C++" })[submission.language] || submission.language}</p>
          {submission.status === "completed" ? <p><strong>{formatPoints(submission.score ?? 0)} / {formatPoints(submission.max_points ?? 100)} pontos</strong> · {submission.passed ?? 0}/{submission.total ?? 0} casos corretos</p>
            : submission.status === "service_error" ? <p>Falha na correção automática. O código enviado está disponível.</p>
            : <p>Correção em andamento.</p>}
          <details><summary>VER CÓDIGO ENVIADO</summary><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{submission.source_code}</pre></details>
        </> : <p className="challenge-content">{submission.summary}</p>}
        <div className="tag-row">{(submission.talent?.skills || []).map((skill) => <span key={skill}>{skill}</span>)}</div>
      </div>
    </div>
    <div className="evaluation-actions">
      {submission.file_name && <button className="outline-button small" onClick={download}>BAIXAR</button>}
      {submission.report_url && <a className="outline-button small" href={submission.report_url} target="_blank" rel="noreferrer">ABRIR LINK</a>}
      {!isCode && <button className="primary-button small" onClick={() => setOpen(!open)}>{submission.evaluation ? "REAVALIAR" : "AVALIAR →"}</button>}
      <button className="outline-button small" disabled={shortlisting || submission.shortlisted || !submission.participation?._id} aria-busy={shortlisting} onClick={addToShortlist}>{submission.shortlisted ? "NA SHORTLIST" : shortlisting ? "ADICIONANDO..." : "ADICIONAR À SHORTLIST"}</button>
    </div>
    {error && <div className="form-error" role="alert">{error}</div>}
    {!isCode && open && <form className="inline-evaluation" onSubmit={submit}><label>Nota (0 a 100)<input type="number" name="score" min="0" max="100" defaultValue={submission.evaluation?.score ?? 80} required /></label><label>Decisão<select name="decision" defaultValue={submission.evaluation?.decision || "shortlisted"}><option value="shortlisted">Adicionar à shortlist</option><option value="rejected">Não selecionar</option></select></label><label className="wide">Feedback<textarea name="feedback" required rows="3" defaultValue={submission.evaluation?.feedback} placeholder="Registre os pontos fortes e oportunidades de melhoria..." /></label><button className="primary-button small">SALVAR AVALIAÇÃO</button></form>}
  </article>;
}

function CompanyDashboard({ initialActive = "overview" }) {
  const { user } = useAuth();
  const [active, setActive] = useState(initialActive);
  useEffect(() => { setActive(initialActive); }, [initialActive]);
  const [data, setData] = useState({ challenges: [], submissions: [], profile: {} });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [codingSettings, setCodingSettings] = useState(null);
  const load = useCallback(async () => { setLoading(true); try { setData(await api("/dashboard")); } catch (err) { setToast({ message: err.message, kind: "error" }); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load, active]);
  async function challengeAction(id, action) { try { await api(`/challenges/${id}/status`, { method: "PATCH", body: JSON.stringify({ action }) }); setToast({ message: challengeActionMessage(action) }); await load(); } catch (err) { setToast({ message: err.message, kind: "error" }); } }
  const submissions = useMemo(() => [...data.submissions, ...(data.coding_submissions || [])].sort((a, b) => (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0)), [data.submissions, data.coding_submissions]);
  const pending = submissions.filter((x) => !x.evaluation && !x.shortlisted);
  const shortlisted = data.shortlist || [];
  const totalParticipants = data.challenges.reduce((sum, x) => sum + (x.participant_count || 0), 0);
  return <DashboardLayout role="company" active={active} setActive={setActive}>
    {loading && <div className="loader">CARREGANDO DADOS<span>_</span></div>}
    {!loading && active === "overview" && <><PageHeader eyebrow="PAINEL DA EMPRESA" title={`Olá, ${data.profile.organization_name || data.profile.name}.`} description="Acompanhe seus processos seletivos em cibersegurança." action={<button className="primary-button small" onClick={() => setActive("publish")}>+ NOVO DESAFIO</button>} /><div className="metrics"><Metric number={data.challenges.filter((x) => x.status === "published").length} label="Processos ativos" detail="Publicados" /><Metric number={totalParticipants} label="Participantes" detail="Em desafios" /><Metric number={pending.length} label="Para avaliar" detail="Entregas pendentes" /><Metric number={shortlisted.length} label="Shortlist" detail="Talentos" /></div><h2 className="section-title">Seus desafios</h2><div className="card-grid">{data.challenges.length ? data.challenges.map((challenge) => <ChallengeCard key={challenge._id} challenge={challenge} role="company" onAction={challengeAction} onConfigureCoding={canConfigureCoding(challenge, user) ? setCodingSettings : undefined} />) : <EmptyState title="Nenhum desafio criado" text="Cadastre seu primeiro desafio e envie para aprovação da administração." />}</div></>}
    {!loading && active === "publish" && <><PageHeader eyebrow="NOVO PROCESSO SELETIVO" title="Crie um desafio técnico." description="Cadastre o enunciado e envie para aprovação. O desafio aparece para os talentos após a análise da administração." /><ChallengeForm onCreated={(challenge) => { setToast({ message: "Rascunho criado. Abra o desafio para enviar à aprovação da administração." }); setData((current) => ({ ...current, challenges: [challenge, ...current.challenges] })); }} /></>}
    {!loading && active === "evaluations" && <><PageHeader eyebrow="ANÁLISE TÉCNICA" title="Avalie as entregas." description="Consulte relatórios e soluções em código e selecione os candidatos." /><div className="evaluation-list">{submissions.length ? submissions.map((item) => <EvaluationCard key={`${item.kind || "report"}_${item._id}`} submission={item} onEvaluated={() => { setToast({ message: "Avaliação salva." }); return load(); }} onShortlisted={() => { setToast({ message: "Talento adicionado à shortlist." }); return load(); }} />) : <EmptyState title="Nenhuma entrega recebida" text="As soluções enviadas pelos participantes aparecerão aqui." />}</div></>}
    {!loading && active === "shortlist" && <><PageHeader eyebrow="TALENTOS SELECIONADOS" title="Sua shortlist." description="Perfis que se destacaram nos desafios técnicos." /><div className="talent-grid">{shortlisted.length ? shortlisted.map((item) => <article className="talent-card" key={item.talent._id}>
      <div className="avatar large">{(item.talent.name || "T").slice(0, 2).toUpperCase()}</div>
      <h3>{item.talent.name}</h3>
      <p>{item.talent.email}</p>
      {item.talent.headline && <strong>{item.talent.headline}</strong>}
      {item.talent.talent_type && <p>{({ student: "Estudante", professional: "Profissional" })[item.talent.talent_type] || item.talent.talent_type}</p>}
      {item.talent.city && <p>{item.talent.city}</p>}
      {item.talent.bio && <p className="challenge-content">{item.talent.bio}</p>}
      <div className="tag-row">{(item.talent.skills || []).map((skill) => <span key={skill}>{skill}</span>)}</div>
      <div>{(item.challenges || []).map((challenge) => <p key={challenge._id}>{challenge.title}</p>)}</div>
      {item.talent.email && <a href={`mailto:${item.talent.email}`} className="primary-button small">ENTRAR EM CONTATO →</a>}
    </article>) : <EmptyState title="Shortlist vazia" text="Adicione um talento pela aba Avaliações para acompanhar seu perfil aqui." />}</div></>}
    {!loading && active === "profile" && <ProfileForm profile={data.profile} role="company" onSaved={load} />}
    {codingSettings && <CodingSettings challenge={codingSettings} onClose={() => setCodingSettings(null)} onSaved={async () => { setToast({ message: "Avaliação por código salva. Envie o desafio para aprovação quando estiver pronto." }); await load(); }} />}
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
  const [pendingAction, setPendingAction] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [codingSettingsOpen, setCodingSettingsOpen] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState(null);
  const isDemo = isDemoChallenge(challenge?._id);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try { await syncLegacyParticipations(user); }
    catch (err) { setToast({ message: err.message, kind: "error" }); }
    try {
      const result = await api(`/challenges/${challengeId}`);
      setChallenge(result.challenge);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [challengeId, user._id]);
  useEffect(() => { load(); }, [load]);

  const canManage = !isDemo && (user.role === "admin" || (user.role === "company" && challenge?.owner_id === user._id));
  const canSubmit = user.role === "talent" && canSubmitReport(challenge);
  const canOpenCoding = !isDemo && user.role === "talent" && challenge?.coding_enabled && Boolean(challenge?.participation) && ["published", "closed"].includes(challenge?.status);
  const codingEditable = canConfigureCoding(challenge, user);
  async function join() {
    setBusy(true);
    setError("");
    try {
      await api(`/challenges/${challenge._id}/join`, { method: "POST" });
      setMessage("Inscrição confirmada! Você já pode enviar sua solução.");
      await load();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  async function changeStatus(action, extra = {}) {
    setBusy(true);
    setPendingAction(action);
    setError("");
    setMessage("");
    setToast(null);
    try {
      await api(`/challenges/${challenge._id}/status`, { method: "PATCH", body: JSON.stringify({ action, review_revision: challenge.revision ?? 0, ...extra }) });
      setReviewOpen(false);
      setToast({ message: challengeActionMessage(action), kind: "success" });
      await load();
    } catch (err) { setToast({ message: err.message, kind: "error" }); }
    finally { setBusy(false); setPendingAction(""); }
  }
  return <DashboardLayout role={user.role} active="" setActive={(section) => go(`${homeForRole(user.role)}?aba=${section}`)}>
    <a className="text-button challenge-back" href={`#${homeForRole(user.role)}`}>← VOLTAR AOS DESAFIOS</a>
    {loading && <div className="loader">CARREGANDO DESAFIO<span>_</span></div>}
    {error && <div className="form-error" role="alert">{error} <button className="text-button" onClick={load}>TENTAR NOVAMENTE</button></div>}
    {message && <div className="form-success" role="status">{message}</div>}
    {!loading && challenge && <>
      <PageHeader eyebrow="DESAFIO / CTF" title={editing ? "Editar enunciado" : challenge.title} description={challenge.company_name} />
      {editing ? <ChallengeForm challenge={challenge} onCancel={() => setEditing(false)} onCreated={(saved) => { setChallenge(saved); setEditing(false); setMessage(user.role === "company" && saved.status === "draft" ? "Enunciado salvo como rascunho. Envie o desafio para aprovação antes de publicar." : "Enunciado atualizado."); }} /> : <article className="challenge-card challenge-detail">
        <div className="challenge-top"><Status value={challenge.status} /><span>{challenge.level}</span></div>
        {canManage && challenge.status === "pending_review" && <p className="review-note">{user.role === "admin" ? "Revise o enunciado e os entregáveis antes de aprovar a publicação ou solicitar ajustes." : "Seu desafio está aguardando a aprovação da administração. Ele ainda não aparece para os talentos."}</p>}
        {canManage && challenge.review_feedback && <div className="review-note"><strong>Ajustes solicitados pela administração</strong><p className="challenge-content">{challenge.review_feedback}</p></div>}
        <dl><div><dt>Prazo</dt><dd>{challenge.deadline ? new Date(`${challenge.deadline.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "A definir"}</dd></div><div><dt>Formato</dt><dd>{challenge.work_mode || "Remoto"}</dd></div><div><dt>Participantes</dt><dd>{challenge.participant_count ?? 0}</dd></div></dl>
        <h2>Enunciado do desafio</h2><p className="challenge-content">{challenge.description}</p>
        <h2>Entregáveis</h2><p className="challenge-content">{challenge.deliverables || "Apresente sua análise, as evidências e as recomendações para o cenário descrito."}</p>
        <div className="tag-row">{(challenge.skills || []).map((skill) => <span key={skill}>{skill}</span>)}</div>
        {challenge.status !== "published" && user.role === "talent" && <p>Este desafio não está recebendo novas soluções.</p>}
        <div className="card-actions">
          {user.role === "talent" && challenge.status === "published" && !challenge.participation && <button className="primary-button" disabled={busy} onClick={join}>PARTICIPAR →</button>}
          {(canSubmit || canOpenCoding) && <button className="primary-button" onClick={() => setModal(true)}>{canOpenCoding ? challenge.status === "closed" ? "CONSULTAR CÓDIGO E RESULTADOS →" : "ABRIR EDITOR →" : challenge.latest_submission ? "EDITAR ENTREGA →" : "ENVIAR SOLUÇÃO →"}</button>}
          {user.role === "talent" && challenge.participation && <Status value={challenge.participation.status} />}
          {canManage && <>
            {codingEditable && <button className="outline-button" disabled={busy} onClick={() => setCodingSettingsOpen(true)}>CONFIGURAR CÓDIGO</button>}
            {challenge.coding_enabled && !codingEditable && <button className="outline-button" disabled={busy} onClick={() => setCodingSettingsOpen(true)}>{user.role === "admin" ? "REVISAR AVALIAÇÃO POR CÓDIGO" : "VER AVALIAÇÃO POR CÓDIGO"}</button>}
            <button className="outline-button" disabled={busy} onClick={() => setEditing(true)}>EDITAR ENUNCIADO</button>
            {user.role === "company" && ["draft", "changes_requested", "closed"].includes(challenge.status) && <button className="primary-button" disabled={busy} onClick={() => changeStatus("submit_review")}>ENVIAR PARA APROVAÇÃO →</button>}
            {user.role === "admin" && challenge.status === "pending_review" && <>
              <button className="primary-button" disabled={busy} aria-busy={pendingAction === "approve"} onClick={() => changeStatus("approve")}>{pendingAction === "approve" ? "APROVANDO..." : "APROVAR E PUBLICAR →"}</button>
              <button className="outline-button" disabled={busy} onClick={() => setReviewOpen(!reviewOpen)}>SOLICITAR AJUSTES</button>
            </>}
            {challenge.status === "published" && <button className="outline-button" disabled={busy} onClick={() => changeStatus("close")}>ENCERRAR DESAFIO</button>}
            {user.role === "admin" && !["draft", "pending_review"].includes(challenge.status) && <button className="outline-button" disabled={busy} onClick={() => changeStatus("draft")}>VOLTAR A RASCUNHO</button>}
          </>}
        </div>
        {user.role === "admin" && challenge.status === "pending_review" && reviewOpen && <form className="review-form" onSubmit={(event) => { event.preventDefault(); const feedback = new FormData(event.currentTarget).get("feedback"); changeStatus("request_changes", { feedback }); }}>
          <label>Ajustes necessários<textarea name="feedback" required maxLength={2000} rows="4" placeholder="Explique para a empresa o que precisa ser corrigido..." /></label>
          <button className="primary-button small" disabled={busy}>ENVIAR SOLICITAÇÃO DE AJUSTES</button>
        </form>}
      </article>}
    </>}
    {modal && challenge && (canOpenCoding ? <CodingWorkspace key={`${user._id}_${challenge._id}`} challenge={challenge} onClose={() => setModal(false)} onUpdated={load} /> : <SubmissionModal challenge={challenge} onClose={() => setModal(false)} onDone={(text) => { setMessage(text); load(); }} />)}
    {codingSettingsOpen && challenge && canManage && <CodingSettings challenge={challenge} readOnly={!codingEditable} onClose={() => setCodingSettingsOpen(false)} onSaved={async () => { setMessage("Avaliação por código salva. Envie o desafio para aprovação quando estiver pronto."); await load(); }} />}
    {toast && <Toast {...toast} onClose={() => setToast(null)} />}
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
      setToast({ message: challengeActionMessage(action) });
      await load();
    } catch (err) { setToast({ message: err.message, kind: "error" }); }
  }
  const filtered = challenges.filter((item) => (!status || item.status === status) && `${item.title} ${item.company_name}`.toLocaleLowerCase("pt-BR").includes(query.trim().toLocaleLowerCase("pt-BR")));
  return <DashboardLayout role="admin" active="challenges" setActive={() => {}}>
    <PageHeader eyebrow="ADMINISTRAÇÃO RETURN TECH" title="Administração de CTFs" description="Revise os desafios enviados pelas empresas. Apenas os aprovados ficam disponíveis para os talentos." />
    {error && <div className="form-error" role="alert">{error} <button className="text-button" onClick={load}>TENTAR NOVAMENTE</button></div>}
    {loading ? <div className="loader">CARREGANDO CTFS<span>_</span></div> : <>
      <div className="metrics"><Metric number={challenges.length} label="Total de desafios" detail="Todas as empresas" /><Metric number={challenges.filter((item) => item.status === "published").length} label="Publicados" detail="Disponíveis para talentos" /><Metric number={challenges.filter((item) => item.status === "pending_review").length} label="Aguardando aprovação" detail="Revisão da administração" /><Metric number={challenges.filter((item) => item.status === "closed").length} label="Encerrados" detail="Sem novas entregas" /></div>
      <div className="form-grid challenge-filters">
        <label>Buscar desafio ou empresa<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Digite o título ou a empresa..." /></label>
        <label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Todos</option><option value="pending_review">Aguardando aprovação</option><option value="changes_requested">Ajustes solicitados</option><option value="draft">Rascunhos</option><option value="published">Publicados</option><option value="closed">Encerrados</option>
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
    try { const result = await api("/profile", { method: "PATCH", body: JSON.stringify(fields) }); setUser(result.profile); localStorage.setItem("return_tech_user", JSON.stringify(result.profile)); setMessage("Perfil atualizado."); onSaved(); } catch (err) { setMessage(err.message); }
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
  if (route === "/login/talent") return <AuthPage mode="login" role="talent" />;
  if (route === "/login/company") return <AuthPage mode="login" role="company" />;
  if (route === "/cadastro") return <Landing register />;
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
  if (path === "/talentos") return user?.role === "talent" ? <TalentDashboard initialActive={["explore", "participations", "portfolio", "profile"].includes(section) ? section : "explore"} /> : <AuthPage mode="login" role="talent" />;
  if (path === "/empresas") return user?.role === "company" ? <CompanyDashboard initialActive={["overview", "publish", "evaluations", "shortlist", "profile"].includes(section) ? section : "overview"} /> : <AuthPage mode="login" role="company" />;
  if (user) { go(homeForRole(user.role)); return null; }
  return <Landing />;
}

export default App;
