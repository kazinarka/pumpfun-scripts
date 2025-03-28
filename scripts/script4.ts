import {
    ComputeBudgetProgram,
    Connection,
    Keypair,
    LAMPORTS_PER_SOL,
    PublicKey,
    SystemProgram,
    Transaction
} from "@solana/web3.js";
import {buildVersionedTx, calculateWithSlippageBuy, PumpFunSDK} from "../src";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import {AnchorProvider, Wallet} from "@coral-xyz/anchor";
import * as bs58 from 'bs58';
import { DEFAULT_COMMITMENT } from "../src";
import {searcherClient} from 'jito-ts/dist/sdk/block-engine/searcher';
import {Bundle} from "jito-ts/dist/sdk/block-engine/types";
import {Buffer} from "buffer";
import {createTransferInstruction, getAssociatedTokenAddress} from "@solana/spl-token";
import config from './script4-config'
import fs from "fs";

const main = async () => {
    const jito_auth_keypair = Keypair.fromSecretKey(new Uint8Array(bs58.decode(config.jito.jitoAuth)));
    const wallet_to_pay_jito_fees_keypair = Keypair.fromSecretKey(new Uint8Array(bs58.decode(config.jito.walletToPayFees)));
    const blockEngineUrl = config.jito.blockEngineUrl;
    const tipLamports = config.jito.tipLamports;

    const priorityFee = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: config.priorityFee,
    });

    const funder_keypair = Keypair.fromSecretKey(new Uint8Array(bs58.decode(config.funderPk)));
    const creator_keypair = Keypair.fromSecretKey(new Uint8Array(bs58.decode(config.creator.privateKey)));
    const creator_amount = calculateWithSlippageBuy(
        BigInt(config.creator.amount * LAMPORTS_PER_SOL),
        BigInt(config.slippage) * 100n
    );
    const amount = BigInt(config.creator.amount * LAMPORTS_PER_SOL);

    const buyers = config.buyers as { privateKey: string; amount: number }[];

    const buyers_keypairs = [];
    const buyers_amounts = [];
    const amounts = [];

    for (let i = 0; i < buyers.length; i++) {
        buyers_keypairs.push(Keypair.fromSecretKey(new Uint8Array(bs58.decode(buyers[i].privateKey))));
        buyers_amounts.push(calculateWithSlippageBuy(
            BigInt(buyers[i].amount * LAMPORTS_PER_SOL),
            BigInt(config.slippage) * 100n
        ));
        amounts.push(BigInt(buyers[i].amount * LAMPORTS_PER_SOL))
    }

    if (config.generateMint) {
        const keypair = Keypair.generate();
        fs.writeFileSync('./inputs/mint-keypair.json', '[' + keypair.secretKey.toString() + ']')
    }
    const mint = Keypair.fromSecretKey(Buffer.from(JSON.parse(fs.readFileSync('./inputs/mint-keypair.json').toString())));

    let connection = new Connection(config.rpcUrl);

    let wallet = new NodeWallet(funder_keypair);
    const provider = new AnchorProvider(connection, wallet, {
        commitment: DEFAULT_COMMITMENT,
    });

    let sdk = new PumpFunSDK(provider);

    if (!config.doRefundOnly.sol && !config.doRefundOnly.token) {
        if (!config.skipFunding) {
            let fundTx = new Transaction();

            // CONTACT ME: fund with precision

            const signature = await connection.sendTransaction(
                fundTx,
                [funder_keypair],
                {
                    preflightCommitment: 'confirmed',
                }
            )

            console.log('Funding transfers signature: ', signature)

            let success = 0;

            while (success < 1) {
                const transactionStatus = await connection.getParsedTransaction(signature);

                if (transactionStatus != null) {
                    success = 1;
                    console.log('Successfully funded!')
                }
                await new Promise(f => setTimeout(f, 1000));
            }
        }

        const bundleTransactionLimit = 5;
        const search = searcherClient(blockEngineUrl, jito_auth_keypair);

        const _tipAccount = (await search.getTipAccounts())[0];
        const tipAccount = new PublicKey(_tipAccount);

        const bund = new Bundle([], bundleTransactionLimit);
        const bundSell = new Bundle([], bundleTransactionLimit);

        // CONTACT ME: bundle with create-n-buy logic
        // CONTACT ME: bundle with sell logic
        // CONTACT ME: landing with block interval
    } else {
        if (config.doRefundOnly.sol) {
            let unfundTx1 = new Transaction();
            unfundTx1.feePayer = funder_keypair.publicKey;
            let unfundTx2 = new Transaction();
            unfundTx2.feePayer = funder_keypair.publicKey;

            unfundTx1.add(priorityFee).add(SystemProgram.transfer(
                {
                    fromPubkey: creator_keypair.publicKey,
                    toPubkey: funder_keypair.publicKey,
                    lamports: await connection.getBalance(creator_keypair.publicKey),
                }
            ));

            unfundTx2.add(priorityFee)

            let signers1 = [];
            let signers2 = [];

            for (let i = 0; i < buyers.length; i++) {
                if (i < 8) {
                    unfundTx1.add(SystemProgram.transfer(
                        {
                            fromPubkey: buyers_keypairs[i].publicKey,
                            toPubkey: funder_keypair.publicKey,
                            lamports: await connection.getBalance(buyers_keypairs[i].publicKey),
                        }
                    ))
                    signers1.push(buyers_keypairs[i])
                } else {
                    unfundTx2.add(SystemProgram.transfer(
                        {
                            fromPubkey: buyers_keypairs[i].publicKey,
                            toPubkey: funder_keypair.publicKey,
                            lamports: await connection.getBalance(buyers_keypairs[i].publicKey),
                        }
                    ))
                    signers2.push(buyers_keypairs[i])
                }
            }

            const sig1 = await connection.sendTransaction(
                unfundTx1,
                [funder_keypair, creator_keypair, ...signers1],
                {
                    preflightCommitment: 'confirmed',
                }
            )

            let sig2 = '';

            if (buyers.length >= 8) {
                sig2 = await connection.sendTransaction(
                    unfundTx2,
                    [funder_keypair, ...signers2],
                    {
                        preflightCommitment: 'confirmed',
                    }
                )

                console.log('Refunding transfers signatures: ', [sig1, sig2])
            } else {
                console.log('Refunding transfers signatures: ', [sig1])
            }

            let success = 0;

            while (success < 1) {
                const transactionStatus1 = await connection.getParsedTransaction(sig1);

                if (transactionStatus1 != null) {
                    if (buyers.length >= 8) {
                        const transactionStatus2 = await connection.getParsedTransaction(sig2);
                        if (transactionStatus2 != null) {
                            success = 1;
                            console.log('Successfully refunded!')
                        }
                    } else {
                        success = 1;
                        console.log('Successfully refunded!')
                    }
                }
                await new Promise(f => setTimeout(f, 1000));
            }
        }

        if (config.doRefundOnly.token) {
            if (buyers.length == 0) {
                console.log('No wallets to refund!')
                return;
            }
            let creatorTokenAccount = await getAssociatedTokenAddress(
                mint.publicKey,
                creator_keypair.publicKey,
                false
            )

            const token_accounts = [];
            const token_amounts = [];
            for (let i = 0; i < buyers.length; i++) {
                token_accounts.push(await getAssociatedTokenAddress(
                    mint.publicKey,
                    buyers_keypairs[i].publicKey,
                    false
                ))
                token_amounts.push(await connection.getTokenAccountBalance(token_accounts[i]))
            }

            let unfundTx3 = new Transaction()
            unfundTx3.feePayer = funder_keypair.publicKey;
            let unfundTx4 = new Transaction()
            unfundTx4.feePayer = funder_keypair.publicKey;
            let unfundTx5 = new Transaction()
            unfundTx5.feePayer = funder_keypair.publicKey;

            let signers3 = [];
            let signers4 = [];
            let signers5 = [];

            for (let i = 0; i < token_accounts.length; i++) {
                if (i < 6) {
                    unfundTx3.add(createTransferInstruction(
                        token_accounts[i],
                        creatorTokenAccount,
                        buyers_keypairs[i].publicKey,
                        Number(token_amounts[i].value.amount)
                    ))
                    signers3.push(buyers_keypairs[i])
                } else if (i >= 6 && i < 13) {
                    unfundTx4.add(createTransferInstruction(
                        token_accounts[i],
                        creatorTokenAccount,
                        buyers_keypairs[i].publicKey,
                        Number(token_amounts[i].value.amount)
                    ))
                    signers4.push(buyers_keypairs[i])
                } else {
                    unfundTx5.add(createTransferInstruction(
                        token_accounts[i],
                        creatorTokenAccount,
                        buyers_keypairs[i].publicKey,
                        Number(token_amounts[i].value.amount)
                    ))
                    signers5.push(buyers_keypairs[i])
                }
            }

            let sigs = [];

            const sig3 = await connection.sendTransaction(
                unfundTx3,
                [funder_keypair, ...signers3],
                {
                    preflightCommitment: 'confirmed',
                }
            )
            sigs.push(sig3)

            if (buyers.length >= 6) {
                const sig4 = await connection.sendTransaction(
                    unfundTx4,
                    [funder_keypair, ...signers4],
                    {
                        preflightCommitment: 'confirmed',
                    }
                )
                sigs.push(sig4)
            }

            if (buyers.length >= 13) {
                const sig5 = await connection.sendTransaction(
                    unfundTx5,
                    [funder_keypair, ...signers5],
                    {
                        preflightCommitment: 'confirmed',
                    }
                )
                sigs.push(sig5)
            }

            console.log('Token refunding transfers signatures: ', sigs)

            let success = 0;

            while (success < 1) {
                const transactionStatus1 = await connection.getParsedTransaction(sigs[0]);

                if (transactionStatus1 != null) {
                    if (buyers.length >= 6) {
                        const transactionStatus2 = await connection.getParsedTransaction(sigs[1]);
                        if (transactionStatus2 != null) {
                            if (buyers.length >= 13) {
                                const transactionStatus3 = await connection.getParsedTransaction(sigs[2]);
                                if (transactionStatus3 != null) {
                                    success = 1;
                                    console.log('Successfully refunded!')
                                }
                            } else {
                                success = 1;
                                console.log('Successfully refunded!')
                            }
                        }
                    } else {
                        success = 1;
                        console.log('Successfully refunded!')
                    }
                }
                await new Promise(f => setTimeout(f, 1000));
            }
        }
    }
};

main();
