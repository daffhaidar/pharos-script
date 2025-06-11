# Pharos Network Faucet Script

This script has evolved from a simple faucet into a powerful, all-in-one automation bot for the Pharos Network. It's designed to run continuously, executing a configurable sequence of operations like token swaps and batch transfers across an unlimited number of wallets.

## Features

- **All-in-One Script**: All logic, configuration, and execution are contained within a single `send_faucet.js` file for maximum portability.
- **Sequential Operations**: Executes a predefined sequence of tasks (e.g., swap PHRS to USDT, then transfer a batch, then swap USDT to USDC) for each wallet.
- **Multi-Action Support**: Natively supports complex actions like:
  - Swapping the native coin (PHRS) for tokens.
  - Swapping between different tokens (e.g., USDC to USDT).
  - Sending PHRS to a large batch of randomly generated addresses.
- **Unlimited Multi-Wallet Support**: Automatically detects and uses all private keys from your `.env` file that start with `PRIVATE_KEY_`.
- **Fully Configurable**: Easily change the entire bot's behavior—the sequence of actions, swap amounts, transfer counts, and delays—directly within the `config` object at the top of the script.
- **Randomized Behavior**: Simulates human activity with random delays between transactions and cycles, plus random amounts for each transaction.
- **Continuous Operation**: Runs in an infinite loop, completing a full cycle for all wallets before starting the next one after a random delay.

## Network Information

- **Network Name**: Pharos Testnet
- **Chain ID**: 688688
- **RPC URL**: `https://testnet.dplabs-internal.com`
- **Block Explorer**: `https://testnet.pharosscan.xyz`
- **Currency Symbol**: PHRS

## Setup

1.  **Install dependencies**:
    ```bash
    git clone https://github.com/daffhaidar/pharos-script.git
    cd pharos-script
    npm install
    ```

2.  **Create a `.env` file** in the root directory with your private keys:
    ```env
    PRIVATE_KEY_1=your_first_private_key
    PRIVATE_KEY_2=your_second_private_key
    PRIVATE_KEY_3=your_third_private_key
    # Add more private keys as needed
    ```

3.  **Ensure sufficient PHRS tokens**: Make sure each wallet has enough PHRS tokens to cover the maximum possible distribution (0.0023 PHRS × number of addresses per wallet).

## Usage

Run the script:
```bash
node send_faucet.js
```

The script will:
- Generate 51 random addresses.
- Split these addresses among the available private keys.
- Send random amounts of PHRS tokens to each address.
- Wait random intervals between transactions and wallet switches.

## Configuration

The script includes several configurable parameters:
- **Random amount range**: 0.0012 - 0.0023 PHRS
- **Transaction delay**: 31 - 61 seconds
- **Wallet switch delay**: 5 - 10 minutes
- **Number of addresses**: 51 (can be modified in the code)

## Error Handling

The script includes error handling for:
- Insufficient wallet balance.
- Transaction failures.
- Network connectivity issues.
- Invalid private keys.

## Notes

- Keep your private keys secure and never commit them to version control.
- The script uses the maximum possible amount (0.0023 PHRS) when checking wallet balances to ensure sufficient funds.
- Each transaction is confirmed before proceeding to the next one.
- The script maintains proper nonce management for each wallet. 
