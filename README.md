# Pharos Network Bot

An automated bot for interacting with Pharos Testnet, performing swaps, transfers, faucet claims, and daily check-ins.

## Features ✨

- **Faucet Claim**: Automatically claim testnet tokens
- **Token Swap**: Swap between WPHRS and USDC
- **PHRS Transfer**: Send PHRS to random addresses
- **Daily Check-in**: Daily check-in for rewards
- **Multi-wallet Support**: Support for multiple wallets

## Prerequisites 📋

- Node.js (v18 or higher)
- npm or yarn
- Pharos Testnet wallet with private key

## Installation ⚙️

1. Clone the repository:

```bash
git clone https://github.com/daffhaidar/pharos-script.git
cd pharos-bot
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory with your private key:

```
PRIVATE_KEY_1=your_private_key_here
PRIVATE_KEY_2=your_private_key_here
PRIVATE_KEY_3=your_private_key_here
PRIVATE_KEY_4=your_private_key_here
PRIVATE_KEY_5=your_private_key_here
# Add more private keys as needed
```

## Configuration ⚙️

The bot uses default settings for Pharos Testnet. You can modify:

- Network RPC URL in `CONFIG.NETWORK`
- Contract addresses in `CONFIG.TOKENS` and `CONFIG.DEX`
- Swap amounts in `CONFIG.SWAP`
- Transfer amounts in `CONFIG.TRANSFER`

## Usage 🚀

Run the bot:

```javascript
node pharos_bot.js
```

The bot will:

1. Display a banner with project info
2. Process each wallet sequentially:
   - Claim faucet (if available)
   - Perform daily check-in
   - Execute 10 PHRS transfers
   - Execute 10 token swaps
3. Repeat every 30 minutes

## Logging 📝

The bot provides color-coded logs:

- ✅ Success messages (green)
- ⚠️ Warnings (yellow)
- ❌ Errors (red)
- 🔄 Loading/process indicators (cyan)
- ➤ Step-by-step actions (white)

## Important Notes ⚠️

1. This bot is for TESTNET use only
2. Never use mainnet private keys
3. The bot runs indefinitely until stopped (Ctrl+C)
4. All transactions use 0 gas price (testnet feature)
5. The bot includes random delays between operations

## Code Structure 📁

```
pharos_bot/
├── pharos_bot.js      # Main bot file
├── .env              # Private key configuration
├── package.json      # Dependencies
└── README.md         # Documentation
```

## Contributing 🤝

Feel free to make pull requests for contributions. For major changes, please open an issue first to discuss what you would like to change.

## License 📄

MIT License - See LICENSE file for details

## Disclaimer ⚠️

This software is provided "as is" without warranties. Use at your own risk. The developers are not responsible for any losses or issues caused by using this bot.
