const { ethers } = require("ethers");
require("dotenv").config();

// Faroswap Router ABI (minimal for swap functionality)
const FAROSWAP_ROUTER_ABI = [
    'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
    'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
    'function getAmountsOut(uint amountIn, address[] memory path) external view returns (uint[] memory amounts)',
    'function WETH() external pure returns (address)'
];

// Faroswap Router address
const FAROSWAP_ROUTER = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

// Token addresses
const TOKENS = {
    WPHRS: "0x76aaada469d23216be5f7c596fa25f282ff9b364",
    USDC: "0xad902cf99c2de2f1ba5ec4d642fd7e49cae9ee37",
    USDT: "0xed59de2d7ad9c043442e381231ee3646fc3c2939"
};

async function interactWithFaroswap(wallet, action) {
    try {
        const router = new ethers.Contract(FAROSWAP_ROUTER, FAROSWAP_ROUTER_ABI, wallet);
        
        if (!action.action) {
            throw new Error('Action type not specified');
        }

        switch(action.action) {
            case 'swap':
                return await performSwap(router, wallet, action);
            case 'getPrice':
                return await getTokenPrice(router, action);
            default:
                throw new Error(`Unknown action type: ${action.action}`);
        }
    } catch (error) {
        console.error(`[ERROR] Faroswap interaction failed: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}

async function performSwap(router, wallet, action) {
    const { from, to, amount } = action;
    
    if (!from || !to || !amount) {
        throw new Error('Missing required parameters for swap');
    }

    if (!TOKENS[from] || !TOKENS[to]) {
        throw new Error(`Invalid token pair: ${from} -> ${to}`);
    }

    console.log(`[INFO] Preparing swap: ${amount} ${from} -> ${to}`);
    
    try {
        // Get token contracts
        const fromToken = new ethers.Contract(TOKENS[from], ['function approve(address,uint256)', 'function balanceOf(address)'], wallet);
        const toToken = new ethers.Contract(TOKENS[to], ['function balanceOf(address)'], wallet);
        
        // Check and approve if needed
        const amountIn = ethers.utils.parseEther(amount.toString());
        const balance = await fromToken.balanceOf(wallet.address);
        
        if (balance.toString() === '0') {
            throw new Error(`Insufficient ${from} balance`);
        }
        
        // Approve router to spend tokens
        const approveTx = await fromToken.approve(FAROSWAP_ROUTER, amountIn);
        await approveTx.wait();
        
        // Get amounts out
        const path = [TOKENS[from], TOKENS[to]];
        const amounts = await router.getAmountsOut(amountIn, path);
        const amountOutMin = amounts[1].mul(95).div(100); // 5% slippage
        
        // Perform swap
        console.log(`[INFO] Executing swap on Faroswap...`);
        const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes
        const swapTx = await router.swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            wallet.address,
            deadline,
            { gasLimit: 300000 }
        );
        
        // Wait for transaction
        const receipt = await swapTx.wait();
        
        // Get final balance
        const finalBalance = await toToken.balanceOf(wallet.address);
        
        console.log(`[SUCCESS] Swap completed!`);
        console.log(`[INFO] Transaction hash: ${receipt.transactionHash}`);
        console.log(`[INFO] Final ${to} balance: ${ethers.utils.formatEther(finalBalance)}`);
        
        return {
            success: true,
            txHash: receipt.transactionHash,
            amountOut: amounts[1]
        };
    } catch (error) {
        console.error(`[ERROR] Swap failed: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}

async function getTokenPrice(router, action) {
    const { from, to, amount } = action;
    
    if (!from || !to || !amount) {
        throw new Error('Missing required parameters for price check');
    }

    if (!TOKENS[from] || !TOKENS[to]) {
        throw new Error(`Invalid token pair: ${from} -> ${to}`);
    }

    try {
        // Convert amount to wei
        const amountIn = ethers.utils.parseEther(amount.toString());
        
        // Get WETH address
        const wethAddress = await router.WETH();
        console.log(`[INFO] WETH address: ${wethAddress}`);
        
        // Prepare path
        const path = [TOKENS[from], TOKENS[to]];
        console.log(`[INFO] Swap path: ${path.join(' -> ')}`);
        
        // Get amounts out
        const amounts = await router.getAmountsOut(amountIn, path);
        
        console.log(`[INFO] Price quote for ${amount} ${from} -> ${to}`);
        console.log(`[INFO] Expected output: ${ethers.utils.formatEther(amounts[1])} ${to}`);
        
        return {
            success: true,
            amountIn: amounts[0],
            amountOut: amounts[1]
        };
    } catch (error) {
        console.error(`[ERROR] Price check failed: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = {
    interactWithFaroswap,
    TOKENS
}; 