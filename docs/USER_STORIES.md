# User Stories

## Core User Stories

### Wallet Connection
- **As a user**, I want to connect my wallet to the application so that I can interact with the vault
- **As a user**, I want to see which wallet address is connected so that I know I'm using the correct account
- **As a user**, I want to easily disconnect my wallet when I'm done using the application

### Network Management
- **As a user**, I want to see which network I'm currently connected to so that I know where my transactions will occur
- **As a user**, I want to switch between supported networks easily without leaving the application
- **As a user**, I want to be prompted to switch networks if I'm on an unsupported network

### Balance Display
- **As a user**, I want to see my USDC balance in my wallet for each supported chain
- **As a user**, I want to see my USDC balance in the vault for each supported chain
- **As a user**, I want to see my total portfolio value aggregated across all chains
- **As a user**, I want the balances to refresh automatically after I complete a transaction

### Multi-Chain Batch Deposits (Primary Feature)
- **As a user**, I want to specify deposit amounts for multiple chains at once so that I can efficiently allocate my funds
- **As a user**, I want to see the total amount I'm depositing across all chains before confirming
- **As a user**, I want to execute all deposits with a single action rather than switching networks multiple times
- **As a user**, I want clear visual feedback showing which transaction is currently being processed
- **As a user**, I want to see the progress of my batch operation (e.g., "Step 2 of 6: Approving USDC on Polygon Mumbai")
- **As a user**, I want the ability to retry failed transactions without starting the entire batch over
- **As a user**, I want to continue the batch operation even if one transaction fails on a specific chain

### Single Chain Operations
- **As a user**, I want to deposit USDC into the vault on a specific chain
- **As a user**, I want to withdraw my USDC from the vault on a specific chain
- **As a user**, I want input validation to prevent me from trying to withdraw more than my vault balance

### Transaction Management
- **As a user**, I want to see the status of my pending transactions in real-time
- **As a user**, I want to view my recent transaction history
- **As a user**, I want to click on a transaction to view it on the block explorer
- **As a user**, I want to see gas estimates before confirming a transaction

### Error Handling
- **As a user**, I want to see clear error messages when something goes wrong
- **As a user**, I want guidance on how to resolve common errors (insufficient balance, failed approval, etc.)
- **As a user**, I want the application to handle network errors gracefully without crashing

## Detailed Batch Operation Flow

### Scenario: Multi-Chain Batch Deposit

**Given** I have USDC in my wallet across multiple chains  
**When** I navigate to the deposit section  
**Then** I should see input fields for each supported chain

**Given** I have entered deposit amounts for multiple chains  
**When** I click "Preview Batch Deposit"  
**Then** I should see:
- Individual amounts for each chain
- Total USDC to be deposited
- Estimated number of transactions required
- Estimated total gas costs

**Given** I have confirmed the batch deposit preview  
**When** I click "Execute Batch Deposit"  
**Then** I should see a modal with:
- Current transaction being processed
- Progress indicator (e.g., "2 of 6 transactions complete")
- Status of each chain (pending, in progress, completed, failed)
- Option to cancel remaining transactions

**Given** a transaction fails during batch execution  
**When** the failure is detected  
**Then** I should:
- See which specific transaction failed
- Understand why it failed
- Have the option to retry just that transaction
- Be able to continue with remaining chains

**Given** all transactions in the batch are complete  
**When** I close the batch operation modal  
**Then** I should:
- See updated vault balances across all chains
- Have a summary of what was deposited where
- Be able to view all transactions in my history

## Acceptance Criteria

1. **Batch Operation UI**
   - Clean, intuitive interface for entering multiple deposit amounts
   - Clear visual distinction between chains
   - Real-time validation of input amounts
   - Summary view before execution

2. **Transaction Flow**
   - Sequential execution with clear progress indicators
   - Graceful handling of user rejections
   - Automatic network switching (if supported by wallet)
   - Persistent state (can close modal and return to see progress)

3. **Error Recovery**
   - Specific error messages for each failure type
   - Retry functionality at the transaction level
   - Option to abort remaining transactions
   - No loss of funds due to UI errors

4. **Performance**
   - Responsive UI during long-running operations
   - Efficient RPC calls (batch where possible)
   - Proper loading states
   - No blocking of other UI interactions