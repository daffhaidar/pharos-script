const hre = require("hardhat");

// Configurations
const CONFIG = {
  FAUCET_ADDRESS: "0x49f3fd7ca34317d3c44f7947741ae6566cfdb553",
  FAUCET_ABI: ["function claim() external"],
  CLAIM_COOLDOWN_HOURS: 24,
  GAS_LIMIT: 200000,
};

// Logger Utility
const Logger = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  warn: (msg) => console.warn(`\n[PERINGATAN] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
  success: (msg) => console.log(`\n[SUCCESS] ${msg}`),
  important: (msg) => console.log(`[PENTING] ${msg}`),
};

// State Management
class ClaimState {
  constructor() {
    this.lastClaimTime = new Map();
  }
  getLastClaimTime(address) {
    return this.lastClaimTime.get(address) || 0;
  }
  setLastClaimTime(address, time) {
    this.lastClaimTime.set(address, time);
  }
  getHoursSinceLastClaim(address) {
    const lastClaim = this.getLastClaimTime(address);
    return (Date.now() - lastClaim) / (1000 * 60 * 60);
  }
}
const claimState = new ClaimState();

// Validators
class Validators {
  static isFaucetAddressValid() {
    if (CONFIG.FAUCET_ADDRESS === "0x0000000000000000000000000000000000000000") {
      Logger.warn("Alamat Faucet masih placeholder (0x000...)!");
      return false;
    }
    return true;
  }
  static canClaim(address) {
    const hoursSinceLastClaim = claimState.getHoursSinceLastClaim(address);
    if (hoursSinceLastClaim < CONFIG.CLAIM_COOLDOWN_HOURS) {
      const hoursRemaining = (CONFIG.CLAIM_COOLDOWN_HOURS - hoursSinceLastClaim).toFixed(2);
      Logger.info(`Alamat ${address} perlu nunggu ${hoursRemaining} jam lagi.`);
      return { canClaim: false };
    }
    return { canClaim: true };
  }
}

// Transaction Utility
function calculateTxFee(receipt, tx) {
  const gasUsed = receipt.gasUsed;
  const gasPrice = receipt.effectiveGasPrice || tx.gasPrice;
  if (!gasPrice) {
    throw new Error("Gagal mendapatkan harga gas dari transaksi. Aneh banget.");
  }
  return BigInt(gasUsed) * BigInt(gasPrice);
}

// Main claim function
async function claimFaucet(signer) {
  const address = signer.address;

  if (!Validators.isFaucetAddressValid()) return { success: false };
  if (!Validators.canClaim(address).canClaim) return { success: false };

  try {
    const faucetContract = new hre.ethers.Contract(
      CONFIG.FAUCET_ADDRESS,
      CONFIG.FAUCET_ABI,
      signer
    );

    Logger.info(`Mengirim permintaan klaim ke Faucet untuk ${address}...`);
    const tx = await faucetContract.claim({ gasLimit: CONFIG.GAS_LIMIT });
    const receipt = await tx.wait();

    claimState.setLastClaimTime(address, Date.now());
    const txFee = calculateTxFee(receipt, tx);

    Logger.success("Permintaan klaim berhasil dikirim!");
    Logger.info(`Hash Transaksi: ${receipt.hash}`);
    Logger.info(`Biaya Gas Fee: ${hre.ethers.formatEther(txFee)} PHRS`);
    Logger.important("Faucet akan mengirim PHRS dalam transaksi terpisah. Cek saldo beberapa saat lagi.");

    return { success: true, txHash: receipt.hash };
  } catch (error) {
    Logger.error(`Gagal mengirim permintaan klaim: ${error.message}`);
    return { success: false, error: error.message };
  }
}

module.exports = { claimFaucet };
