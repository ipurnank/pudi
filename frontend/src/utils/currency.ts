// Indian Rupee Formatting Utility
// Formats numbers in Indian numbering system: 1,00,000 instead of 100,000

export function formatIndianRupee(amount: number): string {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  
  // Handle decimal places
  const parts = absAmount.toFixed(2).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1];
  
  // Format in Indian numbering system
  // Last 3 digits, then groups of 2
  if (integerPart.length > 3) {
    const lastThree = integerPart.slice(-3);
    const remaining = integerPart.slice(0, -3);
    
    // Add commas every 2 digits from right in the remaining part
    const formatted = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    integerPart = formatted + ',' + lastThree;
  }
  
  // Remove trailing zeros from decimal
  let result = integerPart;
  if (decimalPart !== '00') {
    result += '.' + decimalPart.replace(/0+$/, '');
  }
  
  return (isNegative ? '-' : '') + '₹' + result;
}

export function formatCompactIndianRupee(amount: number): string {
  const absAmount = Math.abs(amount);
  const isNegative = amount < 0;
  
  if (absAmount >= 10000000) {
    // Crores
    return (isNegative ? '-' : '') + '₹' + (absAmount / 10000000).toFixed(1).replace(/\.0$/, '') + 'Cr';
  } else if (absAmount >= 100000) {
    // Lakhs
    return (isNegative ? '-' : '') + '₹' + (absAmount / 100000).toFixed(1).replace(/\.0$/, '') + 'L';
  } else if (absAmount >= 1000) {
    // Thousands
    return (isNegative ? '-' : '') + '₹' + (absAmount / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return formatIndianRupee(amount);
}

export function parseIndianRupee(value: string): number {
  // Remove ₹ symbol and commas
  const cleaned = value.replace(/[₹,\s]/g, '');
  return parseFloat(cleaned) || 0;
}
