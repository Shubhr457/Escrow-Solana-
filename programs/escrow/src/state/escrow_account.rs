// programs/anchor-program-escrow/src/state/escrow_account.rs
use anchor_lang::prelude::*;

#[account]
pub struct EscrowAccount {
    pub owner: Pubkey, // 32 bytes
    pub amount: u64,   // 8 bytes
    pub mint: Pubkey,  // 32 bytes (new field to track token mint)
}