function daysFromNow(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export const DEMO_CHALLENGES = [
  {
    _id: "demo-sentinel-fintech",
    status: "published",
    level: "Júnior",
    title: "Triagem de alertas de acesso suspeito",
    description: "A Sentinel Fintech identificou tentativas de acesso fora do padrão. Analise alertas fictícios e proponha uma priorização e um fluxo de resposta para o time de SOC.",
    skills: ["SOC", "Análise de logs", "Resposta a incidentes"],
    deadline: daysFromNow(14),
    work_mode: "Remoto",
    participant_count: 8,
  },
  {
    _id: "demo-aurora-cloud",
    status: "published",
    level: "Intermediário",
    title: "Revisão de segurança em ambiente de nuvem",
    description: "A Aurora Cloud está revisando a configuração de um ambiente fictício. Identifique riscos de exposição, organize as prioridades e proponha controles preventivos.",
    skills: ["Segurança em nuvem", "AWS", "IAM"],
    deadline: daysFromNow(21),
    work_mode: "Híbrido",
    participant_count: 12,
  },
  {
    _id: "demo-horizonte-saude",
    status: "published",
    level: "Intermediário",
    title: "Plano de resposta a incidente e proteção de dados",
    description: "A Horizonte Saúde precisa aprimorar seu processo de resposta a incidentes envolvendo dados. Elabore um plano de comunicação, contenção e recuperação alinhado à LGPD.",
    skills: ["LGPD", "Governança", "Resposta a incidentes"],
    deadline: daysFromNow(18),
    work_mode: "Remoto",
    participant_count: 6,
  },
  {
    _id: "demo-vertice-logistica",
    status: "published",
    level: "Sênior",
    title: "Caça a ameaças em registros corporativos",
    description: "A Vértice Logística quer melhorar a detecção de atividades anômalas. Examine um conjunto de logs sintético e apresente hipóteses, critérios de alerta e recomendações.",
    skills: ["Threat hunting", "SIEM", "Análise de logs"],
    deadline: daysFromNow(28),
    work_mode: "Remoto",
    participant_count: 4,
  },
  {
    _id: "demo-solaris-energia",
    status: "published",
    level: "Sênior",
    title: "Avaliação de segurança de API em escopo controlado",
    description: "A Solaris Energia está preparando uma API fictícia para lançamento. Faça uma avaliação defensiva dentro do escopo fornecido e entregue riscos priorizados e sugestões de mitigação.",
    skills: ["Segurança de APIs", "OWASP", "Python"],
    deadline: daysFromNow(25),
    work_mode: "Híbrido",
    participant_count: 9,
  },
  {
    _id: "demo-nexo-varejo",
    status: "published",
    level: "Júnior",
    title: "Conscientização e simulação de resposta a phishing",
    description: "A Nexo Varejo quer fortalecer a cultura de segurança. Crie uma proposta educativa de conscientização e um roteiro de resposta a mensagens suspeitas, sem usar dados reais.",
    skills: ["Conscientização", "Phishing", "Comunicação"],
    deadline: daysFromNow(16),
    work_mode: "Presencial",
    participant_count: 15,
  },
];

export function isDemoChallenge(id) {
  return typeof id === "string" && id.startsWith("demo-");
}

export function demoStorageKey(user) {
  const identity = user?._id || user?.id || user?.email;
  return `return_tech_demo_challenges:${identity || "talent"}`;
}

export function loadDemoState(storageKey) {
  const stored = localStorage.getItem(storageKey);
  if (!stored) return {};

  const state = JSON.parse(stored);
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new Error("Os dados locais dos desafios demonstrativos estão inválidos.");
  }
  return state;
}

export function saveDemoState(storageKey, state) {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

export function getDemoChallenges(state) {
  return DEMO_CHALLENGES.map((challenge) => {
    const saved = state[challenge._id];
    return {
      ...challenge,
      participant_count: challenge.participant_count + (saved?.participation ? 1 : 0),
      participation: saved?.participation,
    };
  });
}

export function getDemoSubmissions(state) {
  return DEMO_CHALLENGES.flatMap((challenge) => {
    const submission = state[challenge._id]?.submission;
    if (!submission) return [];
    return [{
      _id: `${challenge._id}-submission`,
      challenge,
      summary: submission.summary,
      report_url: submission.report_url,
      participation: { status: "submitted" },
    }];
  });
}
