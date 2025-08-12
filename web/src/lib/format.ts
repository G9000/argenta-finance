import { formatUnits } from "viem";

export function formatBalance(
  balance: bigint | undefined,
  decimals: number = 6,
  displayDecimals: number = 2
): string {
  if (!balance || balance === BigInt(0)) return "0.00";

  try {
    const d = Math.min(displayDecimals, decimals);

    const formatted = formatUnits(balance, decimals);
    const parts = formatted.split(".");
    const wholePart = parts[0] || "0";
    const decimalPart = parts[1] || "00";

    const displayDecimalPart = decimalPart.slice(0, d).padEnd(d, "0");

    const hasSignificantValue =
      wholePart !== "0" || decimalPart.slice(0, d).match(/[1-9]/);
    if (!hasSignificantValue) {
      const hasAnyNonZero = decimalPart.match(/[1-9]/);
      if (hasAnyNonZero) {
        const threshold = "0." + "0".repeat(d - 1) + "1";
        return `< ${threshold}`;
      }
    }

    const formattedWhole = wholePart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `${formattedWhole}.${displayDecimalPart}`;
  } catch (error) {
    console.error("Error formatting balance:", error);
    return "Error";
  }
}
