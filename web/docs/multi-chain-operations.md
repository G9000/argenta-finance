# Multi-Chain Operations Guide

This document explains how to handle multi-chain operations with the enhanced individual chain operations system.

## Overview

The application now supports three operation modes:

1. **Single Chain Mode**: One operation at a time (original behavior)
2. **Multi-Chain Queue Mode**: Queue operations for sequential execution across chains
3. **Batch Mode**: Parallel execution via the batch service

## Multi-Chain Operation Modes

### 1. Single Chain Operations (Backward Compatible)

```typescript
const {
  approveChain,
  depositChain,
  retryOperation,
  getChainState,
  getChainTransactions,
} = useMultiChainOperations();

// Execute single operations
await approveChain(SupportedChainId.ETH_SEPOLIA, "100");
await depositChain(SupportedChainId.SEI_TESTNET, "50");
```

### 2. Multi-Chain Queue Operations

```typescript
const {
  queueApproval,
  queueDeposit,
  queueApprovalAndDeposit,
  processQueue,
  clearQueue,
  isProcessingQueue,
  queueLength,
} = useMultiChainOperations();

// Queue operations for multiple chains
queueApprovalAndDeposit(SupportedChainId.ETH_SEPOLIA, "100");
queueApprovalAndDeposit(SupportedChainId.SEI_TESTNET, "50");

// Process all queued operations sequentially
await processQueue();
```

### 3. Per-Chain State Management

```typescript
// Check individual chain states
const ethState = getChainState(SupportedChainId.ETH_SEPOLIA);
const seiState = getChainState(SupportedChainId.SEI_TESTNET);

console.log("ETH operating:", ethState.isOperating);
console.log("SEI error:", seiState.error);

// Get transaction hashes for each chain
const ethTxs = getChainTransactions(SupportedChainId.ETH_SEPOLIA);
console.log("ETH approval:", ethTxs.approvalTxHash);
console.log("ETH deposit:", ethTxs.depositTxHash);
```

## UI Integration

The UI components automatically handle multi-chain states:

### ChainApprovalCard

- Shows per-chain loading states
- Displays chain-specific errors
- Handles individual chain operations

### DepositSummary

- Coordinates between manual and batch modes
- Shows transaction history per chain
- Provides unified operation controls

## Operation Flow Examples

### Example 1: Queue Multiple Chains

```typescript
// User selects multiple chains and amounts
const chainAmounts = [
  { chainId: SupportedChainId.ETH_SEPOLIA, amount: "100" },
  { chainId: SupportedChainId.SEI_TESTNET, amount: "50" },
];

// Queue all operations
chainAmounts.forEach(({ chainId, amount }) => {
  queueApprovalAndDeposit(chainId, amount);
});

// Process queue
await processQueue();
```

### Example 2: Mixed Operation Patterns

```typescript
// Immediate operation for one chain
await approveChain(SupportedChainId.ETH_SEPOLIA, "100");

// Queue operations for others
queueDeposit(SupportedChainId.ETH_SEPOLIA, "100"); // After approval
queueApprovalAndDeposit(SupportedChainId.SEI_TESTNET, "50");

// Process queue
await processQueue();
```

### Example 3: Error Handling

```typescript
// Get chain state to check for errors
const chainState = getChainState(chainId);

if (chainState.error) {
  if (chainState.isUserCancellation) {
    console.log("User cancelled transaction");
  } else {
    console.log("Transaction failed:", chainState.error);
  }

  // Retry the operation
  await retryOperation(chainId, amount);
}
```

## Benefits

### 1. **Flexible Operation Modes**

- Single chain for immediate operations
- Queue mode for planned multi-chain execution
- Batch mode for parallel processing

### 2. **Enhanced State Management**

- Per-chain operation tracking
- Individual error states
- Transaction history per chain

### 3. **Improved User Experience**

- Real-time status updates per chain
- Clear loading states
- Granular error handling

### 4. **Backward Compatibility**

- Existing single-chain APIs still work
- Gradual migration path
- No breaking changes

## Coordination with Batch Operations

The system coordinates with existing batch operations:

- **Manual Mode**: Uses multi-chain individual operations
- **Batch Mode**: Uses the existing batch service
- **State Synchronization**: Updates allowances after individual operations
- **Conflict Prevention**: Prevents concurrent batch and individual operations

## Best Practices

1. **Use Queue Mode** for planned multi-chain operations
2. **Check Chain States** before operations
3. **Handle Errors Gracefully** with retry mechanisms
4. **Clear Queues** when user changes inputs
5. **Show Progress** during queue processing

## Technical Implementation

The `useMultiChainOperations` hook provides:

- **State Management**: Per-chain operation states
- **Queue System**: Operation queuing and processing
- **Error Handling**: Chain-specific error management
- **Transaction Tracking**: Hash storage per chain
- **Coordination**: Integration with existing systems

This approach maintains the robustness of batch operations while adding granular control for individual chain operations.
