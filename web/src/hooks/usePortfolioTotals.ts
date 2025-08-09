import { useMemo } from 'react'
import { useAccount, useReadContracts } from 'wagmi'
import { erc20Abi } from 'viem'
import { simpleVaultAbi } from '@/generated/wagmi'
import { sepolia, seiTestnet } from '@/lib/chains'
import {
  getSimpleVaultAddress,
  getUsdcAddress,
} from '@/lib/contracts'


export function usePortfolioTotals() {
  const { address: walletAddress } = useAccount()
  

  const sepoliaUsdcAddress = getUsdcAddress(sepolia.id)
  const sepoliaVaultAddress = getSimpleVaultAddress(sepolia.id)
  const seiUsdcAddress = getUsdcAddress(seiTestnet.id)
  const seiVaultAddress = getSimpleVaultAddress(seiTestnet.id)

  const { data: contractResults } = useReadContracts({
    contracts: [

      {
        chainId: sepolia.id,
        abi: erc20Abi,
        address: sepoliaUsdcAddress,
        functionName: 'balanceOf' as const,
        args: walletAddress ? [walletAddress as `0x${string}`] : undefined,
      },
      {
        chainId: seiTestnet.id,
        abi: erc20Abi,
        address: seiUsdcAddress,
        functionName: 'balanceOf' as const,
        args: walletAddress ? [walletAddress as `0x${string}`] : undefined,
      },
      {
        chainId: sepolia.id,
        abi: simpleVaultAbi,
        address: sepoliaVaultAddress,
        functionName: 'getBalance' as const,
        args: walletAddress ? [walletAddress as `0x${string}`, sepoliaUsdcAddress] : undefined,
      },
      {
        chainId: seiTestnet.id,
        abi: simpleVaultAbi,
        address: seiVaultAddress,
        functionName: 'getBalance' as const,
        args: walletAddress ? [walletAddress as `0x${string}`, seiUsdcAddress] : undefined,
      },
    ],
    allowFailure: true,
    query: { enabled: Boolean(walletAddress) },
  })

  console.log('contractResults', contractResults)


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
