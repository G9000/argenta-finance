import { formatUnits } from "viem";
import { USDC_DECIMALS } from "../constant/contracts";

export function formatBalance(
  balance: bigint | undefined,
  decimals: number = USDC_DECIMALS,
  displayDecimals: number = 2
): string {
  if (!balance || balance === BigInt(0)) return "0.00";

  try {
    const d = Math.min(displayDecimals, decimals);

    const formatted = formatUnits(balance, decimals);
    const parts = formatted.split(".");
    const wholePart = parts[0] || "0";
    const decimalPart = parts[1] || "00";

    // All cases: keep it string-based to preserve precision
    const displayDecimalPart = decimalPart.slice(0, d).padEnd(d, "0");

    // Check for tiny non-zero values using string comparison
    const hasSignificantValue =
      wholePart !== "0" || decimalPart.slice(0, d).match(/[1-9]/);
    if (!hasSignificantValue) {
      // All digits in display range are zero, but original might be non-zero
      const hasAnyNonZero = decimalPart.match(/[1-9]/);
      if (hasAnyNonZero) {
        const threshold = "0." + "0".repeat(d - 1) + "1";
        return `< ${threshold}`;
      }
    }

    // Format with thousand separators using regex
    const formattedWhole = wholePart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `${formattedWhole}.${displayDecimalPart}`;
  } catch (error) {
    console.error("Error formatting balance:", error);
    return "Error";
  }
}
