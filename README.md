# Solana Escrow Program

This is a simple escrow smart contract built on the Solana blockchain using the Anchor framework. It allows users to deposit tokens into an escrow account and later withdraw them, with ownership enforced via Program Derived Addresses (PDAs).

## Program ID
```
2k7TSn8QP62CbdfZJaZP9jptcnXxoycnG2iCsE4vuake
```

## Features
- **Deposit**: Lock SPL tokens into an escrow account.
- **Withdraw**: Release tokens from escrow back to the original owner.
- Secure ownership verification using PDAs.
- Built with Anchor for type safety and ease of development.

## Prerequisites
- Rust and Cargo (latest stable version)
- Solana CLI (`solana --version` should be 1.18.x or compatible)
- Anchor CLI (`anchor --version` should be 0.30.x or compatible)
- Node.js and Yarn (for testing/deployment scripts)
- A Solana wallet with some SOL for deployment and testing

## Project Structure
```
escrow/
├── programs/
│   └── escrow/
│       └── src/
│           └── lib.rs    # Main contract logic
├── Anchor.toml           # Anchor configuration
├── package.json          # Node dependencies
└── README.md             # This file
```

## Installation

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd escrow
   ```

2. **Install Dependencies**
   ```bash
   yarn install
   ```

3. **Build the Program**
   ```bash
   anchor build
   ```

4. **Test the Program**
   ```bash
   anchor test
   ```
   *Note: Ensure a local Solana validator is running (`solana-test-validator`) if testing locally.*

5. **Deploy the Program**
   ```bash
   anchor deploy
   ```
   *Ensure your Solana CLI is configured with a wallet and connected to your desired network (e.g., devnet).*

## Usage

### Functions

#### 1. `deposit`
- **Purpose**: Locks a specified amount of tokens into escrow.
- **Arguments**:
  - `amount: u64` - The number of tokens to deposit.
- **Accounts**:
  - `user`: The signer (token owner).
  - `user_token_account`: The user's SPL token account.
  - `escrow_token_account`: The escrow's SPL token account.
  - `escrow_account`: The escrow state account (PDA).
  - `token_program`: SPL Token program.
  - `system_program`: Solana System program.
- **Constraints**:
  - Amount must be greater than 0.
  - Token accounts must have matching mints.
- **Behavior**:
  - Transfers tokens from `user_token_account` to `escrow_token_account`.
  - Records the owner and amount in `escrow_account`.

#### 2. `withdraw`
- **Purpose**: Releases all tokens from escrow back to the owner.
- **Arguments**: None (withdraws full amount).
- **Accounts**:
  - `user`: The signer (must be the original owner).
  - `user_token_account`: The user's SPL token account.
  - `escrow_token_account`: The escrow's SPL token account.
  - `escrow_account`: The escrow state account (PDA).
  - `token_program`: SPL Token program.
- **Constraints**:
  - Only the original owner can withdraw.
- **Behavior**:
  - Transfers all tokens from `escrow_token_account` to `user_token_account`.
  - Resets escrow amount to 0 and closes the escrow account.

### Data Structure
- **EscrowAccount**:
  ```rust
  pub struct EscrowAccount {
      pub owner: Pubkey,  // Owner's public key
      pub amount: u64,    // Amount of tokens in escrow
  }
  ```

### Errors
- `Unauthorized`: Attempted access by a non-owner.
- `InsufficientBalance`: Deposit amount is 0 or invalid.

## Example Workflow
1. **Deposit Tokens**:
   - User calls `deposit` with 100 tokens.
   - Tokens move to escrow, and `EscrowAccount` is initialized with `owner` as the user's public key and `amount` as 100.

2. **Withdraw Tokens**:
   - User calls `withdraw`.
   - 100 tokens are returned to the user, and the escrow account is closed.

## Security Considerations
- Uses PDAs to ensure only the program can control the escrow token account.
- Validates account ownership and token mint compatibility.
- Only the original depositor can withdraw their funds.
- Includes basic error checking (e.g., non-zero amount).

## Development Notes
- The escrow account is initialized with a space of 8 + 40 bytes (8 for discriminator, 32 for `Pubkey`, 8 for `u64`).
- Built with Anchor's SPL token integration for reliable token transfers.
- Uses CPI (Cross-Program Invocation) to interact with the SPL Token program.

## Contributing
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/new-feature`).
3. Commit changes (`git commit -m "Add new feature"`).
4. Push to the branch (`git push origin feature/new-feature`).
5. Open a pull request.
