import { useMemo } from 'react'
import { useAccount, useReadContracts } from 'wagmi'
import { erc20Abi } from 'viem'
import { simpleVaultAbi } from '@/generated/wagmi'
import { SupportedChainId, getUsdcAddress, getVaultAddress } from '@/lib/contracts'

export function usePortfolioTotals() {
  const { address: walletAddress } = useAccount()
  
  const sepoliaUsdcAddress = getUsdcAddress(SupportedChainId.ETH_SEPOLIA)
  const sepoliaVaultAddress = getVaultAddress(SupportedChainId.ETH_SEPOLIA)
  const seiUsdcAddress = getUsdcAddress(SupportedChainId.SEI_TESTNET)
  const seiVaultAddress = getVaultAddress(SupportedChainId.SEI_TESTNET)

  const { data: contractResults } = useReadContracts({
    contracts: [
      {
        chainId: SupportedChainId.ETH_SEPOLIA,
        abi: erc20Abi,
        address: sepoliaUsdcAddress,
        functionName: 'balanceOf' as const,
        args: walletAddress ? [walletAddress as `0x${string}`] : undefined,
      },
      {
        chainId: SupportedChainId.SEI_TESTNET,
        abi: erc20Abi,
        address: seiUsdcAddress,
        functionName: 'balanceOf' as const,
        args: walletAddress ? [walletAddress as `0x${string}`] : undefined,
      },
      {
        chainId: SupportedChainId.ETH_SEPOLIA,
        abi: simpleVaultAbi,
        address: sepoliaVaultAddress,
        functionName: 'getBalance' as const,
        args: walletAddress ? [walletAddress as `0x${string}`, sepoliaUsdcAddress] : undefined,
      },
      {
        chainId: SupportedChainId.SEI_TESTNET,
        abi: simpleVaultAbi,
        address: seiVaultAddress,
        functionName: 'getBalance' as const,
        args: walletAddress ? [walletAddress as `0x${string}`, seiUsdcAddress] : undefined,
      },
    ],
    allowFailure: true,
    query: { enabled: Boolean(walletAddress) },
  })

  const totals = useMemo(() => {
    const sepoliaWalletBalance = contractResults?.[0]?.result ?? 0n
    const seiWalletBalance = contractResults?.[1]?.result ?? 0n
    const sepoliaVaultBalance = contractResults?.[2]?.result ?? 0n
    const seiVaultBalance = contractResults?.[3]?.result ?? 0n
    

    const totalWallet = sepoliaWalletBalance + seiWalletBalance
    const totalVault = sepoliaVaultBalance + seiVaultBalance
    const totalPortfolio = totalWallet + totalVault
    
    return {
      totalWallet,
      totalVault,
      totalPortfolio,
    }
  }, [contractResults])

  return totals
}
