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
}`;

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
        // Create contract factory with proper bytecode
        const factory = new ethers.ContractFactory(
            ['function setValue(uint256)', 'function getValue() view returns (uint256)'],
            '0x608060405234801561001057600080fd5b50610150806100206000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c806360fe47b11461003b5780636d4ce63c14610057575b600080fd5b610055600480360381019061005091906100c3565b610075565b005b61005f61007f565b60405161006c91906100ff565b60405180910390f35b8060008190555050565b60008054905090565b600080fd5b6000819050919050565b61009f8161008c565b81146100aa57600080fd5b50565b6000813590506100bc81610096565b92915050565b6000602082840312156100d8576100d7610087565b5b60006100e484846100ad565b91505092915050565b6100f68161008c565b82525050565b600060208201905061011160008301846100ed565b9291505056fea2646970667358221220c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c64736f6c63430008110033',
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