import { defineConfig } from "@wagmi/cli";
import { foundry, react } from "@wagmi/cli/plugins";

export default defineConfig({
  out: "src/generated/wagmi.ts",
  plugins: [
    foundry({
      project: "../contracts",
      include: ["SimpleVault.sol/SimpleVault.json"],
    }),
    react(),
  ],
});