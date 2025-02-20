use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("2k7TSn8QP62CbdfZJaZP9jptcnXxoycnG2iCsE4vuake");

#[program]
pub mod escrow {
    use super::*;

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        require!(amount > 0, EscrowError::InsufficientBalance);
        let escrow_account = &mut ctx.accounts.escrow_account;
        escrow_account.owner = *ctx.accounts.user.key;
        escrow_account.amount += amount;
        
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.escrow_token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        token::transfer(CpiContext::new(cpi_program, cpi_accounts), amount)?;

        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
        let amount = ctx.accounts.escrow_account.amount;
        ctx.accounts.escrow_account.amount = 0;
    
        // Get PDA Seeds & Bump
        let bump = ctx.bumps.escrow_account;
        let seeds = &[b"escrow".as_ref(), ctx.accounts.escrow_account.owner.as_ref(), &[bump]];
        let signer_seeds = &[&seeds[..]];
    
        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.escrow_account.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        token::transfer(
            CpiContext::new_with_signer(
                cpi_program,
                cpi_accounts,
                signer_seeds
            ),
            amount
        )?;
    
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        mut,
        constraint = user_token_account.owner == user.key(),
        constraint = escrow_token_account.mint == user_token_account.mint
    )]
    pub user_token_account: Account<'info, TokenAccount>, // Change from Box<Account<...>> to Account<...>
    #[account(
        mut,
        constraint = escrow_token_account.owner == escrow_account.key()
    )]
    pub escrow_token_account: Account<'info, TokenAccount>, // Change from Box<Account<...>> to Account<...>
    #[account(
        init_if_needed,
        payer = user, 
        space = 8 + 40,
        seeds = [b"escrow".as_ref(), user.key().as_ref()], 
        bump
    )]
    pub escrow_account: Account<'info, EscrowAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>, // Change from Box<Account<...>> to Account<...>
    #[account(mut)]
    pub escrow_token_account: Account<'info, TokenAccount>, // Change from Box<Account<...>> to Account<...>
    #[account(
        mut,
        constraint = escrow_account.owner == user.key(),
        seeds = [b"escrow".as_ref(), escrow_account.owner.as_ref()],
        bump,
        close = user
    )]
    pub escrow_account: Account<'info, EscrowAccount>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct EscrowAccount {
    pub owner: Pubkey,
    pub amount: u64,
}

#[error_code]
pub enum EscrowError {
    #[msg("Unauthorized access.")]
    Unauthorized,
    #[msg("Insufficient balance.")]
    InsufficientBalance,
}