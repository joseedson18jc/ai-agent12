/**
 * Aplica máscara de CPF: 999.999.999-99
 */
export function maskCPF(value: string): string {
  return value
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

/**
 * Aplica máscara de CNPJ: 99.999.999/9999-99
 */
export function maskCNPJ(value: string): string {
  return value
    .replace(/\D/g, "")
    .slice(0, 14)
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

/**
 * Aplica máscara de telefone: (99) 99999-9999 ou (99) 9999-9999
 */
export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  }
  return digits
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d{1,4})$/, "$1-$2");
}

/**
 * Aplica máscara de CEP: 99999-999
 */
export function maskCEP(value: string): string {
  return value
    .replace(/\D/g, "")
    .slice(0, 8)
    .replace(/(\d{5})(\d{1,3})$/, "$1-$2");
}

/**
 * Aplica máscara de moeda brasileira: 1.234,56
 * Retorna apenas o valor formatado sem o símbolo R$
 */
export function maskCurrency(value: string): string {
  // Remove tudo que não é dígito
  let digits = value.replace(/\D/g, "");

  if (digits === "") return "";

  // Remove zeros à esquerda, mantendo pelo menos um dígito
  digits = digits.replace(/^0+(?=\d)/, "");

  // Garante pelo menos 3 dígitos (para os centavos)
  while (digits.length < 3) {
    digits = "0" + digits;
  }

  // Separa parte inteira e decimal
  const integerPart = digits.slice(0, -2);
  const decimalPart = digits.slice(-2);

  // Formata a parte inteira com pontos como separadores de milhar
  const formattedInteger = integerPart.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    "."
  );

  return `${formattedInteger},${decimalPart}`;
}

/**
 * Converte valor com máscara de moeda para número
 * Ex: "1.234,56" -> 1234.56
 */
export function unmaskCurrency(value: string): number {
  const cleaned = value.replace(/\./g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Remove qualquer máscara, retornando apenas dígitos
 */
export function unmask(value: string): string {
  return value.replace(/\D/g, "");
}
