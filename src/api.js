const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export function getToken() {
  return localStorage.getItem("return_tech_token");
}

export async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getToken();
  const isForm = options.body instanceof FormData;

  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !isForm) headers.set("Content-Type", "application/json");

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new Error("Não foi possível conectar ao backend. Verifique se o Flask está rodando na porta 5000.");
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof data === "object" ? data.error || data.message : data;
    throw new Error(message || "Ocorreu um erro na requisição.");
  }

  return data;
}

export async function downloadSubmission(submissionId, filename = "entrega") {
  const response = await fetch(`${API_URL}/submissions/${submissionId}/file`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!response.ok) throw new Error("Não foi possível baixar este arquivo.");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
