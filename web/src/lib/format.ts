import { formatUnits } from 'viem'
import { USDC_DECIMALS } from './contracts'

export function formatBalance(
  balance: bigint | undefined, 
  decimals: number = USDC_DECIMALS, 
  displayDecimals: number = 2
): string {
  if (!balance || balance === BigInt(0)) return '0.00'
  
  try {
    // Clamp display decimals to actual token decimals
    const d = Math.min(displayDecimals, decimals)
    
    // Get full precision string
    const formatted = formatUnits(balance, decimals)
    const parts = formatted.split('.')
    const wholePart = parts[0] || '0'
    const decimalPart = parts[1] || '00'
    
    // String-length check avoids any float conversion
    if (wholePart.length > 15) {
      // Very large number - use truncation to preserve precision
      const displayDecimalPart = decimalPart.slice(0, d).padEnd(d, '0')
      // Keep it purely string-based - avoid Number() conversion for huge values
      const formattedWhole = wholePart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      return `${formattedWhole}.${displayDecimalPart}`
    }
    
    // Normal case: safe to use parseFloat for rounding
    const num = parseFloat(formatted)
    
    // Check for tiny non-zero values
    if (num > 0 && num < Math.pow(10, -d)) {
      return `< ${Math.pow(10, -d).toFixed(d)}`
    }
    
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: d,
      maximumFractionDigits: d
    }).format(num)

  } catch (error) {
    console.error('Error formatting balance:', error)
    return 'Error'
  }
}

