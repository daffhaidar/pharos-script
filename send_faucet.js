// Script to send PHRS tokens to random accounts on Pharos Network
const { ethers } = require("ethers");
// Try to load dotenv if available
try {
  require("dotenv").config();
} catch (error) {
  // dotenv not installed, using direct config
}

// Pharos testnet RPC URL
const RPC_URL = process.env.RPC_URL || "https://api.zan.top/node/v1/pharos/testnet/1761472bf26745488907477d23719fb5";

// Get private keys from .env file
// Format in .env should be: PRIVATE_KEY_1=your_key_1, PRIVATE_KEY_2=your_key_2, etc.
const PRIVATE_KEYS = Object.keys(process.env)
  .filter((key) => key.startsWith("PRIVATE_KEY_"))
  .map((key) => process.env[key]);

if (PRIVATE_KEYS.length === 0) {
  console.error("No private keys found in .env file. Please add PRIVATE_KEY_1, PRIVATE_KEY_2, etc.");
  process.exit(1);
}

// Amount of PHRS to send to each address
const AMOUNT_TO_SEND = "0.0021";

// Connect to Pharos testnet with chain ID
const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
provider.getNetwork().then((network) => {
  if (network.chainId !== CHAIN_ID) {
    console.error(`Warning: Connected to chain ID ${network.chainId}, expected ${CHAIN_ID}`);
  }
});

// Helper function to sleep for a given time
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Helper function to get a random delay between 5-10 minutes
function getRandomDelay() {
  // Random minutes between 5 and 10
  const minutes = Math.floor(Math.random() * 5) + 5;
  // Convert to milliseconds
  return minutes * 60 * 1000;
}

// Generate random addresses
function generateRandomAddresses(count) {
  const addresses = [];
  for (let i = 0; i < count; i++) {
    const randomWallet = ethers.Wallet.createRandom();
    addresses.push(randomWallet.address);
  }
  return addresses;
}

// Send PHRS tokens to addresses using a specific wallet
async function sendTokens(addresses, privateKey) {
  const wallet = new ethers.Wallet(privateKey, provider);
  const valueToSend = ethers.utils.parseEther(AMOUNT_TO_SEND);

  console.log(`\nUsing sender address: ${wallet.address}`);

  // Get current balance
  const balance = await provider.getBalance(wallet.address);
  console.log(`Current balance: ${ethers.utils.formatEther(balance)} PHRS`);

  // Check if we have enough balance
  const requiredBalance = valueToSend.mul(addresses.length);
  if (balance.lt(requiredBalance)) {
    console.error(`Not enough balance for wallet ${wallet.address}. Need at least ${ethers.utils.formatEther(requiredBalance)} PHRS`);
    return false;
  }

  // Send transactions in sequence to avoid nonce issues
  let nonce = await provider.getTransactionCount(wallet.address);

  for (const address of addresses) {
    console.log(`Sending ${AMOUNT_TO_SEND} PHRS to ${address}...`);

    const tx = {
      to: address,
      value: valueToSend,
      nonce: nonce++,
    };

    try {
      const transaction = await wallet.sendTransaction(tx);
      console.log(`Transaction hash: ${transaction.hash}`);
      await transaction.wait();
      console.log(`Transaction confirmed!`);

      // Fixed delay of 61 seconds between transactions
      console.log(`Waiting 61 seconds before next transaction...`);
      await sleep(61000);
    } catch (error) {
      console.error(`Error sending to ${address}:`, error.message);
      return false;
    }
  }
  return true;
}

// Main function
async function main() {
  try {
    // Generate random addresses (51 addresses)
    const allAddresses = generateRandomAddresses(51);
    console.log("Generated addresses:", allAddresses);

    // Split addresses into batches based on number of private keys
    const batches = [];
    const addressesPerBatch = Math.ceil(allAddresses.length / PRIVATE_KEYS.length);

    for (let i = 0; i < allAddresses.length; i += addressesPerBatch) {
      batches.push(allAddresses.slice(i, i + addressesPerBatch));
    }

    // Process each batch with a different private key
    for (let i = 0; i < batches.length; i++) {
      if (i >= PRIVATE_KEYS.length) {
        console.error("Not enough private keys for all batches");
        break;
      }

      console.log(`\nProcessing batch ${i + 1} with wallet ${i + 1}:`);
      const success = await sendTokens(batches[i], PRIVATE_KEYS[i]);

      if (!success) {
        console.error(`Failed to process batch ${i + 1}`);
        continue;
      }

      // Add delay between batches if not the last batch
      if (i < batches.length - 1) {
        const delay = getRandomDelay();
        console.log(`\nWaiting ${Math.floor(delay / 60000)} minutes and ${Math.floor((delay % 60000) / 1000)} seconds before next batch...`);
        await sleep(delay);
      }
    }

    console.log("\nAll PHRS tokens sent successfully!");
  } catch (error) {
    console.error("Error in main function:", error);
  }
}

main();
