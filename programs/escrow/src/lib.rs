#![allow(clippy::result_large_err)]
#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;
use crate::instructions::*;

pub mod instructions;
pub mod state;
pub mod constants;

declare_id!("4LqeQmPkhTkmkS1nGQJXsqwxfk1n5zU774oFWqojcJkq");

#[program]
pub mod escrow {
    use super::*;

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        instructions::deposit::deposit(ctx, amount)
    }

    pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
        instructions::withdraw::withdraw(ctx)
    }
}

pub use state::error::EscrowError;