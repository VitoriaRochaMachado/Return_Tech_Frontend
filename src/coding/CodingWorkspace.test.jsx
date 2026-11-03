import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import CodingWorkspace from "./CodingWorkspace";
import CodingSettings from "./CodingSettings";
import CodingResults from "./CodingResults";
import App from "../App";
import { useAuth } from "../AuthContext";
import { api } from "../api";

vi.mock("../api", () => ({ api: vi.fn(), downloadSubmission: vi.fn() }));
vi.mock("../AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("./CodeEditor", () => ({ default: ({ value, onChange }) => <textarea aria-label="Editor de código" value={value} onChange={(event) => onChange(event.target.value)} /> }));

const challenge = { _id: "challenge-1", title: "Análise de eventos", description: "Conte os eventos.", deliverables: "Um programa Python.", coding_enabled: true, coding_max_points: 100 };
const detail = () => ({ config: { languages: ["python"], max_points: 100, cpu_time_limit: 2, example: { stdin: "FAIL\n", expected_output: "1\n" }, starter_code: { python: "import sys\n" } }, language_options: [{ key: "python", name: "Python", editor: "python" }], runner_configured: true, can_submit: true, best_score: 0, latest_job: null });
const processing = () => ({ _id: "job-1", mode: "submit", status: "processing" });

beforeEach(() => {
  api.mockReset();
  sessionStorage.clear();
  localStorage.clear();
  window.location.hash = "";
  useAuth.mockReturnValue({ user: { _id: "candidate-1", role: "talent" }, checking: false });
});
afterEach(cleanup);

describe("candidate submissions", () => {
  it("shows a read-only example and no experimental input or run button", async () => {
    api.mockResolvedValue(detail());
    render(<CodingWorkspace challenge={challenge} onClose={() => {}} />);
    expect((await screen.findByLabelText("Editor de código")).value).toContain("import sys");
    expect(screen.getByText("Conte os eventos.")).toBeTruthy();
    expect(screen.getByText("Exemplo de entrada")).toBeTruthy();
    expect(screen.queryByLabelText("Entrada para experimentar")).toBeNull();
    expect(screen.queryByRole("button", { name: "EXECUTAR", exact: true })).toBeNull();
    expect(screen.getByRole("button", { name: "ENVIAR SOLUÇÃO →", exact: true }).disabled).toBe(false);
    expect(screen.getByText(/pontuação é proporcional/)).toBeTruthy();
  });

  it.each([[50, "50", 3], [66.67, "66,67", 4], [100, "100", 6]])("submits only code and language and displays %s points", async (score, display, passed) => {
    const updated = vi.fn();
    api.mockResolvedValueOnce(detail()).mockResolvedValueOnce({ job: processing() }).mockResolvedValueOnce({
      job: { _id: "job-1", mode: "submit", status: "completed", score, max_points: 100, passed, total: 6,
        results: [{ number: 1, passed: true, status: "Correto" }], output: { stdout: "PRIVATE OUTPUT" } }, best_score: score,
    });
    render(<CodingWorkspace challenge={challenge} onClose={() => {}} onUpdated={updated} />);
    fireEvent.change(await screen.findByLabelText("Editor de código"), { target: { value: "print(1)" } });
    fireEvent.click(screen.getByRole("button", { name: "ENVIAR SOLUÇÃO →", exact: true }));
    await screen.findByText(`${display} / 100 pontos · ${passed} de 6 casos corretos`, {}, { timeout: 4000 });
    expect(JSON.parse(api.mock.calls[1][1].body)).toEqual({ mode: "submit", language: "python", source_code: "print(1)" });
    expect(document.querySelector(".code-score strong").textContent).toBe(`${display} / 100`);
    expect(screen.queryByText("PRIVATE OUTPUT")).toBeNull();
    await waitFor(() => expect(updated).toHaveBeenCalledTimes(2));
  });

  it("keeps the best grade while displaying a lower latest grade", async () => {
    api.mockResolvedValue({ ...detail(), best_score: 66.67, latest_job: {
      _id: "job-1", mode: "submit", status: "completed", score: 33.33, max_points: 100, passed: 2, total: 6,
      results: [{ number: 1, passed: false, status: "Resposta incorreta" }],
    } });
    render(<CodingWorkspace challenge={challenge} onClose={() => {}} />);
    await screen.findByText("33,33 / 100 pontos · 2 de 6 casos corretos");
    expect(document.querySelector(".code-score strong").textContent).toBe("66,67 / 100");
  });

  it("disables submission when the executor is unconfigured", async () => {
    api.mockResolvedValue({ ...detail(), runner_configured: false });
    render(<CodingWorkspace challenge={challenge} onClose={() => {}} />);
    const editor = await screen.findByLabelText("Editor de código");
    fireEvent.change(editor, { target: { value: "print(0)" } });
    expect(editor.value).toBe("print(0)");
    const submit = screen.getByRole("button", { name: "ENVIAR SOLUÇÃO →", exact: true });
    expect(submit.disabled).toBe(true);
    expect(submit.getAttribute("aria-busy")).toBe("false");
    fireEvent.click(submit);
    expect(api).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("alert").textContent).toContain("serviço de correção ainda não foi configurado");
  });

  it("preserves the draft after closing and opening the editor", async () => {
    api.mockResolvedValue(detail());
    const first = render(<CodingWorkspace challenge={challenge} onClose={() => {}} />);
    fireEvent.change(await screen.findByLabelText("Editor de código"), { target: { value: "print(42)" } });
    await waitFor(() => expect(sessionStorage.getItem("return_tech_code_candidate-1_challenge-1_python")).toBe("print(42)"));
    first.unmount();
    render(<CodingWorkspace challenge={challenge} onClose={() => {}} />);
    expect((await screen.findByLabelText("Editor de código")).value).toBe("print(42)");
  });

  it("does not show previously saved experimental runs", async () => {
    api.mockResolvedValue({ ...detail(), latest_job: { _id: "old-run", mode: "run", status: "completed", output: { stdout: "OLD EXPERIMENT" } } });
    render(<CodingWorkspace challenge={challenge} onClose={() => {}} />);
    await screen.findByLabelText("Editor de código");
    expect(screen.queryByText("OLD EXPERIMENT")).toBeNull();
    expect(screen.getByText("Escreva seu código e envie a solução para receber sua pontuação.")).toBeTruthy();
  });

  it("resumes pending correction and shows service errors without assigning a grade", async () => {
    api.mockResolvedValueOnce({ ...detail(), latest_job: processing() }).mockResolvedValueOnce({
      job: { _id: "job-1", mode: "submit", status: "service_error", error: "Executor indisponível; envie novamente." }, best_score: 0,
    });
    render(<CodingWorkspace challenge={challenge} onClose={() => {}} />);
    await screen.findByText("Executor indisponível; envie novamente.", {}, { timeout: 4000 });
    expect(screen.queryByText(/0 \/ 100 pontos ·/)).toBeNull();
  });

  it("lets the candidate read results after the deadline", async () => {
    api.mockResolvedValue({ ...detail(), can_submit: false, best_score: 100 });
    render(<CodingWorkspace challenge={challenge} onClose={() => {}} />);
    await screen.findByLabelText("Editor de código");
    expect(screen.getByText(/período de envio terminou/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "ENVIAR SOLUÇÃO →", exact: true }).disabled).toBe(true);
  });

  it("shows validation errors without losing the written code", async () => {
    api.mockResolvedValueOnce(detail()).mockRejectedValueOnce(new Error("Aguarde alguns segundos."));
    render(<CodingWorkspace challenge={challenge} onClose={() => {}} />);
    const editor = await screen.findByLabelText("Editor de código");
    fireEvent.change(editor, { target: { value: "print(7)" } });
    fireEvent.click(screen.getByRole("button", { name: "ENVIAR SOLUÇÃO →", exact: true }));
    await screen.findByText("Aguarde alguns segundos.");
    expect(editor.value).toBe("print(7)");
  });
});

describe("company configuration and results", () => {
  it("saves private evaluation cases through the owner endpoint", async () => {
    const config = { ...detail().config, tests: [{ stdin: "SECRET", expected_output: "1" }] };
    api.mockResolvedValueOnce({ config, editable: true }).mockResolvedValueOnce({ ok: true });
    const onSaved = vi.fn();
    render(<CodingSettings challenge={challenge} onClose={() => {}} onSaved={onSaved} />);
    const field = await screen.findByLabelText("Configuração dos testes");
    await waitFor(() => expect(field.value).toContain("SECRET"));
    expect(screen.getByText(/pontuação é proporcional/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "SALVAR AVALIAÇÃO POR CÓDIGO" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(JSON.parse(api.mock.calls[1][1].body).tests[0].stdin).toBe("SECRET");
  });

  it("shows fractional candidate points and source in company results", async () => {
    api.mockResolvedValue({ results: [{ talent_id: "candidate-1", name: "Candidato", score: 66.67, attempts: 2, source_code: "print(1)", latest_job: { status: "completed", passed: 4, total: 6, language: "python" } }] });
    render(<CodingResults challenges={[challenge]} />);
    expect(await screen.findByRole("heading", { name: "Candidato" })).toBeTruthy();
    expect(screen.getByText("2 envio(s) para correção")).toBeTruthy();
    expect(screen.getByText("66,67")).toBeTruthy();
    expect(screen.getByText("print(1)")).toBeTruthy();
  });

  it("shows the challenge creation form without demonstration tools", async () => {
    window.location.hash = "#/empresas";
    useAuth.mockReturnValue({ user: { _id: "owner-1", name: "Empresa", role: "company" }, checking: false, logout: vi.fn() });
    api.mockResolvedValue({ challenges: [], submissions: [], profile: { organization_name: "Empresa" } });
    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "+ NOVO DESAFIO" }));
    expect(await screen.findByRole("button", { name: "SALVAR COMO RASCUNHO →" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "CRIAR DEMONSTRAÇÃO" })).toBeNull();
    expect(screen.queryByText("Teste o editor e a pontuação")).toBeNull();
  });

  it("guides companies without configured challenges to the real configuration flow", () => {
    render(<CodingResults challenges={[]} />);
    expect(screen.getByText("Nenhum desafio de código")).toBeTruthy();
    expect(screen.queryByText(/demonstração/i)).toBeNull();
  });

  it("loads results when configured challenges arrive after the component mounts", async () => {
    api.mockResolvedValue({ results: [{ talent_id: "candidate-1", name: "Candidato assíncrono", score: 50, attempts: 1 }] });
    const view = render(<CodingResults challenges={[]} />);
    expect(api).not.toHaveBeenCalled();
    view.rerender(<CodingResults challenges={[challenge]} />);
    expect(await screen.findByRole("heading", { name: "Candidato assíncrono" })).toBeTruthy();
    expect(api).toHaveBeenCalledWith("/challenges/challenge-1/coding/results");
  });

  it("keeps locked configurations read-only and does not offer a save action", async () => {
    api.mockResolvedValue({ config: { ...detail().config, tests: [{ stdin: "PRIVATE CASE", expected_output: "1" }] }, editable: false, lock_reason: "Este desafio já recebeu tentativas." });
    render(<CodingSettings challenge={challenge} onClose={() => {}} onSaved={vi.fn()} />);
    const field = await screen.findByLabelText("Configuração dos testes");
    expect(field.readOnly).toBe(true);
    expect(screen.getByText("Este desafio já recebeu tentativas.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "SALVAR AVALIAÇÃO POR CÓDIGO" })).toBeNull();
    expect(api).toHaveBeenCalledTimes(1);
  });

  it("only offers configuration for the owner's editable draft", async () => {
    window.location.hash = "#/empresas";
    useAuth.mockReturnValue({ user: { _id: "owner-1", name: "Empresa", role: "company" }, checking: false, logout: vi.fn() });
    api.mockResolvedValue({ challenges: [
      { ...challenge, _id: "own-draft", title: "Meu rascunho", owner_id: "owner-1", status: "draft", coding_editable: true },
      { ...challenge, _id: "locked-draft", title: "Rascunho com tentativas", owner_id: "owner-1", status: "draft", coding_editable: false },
      { ...challenge, _id: "other-draft", title: "Outro proprietário", owner_id: "owner-2", status: "draft", coding_editable: true },
      { ...challenge, _id: "published", title: "Publicado", owner_id: "owner-1", status: "published", coding_editable: false },
    ], submissions: [], profile: { organization_name: "Empresa" } });
    render(<App />);
    const configure = await screen.findByRole("button", { name: "CONFIGURAR CÓDIGO", exact: true });
    expect(configure.closest("article").textContent).toContain("Meu rascunho");
    expect(screen.getAllByRole("button", { name: "CONFIGURAR CÓDIGO", exact: true })).toHaveLength(1);
  });
});

describe("integration with existing project flows", () => {
  it("counts selected code and legacy report participation once across versions", async () => {
    window.location.hash = "#/talentos";
    const selectedParticipation = { _id: "participation-1", status: "shortlisted" };
    const legacyParticipation = { _id: "participation-2", status: "submitted" };
    const legacyChallenge = { _id: "legacy-challenge", title: "Relatório" };
    api.mockResolvedValue({
      challenges: [{ ...challenge, status: "published", participation: selectedParticipation }], profile: {},
      coding_submissions: [1, 2].map((version) => ({ _id: `job-${version}`, kind: "code", challenge, participation: selectedParticipation })),
      submissions: [1, 2].map((version) => ({ _id: `report-${version}`, challenge: legacyChallenge, participation: legacyParticipation, evaluation: { decision: "shortlisted" } })),
    });
    render(<App />);
    const label = await screen.findByText("Shortlists");
    expect(label.closest(".metric").querySelector("strong").textContent).toBe("2");
  });

  it("creates a code challenge with friendly fields and resets to report creation", async () => {
    window.location.hash = "#/empresas?aba=publish";
    useAuth.mockReturnValue({ user: { _id: "owner-1", name: "Empresa", role: "company" }, checking: false, logout: vi.fn() });
    const requests = [];
    api.mockImplementation(async (path, options) => {
      if (path === "/dashboard") return { challenges: [], submissions: [], profile: { organization_name: "Empresa" } };
      if (path === "/challenges" && options.method === "POST") {
        const fields = JSON.parse(options.body);
        requests.push(fields);
        return { challenge: { ...fields, _id: `created-${requests.length}`, status: "draft", coding_enabled: Boolean(fields.coding_config) } };
      }
      throw new Error(`Unexpected endpoint: ${path}`);
    });
    function fillChallenge(title) {
      fireEvent.change(screen.getByLabelText("Título do desafio"), { target: { value: title } });
      fireEvent.change(screen.getByLabelText("Enunciado do desafio"), { target: { value: "Some os valores recebidos na entrada." } });
      fireEvent.change(screen.getByLabelText("Entregáveis"), { target: { value: "Uma solução para o problema." } });
      fireEvent.change(screen.getByLabelText("Competências"), { target: { value: "Python, Lógica" } });
      fireEvent.change(screen.getByLabelText("Prazo"), { target: { value: "2099-12-31" } });
    }
    render(<App />);
    await screen.findByLabelText("Tipo de desafio");
    fillChallenge("Soma de valores");
    fireEvent.change(screen.getByLabelText("Tipo de desafio"), { target: { value: "code" } });
    expect(screen.getByLabelText("Python").checked).toBe(true);
    fireEvent.click(screen.getByLabelText("JavaScript"));
    fireEvent.change(screen.getByLabelText("Pontuação máxima"), { target: { value: "250" } });
    fireEvent.change(screen.getByLabelText("Entrada do exemplo"), { target: { value: "1 2" } });
    fireEvent.change(screen.getByLabelText("Saída esperada do exemplo"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Entrada do caso privado 1"), { target: { value: "5 7" } });
    fireEvent.change(screen.getByLabelText("Saída esperada do caso privado 1"), { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: "ADICIONAR CASO" }));
    fireEvent.change(screen.getByLabelText("Entrada do caso privado 2"), { target: { value: "10 20" } });
    fireEvent.change(screen.getByLabelText("Saída esperada do caso privado 2"), { target: { value: "30" } });
    fireEvent.click(screen.getByRole("button", { name: "SALVAR COMO RASCUNHO →" }));
    await waitFor(() => expect(screen.getByLabelText("Tipo de desafio").value).toBe("report"));
    expect(requests).toHaveLength(1);
    expect(requests[0].coding_config).toEqual({ languages: ["python", "javascript"], max_points: 250, cpu_time_limit: 2, memory_limit_kb: 128000, starter_code: {}, example: { stdin: "1 2", expected_output: "3" }, tests: [{ stdin: "5 7", expected_output: "12" }, { stdin: "10 20", expected_output: "30" }] });
    expect(screen.queryByLabelText("Entrada do caso privado 1")).toBeNull();
    fillChallenge("Relatório de análise");
    fireEvent.click(screen.getByRole("button", { name: "SALVAR COMO RASCUNHO →" }));
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[1]).not.toHaveProperty("coding_config");
    expect(api.mock.calls.some(([path]) => path.endsWith("/coding/config"))).toBe(false);
  });

  it("shows reports and code in company evaluations and shortlists the author's profile directly", async () => {
    window.location.hash = "#/empresas?aba=evaluations";
    useAuth.mockReturnValue({ user: { _id: "owner-1", name: "Empresa", role: "company" }, checking: false, logout: vi.fn() });
    const talent = { _id: "candidate-1", name: "Ana Silva", email: "ana@example.test", headline: "Analista de segurança", city: "São Paulo", bio: "Investigo incidentes e automatizo análises.", talent_type: "professional", skills: ["Python", "SOC"] };
    const reportChallenge = { _id: "report-challenge", title: "Investigação de incidente" };
    let selected = false;
    let finishShortlist;
    api.mockImplementation(async (path) => {
      if (path === "/dashboard") return {
        challenges: [], profile: { organization_name: "Empresa" },
        submissions: [{ _id: "report-1", version: 1, summary: "Relatório completo de investigação", created_at: "2026-01-01T10:00:00Z", talent, challenge: reportChallenge, participation: { _id: "participation-report", status: "submitted" }, shortlisted: selected }],
        coding_submissions: [{ kind: "code", _id: "job-1", source_code: "print(0)", status: "completed", score: 0, max_points: 100, passed: 0, total: 4, language: "python", created_at: "2026-01-02T10:00:00Z", talent, challenge, participation: { _id: "participation-code", status: "submitted" }, shortlisted: selected }],
        shortlist: selected ? [{ talent, challenges: [reportChallenge, challenge] }] : [],
      };
      if (path === "/participations/participation-code/shortlist") return new Promise((resolve) => { finishShortlist = () => { selected = true; resolve({ ok: true }); }; });
      throw new Error(`Unexpected endpoint: ${path}`);
    });
    render(<App />);
    await screen.findByText("Relatório completo de investigação");
    expect(screen.getAllByText("ana@example.test")).toHaveLength(2);
    expect(screen.getByText("0 / 100 pontos")).toBeTruthy();
    expect(screen.getByText("print(0)")).toBeTruthy();
    const cards = document.querySelectorAll(".evaluation-card");
    expect(cards[0].textContent).toContain("VER CÓDIGO ENVIADO");
    expect(cards[1].textContent).toContain("Relatório completo de investigação");
    expect(screen.getAllByRole("button", { name: "ADICIONAR À SHORTLIST" })).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "AVALIAR →" }));
    expect(screen.getByLabelText("Nota (0 a 100)")).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: "ADICIONAR À SHORTLIST" })[0]);
    const adding = screen.getByRole("button", { name: "ADICIONANDO..." });
    expect(adding.disabled).toBe(true);
    expect(adding.getAttribute("aria-busy")).toBe("true");
    expect(api).toHaveBeenCalledWith("/participations/participation-code/shortlist", { method: "POST" });
    finishShortlist();
    await waitFor(() => expect(screen.getAllByRole("button", { name: "NA SHORTLIST" })).toHaveLength(2));
    fireEvent.click(screen.getByRole("button", { name: /Shortlist$/ }));
    await screen.findByText("Investigo incidentes e automatizo análises.");
    expect(document.querySelectorAll(".talent-card")).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "Ana Silva" })).toBeTruthy();
    expect(screen.getByText("ana@example.test")).toBeTruthy();
    expect(screen.getByText("Analista de segurança")).toBeTruthy();
    expect(screen.getByText("Profissional")).toBeTruthy();
    expect(screen.getByText("São Paulo")).toBeTruthy();
    expect(screen.getByText("Investigação de incidente")).toBeTruthy();
    expect(screen.getByText("Análise de eventos")).toBeTruthy();
    expect(screen.getByRole("link", { name: "ENTRAR EM CONTATO →" }).getAttribute("href")).toBe("mailto:ana@example.test");
  });

  it("edits the current report, keeps its attachment, and stops editing after closure", async () => {
    const original = { _id: "report-current", version: 2, summary: "Análise original", report_url: "https://example.test/original", file_name: "relatorio.pdf" };
    let current = { ...challenge, coding_enabled: false, status: "published", deadline: "2099-12-31", participation: { status: "shortlisted" }, latest_submission: original };
    let sent;
    api.mockImplementation(async (path, options) => {
      if (path === "/dashboard") return { challenges: [current], submissions: [
        { ...original, _id: "report-old", version: 1, challenge: current, participation: current.participation },
        { ...current.latest_submission, challenge: current, participation: current.participation },
      ], profile: {} };
      if (path === "/challenges/challenge-1") return { challenge: current };
      if (path === "/challenges/challenge-1/submissions") {
        sent = options.body;
        current = { ...current, latest_submission: { ...original, _id: "report-new", version: 3, summary: sent.get("summary"), report_url: sent.get("report_url") } };
        return { submission: current.latest_submission };
      }
      throw new Error(`Unexpected endpoint: ${path}`);
    });
    window.location.hash = "#/talentos?aba=portfolio";
    const view = render(<App />);
    const edit = await screen.findByRole("link", { name: "EDITAR ENTREGA →" });
    expect(screen.getAllByRole("link", { name: "EDITAR ENTREGA →" })).toHaveLength(1);
    fireEvent.click(edit);
    fireEvent.click(await screen.findByRole("button", { name: "EDITAR ENTREGA →" }));
    expect(screen.getByLabelText("Resumo da solução").value).toBe("Análise original");
    expect(screen.getByLabelText("Link complementar").value).toBe("https://example.test/original");
    expect(screen.getByText(/Se não selecionar outro arquivo, ele será mantido/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Resumo da solução"), { target: { value: "Análise revisada" } });
    fireEvent.change(screen.getByLabelText("Link complementar"), { target: { value: "https://example.test/revised" } });
    fireEvent.click(screen.getByRole("button", { name: "SALVAR ALTERAÇÕES →" }));
    await screen.findByText("Entrega atualizada com sucesso.");
    expect(sent.get("summary")).toBe("Análise revisada");
    expect(sent.get("report_url")).toBe("https://example.test/revised");
    expect(sent.get("previous_submission_id")).toBe("report-current");
    expect(sent.get("file").size).toBe(0);
    view.unmount();
    current = { ...current, status: "closed" };
    window.location.hash = "#/talentos?aba=portfolio";
    render(<App />);
    await screen.findByText("Análise revisada");
    expect(screen.queryByRole("link", { name: "EDITAR ENTREGA →" })).toBeNull();
  });

  it("keeps every code attempt and report accessible in the portfolio", async () => {
    window.location.hash = "#/talentos?aba=portfolio";
    api.mockResolvedValue({
      challenges: [], profile: { name: "Talento" },
      submissions: [{ _id: "report-1", summary: "Minha análise completa", report_url: "https://example.test/report", challenge: { _id: "report-challenge", title: "Relatório de segurança" }, participation: { status: "submitted" } }],
      coding_submissions: [
        { _id: "attempt-1", kind: "code", source_code: "print(0)", language: "python", status: "completed", score: 0, max_points: 100, challenge },
        { _id: "attempt-2", kind: "code", source_code: "print(42)", language: "python", status: "completed", score: 100, max_points: 100, challenge },
        { _id: "attempt-3", kind: "code", source_code: "print(7)", language: "python", status: "processing", challenge },
      ],
    });
    render(<App />);
    expect(await screen.findByText("Minha análise completa")).toBeTruthy();
    expect(screen.getByText("0 / 100")).toBeTruthy();
    expect(screen.getByText("100 / 100")).toBeTruthy();
    expect(screen.getByText("Corrigindo sua solução...")).toBeTruthy();
    expect(screen.getAllByText("VER CÓDIGO ENVIADO")).toHaveLength(3);
    fireEvent.click(screen.getAllByText("VER CÓDIGO ENVIADO")[0]);
    expect(screen.getByText("print(0)")).toBeTruthy();
    expect(screen.getByText("print(42)")).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "VER DESAFIO →" })).toHaveLength(4);
    expect(screen.getByRole("link", { name: "ABRIR LINK" }).getAttribute("href")).toBe("https://example.test/report");
  });

  it("announces a rejected approval and allows another attempt without publishing", async () => {
    const reviewed = { ...challenge, status: "pending_review", revision: 7, owner_id: "owner-1" };
    window.location.hash = "#/desafios/challenge-1";
    useAuth.mockReturnValue({ user: { _id: "admin-1", name: "Admin", role: "admin" }, checking: false, logout: vi.fn() });
    api.mockImplementation(async (path) => {
      if (path === "/challenges/challenge-1") return { challenge: reviewed };
      if (path === "/challenges/challenge-1/status") {
        const error = new Error("O prazo do desafio já terminou. Atualize o prazo antes de aprovar a publicação.");
        error.status = 409;
        throw error;
      }
      throw new Error(`Unexpected endpoint: ${path}`);
    });
    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "APROVAR E PUBLICAR →" }));
    const notice = await screen.findByRole("alert", { name: "Erro na operação" });
    expect(notice.textContent).toContain("O prazo do desafio já terminou.");
    expect(screen.getByRole("button", { name: "APROVAR E PUBLICAR →" }).disabled).toBe(false);
    expect(screen.getByText("Aguardando aprovação")).toBeTruthy();
    expect(screen.queryByText("Desafio aprovado e publicado para os talentos.")).toBeNull();
  });

  it("shows approval progress and blocks repeated clicks while the request is pending", async () => {
    const reviewed = { ...challenge, status: "pending_review", revision: 7, owner_id: "owner-1" };
    let rejectApproval;
    const pending = new Promise((resolve, reject) => { rejectApproval = reject; });
    window.location.hash = "#/desafios/challenge-1";
    useAuth.mockReturnValue({ user: { _id: "admin-1", name: "Admin", role: "admin" }, checking: false, logout: vi.fn() });
    api.mockImplementation((path) => {
      if (path === "/challenges/challenge-1") return Promise.resolve({ challenge: reviewed });
      if (path === "/challenges/challenge-1/status") return pending;
      return Promise.reject(new Error(`Unexpected endpoint: ${path}`));
    });
    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "APROVAR E PUBLICAR →" }));
    const approving = await screen.findByRole("button", { name: "APROVANDO..." });
    expect(approving.disabled).toBe(true);
    expect(approving.getAttribute("aria-busy")).toBe("true");
    fireEvent.click(approving);
    expect(api.mock.calls.filter(([path]) => path.endsWith("/status"))).toHaveLength(1);
    rejectApproval(new Error("Não foi possível concluir a aprovação."));
    await screen.findByRole("alert", { name: "Erro na operação" });
    expect(screen.getByRole("button", { name: "APROVAR E PUBLICAR →" }).disabled).toBe(false);
  });

  it("preserves the administration route, private code review and approval with revision", async () => {
    const reviewed = { ...challenge, status: "pending_review", revision: 7, owner_id: "owner-1", company_name: "Empresa" };
    let status = "pending_review";
    window.location.hash = "#/admin";
    useAuth.mockReturnValue({ user: { _id: "admin-1", name: "Admin", role: "admin" }, checking: false, logout: vi.fn() });
    api.mockImplementation(async (path, options) => {
      if (path === "/admin/challenges") return { challenges: [reviewed] };
      if (path === "/challenges/challenge-1/coding/config") return { config: { ...detail().config, tests: [{ stdin: "ADMIN PRIVATE CASE", expected_output: "1" }] }, editable: false };
      if (path === "/challenges/challenge-1/status") { status = "published"; return { ok: true }; }
      if (path === "/challenges/challenge-1") return { challenge: { ...reviewed, status } };
      throw new Error(`Unexpected endpoint: ${path}`);
    });
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Administração de CTFs" })).toBeTruthy();
    expect(await screen.findByRole("link", { name: "REVISAR DESAFIO →" })).toBeTruthy();
    window.location.hash = "#/desafios/challenge-1";
    fireEvent(window, new Event("hashchange"));
    fireEvent.click(await screen.findByRole("button", { name: "REVISAR AVALIAÇÃO POR CÓDIGO" }));
    const field = await screen.findByLabelText("Configuração dos testes");
    expect(field.value).toContain("ADMIN PRIVATE CASE");
    expect(field.readOnly).toBe(true);
    expect(screen.queryByRole("button", { name: "SALVAR AVALIAÇÃO POR CÓDIGO" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Fechar configuração" }));
    fireEvent.click(screen.getByRole("button", { name: "APROVAR E PUBLICAR →" }));
    await screen.findByText("Desafio aprovado e publicado para os talentos.");
    const approval = api.mock.calls.find(([path]) => path.endsWith("/status"));
    expect(JSON.parse(approval[1].body)).toEqual({ action: "approve", review_revision: 7 });
  });

  it("imports saved legacy participation once and shows only the real challenge and portfolio entry", async () => {
    window.location.hash = "#/talentos";
    const saved = JSON.stringify({ "demo-sentinel-fintech": { participation: { status: "submitted" }, submission: { summary: "Minha análise dos alertas", report_url: "https://example.test/analysis" } } });
    localStorage.setItem("return_tech_demo_challenges:candidate-1", saved);
    const submission = { _id: "imported-report", version: 1, summary: "Minha análise dos alertas", report_url: "https://example.test/analysis" };
    const realChallenge = { ...challenge, _id: "real-sentinel-id", legacy_id: "demo-sentinel-fintech", title: "Triagem de alertas de acesso suspeito", coding_enabled: false, status: "published", deadline: "2099-12-31", participation: { _id: "imported-participation", status: "submitted" }, latest_submission: submission };
    api.mockImplementation(async (path) => {
      if (path === "/legacy-participations/import") return { ok: true };
      if (path === "/dashboard") return { challenges: [realChallenge], submissions: [{ ...submission, challenge: realChallenge, participation: realChallenge.participation }], profile: { name: "Talento" } };
      if (path === "/challenges/real-sentinel-id") return { challenge: realChallenge };
      throw new Error(`Unexpected endpoint: ${path}`);
    });
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Triagem de alertas de acesso suspeito" })).toBeTruthy();
    expect(document.querySelectorAll(".challenge-card")).toHaveLength(1);
    expect(api.mock.calls[0][0]).toBe("/legacy-participations/import");
    expect(JSON.parse(api.mock.calls[0][1].body)).toEqual({ items: [{ legacy_id: "demo-sentinel-fintech", summary: "Minha análise dos alertas", report_url: "https://example.test/analysis" }] });
    fireEvent.click(screen.getByRole("button", { name: /Portfólio$/ }));
    await screen.findByText("Minha análise dos alertas");
    expect(document.querySelectorAll(".submission")).toHaveLength(1);
    const challengeLink = screen.getByRole("link", { name: "VER DESAFIO →" });
    expect(challengeLink.getAttribute("href")).toBe("#/desafios/real-sentinel-id");
    fireEvent.click(challengeLink);
    fireEvent.click(await screen.findByRole("button", { name: "EDITAR ENTREGA →" }));
    expect(screen.getByLabelText("Resumo da solução")).toBeTruthy();
    expect(screen.getByLabelText("Resumo da solução").value).toBe("Minha análise dos alertas");
    expect(screen.getByLabelText("Arquivo do relatório")).toBeTruthy();
    expect(screen.queryByLabelText("Editor de código")).toBeNull();
    expect(api.mock.calls.filter(([path]) => path === "/legacy-participations/import")).toHaveLength(1);
    expect(localStorage.getItem("return_tech_demo_challenges:candidate-1")).toBe(saved);
    expect(localStorage.getItem("return_tech_legacy_imported:candidate-1")).toBe(saved);
  });

  it("loads another user's own draft without copying code from the previous session", async () => {
    api.mockResolvedValue(detail());
    const view = render(<CodingWorkspace challenge={challenge} onClose={() => {}} />);
    fireEvent.change(await screen.findByLabelText("Editor de código"), { target: { value: "print(11)" } });
    sessionStorage.setItem("return_tech_code_candidate-2_challenge-1_python", "print(22)");
    useAuth.mockReturnValue({ user: { _id: "candidate-2", role: "talent" }, checking: false });
    view.rerender(<CodingWorkspace challenge={challenge} onClose={() => {}} />);
    await waitFor(() => expect(screen.getByLabelText("Editor de código").value).toBe("print(22)"));
    expect(sessionStorage.getItem("return_tech_code_candidate-2_challenge-1_python")).toBe("print(22)");
    expect(sessionStorage.getItem("return_tech_code_candidate-1_challenge-1_python")).toBe("print(11)");
  });
});
