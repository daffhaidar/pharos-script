const hre = require("hardhat");
const { deployContract } = require('./deploy_contract.js');
const { claimFaucet } = require('./faucet_claim.js');

const config = {
    sequence: [
        { type: 'claim_faucet' },
        { type: 'deploy_contract' },
        { type: 'transfer_batch', count: 51 },
        { type: 'deploy_contract' },
    ],
    transactions: {
        amountRange: { min: 0.0012, max: 0.0025 },
    },
    delay: {
        betweenCyclesMinutes: { min: 5, max: 11 },
        betweenMicroTasksSeconds: { min: 11, max: 120 }
    },
    gas: {
        gasLimit: 500000,
    },
};

const utils = {
    randomDelay: (min, max) => 
        new Promise(res => setTimeout(res, (min + Math.random() * (max - min)) * 1000)),

    countdown: async (minutes) => {
        for (let i = Math.round(minutes * 60); i >= 0; i--) {
            process.stdout.write(`\r[INFO] Siklus berikutnya dalam: ${Math.floor(i / 60)}m ${i % 60}s   `);
            await new Promise(res => setTimeout(res, 1000));
        }
        console.log();
    },

    generateRandomAmount: (min, max) => 
        (min + Math.random() * (max - min)).toFixed(8),

    shuffleArray: (array) => {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }
};

class Bot {
    constructor(signer) {
        this.signer = signer;
        this.address = signer.address;
        this.currentStepIndex = 0;
        console.log(`[INFO] Bot disiapkan untuk alamat: ${this.address}`);
    }

    reset() {
        this.currentStepIndex = 0;
    }

    isFinished() {
        return this.currentStepIndex >= config.sequence.length;
    }

    async executeNextStep() {
        if (this.isFinished()) return;

        const step = config.sequence[this.currentStepIndex];
        console.log(`\n--- [${this.address}] Langkah ${this.currentStepIndex + 1}/${config.sequence.length}: ${step.type.toUpperCase()} ---`);

        try {
            switch (step.type) {
                case 'claim_faucet': 
                    await claimFaucet(this.signer); 
                    break;
                case 'deploy_contract': 
                    await deployContract(this.signer); 
                    break;
                case 'transfer_batch': 
                    await this.performBatchTransfer(step); 
                    break;
                default: 
                    console.warn(`[WARN] Tipe langkah tidak dikenal: ${step.type}`);
            }
        } catch (error) { 
            console.error(`[ERROR] Gagal di langkah ${step.type}: ${error.message}`); 
        }
        
        this.currentStepIndex++;
    }

    async performBatchTransfer(step) {
        const count = step.count || 1;
        console.log(`[INFO] Memulai transfer batch ke ${count} alamat acak.`);

        for (let i = 0; i < count; i++) {
            await this.executeSingleTransfer(i, count);
            if (i < count - 1) {
                await utils.randomDelay(
                    config.delay.betweenMicroTasksSeconds.min,
                    config.delay.betweenMicroTasksSeconds.max
                );
            }
        }
    }

    async executeSingleTransfer(index, total) {
        const toAddress = hre.ethers.Wallet.createRandom().address;
        const amount = utils.generateRandomAmount(
            config.transactions.amountRange.min,
            config.transactions.amountRange.max
        );

        console.log(`[INFO] Transfer ${index + 1}/${total}: Mengirim ${amount} PHRS ke ${toAddress}`);

        try {
            const amountIn = hre.ethers.parseEther(amount);
            const tx = await this.signer.sendTransaction({ 
                to: toAddress, 
                value: amountIn, 
                gasLimit: config.gas.gasLimit 
            });
            await tx.wait();
            console.log(`[SUCCESS] Transfer ke ${toAddress} berhasil! Hash: ${tx.hash}`);
        } catch (error) { 
            console.error(`[ERROR] Gagal mengirim ke ${toAddress}: ${error.message}`); 
        }
    }
}

async function main() {
    console.log("--- [SYSTEM] Memulai Bot dengan Taktik Estafet Silang ---");
    
    const signers = await hre.ethers.getSigners();
    if (signers.length === 0) throw new Error("Tidak ada dompet yang dikonfigurasi!");

    const bots = signers.map(signer => new Bot(signer));

    while (true) {
        console.log("\n--- [SYSTEM] Memulai siklus estafet baru ---");
        
        // Reset all bots for new cycle
        bots.forEach(bot => bot.reset());
        let activeBots = bots.filter(bot => !bot.isFinished());

        while (activeBots.length > 0) {
            // Shuffle bots for random order
            activeBots = utils.shuffleArray(activeBots);

            for (const bot of activeBots) {
                if (bot.isFinished()) continue;
                
                await bot.executeNextStep();
                await utils.randomDelay(
                    config.delay.betweenMicroTasksSeconds.min,
                    config.delay.betweenMicroTasksSeconds.max
                );
            }
            
            activeBots = bots.filter(bot => !bot.isFinished());
        }

        console.log("\n--- [SYSTEM] Semua dompet telah menyelesaikan siklus estafet mereka. ---");
        const delayMinutes = parseFloat(utils.generateRandomAmount(
            config.delay.betweenCyclesMinutes.min,
            config.delay.betweenCyclesMinutes.max
        ));
        await utils.countdown(delayMinutes);
    }
}

main().catch(error => {
    console.error("[FATAL] Terjadi error tak terduga di fungsi utama:", error);
    process.exit(1);
});
