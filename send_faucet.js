// Script to send PHRS tokens to random accounts on Pharos Network
const { ethers } = require("ethers");
// Try to load dotenv if available
try {
  require("dotenv").config();
} catch (error) {
  // dotenv not installed, using direct config
}

// Pharos testnet RPC URL
const RPC_URL = process.env.RPC_URL || "https://testnet.dplabs-internal.com";

// Masukin di bawah private key lu ea
const SENDER_PRIVATE_KEY = process.env.PRIVATE_KEY || "YOUR PRIVATE KEY";

// Amount of PHRS to send to each address
const AMOUNT_TO_SEND = process.env.AMOUNT_TO_SEND || "0.001";

// Connect to Pharos testnet
const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(SENDER_PRIVATE_KEY, provider);

// Helper function to sleep for a given time
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Helper function to get a random delay between 2-6 minutes
function getRandomDelay() {
  // Random minutes between 2 and 6
  const minutes = Math.floor(Math.random() * 4) + 2;
  // Convert to milliseconds
  return minutes * 60 * 1000;
}

// Generate 11 random addresses
function generateRandomAddresses(count) {
  const addresses = [];
  for (let i = 0; i < count; i++) {
    const randomWallet = ethers.Wallet.createRandom();
    addresses.push(randomWallet.address);
  }
  return addresses;
}

// Send PHRS tokens to addresses
async function sendTokens(addresses) {
  const valueToSend = ethers.utils.parseEther(AMOUNT_TO_SEND);

  console.log(`Sender address: ${wallet.address}`);

  // Get current balance
  const balance = await provider.getBalance(wallet.address);
  console.log(`Current balance: ${ethers.utils.formatEther(balance)} PHRS`);

  // Check if we have enough balance
  const requiredBalance = valueToSend.mul(addresses.length);
  if (balance.lt(requiredBalance)) {
    console.error(`Not enough balance. Need at least ${ethers.utils.formatEther(requiredBalance)} PHRS`);
    return;
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

      // Add a small random delay between transactions within the same batch (5-15 seconds)
      const smallDelay = (Math.floor(Math.random() * 10) + 5) * 1000;
      console.log(`Waiting ${smallDelay / 1000} seconds before next transaction...`);
      await sleep(smallDelay);
    } catch (error) {
      console.error(`Error sending to ${address}:`, error.message);
    }
  }
}

// Main function
async function main() {
  try {
    // Generate 11 random addresses
    const allAddresses = generateRandomAddresses(11);
    console.log("Generated addresses:", allAddresses);

    // Send to 5 addresses at a time
    const batch1 = allAddresses.slice(0, 5);
    const batch2 = allAddresses.slice(5, 10);
    const batch3 = allAddresses.slice(10); // Just one address

    console.log("\nSending to batch 1:");
    await sendTokens(batch1);

    // Random delay between batches (2-6 minutes)
    const delay1 = getRandomDelay();
    console.log(`\nWaiting ${Math.floor(delay1 / 60000)} minutes and ${Math.floor((delay1 % 60000) / 1000)} seconds before processing batch 2...`);
    await sleep(delay1);

    console.log("\nSending to batch 2:");
    await sendTokens(batch2);

    // Random delay between batches (2-6 minutes)
    const delay2 = getRandomDelay();
    console.log(`\nWaiting ${Math.floor(delay2 / 60000)} minutes and ${Math.floor((delay2 % 60000) / 1000)} seconds before processing batch 3...`);
    await sleep(delay2);

    console.log("\nSending to batch 3:");
    await sendTokens(batch3);

    console.log("\nAll PHRS tokens sent successfully!");
  } catch (error) {
    console.error("Error in main function:", error);
  }
}

main();
