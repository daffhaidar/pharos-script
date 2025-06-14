const { ethers } = require("ethers");
require("dotenv").config();

// Simple storage contract for testing
const contractSource = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleStorage {
    uint256 private value;
    
    function setValue(uint256 _value) public {
        value = _value;
    }
    
    function getValue() public view returns (uint256) {
        return value;
    }
}
`;

// Track deployments per address
const deploymentCounts = new Map();

async function deployContract(wallet) {
    const address = wallet.address;
    
    // Check if address has reached deployment limit
    const currentCount = deploymentCounts.get(address) || 0;
    if (currentCount >= 2) {
        console.log(`[INFO] Address ${address} has reached maximum deployment limit (2)`);
        return null;
    }

    try {
        // Create contract factory
        const factory = new ethers.ContractFactory(
            ['function setValue(uint256)', 'function getValue() view returns (uint256)'],
            contractSource,
            wallet
        );

        // Deploy contract
        console.log(`[INFO] Deploying contract from ${address}...`);
        console.log(`[INFO] Using playground at https://playground.easy-node.xyz/`);
        
        // Get deployment transaction
        const deployTx = await factory.getDeployTransaction();
        
        // Log deployment info
        console.log(`[INFO] Contract bytecode length: ${deployTx.data.length / 2 - 1} bytes`);
        console.log(`[INFO] Estimated gas: ${deployTx.gasLimit.toString()}`);
        
        // Deploy through playground
        const contract = await factory.deploy();
        
        // Wait for deployment transaction to be mined
        console.log(`[INFO] Waiting for deployment transaction to be mined...`);
        const receipt = await contract.deployTransaction.wait();
        
        // Verify contract is deployed by checking its code
        const provider = wallet.provider;
        const code = await provider.getCode(contract.address);
        
        if (code === '0x') {
            throw new Error('Contract deployment failed - no code at address');
        }
        
        // Verify contract is working by calling getValue
        try {
            await contract.getValue();
            console.log(`[SUCCESS] Contract verified and working at: ${contract.address}`);
            console.log(`[INFO] Transaction hash: ${receipt.transactionHash}`);
            console.log(`[INFO] Block number: ${receipt.blockNumber}`);
            console.log(`[INFO] Gas used: ${receipt.gasUsed.toString()}`);
            
            // Increment deployment count only after successful verification
            deploymentCounts.set(address, currentCount + 1);
            console.log(`[INFO] Deployment count for ${address}: ${deploymentCounts.get(address)}/2`);
            
            return contract.address;
        } catch (error) {
            throw new Error('Contract deployment failed - contract not responding');
        }
    } catch (error) {
        console.error(`[ERROR] Failed to deploy contract: ${error.message}`);
        return null;
    }
}

module.exports = {
    deployContract,
    deploymentCounts
}; 