// programs/anchor-program-escrow/src/instructions/deposit.rs
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::*;
use crate::EscrowError;

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        mut,
        constraint = user_token_account.owner == user.key(),
        constraint = escrow_token_account.mint == user_token_account.mint
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = escrow_token_account.owner == escrow_account.key()
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + 40 + 32, // Increased space for mint Pubkey
        seeds = [b"escrow".as_ref(), user.key().as_ref(), user_token_account.mint.as_ref()],
        bump
    )]
    pub escrow_account: Account<'info, EscrowAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    require!(amount > 0, EscrowError::InsufficientBalance);
    let escrow_account = &mut ctx.accounts.escrow_account;
    escrow_account.owner = *ctx.accounts.user.key;
    escrow_account.amount += amount;
    escrow_account.mint = ctx.accounts.user_token_account.mint;

    let cpi_accounts = Transfer {
        from: ctx.accounts.user_token_account.to_account_info(),
        to: ctx.accounts.escrow_token_account.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    token::transfer(CpiContext::new(cpi_program, cpi_accounts), amount)?;

    Ok(())
}