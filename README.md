# Pumpfun scripts

>Just created Create-n-buy bundled V2 (script4) - which allows sending 2 bundles in adjacent blocks. Minimizing the possibility of sniper transaction slippage.

# Contact me
- full code
- full updated SDK
- end to end help
- any private offers
### Telegram
> https://t.me/kazinarka

# Coming soon
> Telegram bot for launching scripts (only for registered users)

## Script 1 - Create-n-buy bundled V1

Bundle:
- 1st transaction - pay jito fee, create token and buy certain amount in SOL equivalent with creator wallet
- 2nd-5th transactions - buy certain amount in SOL equivalent with buyers wallets (4 buys in 1 tx)

Update data in scripts/script1-config.ts
> npm run start1

Features:
- Optional fund
- Bundle to create token on pump fun and buy it with 17 wallets (creator wallet + 16 buyers)
- Separate refund of SOL and special SPL-token from all wallets (SOL refund goes to funder wallet, token refund goes to 1st buyer wallet)


## Script 2 - Sell-n-buy with several wallets

Update data in scripts/script2-config.ts
Update data in inputs/script2-input.csv
> npm run start2

Features:
- Sell and buy for each wallet in the list in a SOL equivalent provided
- See failed transactions in outputs/scripts2-failed.csv


## Script 3 - Sell-or-buy bundled

Bundle:
- 1st - pay jito fee
- 2nd-5th transactions - buy certain amount in SOL equivalent or sell certain amount of tokens with buyers wallets (4 buys/sells in 1 tx)

Update data in scripts/script3-config.ts
> npm run start3

Features:
- Optional fund
- Separate refund of SOL and special SPL-token from all wallets (SOL refund goes to funder wallet, token refund goes to 1st buyer wallet)
- Sell or buy bundle with 16 wallets (buyers wallets)
- Sell all tokens from wallets


## Script 4 - Create-n-buy bundled V2

1st Bundle (N block):
- 1st transaction - pay jito fee, create token and buy certain amount in SOL equivalent with creator wallet
- 2nd-5th transactions - buy certain amount in SOL equivalent with buyers wallets (4 buys in 1 tx)

2nd Bundle (N + M block):
- 1st transaction - pay jito fee, sell all bought tokens with creator wallet
- 2nd-5th transactions - sell all bought tokens with 0-16 wallets

M - is configurable (1 or more)

Update data in scripts/script4-config.ts
> npm run start4

Features:
- Optional fund
- Bundle to create token on pump fun and buy it with 1-17 wallets (creator wallet + 0-16 buyers)
- Bundle to sell all tokens from wallets (optional, with delay of 1 block or higher)
- Separate refund of SOL and special SPL-token from all wallets (SOL refund goes to funder wallet, token refund goes to creator wallet)
