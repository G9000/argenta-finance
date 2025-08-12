# Multi-Chain Operations Documentation

This directory contains comprehensive documentation for the multi-chain operations implementation.

## Documentation Overview

### 📋 [Implementation Sequence](./multi-chain-implementation-sequence.md)

- Step-by-step implementation process
- Phase-by-phase development approach
- State management evolution
- Integration points and coordination

### 🔄 [Technical Sequence Diagrams](./technical-sequence-diagram.md)

- Detailed technical flows
- Error handling sequences
- State management flows
- UI synchronization patterns

### 🚀 [Multi-Chain Operations Guide](./multi-chain-operations.md)

- Usage examples and patterns
- API reference
- Best practices
- Coordination strategies

### 📊 [Individual Chain Operations Flow](./individual-chain-operations-flow.md)

- Original single-chain implementation
- State transitions and UI feedback
- Button states and auto-progression

## Quick Start

### For Developers

1. **Review the Implementation Sequence** to understand how the system was built
2. **Check Technical Diagrams** for detailed flow understanding
3. **Use the Operations Guide** for practical implementation

### For Users

The system now supports three operation modes:

1. **Single Chain**: Immediate operations on one chain
2. **Queue Mode**: Sequential operations across multiple chains
3. **Batch Mode**: Parallel operations (existing functionality)

## Architecture Summary

```typescript
// New Multi-Chain Hook
const {
  // Single chain (backward compatible)
  approveChain,
  depositChain,
  retryOperation,

  // Multi-chain queue operations
  queueApproval,
  queueDeposit,
  queueApprovalAndDeposit,
  processQueue,

  // State management
  getChainState,
  getChainTransactions,
  isChainOperating,
  isAnyChainOperating,
} = useMultiChainOperations();
```

## Key Benefits

✅ **Backward Compatible**: All existing code continues to work
✅ **Scalable**: Handle multiple chains efficiently  
✅ **User-Friendly**: Clear status per chain
✅ **Robust**: Independent error handling per chain
✅ **Flexible**: Choose operation mode based on needs
✅ **Coordinated**: Works with existing batch system

## Implementation Highlights

### 1. Enhanced State Management

- Per-chain operation tracking
- Independent error states
- Transaction history per chain
- Operation queue system

### 2. UI Component Updates

- `ChainApprovalCard`: Shows per-chain states
- `DepositSummary`: Coordinates operation modes
- `ApprovalSection`: Manages execution modes
- `DepositInputV2`: Integrates multi-chain operations

### 3. Operation Patterns

**Single Chain:**

```typescript
await approveChain(SupportedChainId.ETH_SEPOLIA, "100");
```

**Multi-Chain Queue:**

```typescript
queueApprovalAndDeposit(SupportedChainId.ETH_SEPOLIA, "100");
queueApprovalAndDeposit(SupportedChainId.SEI_TESTNET, "50");
await processQueue();
```

**State Checking:**

```typescript
const ethState = getChainState(SupportedChainId.ETH_SEPOLIA);
if (ethState.isOperating) {
  console.log("ETH chain is processing...");
}
```

## Files Modified

### Core Implementation

- `web/src/hooks/useMultiChainOperations.ts` - New multi-chain operations hook

### UI Components

- `web/src/components/ui/deposit-summary/ChainApprovalCard.tsx`
- `web/src/components/ui/DepositSummary.tsx`
- `web/src/components/ui/deposit-summary/ApprovalSection.tsx`
- `web/src/components/ui/DepositInputV2.tsx`

### Documentation

- `web/docs/multi-chain-implementation-sequence.md`
- `web/docs/technical-sequence-diagram.md`
- `web/docs/multi-chain-operations.md`
- `web/docs/README-multi-chain.md`

## Testing Strategy

### Test Scenarios

1. **Single Chain Operations**

   - Approve → Deposit flow
   - Error handling and retry
   - User cancellation

2. **Multi-Chain Queue**

   - Queue multiple operations
   - Process queue sequentially
   - Handle mixed successes/failures

3. **State Management**

   - Per-chain state isolation
   - Transaction history tracking
   - Error state management

4. **UI Integration**
   - Real-time status updates
   - Loading state coordination
   - Mode switching

### Coordination Testing

1. **Batch vs Individual**

   - Prevent concurrent operations
   - State synchronization
   - Mode switching

2. **Chain Switching**
   - Efficient chain switches
   - Error handling during switches
   - State preservation

## Future Enhancements

### Potential Improvements

1. **Parallel Individual Operations**

   - Execute operations on different chains simultaneously
   - Requires enhanced state management

2. **Smart Queue Optimization**

   - Group operations by chain
   - Minimize chain switches

3. **Enhanced Error Recovery**

   - Automatic retry strategies
   - Gas optimization on retry

4. **Progress Tracking**
   - Detailed progress indicators
   - Time estimates per operation

## Troubleshooting

### Common Issues

1. **Chain Switch Delays**

   - Solution: Built-in delays after chain switches
   - Configurable timing if needed

2. **State Synchronization**

   - Solution: Per-chain state isolation
   - Independent error handling

3. **Queue Processing Errors**
   - Solution: Continue queue processing on individual failures
   - Detailed error reporting per chain

### Debug Tools

```typescript
// Check current states
console.log("Chain states:", {
  eth: getChainState(SupportedChainId.ETH_SEPOLIA),
  sei: getChainState(SupportedChainId.SEI_TESTNET),
});

// Check queue status
console.log("Queue length:", queueLength);
console.log("Processing:", isProcessingQueue);
```

## Migration Guide

### For Existing Code

No migration needed! The new system is fully backward compatible:

```typescript
// This continues to work exactly as before
const { approveChain, depositChain } = useIndividualChainOperations();

// Can be replaced with (same API)
const { approveChain, depositChain } = useMultiChainOperations();
```

### For New Features

Use the enhanced multi-chain capabilities:

```typescript
const { queueApprovalAndDeposit, processQueue, getChainState } =
  useMultiChainOperations();
```

This implementation provides a robust, scalable solution for multi-chain operations while maintaining the simplicity and reliability of the existing system.
