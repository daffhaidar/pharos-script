const { ethers } = require("ethers");
require("dotenv").config();

// Track last claim time per address
const lastClaimTime = new Map();

async function claimFaucet(wallet) {
    const address = wallet.address;
    
    // Check if 24 hours have passed since last claim
    const lastClaim = lastClaimTime.get(address) || 0;
    const now = Date.now();
    const hoursSinceLastClaim = (now - lastClaim) / (1000 * 60 * 60);
    
    if (hoursSinceLastClaim < 24) {
        const hoursRemaining = (24 - hoursSinceLastClaim).toFixed(2);
        console.log(`[INFO] Address ${address} needs to wait ${hoursRemaining} more hours before next claim`);
        return {
            success: false,
            message: `Need to wait ${hoursRemaining} more hours`
        };
    }

    try {
        // Create provider for faucet network
        const provider = new ethers.providers.JsonRpcProvider("https://testnet.dplabs-internal.com");
        const connectedWallet = wallet.connect(provider);

        // Get current balance before claim
        const balanceBefore = await provider.getBalance(address);
        console.log(`[INFO] Balance before claim: ${ethers.utils.formatEther(balanceBefore)} PHRS`);

        // Prepare faucet claim transaction
        const faucetAddress = "0x0000000000000000000000000000000000000000"; // Replace with actual faucet contract address
        const faucetABI = [
            "function claim() external"
        ];
        const faucetContract = new ethers.Contract(faucetAddress, faucetABI, connectedWallet);

        // Send claim transaction
        console.log(`[INFO] Claiming faucet for ${address}...`);
        const tx = await faucetContract.claim({
            gasLimit: 200000
        });

        // Wait for transaction confirmation
        console.log(`[INFO] Waiting for claim transaction to be mined...`);
        const receipt = await tx.wait();

        // Get new balance
        const balanceAfter = await provider.getBalance(address);
        const claimedAmount = balanceAfter.sub(balanceBefore);
        
        // Update last claim time
        lastClaimTime.set(address, now);

        console.log(`[SUCCESS] Faucet claimed successfully!`);
        console.log(`[INFO] Transaction hash: ${receipt.transactionHash}`);
        console.log(`[INFO] Claimed amount: ${ethers.utils.formatEther(claimedAmount)} PHRS`);
        console.log(`[INFO] New balance: ${ethers.utils.formatEther(balanceAfter)} PHRS`);
        console.log(`[INFO] Next claim available in 24 hours`);

        return {
            success: true,
            txHash: receipt.transactionHash,
            claimedAmount: ethers.utils.formatEther(claimedAmount),
            newBalance: ethers.utils.formatEther(balanceAfter)
        };
    } catch (error) {
        console.error(`[ERROR] Failed to claim faucet: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = {
    claimFaucet,
    lastClaimTime
}; 