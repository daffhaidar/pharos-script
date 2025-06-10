# Pharos Network Token Faucet Script

Script to send PHRS tokens to multiple random addresses on Pharos Network testnet.

## Features

* Supports multiple private keys (unlimited)
* Generates 51 random valid Ethereum addresses
* Sends PHRS tokens in batches
* Checks sender balance before transactions
* Handles nonce management automatically
* Confirms transactions and shows transaction hashes
* 61 seconds delay between transactions
* Random 5-10 minutes delay between batches

## Installation

Clone repository and install dependencies:

```bash
git clone https://github.com/daffhaidar/pharos-script.git
cd pharos-script
npm install
```

## Usage

1. Create `.env` file and add your private keys:
```
PRIVATE_KEY_1=your_first_private_key
PRIVATE_KEY_2=your_second_private_key
PRIVATE_KEY_3=your_third_private_key
# Add as many private keys as you want
```

2. Run the script:
```bash
node send_faucet.js
```

## How It Works

The script performs the following actions:

1. Connects to Pharos Network testnet using RPC URL: `https://testnet.dplabs-internal.com`
2. Generates 51 random valid Ethereum addresses
3. Splits addresses into batches based on available private keys
4. Sends 0.0021 PHRS tokens to each address in sequence
5. Shows transaction hash and confirmation

## Security Note

⚠️ **IMPORTANT**: Never share or commit your private keys. The script is set up to read private keys from `.env` file.

## Troubleshooting

* If you encounter RPC errors, make sure you're connected to the internet
* Ensure the sender address has enough PHRS tokens to cover all transactions plus gas fees
* Make sure the private keys used are valid and have sufficient balance

## License

MIT
