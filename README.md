# Pharos Network Token Faucet Script

![Pharos](https://img.shields.io/badge/network-Pharos-blue)
Script to send PHRS tokens to multiple random addresses on the Pharos Network testnet.

## Features

- Generates 11 random valid Ethereum addresses
- Sends PHRS tokens in batches (5 + 5 + 1 addresses)
- Checks sender balance before transactions
- Handles nonce management automatically
- Confirms transactions and shows transaction hashes

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/your-username/pharos-faucet-sender.git
cd pharos-script
npm install
```

## Usage

1. Open `send_faucet.js` and replace `'YOUR_PRIVATE_KEY_HERE'` with your actual private key (without the '0x' prefix)
2. Optionally adjust the `AMOUNT_TO_SEND` value (default is 0.001 PHRS per address)
3. Run the script:

```bash
npm start
```

Or directly with Node:

```bash
node send_faucet.js
```

## How It Works

The script performs the following actions:

1. Connects to Pharos Network testnet using the RPC URL: `https://api.zan.top/node/v1/pharos/testnet/1761472bf26745488907477d23719fb5`
2. Generates 11 random valid Ethereum addresses
3. Splits these addresses into 3 batches (5 + 5 + 1)
4. Sends 0.001 PHRS tokens to each address in sequence
5. Outputs transaction hashes and confirmations

## Security Note

⚠️ **IMPORTANT**: Never share or commit your private keys. The script is set up to read your private key from a variable that you need to manually set before running the script.

Consider storing your private key in an environment variable or using a .env file with dotenv for better security.

## Troubleshooting

- If you encounter RPC errors, try reducing the transaction speed or adding more delay between transactions
- Make sure your sending address has enough PHRS tokens to cover all the transactions plus gas fees

## License

[MIT](LICENSE)
