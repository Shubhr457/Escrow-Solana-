# NEW-ESCROW Solana Program

## Overview

NEW-ESCROW is a Solana program built using the Anchor framework, designed to facilitate secure, trustless escrow transactions for SPL tokens. This program allows users to deposit tokens into an escrow account and withdraw them under specific conditions, ensuring secure and automated asset management on the Solana blockchain.

The program includes two main functionalities: depositing tokens into an escrow and withdrawing them, with built-in security measures to prevent unauthorized access and ensure proper token handling.

This README provides instructions for setting up, building, and using the program, along with a detailed user flow for interacting with NEW-ESCROW.

## Prerequisites

Before getting started, ensure you have the following installed:

- **Rust and Cargo**: Install Rust via rustup and ensure `cargo` is available.
- **Node.js and npm/yarn**: Install Node.js (v14 or higher) and either npm or yarn for TypeScript dependencies.
- **Solana CLI**: Install the Solana CLI tools using the latest stable version.
- **Anchor CLI**: Install Anchor using `cargo install anchor-cli --locked`.

## Installation

1. **Clone the Repository**:
   Clone this repository to your local machine and navigate to the project directory.

2. **Install Dependencies**:
   - Install Rust dependencies using Cargo.
   - Install TypeScript dependencies using yarn or npm.

3. **Set Up Solana Environment**:
   - Configure your Solana CLI for a local network, devnet, or mainnet.
   - Create a keypair for your wallet if you don’t have one.

## Building the Program

To build the Solana program, navigate to the project root and use the Anchor CLI to compile the program. This will generate the necessary program ID and IDL files.

## Testing

To test the program locally, start a local Solana validator and run the TypeScript tests using the Anchor CLI. Ensure your tests cover key scenarios, such as depositing and withdrawing tokens, as well as edge cases like insufficient balances or unauthorized access.

## Usage

### Interacting with the Program

You can interact with NEW-ESCROW using the Solana CLI, a custom client (e.g., a TypeScript or JavaScript application), or a Solana wallet interface. Below is an example user flow for interacting with the program programmatically using Anchor.

### User Flow

The following steps outline how a user can interact with NEW-ESCROW:

1. **Set Up Wallet and Connection**:
   - Initialize a Solana wallet and connect to the Solana network (local, devnet, or mainnet).

2. **Deposit Tokens**:
   - Prepare an SPL token account (e.g., for a specific token like USDC) and connect it to the program.
   - Use the program’s deposit functionality to specify the amount of tokens to deposit.
   - The program creates or updates a secure escrow account, transfers the tokens, and records the deposit.

3. **Verify Escrow State**:
   - Check the escrow account on-chain to confirm the deposited amount and ensure the escrow is active.

4. **Withdraw Tokens**:
   - Initiate a withdrawal request using the program’s withdraw functionality.
   - The program transfers the escrowed tokens back to the user’s token account and closes the escrow account, returning any remaining SOL to the user.

5. **Handle Errors**:
   - If an error occurs (e.g., insufficient balance, unauthorized access), the program provides error feedback for the client to handle appropriately.

### Notes on Token Accounts
- Ensure the user has a valid SPL token account for the specific mint they wish to escrow.
- The escrow token account must be managed securely by the program to ensure trustless operation.

## Program ID

The program ID for NEW-ESCROW is a unique identifier defined in the project, used when deploying or interacting with the program on-chain.
