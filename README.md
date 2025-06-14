# Pharos Network Faucet Script

This script has evolved from a simple faucet into a powerful, all-in-one automation bot for the Pharos Network. It's designed to run continuously, executing a configurable sequence of operations like token swaps, contract deployments, and batch transfers across an unlimited number of wallets.

## Features

- **All-in-One Script**: All logic, configuration, and execution are contained within a single `send_faucet.js` file for maximum portability.
- **Sequential Operations**: Executes a predefined sequence of tasks including:
  - Faucet claims (once per 24 hours per address)
  - Contract deployments (limited to 2 per address)
  - Token swaps on Faroswap
  - Price checks and quotes
  - Batch transfers
- **Multi-Action Support**: Natively supports complex actions like:
  - Claiming testnet tokens from faucet
  - Deploying smart contracts through the playground
  - Swapping tokens on Faroswap
  - Swapping the native coin (PHRS) for tokens
  - Swapping between different tokens (e.g., USDC to USDT)
  - Sending PHRS to a large batch of randomly generated addresses
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
- **Faroswap**: `https://faroswap.xyz`
- **Contract Playground**: `https://playground.easy-node.xyz`
- **Faucet**: `https://testnet.pharosnetwork.xyz`

## Setup

1. **Install dependencies**:
    ```bash
    git clone github.com/daffhaidar/pharos-script
    cd pharos-script
    npm install
    ```

2. **Create a `.env` file** in the root directory with your private keys:
    ```env
    PRIVATE_KEY_1=your_first_private_key
    PRIVATE_KEY_2=your_second_private_key
    PRIVATE_KEY_3=your_third_private_key
    # Add more private keys as needed
    ```

3. **Ensure sufficient PHRS tokens**: Make sure each wallet has enough PHRS tokens to cover:
    - Maximum possible distribution (0.0023 PHRS × number of addresses per wallet)
    - Contract deployment fees (approximately 0.02 PHRS per deployment)
    - Swap fees on Faroswap
    - Initial gas for faucet claims

## Usage

Run the script:
```bash
node send_faucet.js
```

The script will:
- Claim faucet tokens (once per 24 hours per address)
- Deploy contracts (limited to 2 per address)
- Perform token swaps on Faroswap
- Generate 51 random addresses
- Split these addresses among the available private keys
- Send random amounts of PHRS tokens to each address
- Wait random intervals between transactions and wallet switches

## Configuration

The script includes several configurable parameters:
- **Faucet Claims**:
  - Once per 24 hours per address
  - Automatic tracking of claim times
  - Balance checks before and after claims

- **Contract Deployment**:
  - Maximum 2 deployments per address
  - Deployed through playground for cost efficiency
  - Automatic verification of deployments

- **Faroswap Integration**:
  - Support for WPHRS, USDC, and USDT pairs
  - Price quotes before swaps
  - 5% slippage protection
  - Automatic token approvals

- **Random amount range**: 0.0012 - 0.0023 PHRS
- **Transaction delay**: 31 - 61 seconds
- **Wallet switch delay**: 5 - 10 minutes
- **Number of addresses**: 51 (can be modified in the code)

## Error Handling

The script includes error handling for:
- Insufficient wallet balance
- Transaction failures
- Network connectivity issues
- Invalid private keys
- Contract deployment failures
- Swap failures on Faroswap
- Faucet claim failures
- 24-hour claim cooldown

## Notes

- Keep your private keys secure and never commit them to version control
- The script uses the maximum possible amount when checking wallet balances to ensure sufficient funds
- Each transaction is confirmed before proceeding to the next one
- The script maintains proper nonce management for each wallet
- Contract deployments are verified on-chain before counting as successful
- Faroswap interactions include price checks and slippage protection
- Faucet claims are tracked per address with 24-hour cooldown
