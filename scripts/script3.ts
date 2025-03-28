import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction
} from "@solana/web3.js";
import {buildVersionedTx, calculateWithSlippageBuy, PumpFunSDK, sendTx} from "../src";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { AnchorProvider } from "@coral-xyz/anchor";
import * as bs58 from 'bs58';
import { DEFAULT_COMMITMENT } from "../src";
import {searcherClient} from 'jito-ts/dist/sdk/block-engine/searcher';
import {Bundle} from "jito-ts/dist/sdk/block-engine/types";
import {Buffer} from "buffer";
import fs from "fs";
import {createTransferInstruction, getAssociatedTokenAddress} from "@solana/spl-token";
import { getMint, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import config from "./script3-config";

const main = async () => {
    const jito_auth_keypair = Keypair.fromSecretKey(new Uint8Array(bs58.decode(config.jito.jitoAuth)));
    const wallet_to_pay_jito_fees_keypair = Keypair.fromSecretKey(new Uint8Array(bs58.decode(config.jito.walletToPayFees)));
    const blockEngineUrl = config.jito.blockEngineUrl;
    const tipLamports = config.jito.tipLamports;

    const priorityFee = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: config.priorityFee,
    });

    const funder_keypair = Keypair.fromSecretKey(new Uint8Array(bs58.decode(config.funderPk)));

    const buyers_keypairs = [];
    const buyers_amounts = [];
    const amounts = [];
    for (let i = 0; i < config.buyers.length; i++) {
        buyers_keypairs.push(Keypair.fromSecretKey(new Uint8Array(bs58.decode(config.buyers[i].privateKey))));
        buyers_amounts.push(calculateWithSlippageBuy(
            BigInt(config.buyers[i].amount * LAMPORTS_PER_SOL),
            BigInt(config.slippage) * 100n
        ));
        amounts.push(BigInt(config.buyers[i].amount * LAMPORTS_PER_SOL))
    }

    const mint = Keypair.fromSecretKey(Buffer.from(JSON.parse(fs.readFileSync('./inputs/mint-keypair.json').toString()))).publicKey;

    let connection = new Connection(config.rpcUrl);

    const mintData = await getMint(connection, mint, DEFAULT_COMMITMENT, TOKEN_PROGRAM_ID);
    const decimals = mintData.decimals

    let wallet = new NodeWallet(funder_keypair);
    const provider = new AnchorProvider(connection, wallet, {
        commitment: DEFAULT_COMMITMENT,
    });

    let sdk = new PumpFunSDK(provider);

    if (!config.doRefundOnly.sol && !config.doRefundOnly.token) {
        if (!config.skipFunding) {
            let fundTx = new Transaction();

            fundTx.add(priorityFee)

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

        // CONTACT ME: buy or sell bundle construction logic

        const response_bund = await search.sendBundle(bund);

        console.log('Response bundle: ', response_bund);
    } else {
        if (config.doRefundOnly.sol) {
            let unfundTx1 = new Transaction();
            unfundTx1.feePayer = funder_keypair.publicKey;
            let unfundTx2 = new Transaction();
            unfundTx2.feePayer = funder_keypair.publicKey;

            unfundTx1.add(priorityFee);

            for (let i = 0; i < config.buyers.length; i++) {
                if (i < config.buyers.length / 2) {
                    unfundTx1.add(SystemProgram.transfer(
                        {
                            fromPubkey: buyers_keypairs[i].publicKey,
                            toPubkey: funder_keypair.publicKey,
                            lamports: await connection.getBalance(buyers_keypairs[i].publicKey),
                        }
                    ))
                } else {
                    unfundTx2.add(SystemProgram.transfer(
                        {
                            fromPubkey: buyers_keypairs[i].publicKey,
                            toPubkey: funder_keypair.publicKey,
                            lamports: await connection.getBalance(buyers_keypairs[i].publicKey),
                        }
                    ))
                }
            }

            const sig1 = await connection.sendTransaction(
                unfundTx1,
                [funder_keypair, ...buyers_keypairs.slice(0, 8)],
                {
                    preflightCommitment: 'confirmed',
                }
            )

            const sig2 = await connection.sendTransaction(
                unfundTx2,
                [funder_keypair, ...buyers_keypairs.slice(8)],
                {
                    preflightCommitment: 'confirmed',
                }
            )

            console.log('Refunding transfers signatures: ', [sig1, sig2])

            let success = 0;

            while (success < 1) {
                const transactionStatus1 = await connection.getParsedTransaction(sig1);
                const transactionStatus2 = await connection.getParsedTransaction(sig2);

                if (transactionStatus1 != null && transactionStatus2 != null) {
                    success = 1;
                    console.log('Successfully refunded!')
                }
                await new Promise(f => setTimeout(f, 1000));
            }
        }

        if (config.doRefundOnly.token) {
            const token_accounts = [];
            const token_amounts = [];
            for (let i = 0; i < config.buyers.length; i++) {
                token_accounts.push(await getAssociatedTokenAddress(
                    mint,
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

            for (let i = 1; i < token_accounts.length; i++) {
                if (i < 7) {
                    unfundTx3.add(createTransferInstruction(
                        token_accounts[i],
                        token_accounts[0],
                        buyers_keypairs[i].publicKey,
                        Number(token_amounts[i].value.amount)
                    ))
                } else if (i >= 7 && i < 13) {
                    unfundTx4.add(createTransferInstruction(
                        token_accounts[i],
                        token_accounts[0],
                        buyers_keypairs[i].publicKey,
                        Number(token_amounts[i].value.amount)
                    ))
                } else {
                    unfundTx5.add(createTransferInstruction(
                        token_accounts[i],
                        token_accounts[0],
                        buyers_keypairs[i].publicKey,
                        Number(token_amounts[i].value.amount)
                    ))
                }
            }

            const sig3 = await connection.sendTransaction(
                unfundTx3,
                [funder_keypair, ...buyers_keypairs.slice(1, 7)],
                {
                    preflightCommitment: 'confirmed',
                }
            )

            const sig4 = await connection.sendTransaction(
                unfundTx4,
                [funder_keypair, ...buyers_keypairs.slice(7, 13)],
                {
                    preflightCommitment: 'confirmed',
                }
            )

            const sig5 = await connection.sendTransaction(
                unfundTx5,
                [funder_keypair, ...buyers_keypairs.slice(13)],
                {
                    preflightCommitment: 'confirmed',
                }
            )

            console.log('Token refunding transfers signatures: ', [sig3, sig4, sig5])

            let success = 0;

            while (success < 1) {
                const transactionStatus1 = await connection.getParsedTransaction(sig3);
                const transactionStatus2 = await connection.getParsedTransaction(sig4);
                const transactionStatus3 = await connection.getParsedTransaction(sig5);

                if (transactionStatus1 != null && transactionStatus2 != null && transactionStatus3 != null) {
                    success = 1;
                    console.log('Successfully refunded!')
                }
                await new Promise(f => setTimeout(f, 1000));
            }
        }
    }
};

main();
