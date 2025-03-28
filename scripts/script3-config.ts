const config = {
    rpcUrl: '',
    priorityFee: 3000000,
    doRefundOnly: {
        sol: false,
        token: false,
    },
    skipFunding: true,
    slippage: 5, // in percent
    bundleType: 'sell', // buy or sell
    sellAll: true, // sell all tokens from wallets; false - to sell first buyer amount of tokens from each wallet

    // Jito
    jito: {
        blockEngineUrl: 'frankfurt.mainnet.block-engine.jito.wtf',
        walletToPayFees: '',
        jitoAuth: '',
        tipLamports: 1000000,
    },

    // Funder
    funderPk: '',

    // Wallets
    buyers: [
        { privateKey: '', amount: 0.000001 },
        { privateKey: '', amount: 0.000001 },
        { privateKey: '', amount: 0.000001 },
        { privateKey: '', amount: 0.000001 },
        { privateKey: '', amount: 0.000001 },
        { privateKey: '', amount: 0.000001 },
        { privateKey: '', amount: 0.000001 },
        { privateKey: '', amount: 0.000001 },
        { privateKey: '', amount: 0.000001 },
        { privateKey: '', amount: 0.000001 },
        { privateKey: '', amount: 0.000001 },
        { privateKey: '', amount: 0.000001 },
        { privateKey: '', amount: 0.000001 },
        { privateKey: '', amount: 0.000001 },
        { privateKey: '', amount: 0.000001 },
        { privateKey: '', amount: 0.000001 },
    ],
}

export default config;
