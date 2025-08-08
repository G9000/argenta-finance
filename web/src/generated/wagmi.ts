import {
  createUseReadContract,
  createUseWriteContract,
  createUseSimulateContract,
  createUseWatchContractEvent,
} from 'wagmi/codegen'

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// SimpleVault
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const simpleVaultAbi = [
  {
    type: 'function',
    inputs: [
      { name: '', internalType: 'address', type: 'address' },
      { name: '', internalType: 'address', type: 'address' },
    ],
    name: 'balances',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'token', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'deposit',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'user', internalType: 'address', type: 'address' },
      { name: 'token', internalType: 'address', type: 'address' },
    ],
    name: 'getBalance',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'token', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'user', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'token',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'Deposited',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'user', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'token',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'Withdrawn',
  },
  { type: 'error', inputs: [], name: 'InsufficientBalance' },
  { type: 'error', inputs: [], name: 'InvalidAmount' },
  { type: 'error', inputs: [], name: 'ReentrancyGuardReentrantCall' },
  {
    type: 'error',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'SafeERC20FailedOperation',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// React
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link simpleVaultAbi}__
 */
export const useReadSimpleVault = /*#__PURE__*/ createUseReadContract({
  abi: simpleVaultAbi,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link simpleVaultAbi}__ and `functionName` set to `"balances"`
 */
export const useReadSimpleVaultBalances = /*#__PURE__*/ createUseReadContract({
  abi: simpleVaultAbi,
  functionName: 'balances',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link simpleVaultAbi}__ and `functionName` set to `"getBalance"`
 */
export const useReadSimpleVaultGetBalance = /*#__PURE__*/ createUseReadContract(
  { abi: simpleVaultAbi, functionName: 'getBalance' },
)

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link simpleVaultAbi}__
 */
export const useWriteSimpleVault = /*#__PURE__*/ createUseWriteContract({
  abi: simpleVaultAbi,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link simpleVaultAbi}__ and `functionName` set to `"deposit"`
 */
export const useWriteSimpleVaultDeposit = /*#__PURE__*/ createUseWriteContract({
  abi: simpleVaultAbi,
  functionName: 'deposit',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link simpleVaultAbi}__ and `functionName` set to `"withdraw"`
 */
export const useWriteSimpleVaultWithdraw = /*#__PURE__*/ createUseWriteContract(
  { abi: simpleVaultAbi, functionName: 'withdraw' },
)

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link simpleVaultAbi}__
 */
export const useSimulateSimpleVault = /*#__PURE__*/ createUseSimulateContract({
  abi: simpleVaultAbi,
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link simpleVaultAbi}__ and `functionName` set to `"deposit"`
 */
export const useSimulateSimpleVaultDeposit =
  /*#__PURE__*/ createUseSimulateContract({
    abi: simpleVaultAbi,
    functionName: 'deposit',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link simpleVaultAbi}__ and `functionName` set to `"withdraw"`
 */
export const useSimulateSimpleVaultWithdraw =
  /*#__PURE__*/ createUseSimulateContract({
    abi: simpleVaultAbi,
    functionName: 'withdraw',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link simpleVaultAbi}__
 */
export const useWatchSimpleVaultEvent =
  /*#__PURE__*/ createUseWatchContractEvent({ abi: simpleVaultAbi })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link simpleVaultAbi}__ and `eventName` set to `"Deposited"`
 */
export const useWatchSimpleVaultDepositedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: simpleVaultAbi,
    eventName: 'Deposited',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link simpleVaultAbi}__ and `eventName` set to `"Withdrawn"`
 */
export const useWatchSimpleVaultWithdrawnEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: simpleVaultAbi,
    eventName: 'Withdrawn',
  })
