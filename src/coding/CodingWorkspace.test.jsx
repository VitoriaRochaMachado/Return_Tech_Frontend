import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import CodingWorkspace from "./CodingWorkspace";
import CodingSettings from "./CodingSettings";
import CodingResults from "./CodingResults";
import { api } from "../api";

vi.mock("../api", () => ({ api: vi.fn() }));
vi.mock("../AuthContext", () => ({ useAuth: () => ({ user: { _id: "candidate-1" } }) }));
vi.mock("./CodeEditor", () => ({ default: ({ value, onChange }) => <textarea aria-label="Editor de código" value={value} onChange={(event) => onChange(event.target.value)} /> }));

const challenge = { _id: "challenge-1", title: "Análise de eventos", description: "Conte os eventos.", deliverables: "Um programa Python.", coding_enabled: true, coding_max_points: 100 };
const detail = () => ({ config: { languages: ["python"], max_points: 100, cpu_time_limit: 2, example: { stdin: "FAIL\n", expected_output: "1\n" }, starter_code: { python: "import sys\n" } }, language_options: [{ key: "python", name: "Python", editor: "python" }], runner_configured: true, can_submit: true, best_score: 0, latest_job: null });
const processing = (mode) => ({ _id: "job-1", mode, status: "processing" });

beforeEach(() => { api.mockReset(); sessionStorage.clear(); });
afterEach(cleanup);

describe("editor and correction workflow", () => {
  it("loads the instructions, example and editor", async () => {
    api.mockResolvedValue(detail());
    render(<CodingWorkspace challenge={challenge} onClose={() => {}} />);
    expect((await screen.findByLabelText("Editor de código")).value).toContain("import sys");
    expect(screen.getByText("Conte os eventos.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "EXECUTAR", exact: true }).disabled).toBe(false);
  });

  it("runs the code with the candidate input and displays stdout", async () => {
    api.mockResolvedValueOnce(detail()).mockResolvedValueOnce({ job: processing("run") }).mockResolvedValueOnce({
      job: { _id: "job-1", mode: "run", status: "completed", results: [{ passed: true }], output: { stdout: "1\n" } }, best_score: 0,
    });
    render(<CodingWorkspace challenge={challenge} onClose={() => {}} />);
    fireEvent.change(await screen.findByLabelText("Editor de código"), { target: { value: "print(1)" } });
    fireEvent.click(screen.getByRole("button", { name: "EXECUTAR", exact: true }));
    await screen.findByText("Execução concluída", {}, { timeout: 4000 });
    const payload = JSON.parse(api.mock.calls[1][1].body);
    expect(payload).toEqual({ mode: "run", language: "python", source_code: "print(1)", stdin: "FAIL\n" });
    expect(screen.getByText("Saída")).toBeTruthy();
    expect(screen.queryByText(/pontos ·/)).toBeNull();
  });

  it("displays awarded points and keeps private output out of the grading view", async () => {
    const updated = vi.fn();
    api.mockResolvedValueOnce(detail()).mockResolvedValueOnce({ job: processing("submit") }).mockResolvedValueOnce({
      job: { _id: "job-1", mode: "submit", status: "completed", score: 100, max_points: 100, passed: 1, total: 1,
        results: [{ number: 1, passed: true, status: "Correto" }], output: { stdout: "PRIVATE OUTPUT" } }, best_score: 100,
    });
    render(<CodingWorkspace challenge={challenge} onClose={() => {}} onUpdated={updated} />);
    await screen.findByLabelText("Editor de código");
    fireEvent.click(screen.getByRole("button", { name: "ENVIAR SOLUÇÃO →", exact: true }));
    await screen.findByText("100 / 100 pontos · 1 de 1 testes passaram", {}, { timeout: 4000 });
    expect(screen.queryByText("PRIVATE OUTPUT")).toBeNull();
    expect(updated).toHaveBeenCalledTimes(1);
  });

  it("shows missing executor configuration and disables paid requests", async () => {
    api.mockResolvedValue({ ...detail(), runner_configured: false });
    render(<CodingWorkspace challenge={challenge} onClose={() => {}} />);
    const editor = await screen.findByLabelText("Editor de código");
    fireEvent.change(editor, { target: { value: "print(0)" } });
    expect(editor.value).toBe("print(0)");
    expect(screen.getByRole("button", { name: "EXECUTAR", exact: true }).disabled).toBe(true);
    const run = screen.getByRole("button", { name: "EXECUTAR", exact: true });
    const submit = screen.getByRole("button", { name: "ENVIAR SOLUÇÃO →", exact: true });
    expect(run.getAttribute("aria-busy")).toBe("false");
    expect(submit.disabled).toBe(true);
    fireEvent.click(run);
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

  it("resumes pending work and displays service errors without a numeric grade", async () => {
    api.mockResolvedValueOnce({ ...detail(), latest_job: processing("submit") }).mockResolvedValueOnce({
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
    fireEvent.click(screen.getByRole("button", { name: "EXECUTAR", exact: true }));
    await screen.findByText("Aguarde alguns segundos.");
    expect(editor.value).toBe("print(7)");
  });
});

describe("company configuration and results", () => {
  it("saves private tests through the owner endpoint", async () => {
    const config = { ...detail().config, tests: [{ stdin: "SECRET", expected_output: "1" }] };
    api.mockResolvedValueOnce({ config }).mockResolvedValueOnce({ ok: true });
    const onSaved = vi.fn();
    render(<CodingSettings challenge={challenge} onClose={() => {}} onSaved={onSaved} />);
    const field = await screen.findByLabelText("Configuração dos testes");
    await waitFor(() => expect(field.value).toContain("SECRET"));
    fireEvent.click(screen.getByRole("button", { name: "SALVAR AVALIAÇÃO POR CÓDIGO" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(JSON.parse(api.mock.calls[1][1].body).tests[0].stdin).toBe("SECRET");
  });

  it("shows candidate points and source in the company results view", async () => {
    api.mockResolvedValue({ results: [{ talent_id: "candidate-1", name: "Candidato", score: 100, attempts: 2, source_code: "print(1)", latest_job: { status: "completed", passed: 5, total: 5, language: "python" } }] });
    render(<CodingResults challenges={[challenge]} />);
    expect(await screen.findByRole("heading", { name: "Candidato" })).toBeTruthy();
    expect(screen.getByText("2 envio(s) para correção")).toBeTruthy();
    expect(screen.getByText("print(1)")).toBeTruthy();
  });
});
