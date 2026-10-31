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
    expect(updated).toHaveBeenCalledTimes(1);
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
    api.mockResolvedValueOnce({ config }).mockResolvedValueOnce({ ok: true });
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
    expect(screen.getByRole("button", { name: "SALVAR COMO RASCUNHO →" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "CRIAR DEMONSTRAÇÃO" })).toBeNull();
    expect(screen.queryByText("Teste o editor e a pontuação")).toBeNull();
  });

  it("guides companies without configured challenges to the real configuration flow", () => {
    render(<CodingResults challenges={[]} />);
    expect(screen.getByText("Nenhum desafio de código")).toBeTruthy();
    expect(screen.queryByText(/demonstração/i)).toBeNull();
  });
});
