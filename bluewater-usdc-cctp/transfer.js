import "dotenv/config";
import axios from "axios";
import {
  createWalletClient,
  createPublicClient,
  http,
  encodeFunctionData,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

// ---- Sei Atlantic-2 Testnet (EVM) ----
const seiTestnet = {
  id: 1328,
  name: "Sei Atlantic-2 Testnet",
  network: "sei-atlantic-2",
  nativeCurrency: { name: "Sei", symbol: "SEI", decimals: 18 },
  rpcUrls: { default: { http: ["https://evm-rpc.atlantic-2.seinetwork.io"] } },
  blockExplorers: {
    default: { url: "https://seitrace.com/?chain=atlantic-2" },
  },
  testnet: true,
};

const PK_RAW = process.env.PRIVATE_KEY;
if (!PK_RAW) throw new Error("Set PRIVATE_KEY in .env");
const account = privateKeyToAccount(`0x${PK_RAW.replace(/^0x/, "")}`);

const DESTINATION_ADDRESS = process.env.DESTINATION_ADDRESS;
if (!DESTINATION_ADDRESS || !/^0x[a-fA-F0-9]{40}$/.test(DESTINATION_ADDRESS)) {
  throw new Error(
    "Set DESTINATION_ADDRESS to a valid 0x EVM address on Sei testnet"
  );
}

const SEPOLIA_RPC = process.env.SEPOLIA_RPC || undefined;

// ---- Contracts and domains ----
const ETHEREUM_SEPOLIA_USDC = "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238";
const ETHEREUM_SEPOLIA_TOKEN_MESSENGER =
  "0x8fe6b999dc680ccfdd5bf7eb0974218be2542daa";
const SEI_TESTNET_MESSAGE_TRANSMITTER =
  "0xe737e5cebeeba77efe34d4aa090756590b1ce275";

const ETHEREUM_SEPOLIA_DOMAIN = 0;
const SEI_TESTNET_DOMAIN = 16;

const AMOUNT = BigInt(
  process.env.AMOUNT_USDC
    ? Math.trunc(Number(process.env.AMOUNT_USDC) * 1e6)
    : 1_000_000
);
const MAX_FEE = BigInt(
  process.env.MAX_FEE_USDC
    ? Math.trunc(Number(process.env.MAX_FEE_USDC) * 1e6)
    : 500
);
if (AMOUNT <= MAX_FEE)
  throw new Error("AMOUNT_USDC must be greater than MAX_FEE_USDC");

function toBytes32Address(addr) {
  if (!/^0x[a-fA-F0-9]{40}$/.test(addr))
    throw new Error(`Bad EVM address: ${addr}`);
  return `0x${addr.slice(2).padStart(64, "0")}`;
}
const DESTINATION_ADDRESS_BYTES32 = toBytes32Address(DESTINATION_ADDRESS);
const ANY_CALLER = `0x${"0".repeat(64)}`;

const TOKEN_MESSENGER_V2_ABI = [
  {
    type: "function",
    name: "depositForBurn",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "destinationDomain", type: "uint32" },
      { name: "mintRecipient", type: "bytes32" },
      { name: "burnToken", type: "address" },
      { name: "destinationCaller", type: "bytes32" },
      { name: "maxFee", type: "uint256" },
      { name: "minFinalityThreshold", type: "uint32" },
    ],
    outputs: [],
  },
];

const MESSAGE_TRANSMITTER_V2_ABI = [
  {
    type: "function",
    name: "receiveMessage",
    stateMutability: "nonpayable",
    inputs: [
      { name: "message", type: "bytes" },
      { name: "attestation", type: "bytes" },
    ],
    outputs: [],
  },
];

// ---- Clients ----
const sepoliaWallet = createWalletClient({
  chain: sepolia,
  transport: http(SEPOLIA_RPC),
  account,
});
const sepoliaPublic = createPublicClient({
  chain: sepolia,
  transport: http(SEPOLIA_RPC),
});
const seiWallet = createWalletClient({
  chain: seiTestnet,
  transport: http(),
  account,
});

// ---- Steps ----
async function approveUSDC() {
  console.log("Approving USDC transfer...");
  const hash = await sepoliaWallet.sendTransaction({
    to: ETHEREUM_SEPOLIA_USDC,
    data: encodeFunctionData({
      abi: [
        {
          type: "function",
          name: "approve",
          stateMutability: "nonpayable",
          inputs: [
            { name: "spender", type: "address" },
            { name: "amount", type: "uint256" },
          ],
          outputs: [{ name: "", type: "bool" }],
        },
      ],
      functionName: "approve",
      args: [ETHEREUM_SEPOLIA_TOKEN_MESSENGER, 10_000_000_000n],
    }),
  });
  console.log(`USDC Approval Tx: ${hash}`);
  return hash;
}

async function sendBurnWithRetry(calldata) {
  const cid = await sepoliaPublic.getChainId();
  console.log("chainId:", cid);
  if (cid !== 11155111) throw new Error("Not on Sepolia (11155111)");

  const bal = await sepoliaPublic.getBalance({ address: account.address });
  console.log("Sepolia ETH balance (wei):", bal.toString());

  const nonceLatest = await sepoliaPublic.getTransactionCount({
    address: account.address,
    blockTag: "latest",
  });
  const noncePending = await sepoliaPublic.getTransactionCount({
    address: account.address,
    blockTag: "pending",
  });
  console.log("nonce latest/pending:", nonceLatest, noncePending);

  const gas = await sepoliaPublic.estimateGas({
    to: ETHEREUM_SEPOLIA_TOKEN_MESSENGER,
    account: account.address,
    data: calldata,
  });
  const fees = await sepoliaPublic.estimateFeesPerGas();
  const bump = (x) => (x ? (x * 130n) / 100n : undefined);
  const gasWithBuffer = (gas * 120n) / 100n;

  let hash = await sepoliaWallet.sendTransaction({
    to: ETHEREUM_SEPOLIA_TOKEN_MESSENGER,
    data: calldata,
    gas: gasWithBuffer,
    maxFeePerGas: bump(fees.maxFeePerGas),
    maxPriorityFeePerGas: bump(fees.maxPriorityFeePerGas),
  });
  console.log("Burn submitted:", hash);

  let seen = await sepoliaPublic.getTransaction({ hash }).catch(() => null);
  if (!seen) {
    console.warn("Warning: RPC returned a hash but network cannot see it yet.");
  }

  try {
    const receipt = await sepoliaPublic.waitForTransactionReceipt({
      hash,
      timeout: 300_000,
      pollingInterval: 2_000,
    });
    if (receipt.status !== "success")
      throw new Error("Burn failed or reverted");
    console.log("Burn mined.");
    return hash;
  } catch (e) {
    console.warn("Burn wait timed out. Replacing with higher fees...");
    const nonce = await sepoliaPublic.getTransactionCount({
      address: account.address,
      blockTag: "pending",
    });
    const fees2 = await sepoliaPublic.estimateFeesPerGas();
    const bump2 = (x) => (x ? (x * 160n) / 100n : undefined);

    const hash2 = await sepoliaWallet.sendTransaction({
      to: ETHEREUM_SEPOLIA_TOKEN_MESSENGER,
      data: calldata,
      nonce,
      gas: gasWithBuffer,
      maxFeePerGas: bump2(fees2.maxFeePerGas),
      maxPriorityFeePerGas: bump2(fees2.maxPriorityFeePerGas),
    });
    console.log("Replacement burn submitted:", hash2);

    const receipt2 = await sepoliaPublic.waitForTransactionReceipt({
      hash: hash2,
      timeout: 300_000,
      pollingInterval: 2_000,
    });
    if (receipt2.status !== "success")
      throw new Error("Replacement burn failed");
    console.log("Replacement burn mined.");
    return hash2;
  }
}

async function burnUSDC() {
  console.log("Burning USDC on Ethereum Sepolia...");
  const calldata = encodeFunctionData({
    abi: TOKEN_MESSENGER_V2_ABI,
    functionName: "depositForBurn",
    args: [
      AMOUNT,
      SEI_TESTNET_DOMAIN,
      DESTINATION_ADDRESS_BYTES32,
      ETHEREUM_SEPOLIA_USDC,
      `0x${"0".repeat(64)}`,
      MAX_FEE,
      1000,
    ],
  });
  return await sendBurnWithRetry(calldata);
}

async function retrieveAttestation(burnHash) {
  console.log("Retrieving attestation...");
  const url = `https://iris-api-sandbox.circle.com/v2/messages/${ETHEREUM_SEPOLIA_DOMAIN}?transactionHash=${burnHash}`;
  while (true) {
    try {
      const r = await axios.get(url, { timeout: 10000 });
      const m = r.data?.messages?.[0];
      if (m?.status === "complete") {
        console.log("Attestation retrieved.");
        return m;
      }
      console.log("Waiting for attestation...");
    } catch {
      console.log("Waiting for attestation...");
    }
    await new Promise((res) => setTimeout(res, 5000));
  }
}

async function mintUSDC(attestation) {
  console.log("Minting USDC on Sei Testnet...");
  const hash = await seiWallet.sendTransaction({
    to: SEI_TESTNET_MESSAGE_TRANSMITTER,
    data: encodeFunctionData({
      abi: MESSAGE_TRANSMITTER_V2_ABI,
      functionName: "receiveMessage",
      args: [attestation.message, attestation.attestation],
    }),
  });
  console.log(`Mint Tx: ${hash}`);
  return hash;
}

async function main() {
  console.log("Dest EVM:", DESTINATION_ADDRESS);
  console.log("Dest bytes32:", DESTINATION_ADDRESS_BYTES32);

  await approveUSDC();
  const burnHash = await burnUSDC();
  const attestation = await retrieveAttestation(burnHash);
  await mintUSDC(attestation);

  console.log("USDC transfer completed.");
}

main().catch((e) => {
  console.error("Transfer failed:", e?.message || e);
  process.exit(1);
});
