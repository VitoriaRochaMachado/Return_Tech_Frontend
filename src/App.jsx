import { useCallback, useEffect, useMemo, useState } from "react";
import { api, downloadSubmission } from "./api";
import { useAuth } from "./AuthContext";

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

      <footer className="public-footer"><span>© 2026 RETURN_TECH</span><span>CONEXÕES BASEADAS EM COMPETÊNCIA</span></footer>
    </main>
  );
}

function AuthPage({ mode, role }) {
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
      go(data.user.role === "company" ? "/empresas" : "/talentos");
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
          <div className="eyebrow">{isLogin ? "ACESSO SEGURO" : role === "company" ? "ÁREA DA EMPRESA" : "ÁREA DE TALENTOS"}</div>
          <h1>{isLogin ? "Bem-vindo de volta." : role === "company" ? "Encontre quem sabe fazer." : "Mostre do que você é capaz."}</h1>
          <p>{isLogin ? "Entre para continuar de onde parou." : role === "company" ? "Publique desafios técnicos, avalie entregas e forme sua shortlist." : "Participe de desafios reais e transforme competência em oportunidade."}</p>
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
          <p className="auth-switch">{isLogin ? "Ainda não tem conta?" : "Já tem uma conta?"} <button type="button" onClick={() => go(isLogin ? "/" : "/login")}>{isLogin ? "Escolher perfil" : "Fazer login"}</button></p>
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
  const items = role === "company" ? companyItems : talentItems;
  return (
    <div className={`dashboard ${role === "company" ? "company-theme" : ""}`}>
      <aside className="sidebar">
        <Brand />
        <nav>{items.map(([key, label]) => <button key={key} className={active === key ? "active" : ""} onClick={() => setActive(key)}><span>0{items.findIndex((x) => x[0] === key) + 1}</span>{label}</button>)}</nav>
        <div className="sidebar-user"><div className="avatar">{(user?.name || "U").slice(0, 2).toUpperCase()}</div><div><strong>{user?.name}</strong><small>{role === "company" ? user?.organization_name : user?.headline || "Talento"}</small></div></div>
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
      <p>{challenge.description}</p>
      <div className="tag-row">{(challenge.skills || []).map((skill) => <span key={skill}>{skill}</span>)}</div>
      <dl>
        <div><dt>Prazo</dt><dd>{challenge.deadline ? new Date(challenge.deadline).toLocaleDateString("pt-BR") : "A definir"}</dd></div>
        <div><dt>Formato</dt><dd>{challenge.work_mode || "Remoto"}</dd></div>
        <div><dt>Participantes</dt><dd>{challenge.participant_count ?? 0}</dd></div>
      </dl>
      <div className="card-actions">
        {role === "talent" && challenge.status === "published" && !challenge.participation && <button className="primary-button small" onClick={() => onJoin(challenge._id)}>PARTICIPAR →</button>}
        {role === "talent" && ["joined", "submitted"].includes(challenge.participation?.status) && <button className="primary-button small" onClick={() => onSubmit(challenge)}>ENVIAR SOLUÇÃO →</button>}
        {role === "talent" && challenge.participation && <Status value={challenge.participation.status} />}
        {role === "company" && challenge.status === "draft" && <button className="primary-button small" onClick={() => onAction(challenge._id, "publish")}>PUBLICAR →</button>}
        {role === "company" && challenge.status === "published" && <button className="outline-button small" onClick={() => onAction(challenge._id, "close")}>ENCERRAR</button>}
      </div>
    </article>
  );
}

function SubmissionModal({ challenge, onClose, onDone }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api(`/challenges/${challenge._id}/submissions`, { method: "POST", body: new FormData(event.currentTarget) });
      onDone("Solução enviada com sucesso.");
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={(e) => e.stopPropagation()}><button className="modal-close" onClick={onClose}>×</button><div className="eyebrow">NOVA ENTREGA</div><h2>{challenge.title}</h2><form onSubmit={submit}><label>Resumo da solução<textarea name="summary" required rows="5" placeholder="Explique sua abordagem, decisões e resultados..." /></label><label>Link complementar<input type="url" name="report_url" placeholder="https://github.com/..." /></label><label>Arquivo do relatório<input type="file" name="file" /></label>{error && <div className="form-error">{error}</div>}<button className="primary-button" disabled={loading}>{loading ? "ENVIANDO..." : "ENVIAR SOLUÇÃO →"}</button></form></div></div>;
}

function TalentDashboard() {
  const [active, setActive] = useState("explore");
  const [data, setData] = useState({ challenges: [], submissions: [], profile: {} });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await api("/dashboard")); }
    catch (err) { setToast({ message: err.message, kind: "error" }); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function join(id) {
    try { await api(`/challenges/${id}/join`, { method: "POST" }); setToast({ message: "Inscrição confirmada!" }); await load(); }
    catch (err) { setToast({ message: err.message, kind: "error" }); }
  }

  const participations = useMemo(() => data.challenges.filter((item) => item.participation), [data]);
  const approved = useMemo(() => data.submissions.filter((item) => item.evaluation?.decision === "shortlisted"), [data]);

  return <DashboardLayout role="talent" active={active} setActive={setActive}>
    {loading && <div className="loader">CARREGANDO DADOS<span>_</span></div>}
    {!loading && active === "explore" && <>
      <PageHeader eyebrow="OPORTUNIDADES ABERTAS" title="Desafios para provar na prática." description="Escolha um processo seletivo e mostre como você resolve problemas reais." />
      <div className="metrics"><Metric number={data.challenges.filter((x) => x.status === "published").length} label="Desafios abertos" detail="Agora" /><Metric number={participations.length} label="Participações" detail="No total" /><Metric number={approved.length} label="Shortlists" detail="Conquistadas" /></div>
      <div className="card-grid">{data.challenges.length ? data.challenges.map((challenge) => <ChallengeCard key={challenge._id} challenge={challenge} role="talent" onJoin={join} onSubmit={setModal} />) : <EmptyState title="Nenhum desafio publicado" text="Quando uma empresa publicar um processo seletivo, ele aparecerá aqui." />}</div>
    </>}
    {!loading && active === "participations" && <><PageHeader eyebrow="MINHA JORNADA" title="Participações" description="Acompanhe cada etapa dos desafios em que você entrou." /><div className="card-grid">{participations.length ? participations.map((challenge) => <ChallengeCard key={challenge._id} challenge={challenge} role="talent" onJoin={join} onSubmit={setModal} />) : <EmptyState title="Você ainda não participa de desafios" text="Acesse Explorar e encontre uma oportunidade." />}</div></>}
    {!loading && active === "portfolio" && <><PageHeader eyebrow="EVIDÊNCIAS DE COMPETÊNCIA" title="Portfólio validado" description="Suas entregas e avaliações ficam reunidas aqui." /><div className="submission-list">{data.submissions.length ? data.submissions.map((item) => <article className="submission" key={item._id}><div><Status value={item.participation?.status || "submitted"} /><h3>{item.challenge?.title}</h3><p>{item.summary}</p><div className="tag-row">{(item.challenge?.skills || []).map((x) => <span key={x}>{x}</span>)}</div></div><div className="submission-side">{item.evaluation ? <><strong>{item.evaluation.score}/100</strong><small>{item.evaluation.feedback}</small></> : <small>Aguardando avaliação</small>}{item.file_name && <button className="outline-button small" onClick={() => downloadSubmission(item._id, item.file_name)}>BAIXAR ARQUIVO</button>}{item.report_url && <a className="outline-button small" href={item.report_url} target="_blank" rel="noreferrer">ABRIR LINK</a>}</div></article>) : <EmptyState title="Portfólio vazio" text="Envie uma solução para começar a construir suas evidências." />}</div></>}
    {!loading && active === "profile" && <ProfileForm profile={data.profile} role="talent" onSaved={load} />}
    {modal && <SubmissionModal challenge={modal} onClose={() => setModal(null)} onDone={(message) => { setToast({ message }); load(); }} />}
    {toast && <Toast {...toast} onClose={() => setToast(null)} />}
  </DashboardLayout>;
}

function ChallengeForm({ onCreated }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setLoading(true); setError("");
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    fields.skills = fields.skills.split(",").map((x) => x.trim()).filter(Boolean);
    try {
      await api("/challenges", { method: "POST", body: JSON.stringify(fields) });
      event.currentTarget.reset();
      onCreated();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }
  return <form className="editor-form" onSubmit={submit}>
    <div className="form-grid"><label className="wide">Título do desafio<input name="title" required placeholder="Ex.: Investigação de incidente em ambiente cloud" /></label><label>Nível<select name="level"><option>Júnior</option><option>Intermediário</option><option>Sênior</option></select></label><label>Modelo<select name="work_mode"><option>Remoto</option><option>Híbrido</option><option>Presencial</option></select></label><label className="wide">Contexto e objetivo<textarea name="description" required rows="6" placeholder="Descreva o cenário, o problema e o que espera da solução..." /></label><label className="wide">Entregáveis<textarea name="deliverables" required rows="4" placeholder="Relatório, recomendações, evidências..." /></label><label>Competências<input name="skills" required placeholder="SOC, AWS, Python" /></label><label>Prazo<input type="date" name="deadline" required /></label></div>
    {error && <div className="form-error">{error}</div>}
    <button className="primary-button" disabled={loading}>{loading ? "SALVANDO..." : "SALVAR COMO RASCUNHO →"}</button>
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

function CompanyDashboard() {
  const [active, setActive] = useState("overview");
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
    {!loading && active === "publish" && <><PageHeader eyebrow="NOVO PROCESSO SELETIVO" title="Crie um desafio técnico." description="Apresente um cenário real e defina as evidências que deseja receber." /><ChallengeForm onCreated={() => { setToast({ message: "Rascunho criado. Agora você pode publicá-lo." }); setActive("overview"); load(); }} /></>}
    {!loading && active === "evaluations" && <><PageHeader eyebrow="ANÁLISE TÉCNICA" title="Avalie as entregas." description="Dê uma nota, deixe feedback e escolha quem avança." /><div className="evaluation-list">{data.submissions.length ? data.submissions.map((item) => <EvaluationCard key={item._id} submission={item} onEvaluated={() => { setToast({ message: "Avaliação salva." }); load(); }} />) : <EmptyState title="Nenhuma entrega recebida" text="As soluções enviadas pelos participantes aparecerão aqui." />}</div></>}
    {!loading && active === "shortlist" && <><PageHeader eyebrow="TALENTOS SELECIONADOS" title="Sua shortlist." description="Perfis que se destacaram nos desafios técnicos." /><div className="talent-grid">{shortlisted.length ? shortlisted.map((item) => <article className="talent-card" key={item._id}><div className="avatar large">{item.talent?.name?.slice(0, 2).toUpperCase()}</div><h3>{item.talent?.name}</h3><p>{item.talent?.headline}</p><div className="score">{item.evaluation.score}<small>/100</small></div><strong>{item.challenge?.title}</strong><div className="tag-row">{(item.talent?.skills || []).map((skill) => <span key={skill}>{skill}</span>)}</div><a href={`mailto:${item.talent?.email}`} className="primary-button small">ENTRAR EM CONTATO →</a></article>) : <EmptyState title="Shortlist vazia" text="Avalie uma entrega como aprovada para adicionar o talento." />}</div></>}
    {!loading && active === "profile" && <ProfileForm profile={data.profile} role="company" onSaved={load} />}
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
  const { user, checking } = useAuth();
  if (checking) return <div className="app-loading"><Brand /><div className="loader">VALIDANDO SESSÃO<span>_</span></div></div>;
  if (route === "/login") return <AuthPage mode="login" />;
  if (route === "/cadastro/talent") return <AuthPage mode="register" role="talent" />;
  if (route === "/cadastro/company") return <AuthPage mode="register" role="company" />;
  if (route === "/talentos") return user?.role === "talent" ? <TalentDashboard /> : <AuthPage mode="login" />;
  if (route === "/empresas") return user?.role === "company" ? <CompanyDashboard /> : <AuthPage mode="login" />;
  if (user) { go(user.role === "company" ? "/empresas" : "/talentos"); return null; }
  return <Landing />;
}

export default App;
