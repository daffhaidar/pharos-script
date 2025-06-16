const hre = require("hardhat");

// Constants
const FAUCET_ADDRESS = "0x49f3fd7ca34317d3c44f7947741ae6566cfdb553";
const FAUCET_ABI = ["function claim() external"];
const CLAIM_COOLDOWN_HOURS = 24;

// State management (udah bagus, gak diubah)
const claimState = {
  lastClaimTime: new Map(),
  getLastClaimTime: (address) => claimState.lastClaimTime.get(address) || 0,
  setLastClaimTime: (address, time) => claimState.lastClaimTime.set(address, time),
  getHoursSinceLastClaim: (address) => {
    const lastClaim = claimState.getLastClaimTime(address);
    return (Date.now() - lastClaim) / (1000 * 60 * 60);
  },
};

// Validation functions (udah bagus, gak diubah)
const validators = {
  isFaucetAddressValid: () => {
    if (FAUCET_ADDRESS === "0x0000000000000000000000000000000000000000") {
      console.warn("\n[PERINGATAN] Alamat Faucet masih placeholder (0x000...)!");
      return false;
    }
    return true;
  },
  canClaim: (address) => {
    const hoursSinceLastClaim = claimState.getHoursSinceLastClaim(address);
    if (hoursSinceLastClaim < CLAIM_COOLDOWN_HOURS) {
      const hoursRemaining = (CLAIM_COOLDOWN_HOURS - hoursSinceLastClaim).toFixed(2);
      console.log(`[INFO] Alamat ${address} perlu nunggu ${hoursRemaining} jam lagi.`);
      return { canClaim: false };
    }
    return { canClaim: true };
  },
};

// Main claim function
async function claimFaucet(signer) {
  const address = signer.address;

  if (!validators.isFaucetAddressValid()) return { success: false };
  if (!validators.canClaim(address).canClaim) return { success: false };

  try {
    const faucetContract = new hre.ethers.Contract(FAUCET_ADDRESS, FAUCET_ABI, signer);

    console.log(`[INFO] Mengirim permintaan klaim ke Faucet untuk ${address}...`);
    const tx = await faucetContract.claim({ gasLimit: 200000 });
    const receipt = await tx.wait();

    claimState.setLastClaimTime(address, Date.now());

    // --- [FIX PALING AKHIR] ---
    // Kita cek dulu `effectiveGasPrice` ada apa nggak. Kalo nggak ada, kita pake `gasPrice` dari transaksi aslinya.
    const gasUsed = receipt.gasUsed;
    const gasPrice = receipt.effectiveGasPrice || tx.gasPrice;

    if (!gasPrice) {
      throw new Error("Gagal mendapatkan harga gas dari transaksi. Aneh banget.");
    }

    const txFee = BigInt(gasUsed) * BigInt(gasPrice);
    // -----------------------------

    console.log(`\n[SUCCESS] Permintaan klaim berhasil dikirim!`);
    console.log(`[INFO] Hash Transaksi: ${receipt.hash}`);
    console.log(`[INFO] Biaya Gas Fee: ${hre.ethers.formatEther(txFee)} PHRS`);
    console.log(`[PENTING] Faucet akan mengirim PHRS dalam transaksi terpisah. Cek saldo beberapa saat lagi.`);

    return { success: true, txHash: receipt.hash };
  } catch (error) {
    console.error(`[ERROR] Gagal mengirim permintaan klaim: ${error.message}`);
    return { success: false, error: error.message };
  }
}

module.exports = { claimFaucet };
