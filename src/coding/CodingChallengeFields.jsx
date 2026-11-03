export function createCodingChallengeConfig() {
  return {
    languages: ["python"], max_points: 100, cpu_time_limit: 2, memory_limit_kb: 128000,
    example: { stdin: "", expected_output: "" }, tests: [{ stdin: "", expected_output: "" }], starter_code: {},
  };
}

export default function CodingChallengeFields({ value, onChange }) {
  function toggleLanguage(language) {
    const languages = value.languages.includes(language)
      ? value.languages.filter((item) => item !== language) : [...value.languages, language];
    onChange({ ...value, languages });
  }
  function updateTest(index, field, text) {
    onChange({ ...value, tests: value.tests.map((test, position) => position === index ? { ...test, [field]: text } : test) });
  }
  return <section>
    <h3>Correção automática</h3>
    <fieldset style={{ border: 0, padding: 0, margin: "0 0 20px" }}>
      <legend>Linguagens permitidas</legend>
      <div className="card-actions">{[["python", "Python"], ["javascript", "JavaScript"], ["cpp", "C++"]].map(([key, label]) => <label key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" style={{ width: "auto" }} checked={value.languages.includes(key)} onChange={() => toggleLanguage(key)} />{label}</label>)}</div>
    </fieldset>
    <label>Pontuação máxima<input type="number" min="1" max="10000" step="1" required value={value.max_points} onChange={(event) => onChange({ ...value, max_points: event.target.value })} /></label>
    <h3>Exemplo público</h3>
    <p>Este exemplo será mostrado aos participantes.</p>
    <div className="form-grid">
      <label>Entrada do exemplo<textarea rows="3" value={value.example.stdin} onChange={(event) => onChange({ ...value, example: { ...value.example, stdin: event.target.value } })} /></label>
      <label>Saída esperada do exemplo<textarea rows="3" value={value.example.expected_output} onChange={(event) => onChange({ ...value, example: { ...value.example, expected_output: event.target.value } })} /></label>
    </div>
    <h3>Casos privados de avaliação</h3>
    <p>Os casos privados são usados na correção e ficam visíveis apenas para a empresa e a administração.</p>
    {value.tests.map((test, index) => <fieldset key={index} style={{ border: "1px solid var(--line)", padding: 16, margin: "0 0 16px" }}>
      <legend>Caso {index + 1}</legend>
      <div className="form-grid">
        <label>Entrada do caso privado {index + 1}<textarea rows="3" value={test.stdin} onChange={(event) => updateTest(index, "stdin", event.target.value)} /></label>
        <label>Saída esperada do caso privado {index + 1}<textarea rows="3" value={test.expected_output} onChange={(event) => updateTest(index, "expected_output", event.target.value)} /></label>
      </div>
      <button type="button" className="text-button" disabled={value.tests.length === 1} onClick={() => onChange({ ...value, tests: value.tests.filter((_, position) => position !== index) })}>REMOVER CASO {index + 1}</button>
    </fieldset>)}
    <button type="button" className="outline-button small" disabled={value.tests.length >= 20} onClick={() => onChange({ ...value, tests: [...value.tests, { stdin: "", expected_output: "" }] })}>ADICIONAR CASO</button>
  </section>;
}
