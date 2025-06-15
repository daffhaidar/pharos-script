const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

// Constants
const DEPLOYMENT_LIMIT = 2;
const COUNTS_FILE_PATH = path.join(__dirname, 'deployment_counts.json');

// File operations
const fileOps = {
    readCounts: () => {
        try {
            if (fs.existsSync(COUNTS_FILE_PATH)) {
                return JSON.parse(fs.readFileSync(COUNTS_FILE_PATH, 'utf8'));
            }
        } catch (error) {
            console.error('[ERROR] Failed to read deployment record file:', error);
        }
        return {};
    },

    writeCounts: (data) => {
        try {
            fs.writeFileSync(COUNTS_FILE_PATH, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('[ERROR] Failed to write deployment record file:', error);
        }
    }
};

// Deployment operations
const deploymentOps = {
    checkDeploymentLimit: (address, currentCount) => {
        if (currentCount >= DEPLOYMENT_LIMIT) {
            console.log(`\n[ALERT] ADDRESS ${address} HAS REACHED DEPLOYMENT LIMIT (${DEPLOYMENT_LIMIT}X)!`);
            return { canDeploy: false, error: 'MAX_DEPLOYMENTS_REACHED' };
        }
        return { canDeploy: true };
    },

    loadContractArtifact: () => 
        require("./artifacts/contracts/MyContract.sol/MyContract.json"),

    deployContract: async (signer, contractArtifact) => {
        const MyContractFactory = await hre.ethers.getContractFactory(
            contractArtifact.abi,
            contractArtifact.bytecode,
            signer
        );
        return await MyContractFactory.deploy();
    },

    verifyDeployment: async (contract) => {
        await contract.getValue();
        console.log('[SUCCESS] Contract responded correctly.');
    }
};

// Main deployment function
async function deployContract(signer) {
    const address = signer.address;
    const allCounts = fileOps.readCounts();
    const currentCount = allCounts[address] || 0;

    // Check deployment limit
    const { canDeploy, error } = deploymentOps.checkDeploymentLimit(address, currentCount);
    if (!canDeploy) {
        return { success: false, error };
    }

    console.log(`\n[INFO] Starting deployment #${currentCount + 1} for address: ${address}...`);

    try {
        // Load and deploy contract
        const contractArtifact = deploymentOps.loadContractArtifact();
        console.log("[INFO] Sending deployment transaction, please wait...");
        
        const myContract = await deploymentOps.deployContract(signer, contractArtifact);
        await myContract.waitForDeployment();
        
        // Get contract address and verify deployment
        const contractAddress = await myContract.getAddress();
        console.log(`\n[SUCCESS] Contract successfully deployed at address: ${contractAddress}`);
        
        await deploymentOps.verifyDeployment(myContract);

        // Update deployment count
        const newCount = currentCount + 1;
        allCounts[address] = newCount;
        fileOps.writeCounts(allCounts);
        
        console.log(`[INFO] Permanent deployment count for this address is now: ${newCount}/${DEPLOYMENT_LIMIT}\n`);
        
        // Get transaction details
        const deployTx = myContract.deploymentTransaction();
        const receipt = await deployTx.wait();
        
        return {
            success: true,
            contractAddress,
            txHash: receipt.hash
        };

    } catch (error) {
        console.error(`\n[FATAL ERROR] Failed during deployment process: ${error.message}`);
        return {
            success: false,
            error: 'DEPLOYMENT_FAILED',
            message: error.message
        };
    }
}

module.exports = { deployContract };
