/**
 * Converts a number to Spanish words for currency formatting
 * E.g.: 300000 → "Trescientos mil pesos 00/100 M.N."
 */

const units = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
const teens = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
const tens = ['', 'diez', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const hundreds = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

function convertHundreds(num: number): string {
  if (num === 0) return '';
  if (num === 100) return 'cien';
  
  const h = Math.floor(num / 100);
  const remainder = num % 100;
  
  let result = hundreds[h];
  
  if (remainder > 0) {
    if (result) result += ' ';
    
    if (remainder < 10) {
      result += units[remainder];
    } else if (remainder < 20) {
      result += teens[remainder - 10];
    } else if (remainder < 30 && remainder > 20) {
      result += 'veinti' + units[remainder - 20];
    } else if (remainder === 20) {
      result += 'veinte';
    } else {
      const t = Math.floor(remainder / 10);
      const u = remainder % 10;
      result += tens[t];
      if (u > 0) {
        result += ' y ' + units[u];
      }
    }
  }
  
  return result;
}

function convertThousands(num: number): string {
  if (num === 0) return 'cero';
  if (num === 1000) return 'mil';
  
  const millions = Math.floor(num / 1000000);
  const thousands = Math.floor((num % 1000000) / 1000);
  const remainder = num % 1000;
  
  let result = '';
  
  // Millions
  if (millions > 0) {
    if (millions === 1) {
      result += 'un millón';
    } else {
      result += convertHundreds(millions) + ' millones';
    }
  }
  
  // Thousands
  if (thousands > 0) {
    if (result) result += ' ';
    if (thousands === 1) {
      result += 'mil';
    } else {
      result += convertHundreds(thousands) + ' mil';
    }
  }
  
  // Remainder
  if (remainder > 0) {
    if (result) result += ' ';
    result += convertHundreds(remainder);
  }
  
  return result;
}

/**
 * Converts a number to Spanish currency text
 * @param amount - The numeric amount
 * @returns Formatted string like "Trescientos mil pesos 00/100 M.N."
 */
export function numberToWords(amount: number): string {
  const integerPart = Math.floor(amount);
  const decimalPart = Math.round((amount - integerPart) * 100);
  
  let words = convertThousands(integerPart);
  
  // Capitalize first letter
  words = words.charAt(0).toUpperCase() + words.slice(1);
  
  // Format decimal part
  const cents = decimalPart.toString().padStart(2, '0');
  
  return `${words} pesos ${cents}/100 M.N.`;
}

/**
 * Formats a number as Mexican currency
 * @param amount - The numeric amount
 * @returns Formatted string like "$300,000.00"
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Creates a formal currency string with amount and words
 * E.g.: "$300,000.00 (Trescientos mil pesos 00/100 M.N.)"
 */
export function formatCurrencyWithWords(amount: number): string {
  return `${formatCurrency(amount)} (${numberToWords(amount)})`;
}
