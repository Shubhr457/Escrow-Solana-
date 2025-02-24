// programs/anchor-program-escrow/src/instructions/withdraw.rs
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::EscrowAccount; 
#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        mut,
        constraint = user_token_account.owner == user.key(),
        constraint = escrow_token_account.mint == user_token_account.mint
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub escrow_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = escrow_account.owner == user.key(),
        constraint = escrow_token_account.owner == escrow_account.key(),
        constraint = escrow_account.mint == user_token_account.mint,
        seeds = [b"escrow".as_ref(), escrow_account.owner.as_ref(), escrow_account.mint.as_ref()],
        bump,
        close = user
    )]
    pub escrow_account: Account<'info, EscrowAccount>,
    pub token_program: Program<'info, Token>,
}

pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
    let amount = ctx.accounts.escrow_account.amount;
    ctx.accounts.escrow_account.amount = 0;

    let bump = ctx.bumps.escrow_account;
    let mint_key = ctx.accounts.escrow_account.mint;
    let seeds = &[
        b"escrow".as_ref(),
        ctx.accounts.escrow_account.owner.as_ref(),
        mint_key.as_ref(),
        &[bump],
    ];
    let signer_seeds = &[&seeds[..]];

    let cpi_accounts = Transfer {
        from: ctx.accounts.escrow_token_account.to_account_info(),
        to: ctx.accounts.user_token_account.to_account_info(),
        authority: ctx.accounts.escrow_account.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    token::transfer(
        CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds),
        amount,
    )?;

    Ok(())
}