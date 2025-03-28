import {
    Connection,
    Keypair,
    PublicKey
} from "@solana/web3.js";
import { PumpFunSDK } from "../src";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { AnchorProvider } from "@coral-xyz/anchor";
import * as bs58 from 'bs58';
import { DEFAULT_COMMITMENT } from "../src";
import fs from "fs";
const csvToJson = require('csvtojson')
import { getMint } from '@solana/spl-token';
import config from './script2-config'

const failedFileName = './outputs/scripts2-failed.csv'
const inputFile = './inputs/script2-input.csv'

const main = async () => {
    fs.writeFileSync(failedFileName, 'wallet,sell,buy,priority' + '\n')

    const data = await csvToJson({
        trim: true
    }).fromFile(inputFile)

    let connection = new Connection(config.rpcUrl);

    const mint = new PublicKey(config.mint)
    const mintInfo = await getMint(connection, mint);

    const decimals = mintInfo.decimals;

    for (let i = 0; i < data.length; i++) {
        try {
            const keypair = Keypair.fromSecretKey(new Uint8Array(bs58.decode(data[i].wallet)));

            const sell_amount = BigInt(Number(data[i].sell) * 10 ** decimals);
            const buy_amount = BigInt(Number(data[i].buy) * 10 ** decimals);

            let wallet = new NodeWallet(keypair);
            const provider = new AnchorProvider(connection, wallet, {
                commitment: DEFAULT_COMMITMENT,
            });

            let sdk = new PumpFunSDK(provider);

            // CONTACT ME: sell-n-buy transaction
        } catch(e) {
            console.error("error sending transaction:", e);
            let output = data[i].wallet + ',' + data[i].sell + ',' + data[i].buy + ',' + data[i].priority + '\n'
            fs.writeFileSync(failedFileName, output, {
                flag: 'a+'
            })
        }
    }
};

main();
