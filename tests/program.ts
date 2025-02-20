import { BN } from 'bn.js';
import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { 
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAccount,
} from '@solana/spl-token';
import { PublicKey, LAMPORTS_PER_SOL, Keypair, Transaction, SystemProgram } from '@solana/web3.js';
import { assert } from 'chai';
import type { Escrow } from '../target/types/escrow';

describe('escrow', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.escrow as Program<Escrow>;
  
  const payer = provider.wallet.payer;
  

  let mint: PublicKey;
  let user: Keypair;
  let userTokenAccount: PublicKey;
  let escrowTokenAccount: PublicKey;
  let escrowAccount: PublicKey;

  before(async () => {
    user = Keypair.generate();

    const fundTx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: user.publicKey,
        lamports: 1 * LAMPORTS_PER_SOL,
      })
    );
    await provider.sendAndConfirm(fundTx, [payer]);

    mint = await createMint(
      provider.connection,
      payer,
      payer.publicKey,
      null,
      0
    );

    const userATA = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer,
      mint,
      user.publicKey
    );
    userTokenAccount = userATA.address;

    [escrowAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), user.publicKey.toBuffer()],
      program.programId
    );

    const escrowATA = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer,
      mint,
      escrowAccount,
      true
    );
    escrowTokenAccount = escrowATA.address;

    await mintTo(
      provider.connection,
      payer,
      mint,
      userTokenAccount,
      payer.publicKey,
      1000
    );
  });

  it("Deposits tokens successfully", async () => {
    const depositAmount = new BN(500);
    
    const tx = await program.methods
      .deposit(depositAmount)
      .accounts({
        user: user.publicKey,
        userTokenAccount,
        escrowTokenAccount,
        escrowAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();
    
    await provider.connection.confirmTransaction(tx);

    const escrowState = await program.account.escrowAccount.fetch(escrowAccount);
    assert.ok(escrowState.owner.equals(user.publicKey), "Owner should match user");
    assert.ok(escrowState.amount.eq(depositAmount), "Escrow amount should equal deposited amount");

    const userTokenBalance = await getAccount(provider.connection, userTokenAccount);
    const escrowTokenBalance = await getAccount(provider.connection, escrowTokenAccount);
    assert.equal(Number(userTokenBalance.amount), 500, "User should have 500 tokens remaining");
    assert.equal(Number(escrowTokenBalance.amount), 500, "Escrow should have 500 tokens");
  });

  it("Makes multiple deposits successfully", async () => {
    const secondDepositAmount = new BN(200);
    const tx = await program.methods
      .deposit(secondDepositAmount)
      .accounts({
        user: user.publicKey,
        userTokenAccount,
        escrowTokenAccount,
        escrowAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    await provider.connection.confirmTransaction(tx);

    const escrowState = await program.account.escrowAccount.fetch(escrowAccount);
    assert.ok(escrowState.amount.eq(new BN(700)), "Escrow amount should be 700 (500 + 200)");

    const userTokenBalance = await getAccount(provider.connection, userTokenAccount);
    const escrowTokenBalance = await getAccount(provider.connection, escrowTokenAccount);
    assert.equal(Number(userTokenBalance.amount), 300, "User should have 300 tokens remaining");
    assert.equal(Number(escrowTokenBalance.amount), 700, "Escrow should have 700 tokens");
  });

  it("Withdraws tokens successfully", async () => {
    const tx = await program.methods
      .withdraw()
      .accounts({
        user: user.publicKey,
        userTokenAccount,
        escrowTokenAccount,
        escrowAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user])
      .rpc();

    await provider.connection.confirmTransaction(tx);

    const postWithdrawBalance = await getAccount(provider.connection, userTokenAccount);
    assert.equal(Number(postWithdrawBalance.amount), 1000, "User should have all 1000 tokens back");

    try {
      await program.account.escrowAccount.fetch(escrowAccount);
      assert.fail("Escrow account should be closed after withdrawal");
    } catch (err) {
      assert.ok(err instanceof Error, "Expected an error when fetching closed account");
    }
  });

  it("Fails to deposit zero amount", async () => {
    const zeroAmount = new BN(0);
    try {
      await program.methods
        .deposit(zeroAmount)
        .accounts({
          user: user.publicKey,
          userTokenAccount,
          escrowTokenAccount,
          escrowAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([user])
        .rpc();
      assert.fail("Deposit with zero amount should fail");
    } catch (err) {
      const anchorError = anchor.AnchorError.parse(err.logs);
      assert.ok(anchorError, "Should throw an AnchorError");
      assert.equal(anchorError.error.errorCode.code, "InsufficientBalance", "Should throw InsufficientBalance error");
    }
  });

  it("Fails to withdraw with unauthorized user", async () => {
    const unauthorizedUser = Keypair.generate();
    const fundTx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: unauthorizedUser.publicKey,
        lamports: 1 * LAMPORTS_PER_SOL,
      })
    );
    await provider.sendAndConfirm(fundTx, [payer]);

    await program.methods
      .deposit(new BN(100))
      .accounts({
        user: user.publicKey,
        userTokenAccount,
        escrowTokenAccount,
        escrowAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    try {
      await program.methods
        .withdraw()
        .accounts({
          user: unauthorizedUser.publicKey,
          userTokenAccount,
          escrowTokenAccount,
          escrowAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([unauthorizedUser])
        .rpc();
      assert.fail("Withdrawal by unauthorized user should fail");
    } catch (err) {
      assert.ok(
        err.message.includes("A seeds constraint was violated") ||
        err.message.includes("Signature verification failed") ||
        err.message.includes("Constraint"),
        "Expected a constraint-related error"
      );
    }
  });

  it("User balance should remain unchanged after failed withdrawal", async () => {
    await program.methods
      .deposit(new BN(100))
      .accounts({
        user: user.publicKey,
        userTokenAccount,
        escrowTokenAccount,
        escrowAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    const preWithdrawBalance = await getAccount(provider.connection, userTokenAccount);
    await program.methods
      .withdraw()
      .accounts({
        user: user.publicKey,
        userTokenAccount,
        escrowTokenAccount,
        escrowAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user])
      .rpc();

    const postFirstWithdrawBalance = await getAccount(provider.connection, userTokenAccount);
    try {
      await program.account.escrowAccount.fetch(escrowAccount);
      assert.fail("Escrow account should be closed after withdrawal");
    } catch (err) {
      assert.ok(err instanceof Error, "Expected an error when fetching closed account");
    }

    try {
      await program.methods
        .withdraw()
        .accounts({
          user: user.publicKey,
          userTokenAccount,
          escrowTokenAccount,
          escrowAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([user])
        .rpc();
      assert.fail("Withdrawal from closed account should fail");
    } catch (err) {
      const anchorError = anchor.AnchorError.parse(err.logs);
      assert.ok(anchorError, "Should throw an AnchorError");
      assert.equal(anchorError.error.errorCode.code, "AccountNotInitialized", 
        "Expected AccountNotInitialized error for closed account");
    }

    const postWithdrawBalance = await getAccount(provider.connection, userTokenAccount);
    assert.equal(
      Number(postWithdrawBalance.amount), 
      Number(postFirstWithdrawBalance.amount), 
      "User balance should remain unchanged after failed withdrawal"
    );
  });

  it("Verifies escrow account space allocation", async () => {
    await program.methods
      .deposit(new BN(100))
      .accounts({
        user: user.publicKey,
        userTokenAccount,
        escrowTokenAccount,
        escrowAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    const escrowInfo = await provider.connection.getAccountInfo(escrowAccount);
    assert.equal(
      escrowInfo.data.length,
      8 + 32 + 8, // discriminator (8) + Pubkey (32) + u64 (8)
      "Escrow account space should match defined structure"
    );
  });
});