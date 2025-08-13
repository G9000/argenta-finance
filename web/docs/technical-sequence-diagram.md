# Technical Sequence Diagrams

This document provides detailed technical sequence diagrams for different multi-chain operation scenarios.

## 1. Single Chain Operation Flow

```mermaid
sequenceDiagram
    participant User
    participant ChainApprovalCard
    participant useMultiChainOperations
    participant Wagmi
    participant Blockchain

    User->>ChainApprovalCard: Click "Approve Allowance"
    ChainApprovalCard->>useMultiChainOperations: approveChain(chainId, amount)

    useMultiChainOperations->>useMultiChainOperations: validateChainOperation(chainId)
    useMultiChainOperations->>useMultiChainOperations: parseAmountToBigInt(amount)
    useMultiChainOperations->>useMultiChainOperations: setChainOperationState(chainId, "approval")

    Note over ChainApprovalCard: Shows "APPROVING" state with orange pulse

    useMultiChainOperations->>Wagmi: switchChainAsync(chainId)
    Wagmi->>Blockchain: Switch to target chain
    Blockchain-->>Wagmi: Chain switched

    useMultiChainOperations->>Wagmi: writeContract(approve)
    Wagmi->>Blockchain: Submit approval transaction
    Blockchain-->>Wagmi: Transaction hash
    Wagmi-->>useMultiChainOperations: Return hash

    useMultiChainOperations->>useMultiChainOperations: storeTransactionHash(chainId, "approval", hash)
    useMultiChainOperations->>useMultiChainOperations: setState(operationType: "confirming")

    Note over ChainApprovalCard: Shows "CONFIRMING" state with orange pulse

    useMultiChainOperations->>Wagmi: waitForTransactionReceipt(hash)
    Wagmi->>Blockchain: Poll for confirmation
    Blockchain-->>Wagmi: Transaction confirmed
    Wagmi-->>useMultiChainOperations: Receipt

    useMultiChainOperations->>useMultiChainOperations: resetChainState(chainId)

    Note over ChainApprovalCard: Shows "READY TO DEPOSIT" state with green dot

    useMultiChainOperations-->>ChainApprovalCard: Operation complete
    ChainApprovalCard-->>User: Success feedback
```

## 2. Multi-Chain Queue Operation Flow

```mermaid
sequenceDiagram
    participant User
    participant DepositInputV2
    participant useMultiChainOperations
    participant Queue
    participant Wagmi
    participant Chain1
    participant Chain2

    User->>DepositInputV2: Enter amounts for multiple chains
    User->>DepositInputV2: Click queue operations

    DepositInputV2->>useMultiChainOperations: queueApprovalAndDeposit(chain1, amount1)
    useMultiChainOperations->>Queue: Add approval operation (priority: 1)
    useMultiChainOperations->>Queue: Add deposit operation (priority: 2)

    DepositInputV2->>useMultiChainOperations: queueApprovalAndDeposit(chain2, amount2)
    useMultiChainOperations->>Queue: Add approval operation (priority: 1)
    useMultiChainOperations->>Queue: Add deposit operation (priority: 2)

    User->>DepositInputV2: Process queue
    DepositInputV2->>useMultiChainOperations: processQueue()

    useMultiChainOperations->>Queue: Sort operations by priority
    useMultiChainOperations->>useMultiChainOperations: setState(isProcessingQueue: true)

    loop For each operation in sorted queue
        useMultiChainOperations->>useMultiChainOperations: executeChainOperation(operation)

        alt Chain 1 Operations
            useMultiChainOperations->>Wagmi: switchChainAsync(chain1)
            Wagmi->>Chain1: Switch to chain 1
            useMultiChainOperations->>Wagmi: writeContract(chain1, operation)
            Wagmi->>Chain1: Submit transaction
            Chain1-->>Wagmi: Transaction hash
            useMultiChainOperations->>Wagmi: waitForTransactionReceipt()
            Wagmi->>Chain1: Wait for confirmation
            Chain1-->>Wagmi: Confirmed
        else Chain 2 Operations
            useMultiChainOperations->>Wagmi: switchChainAsync(chain2)
            Wagmi->>Chain2: Switch to chain 2
            useMultiChainOperations->>Wagmi: writeContract(chain2, operation)
            Wagmi->>Chain2: Submit transaction
            Chain2-->>Wagmi: Transaction hash
            useMultiChainOperations->>Wagmi: waitForTransactionReceipt()
            Wagmi->>Chain2: Wait for confirmation
            Chain2-->>Wagmi: Confirmed
        end

        useMultiChainOperations->>Queue: Remove completed operation
        useMultiChainOperations->>useMultiChainOperations: Update chain state
    end

    useMultiChainOperations->>useMultiChainOperations: setState(isProcessingQueue: false)
    useMultiChainOperations-->>DepositInputV2: All operations complete
    DepositInputV2-->>User: Show completion status
```

## 3. Error Handling and Retry Flow

```mermaid
sequenceDiagram
    participant User
    participant ChainApprovalCard
    participant useMultiChainOperations
    participant Wagmi
    participant Blockchain

    User->>ChainApprovalCard: Click "Approve Allowance"
    ChainApprovalCard->>useMultiChainOperations: approveChain(chainId, amount)

    useMultiChainOperations->>useMultiChainOperations: setChainOperationState(chainId, "approval")
    useMultiChainOperations->>Wagmi: writeContract(approve)
    Wagmi->>Blockchain: Submit transaction

    alt User Cancellation
        Blockchain-->>Wagmi: User rejected transaction
        Wagmi-->>useMultiChainOperations: UserRejectedRequestError
        useMultiChainOperations->>useMultiChainOperations: setChainError(chainId, "cancelled", true)
        Note over ChainApprovalCard: Shows "CANCELLED" state with red dot
    else Network Error
        Blockchain-->>Wagmi: Network error
        Wagmi-->>useMultiChainOperations: Network error
        useMultiChainOperations->>useMultiChainOperations: setChainError(chainId, "Network failed", false)
        Note over ChainApprovalCard: Shows "FAILED" state with red dot
    end

    useMultiChainOperations-->>ChainApprovalCard: Error state
    ChainApprovalCard-->>User: Show retry button

    User->>ChainApprovalCard: Click "Retry"
    ChainApprovalCard->>useMultiChainOperations: retryOperation(chainId, amount)

    useMultiChainOperations->>useMultiChainOperations: getChainState(chainId)
    useMultiChainOperations->>useMultiChainOperations: clearError(chainId)

    useMultiChainOperations->>useMultiChainOperations: executeChainOperation(chainId, "approval", amount)

    Note right of useMultiChainOperations: Resume normal operation flow

    useMultiChainOperations->>Wagmi: writeContract(approve)
    Wagmi->>Blockchain: Submit transaction
    Blockchain-->>Wagmi: Transaction hash

    useMultiChainOperations->>useMultiChainOperations: resetChainState(chainId)
    useMultiChainOperations-->>ChainApprovalCard: Success
    ChainApprovalCard-->>User: Operation completed
```

## 4. State Management Flow

```mermaid
stateDiagram-v2
    [*] --> Idle: Initial state

    Idle --> Approving: approveChain() called
    Idle --> Depositing: depositChain() called
    Idle --> QueueProcessing: processQueue() called

    Approving --> Confirming: Transaction submitted
    Depositing --> Confirming: Transaction submitted

    Confirming --> Completed: Transaction confirmed
    Confirming --> Failed: Transaction failed
    Confirming --> Cancelled: User cancelled

    Failed --> Approving: Retry approval
    Failed --> Depositing: Retry deposit
    Cancelled --> Approving: Retry approval
    Cancelled --> Depositing: Retry deposit

    Completed --> Idle: Operation finished

    QueueProcessing --> Approving: Process approval in queue
    QueueProcessing --> Depositing: Process deposit in queue
    QueueProcessing --> Idle: Queue empty

    state QueueProcessing {
        [*] --> SortQueue
        SortQueue --> ExecuteNext
        ExecuteNext --> ChainSwitch
        ChainSwitch --> SubmitTx
        SubmitTx --> WaitConfirm
        WaitConfirm --> RemoveFromQueue
        RemoveFromQueue --> CheckQueue
        CheckQueue --> ExecuteNext: More operations
        CheckQueue --> [*]: Queue empty
    }
```

## 5. UI State Synchronization Flow

```mermaid
sequenceDiagram
    participant Hook as useMultiChainOperations
    participant Card1 as ChainApprovalCard (ETH)
    participant Card2 as ChainApprovalCard (SEI)
    participant Summary as DepositSummary

    Hook->>Hook: setState(chain1: operating)
    Hook->>Card1: getChainState(ETH_SEPOLIA)
    Card1->>Card1: Update UI to "APPROVING"
    Card1->>Summary: Notify operation started

    Hook->>Hook: setState(chain1: txHash)
    Hook->>Card1: getChainTransactions(ETH_SEPOLIA)
    Card1->>Card1: Show transaction hash

    Hook->>Hook: setState(chain1: confirming)
    Hook->>Card1: getChainState(ETH_SEPOLIA)
    Card1->>Card1: Update UI to "CONFIRMING"

    Hook->>Hook: setState(chain1: completed)
    Hook->>Card1: getChainState(ETH_SEPOLIA)
    Card1->>Card1: Update UI to "COMPLETED"
    Card1->>Summary: Notify operation completed

    Note over Card2: Remains in original state (independent)

    Summary->>Summary: Update overall progress
    Summary->>Summary: Refresh gas estimates
```

## 6. Integration with Batch Operations

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant Individual as useMultiChainOperations
    participant Batch as useBatchDeposit
    participant Mode as ExecutionModeToggle

    User->>UI: Configure amounts for multiple chains

    User->>Mode: Toggle to "Batch Mode"
    Mode->>UI: Set batch execution mode
    UI->>Batch: Prepare batch operations

    User->>UI: Execute Batch
    UI->>Batch: executeBatch(chainAmounts)

    Note over Individual: Individual operations paused during batch

    Batch->>Batch: Process all chains in parallel
    Batch-->>UI: Batch results
    UI-->>User: Show batch completion

    alt User switches to Manual Mode
        User->>Mode: Toggle to "Manual Mode"
        Mode->>UI: Set individual execution mode
        UI->>Individual: Enable individual operations

        User->>UI: Click individual chain operations
        UI->>Individual: executeChainOperation()
        Individual-->>UI: Individual results
    end
```

## Implementation Notes

### Key Design Decisions

1. **Per-Chain State Isolation**: Each chain maintains independent operation state
2. **Priority-Based Queue**: Operations execute in priority order (approvals before deposits)
3. **Backward Compatibility**: Existing APIs continue to work unchanged
4. **Error Isolation**: Errors on one chain don't affect others
5. **Chain Switch Optimization**: Efficient chain switching between operations

### State Management Strategy

- **Local State**: Per-chain operation states
- **Queue State**: Operation queue with priorities
- **Global State**: Processing flags and coordination
- **Transaction History**: Persistent hash storage per chain

### Error Handling Strategy

- **User Cancellation**: Distinguishable from system errors
- **Per-Chain Errors**: Independent error states
- **Retry Logic**: Smart retry based on operation type
- **Queue Resilience**: Failed operations don't stop queue processing

This technical implementation provides robust multi-chain operation handling while maintaining simplicity and backward compatibility.
