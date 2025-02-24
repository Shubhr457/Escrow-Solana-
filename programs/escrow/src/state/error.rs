// programs/anchor-program-escrow/src/lib.rs (add under declare_id! or in a separate file)
use anchor_lang::error_code;

#[error_code]
pub enum EscrowError {
    #[msg("Unauthorized access.")]
    Unauthorized,
    #[msg("Insufficient balance.")]
    InsufficientBalance,
}