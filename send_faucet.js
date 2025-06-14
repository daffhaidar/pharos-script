// Script to perform sequential swaps and batch transfers on Pharos Network
const { ethers } = require("ethers");
require("dotenv").config();
const { deployContract } = require('./deploy_contract');
const { interactWithFaroswap } = require('./faroswap_interaction');
const { claimFaucet } = require('./faucet_claim');

// ===================================================================================
// --- CONFIGURATION ---
// All settings are managed here.
// ===================================================================================
const config = {
    network: {
        rpc: "https://testnet.dplabs-internal.com",
        chainId: 688688,
        name: "Pharos Testnet",
        explorer: "https://testnet.pharosscan.xyz/tx/",
    },
    contracts: {
        usdc: "0xad902cf99c2de2f1ba5ec4d642fd7e49cae9ee37",
        usdt: "0xed59de2d7ad9c043442e381231ee3646fc3c2939",
        wphrs: "0x76aaada469d23216be5f7c596fa25f282ff9b364",
        router: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    },
    // Define the sequence of operations for the bot
    sequence: [
        { type: 'claim_faucet' },
        { type: 'deploy_contract' },
        { type: 'faroswap', action: 'swap', from: 'WPHRS', to: 'USDT', amount: 0.1 },
        { type: 'faroswap', action: 'getPrice', from: 'WPHRS', to: 'USDC', amount: 1 },
        { type: 'swap', from: 'phrs', to: 'usdt' },
        { type: 'swap', from: 'phrs', to: 'usdc' },
        { type: 'transfer_batch', count: 51 },
        { type: 'swap', from: 'usdt', to: 'usdc' },
        { type: 'swap', from: 'usdc', to: 'usdt' },
        { type: 'faroswap', action: 'swap', from: 'USDT', to: 'WPHRS', amount: 0.05 },
        { type: 'deploy_contract' },
    ],
    // Settings for amounts and delays
    transactions: {
        amountRange: { min: 0.0012, max: 0.0025 },
        slippage: 0.05
    },
    delay: {
        betweenCyclesMinutes: { min: 5, max: 11 },
        betweenTransactionsSeconds: { min: 42, max: 63 }
    },
    gas: {
        gasLimit: 500000,
    },
};

// ===================================================================================
// --- CONTRACT ABIs ---
// ===================================================================================
const ERC20_ABI = [ 'function balanceOf(address owner) view returns (uint256)', 'function approve(address spender, uint256 amount) returns (bool)', 'function allowance(address owner, address spender) view returns (uint256)', 'function decimals() view returns (uint8)', 'function symbol() view returns (string)' ];
const ROUTER_ABI = [ 'function WETH() external pure returns (address)', 'function getAmountsOut(uint amountIn, address[] memory path) external view returns (uint[] memory amounts)', 'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)', 'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)' ];

// ===================================================================================
// --- HELPER FUNCTIONS ---
// ===================================================================================
const randomDelay = (minSeconds, maxSeconds) => {
    const delay = minSeconds + Math.random() * (maxSeconds - minSeconds);
    console.log(`[INFO] Waiting for ${delay.toFixed(2)} seconds...`);
    return new Promise(resolve => setTimeout(resolve, delay * 1000));
};

const countdown = async (minutes) => {
    let totalSeconds = Math.round(minutes * 60);
    console.log(`\n[INFO] Cycle complete. Bot will restart in ${minutes.toFixed(2)} minutes...`);
    while (totalSeconds > 0) {
        process.stdout.write(`\r[INFO] Time until next cycle: ${Math.floor(totalSeconds / 60)}m ${totalSeconds % 60}s   `);
        totalSeconds--;
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    process.stdout.write('\n[INFO] Starting new cycle!\n');
};

// ===================================================================================
// --- BOT LOGIC (CLASS-BASED) ---
// ===================================================================================
class Bot {
    constructor(privateKey, provider) {
        this.provider = provider;
        this.wallet = new ethers.Wallet(privateKey, this.provider);
        this.router = new ethers.Contract(config.contracts.router, ROUTER_ABI, this.wallet);
        this.tokenContracts = {
            'usdc': new ethers.Contract(config.contracts.usdc, ERC20_ABI, this.wallet),
            'usdt': new ethers.Contract(config.contracts.usdt, ERC20_ABI, this.wallet),
            'wphrs': new ethers.Contract(config.contracts.wphrs, ERC20_ABI, this.wallet)
        };
        console.log(`[INFO] Bot initialized for address: ${this.wallet.address}`);
    }

    async run() {
        console.log(`\n--- [${this.wallet.address}] Starting Operations ---`);
        let initialBalances = await this.getBalances();
        if (initialBalances) console.log(`[INFO] Initial balances: ${initialBalances.native} PHRS, ${initialBalances.usdc} USDC, ${initialBalances.usdt} USDT`);

        const { sequence } = config;
        const { min, max } = config.delay.betweenTransactionsSeconds;

        for (let i = 0; i < sequence.length; i++) {
            const step = sequence[i];
            console.log(`\n--- [${this.wallet.address}] Step ${i + 1}/${sequence.length}: ${step.type.toUpperCase()} ---`);
            
            switch (step.type) {
                case 'claim_faucet':
                    await this.claimFaucet();
                    break;
                case 'deploy_contract':
                    await this.deployContract();
                    break;
                case 'faroswap':
                    await this.interactWithFaroswap(step);
                    break;
                case 'swap':
                    console.log(`[INFO] Pair: ${step.from.toUpperCase()} -> ${step.to.toUpperCase()}`);
                    if (step.from === 'phrs') await this.swapNativeForToken(step);
                    else await this.swapTokenForToken(step);
                    break;
                case 'transfer_batch':
                    await this.performBatchTransfer(step);
                    break;
                default:
                    console.warn(`[WARN] Unknown step type: ${step.type}`);
            }

            if (i < sequence.length - 1) await randomDelay(min, max);
        }

        console.log(`\n--- [${this.wallet.address}] All tasks completed ---`);
        let finalBalances = await this.getBalances();
        if (finalBalances) console.log(`[INFO] Final balances: ${finalBalances.native} PHRS, ${finalBalances.usdc} USDC, ${finalBalances.usdt} USDT`);
    }
    
    // --- Core Action Functions ---

    async performBatchTransfer(step) {
        const count = step.count || 1;
        console.log(`[INFO] Starting batch transfer to ${count} random addresses.`);
        const addresses = Array.from({ length: count }, () => ethers.Wallet.createRandom().address);

        for (let i = 0; i < addresses.length; i++) {
            const toAddress = addresses[i];
            const { min, max } = config.transactions.amountRange;
            const amount = (min + Math.random() * (max - min)).toFixed(8);
            console.log(`[INFO] Transfer ${i + 1}/${count}: Sending ${amount} PHRS to ${toAddress}`);

            try {
                const amountIn = ethers.utils.parseEther(amount);
                const balance = await this.provider.getBalance(this.wallet.address);
                if (balance.lt(amountIn)) {
                    console.warn(`[WARN] Insufficient balance for transfer, stopping batch.`);
                    break;
                }
                const tx = await this.wallet.sendTransaction({ to: toAddress, value: amountIn, gasLimit: 21000 });
                await tx.wait();
                console.log(`[SUCCESS] Transfer to ${toAddress} confirmed! Hash: ${tx.hash}`);
                if (i < addresses.length - 1) await randomDelay(config.delay.betweenTransactionsSeconds.min, config.delay.betweenTransactionsSeconds.max);
            } catch (error) {
                console.error(`[ERROR] Failed to send to ${toAddress}: ${error.message}`);
            }
        }
    }

    async swapNativeForToken(pair) {
        const { to } = pair;
        const { min, max } = config.transactions.amountRange;
        const amount = (min + Math.random() * (max - min)).toFixed(8);
        console.log(`[INFO] Attempting swap: ${amount} PHRS -> ${to.toUpperCase()}`);
        try {
            const amountIn = ethers.utils.parseEther(amount);
            const balance = await this.provider.getBalance(this.wallet.address);
            if (balance.lt(amountIn)) { console.warn(`[WARN] Insufficient PHRS balance for swap.`); return; }
            const path = [config.contracts.wphrs, config.contracts[to]];
            const deadline = Math.floor(Date.now() / 1000) + 60 * 5;
            const swapTx = await this.router.swapExactETHForTokens(0, path, this.wallet.address, deadline, { value: amountIn, gasLimit: config.gas.gasLimit });
            await swapTx.wait();
            console.log(`[SUCCESS] Swap successful! Hash: ${swapTx.hash}`);
        } catch (error) { console.error(`[ERROR] Failed to swap native for token: ${error.message}`); }
    }

    async swapTokenForToken(pair) {
        const { from, to } = pair;
        const { min, max } = config.transactions.amountRange;
        const amount = (min + Math.random() * (max - min)).toFixed(8);
        console.log(`[INFO] Attempting swap: ${amount} ${from.toUpperCase()} -> ${to.toUpperCase()}`);
        try {
            const isApproved = await this.checkAndApprove(from, amount, config.contracts.router);
            if (!isApproved) { console.error(`[ERROR] Approval/balance check failed, skipping swap.`); return; }
            const fromDecimals = await this.tokenContracts[from].decimals();
            const amountIn = ethers.utils.parseUnits(amount, fromDecimals);
            const path = [config.contracts[from], config.contracts[to]];
            const amountsOut = await this.router.getAmountsOut(amountIn, path);
            const amountOutMin = amountsOut[1].sub(amountsOut[1].mul(Math.floor(config.transactions.slippage * 100)).div(100));
            const deadline = Math.floor(Date.now() / 1000) + 60 * 5;
            const swapTx = await this.router.swapExactTokensForTokens(amountIn, amountOutMin, path, this.wallet.address, deadline, { gasLimit: config.gas.gasLimit });
            await swapTx.wait();
            console.log(`[SUCCESS] Swap successful! Hash: ${swapTx.hash}`);
        } catch (error) { console.error(`[ERROR] Failed to perform token swap: ${error.message}`); }
    }

    async deployContract() {
        try {
            const contractAddress = await deployContract(this.wallet);
            if (contractAddress) {
                console.log(`[SUCCESS] Contract deployed successfully at ${contractAddress}`);
            }
        } catch (error) {
            console.error(`[ERROR] Failed to deploy contract: ${error.message}`);
        }
    }

    async interactWithFaroswap(step) {
        try {
            const result = await interactWithFaroswap(this.wallet, step);
            if (result && result.success) {
                console.log(`[SUCCESS] Faroswap ${step.action} completed successfully`);
                if (result.txHash) {
                    console.log(`[INFO] Transaction hash: ${result.txHash}`);
                }
            } else {
                console.error(`[ERROR] Faroswap ${step.action} failed: ${result?.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error(`[ERROR] Faroswap interaction failed: ${error.message}`);
        }
    }

    async claimFaucet() {
        try {
            const result = await claimFaucet(this.wallet);
            if (result.success) {
                console.log(`[SUCCESS] Faucet claimed successfully`);
                console.log(`[INFO] Claimed amount: ${result.claimedAmount} PHRS`);
                console.log(`[INFO] New balance: ${result.newBalance} PHRS`);
            } else {
                console.log(`[INFO] ${result.message}`);
            }
        } catch (error) {
            console.error(`[ERROR] Faucet claim failed: ${error.message}`);
        }
    }

    // --- Helper methods for the class ---
    
    async checkAndApprove(tokenSymbol, amountToApprove, spenderAddress) {
        const tokenContract = this.tokenContracts[tokenSymbol];
        if (!tokenContract) { console.error(`[ERROR] Token contract for '${tokenSymbol}' not found.`); return false; }
        try {
            const decimals = await tokenContract.decimals();
            const amountInWei = ethers.utils.parseUnits(amountToApprove, decimals);
            const balance = await tokenContract.balanceOf(this.wallet.address);
            if (balance.lt(amountInWei)) { console.warn(`[WARN] Insufficient ${tokenSymbol.toUpperCase()} balance.`); return false; }
            const allowance = await tokenContract.allowance(this.wallet.address, spenderAddress);
            if (allowance.lt(amountInWei)) {
                console.log(`[INFO] Approval needed for ${tokenSymbol.toUpperCase()}. Approving...`);
                const approveTx = await tokenContract.approve(spenderAddress, ethers.constants.MaxUint256);
                await approveTx.wait();
                console.log(`[SUCCESS] ${tokenSymbol.toUpperCase()} approved for spender: ${spenderAddress}`);
            }
            return true;
        } catch (error) { console.error(`[ERROR] Error during check/approve for ${tokenSymbol.toUpperCase()}: ${error.message}`); return false; }
    }

    async getBalances() {
        try {
            const nativeBalance = await this.provider.getBalance(this.wallet.address);
            const usdcBalance = await this.tokenContracts.usdc.balanceOf(this.wallet.address);
            const usdtBalance = await this.tokenContracts.usdt.balanceOf(this.wallet.address);
            const usdcDecimals = await this.tokenContracts.usdc.decimals();
            const usdtDecimals = await this.tokenContracts.usdt.decimals();
            return { usdc: ethers.utils.formatUnits(usdcBalance, usdcDecimals), usdt: ethers.utils.formatUnits(usdtBalance, usdtDecimals), native: ethers.utils.formatEther(nativeBalance) };
        } catch (error) { console.error(`[ERROR] Failed to get balances: ${error.message}`); return null; }
    }
}

// ===================================================================================
// --- MAIN EXECUTION ---
// ===================================================================================
async function main() {
    console.log("--- [SYSTEM] Starting Bot ---");
    const privateKeys = Object.keys(process.env).filter(key => key.startsWith("PRIVATE_KEY_")).map(key => process.env[key]);
    
    if (privateKeys.length === 0) {
        console.error("[FATAL] No private keys found in .env file. Please add PRIVATE_KEY_1, etc.");
        process.exit(1);
    }
    
    console.log(`[INFO] Found ${privateKeys.length} private key(s).`);
    const provider = new ethers.providers.JsonRpcProvider(config.network.rpc);

    while (true) {
        const bots = privateKeys.map(pk => new Bot(pk, provider));
        for (const bot of bots) {
            try {
                await bot.run();
                console.log("---------------------------------");
            } catch (error) {
                console.error(`[FATAL] Unhandled error during bot run for ${bot.wallet.address}: ${error.message}`);
            }
        }
        
        const { min, max } = config.delay.betweenCyclesMinutes;
        const delayMinutes = min + Math.random() * (max - min);
        await countdown(delayMinutes);
    }
}

main().catch(error => {
    console.error("[FATAL] An unexpected error occurred in the main function:", error);
    process.exit(1);
});
