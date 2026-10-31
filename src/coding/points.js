const formatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

export function formatPoints(value) {
  return formatter.format(value ?? 0);
}
