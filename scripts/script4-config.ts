const config = {
  rpcUrl: '',
  priorityFee: 3000000,
  doRefundOnly: {
    sol: false,
    token: false,
  },
  skipFunding: false,
  slippage: 5, // in percent
  generateMint: false, // false to use address from ../inputs/mint-keypair.json
  blockInterval: 1, // 0.4 seconds
  applySellBundle: true, // false to send only first bundle

  // Jito
  jito: {
    blockEngineUrl: 'frankfurt.mainnet.block-engine.jito.wtf',
    walletToPayFees: '',
    jitoAuth: '',
    tipLamports: 1000000,
  },

  // Funder
  funderPk: '',

  // Creator
  creator: {
    privateKey: '',
    amount: 0.000001,
  },

  // Token Metadata
  tokenMetadata: {
    name: 'Test',
    symbol: 'TT',
    description: 'sadfghjk',
    file: 'img.png',
    twitter: '',
    telegram: '',
    website: '',
  },

  // Buyers
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
