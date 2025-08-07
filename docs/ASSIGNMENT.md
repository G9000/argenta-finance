# Multi-Chain Vault Frontend Challenge

## Overview

Your task is to build a modern Web3 frontend application that interacts with our SimpleVault smart contract deployed across multiple EVM chains. This assignment will test your ability to create a seamless multi-chain DeFi experience with a focus on user experience and technical excellence.

## Smart Contract Details

The SimpleVault contract is already deployed on the following networks:

- **Sepolia** (Ethereum testnet)
- **Sei Testnet**

Contract Functions:

- `deposit(address token, uint256 amount)` - Deposit USDC into the vault
- `withdraw(address token, uint256 amount)` - Withdraw USDC from the vault
- `getBalance(address user, address token)` - View user's vault balance

## Technical Requirements

### Required Technologies

- **Framework**: React or Next.js (14+ recommended)
- **Web3 Libraries**: wagmi + viem
- **Wallet Connection**: Your choice (RainbowKit, ConnectKit, Web3Modal, etc.)
- **Styling**: Tailwind CSS + Any UI libraries
- **State Management**: Your choice (Zustand, Redux, Context API, etc.)

### Core Features

1. **Wallet Connection**

   - Support for multiple wallet providers
   - Display connected address and network
   - Network switching functionality

2. **Multi-Chain Dashboard**

   - Display user's USDC balance (wallet and vault) across all supported chains
   - Show total portfolio value aggregated across chains
   - Network status indicators

3. **Multi-Chain Batch Operations** ⭐ (Key Feature)

   - Allow users to input deposit amounts for multiple chains simultaneously
   - Single "Execute Batch" button that initiates the deposit sequence
   - Guide users through each transaction with clear status updates
   - Handle transaction failures gracefully with retry options
   - Example flow:

     ```
     User inputs:
     - Sepolia: 100 USDC
     - Sei Testnet: 50 USDC

     → Click "Execute Batch Deposit"
     → Step 1/4: Approve USDC on Sepolia
     → Step 2/4: Deposit on Sepolia
     → Step 3/4: Approve USDC on Sei Testnet
     → Step 4/4: Deposit on Sei Testnet
     → ✅ Batch operation complete!
     ```

4. **Transaction Management**

   - Real-time transaction status updates
   - Transaction history (at least last 10 transactions)
   - Links to block explorers

5. **Withdrawal Interface(optional)**

   - Withdraw funds from any supported chain
   - Input validation based on vault balance
   - Transaction confirmation

## Bonus Features (Optional)

- Withdraw funds from any supported chain
- Gas estimation for each transaction
- ENS name resolution
- Dark/light theme toggle
- Mobile responsive design
- Loading skeletons
- Error boundary implementation
- Unit tests

## Submission Requirements

1. **Source Code**

   - Public GitHub repository
   - Clear commit history
   - Well-structured codebase

2. **Documentation**

   - README with setup instructions
   - Environment variables documentation
   - Architecture decisions explanation

3. **Deployment**

   - Deploy to Vercel, Netlify, or similar
   - Include deployed URL in README

4. **Video Demo** (Optional)
   - 2-3 minute demo showcasing all features
   - Focus on the multi-chain batch operation flow

## Evaluation Criteria

1. **Functionality (40%)**

   - All required features working correctly
   - Proper handling of Web3 edge cases
   - Multi-chain batch operations implementation

2. **Code Quality (30%)**

   - Clean, maintainable code structure
   - Proper TypeScript usage
   - Reusable components
   - Error handling

3. **UI/UX Design (10%)**

   - Intuitive user interface
   - Smooth user experience
   - Responsive design
   - Visual polish

4. **Technical Excellence (20%)**
   - Performance optimizations
   - Security considerations
   - Best practices implementation

## Resources

### Test USDC Addresses

- **Sepolia**: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
- **Sei Testnet**: `0x4fCF1784B31630811181f670Aea7A7bEF803eaED`

### Vault Contract Addresses

- **Sepolia**: `0xaaaac415c0719cff6BAe3816FE244589442db46C`
- **Sei Testnet**: `0xaaaac415c0719cff6BAe3816FE244589442db46C`

### RPC Endpoints

- **Sepolia**: https://ethereum-sepolia-rpc.publicnode.com
- **Sei Testnet**: https://evm-rpc-testnet.sei-apis.com

### Faucets

- **Sepolia ETH**: https://sepoliafaucet.com/
- **Sei Testnet**: https://atlantic-2.app.sei.io/faucet

### USDC Test Token Faucets

- **Circle Faucet**: https://faucet.circle.com/ (Get testnet USDC for Sepolia and other supported networks)

## Timeline

- **Submission Deadline**: 3-5 days from assignment receipt
- **Submission Method**: Email GitHub repository link and deployed app URL

## Best Practices (Recommendations)

These are suggestions to help you build a better application:

### UI/UX

- Clean, modern interface
- Clear loading states
- Comprehensive error handling with user-friendly messages
- Responsive design (mobile-first approach)
- Intuitive flow for batch operations

### Security

- Validate token addresses before transactions
- Check chain ID before every transaction
- Handle BigNumber operations correctly

### Performance

- Batch RPC calls where possible
- Implement proper React memoization
- Use loading states for all async operations

### Testing (Optional)

- Unit tests for utility functions
- Integration tests for critical flows

## Submission Checklist

Before submitting, ensure:

- [ ] All core features work on both chains
- [ ] No console errors in production build
- [ ] Environment variables are documented
- [ ] README includes clear setup instructions
- [ ] Deployed app is accessible

## Additional Resources

- Contract ABI can be found in `contracts/out/SimpleVault.sol/SimpleVault.json`

## Questions?

If you have any questions about the requirements or encounter any issues with the deployed contracts, please reach out to your recruiting contact.

Good luck! We're excited to see what you build. 🚀
