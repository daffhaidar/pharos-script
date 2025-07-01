// =============================================================================
// BAGIAN 1: PERKAKAS PERANG (IMPORTS & SETUP)
// =============================================================================
require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { HttpsProxyAgent } = require("https-proxy-agent");
const randomUseragent = require("random-useragent");

// =============================================================================
// BAGIAN 2: KONFIGURASI BOT
// =============================================================================
const config = {
  sequence: [{ type: "claim_faucet" }, { type: "deploy_contract" }, { type: "transfer_batch", count: 25 }, { type: "deploy_contract" }],
  transactions: {
    amountRange: { min: 0.0012, max: 0.0025 },
    minimumBalance: "0.0099",
  },
  delay: {
    betweenCyclesMinutes: { min: 5, max: 11 },
    betweenMicroTasksSeconds: { min: 11, max: 120 },
  },
  // [JURUS BARU] Konfigurasi buat "Jurus Sabar"
  retry: {
    attempts: 3, // Coba lagi maksimal 3 kali kalo gagal
    delaySeconds: 15, // Jeda antar percobaan 15 detik
  },
  rpcUrl: "https://testnet.dplabs-internal.com",
  proxies: fs.existsSync("proxies.txt")
    ? fs
        .readFileSync("proxies.txt", "utf8")
        .split("\n")
        .filter((p) => p.trim())
    : [],
};

// =============================================================================
// BAGIAN 3: ALAT BANTU (LOGGER & UTILS)
// =============================================================================
const Logger = {
  info: (msg) => console.log(`\x1b[32m[INFO]\x1b[0m ${msg}`),
  warn: (msg) => console.warn(`\x1b[33m[PERINGATAN]\x1b[0m ${msg}`),
  error: (msg) => console.error(`\x1b[31m[ERROR]\x1b[0m ${msg}`),
  step: (address, msg) => console.log(`\x1b[36m[${address.slice(0, 8)}...]\x1b[0m ${msg}`),
};

const utils = {
  randomDelay: (min, max) => new Promise((res) => setTimeout(res, (min + Math.random() * (max - min)) * 1000)),
  countdown: async (minutes) => {
    for (let i = Math.round(minutes * 60); i >= 0; i--) {
      process.stdout.write(`\r[INFO] Siklus berikutnya dalam: ${Math.floor(i / 60)}m ${i % 60}s   `);
      await new Promise((res) => setTimeout(res, 1000));
    }
    console.log();
  },
  generateRandomAmount: (min, max) => (min + Math.random() * (max - min)).toFixed(8),
  shuffleArray: (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  },
  createApiHeaders: (jwt = null) => {
    const headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "en-US,en;q=0.9",
      "sec-ch-ua": '"Not A;Brand";v="99", "Chromium";v="126", "Google Chrome";v="126"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      Referer: "https://testnet.pharosnetwork.xyz/",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "User-Agent": randomUseragent.getRandom(),
    };
    if (jwt) headers["Authorization"] = `Bearer ${jwt}`;
    return headers;
  },
  // [JURUS BARU] Jurus sabar buat ngadepin server error
  async retryOperation(operation, attempts, delay) {
    for (let i = 0; i < attempts; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i < attempts - 1) {
          const isRetryableError = (error.isAxiosError && error.response && error.response.status >= 500) || error.code === "SERVER_ERROR" || error.code === "NETWORK_ERROR" || (error.message && error.message.includes("INTERNAL_ERROR"));
          if (isRetryableError) {
            Logger.warn(`Operasi gagal (percobaan ${i + 1}/${attempts}): ${error.message}. Coba lagi dalam ${delay} detik...`);
            await new Promise((res) => setTimeout(res, delay * 1000));
          } else {
            throw error; // Kalo bukan error server, jangan di-retry
          }
        } else {
          Logger.error(`Operasi gagal permanen setelah ${attempts} kali percobaan.`);
          throw error; // Kalo udah mentok, lempar errornya
        }
      }
    }
  },
};

// =============================================================================
// BAGIAN 4: SEMUA AKSI BOT (KUMPULAN FUNGSI "PEKERJA")
// =============================================================================

async function claimFaucet(wallet, proxy) {
  const address = wallet.address;
  Logger.step(address, `Memulai proses klaim Faucet via API...`);
  try {
    const signature = await wallet.signMessage("pharos");
    const loginUrl = `https://api.pharosnetwork.xyz/user/login?address=${address}&signature=${signature}&invite_code=S6NGMzXSCDBxhnwo`;
    const loginHeaders = utils.createApiHeaders();
    const axiosConfig = { headers: loginHeaders, httpsAgent: proxy ? new HttpsProxyAgent(proxy) : null };
    const loginResponse = await axios.post(loginUrl, {}, axiosConfig);

    if (loginResponse.data.code !== 0 || !loginResponse.data.data.jwt) {
      Logger.warn(`Login Faucet Gagal: ${loginResponse.data.msg || "Tidak ada token JWT diterima"}`);
      return { success: false }; // Gagal logis, jangan di-retry
    }
    const jwt = loginResponse.data.data.jwt;

    const authHeaders = utils.createApiHeaders(jwt);
    const authAxiosConfig = { headers: authHeaders, httpsAgent: proxy ? new HttpsProxyAgent(proxy) : null };
    const statusUrl = `https://api.pharosnetwork.xyz/faucet/status?address=${address}`;
    const statusResponse = await axios.get(statusUrl, authAxiosConfig);

    if (!statusResponse.data.data.is_able_to_faucet) {
      Logger.info(`Faucet untuk ${address.slice(0, 8)}... masih cooldown.`);
      return { success: false }; // Gagal logis, jangan di-retry
    }

    const claimUrl = `https://api.pharosnetwork.xyz/faucet/daily?address=${address}`;
    const claimResponse = await axios.post(claimUrl, {}, authAxiosConfig);

    if (claimResponse.data.code === 0) {
      Logger.info(`Klaim Faucet BERHASIL untuk dompet ${address.slice(0, 8)}...`);
      return { success: true };
    } else {
      Logger.warn(`Klaim Faucet Gagal: ${claimResponse.data.msg || "Error tidak diketahui"}`);
      return { success: false }; // Gagal logis, jangan di-retry
    }
  } catch (error) {
    Logger.error(`Proses klaim faucet error: ${error.message}`);
    throw error; // Lempar error biar ditangkep sama retryOperation
  }
}

async function deployContract(wallet) {
  const address = wallet.address;
  const countsFilePath = path.join(__dirname, "deployment_counts.json");
  const readCounts = () => (fs.existsSync(countsFilePath) ? JSON.parse(fs.readFileSync(countsFilePath, "utf8")) : {});
  const writeCounts = (data) => fs.writeFileSync(countsFilePath, JSON.stringify(data, null, 2));

  const allCounts = readCounts();
  const currentCount = allCounts[address] || 0;
  if (currentCount >= 2) {
    Logger.info(`Dompet ${address.slice(0, 8)}... sudah mencapai limit deploy (2x).`);
    return { success: true }; // Anggap sukses biar bot lanjut
  }

  Logger.step(address, `Memulai deployment ke-${currentCount + 1}...`);
  try {
    const artifactPath = "./artifacts/contracts/MyContract.sol/MyContract.json";
    if (!fs.existsSync(artifactPath)) throw new Error("Artifact kontrak tidak ditemukan! Jalankan 'npx hardhat compile' dulu.");
    const contractArtifact = require(artifactPath);
    const factory = new ethers.ContractFactory(contractArtifact.abi, contractArtifact.bytecode, wallet);
    const myContract = await factory.deploy();
    await myContract.waitForDeployment();
    allCounts[address] = currentCount + 1;
    writeCounts(allCounts);
    Logger.info(`Deploy BERHASIL! Alamat kontrak baru: ${(await myContract.getAddress()).slice(0, 12)}...`);
    return { success: true };
  } catch (error) {
    Logger.error(`Proses deploy gagal: ${error.message}`);
    throw error; // Lempar error biar ditangkep sama retryOperation
  }
}

async function performBatchTransfer(wallet, count) {
  Logger.step(wallet.address, `Memulai transfer batch ke ${count} alamat acak.`);
  for (let i = 0; i < count; i++) {
    try {
      await utils.retryOperation(
        async () => {
          const toAddress = ethers.Wallet.createRandom().address;
          const amount = utils.generateRandomAmount(config.transactions.amountRange.min, config.transactions.amountRange.max);
          const amountIn = ethers.parseEther(amount);
          const balance = await wallet.provider.getBalance(wallet.address);
          if (balance < amountIn) {
            throw new Error("INSUFFICIENT_FUNDS_FOR_BATCH");
          }
          Logger.info(`   -> Transfer ${i + 1}/${count}: Mengirim ${amount} PHRS ke ${toAddress.slice(0, 8)}...`);
          const tx = await wallet.sendTransaction({ to: toAddress, value: amountIn });
          await tx.wait();
          Logger.info(`   -> Transfer ke ${toAddress.slice(0, 8)}... BERHASIL.`);
        },
        config.retry.attempts,
        config.retry.delaySeconds
      );
    } catch (error) {
      if (error.message === "INSUFFICIENT_FUNDS_FOR_BATCH") {
        Logger.warn(`Saldo tidak cukup untuk transfer. Menghentikan batch.`);
        break;
      } else {
        Logger.error(`Transfer ${i + 1}/${count} gagal permanen.`);
      }
    }
    if (i < count - 1) await utils.randomDelay(1, 5);
  }
  return { success: true };
}

// =============================================================================
// BAGIAN 5: KELAS BOT (SANG MANAJER)
// =============================================================================
class Bot {
  constructor(wallet, proxy) {
    this.wallet = wallet;
    this.proxy = proxy;
    this.address = wallet.address;
    this.currentStepIndex = 0;
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
    Logger.step(this.address, `Langkah ${this.currentStepIndex + 1}/${config.sequence.length}: ${step.type.toUpperCase()}`);
    try {
      await utils.retryOperation(
        async () => {
          switch (step.type) {
            case "claim_faucet":
              return await claimFaucet(this.wallet, this.proxy);
            case "deploy_contract":
              return await deployContract(this.wallet);
            case "transfer_batch":
              return await performBatchTransfer(this.wallet, step.count);
            default:
              Logger.warn(`Tipe langkah tidak dikenal: ${step.type}`);
              return { success: true };
          }
        },
        config.retry.attempts,
        config.retry.delaySeconds
      );
    } catch (error) {
      Logger.error(`Gagal permanen di langkah ${step.type} untuk dompet ${this.address.slice(0, 8)}...`);
    }
    this.currentStepIndex++;
  }
}

// =============================================================================
// BAGIAN 6: FUNGSI UTAMA (SANG SUTRADARA)
// =============================================================================
async function main() {
  console.log("\n\x1b[35m--- [SYSTEM] Memulai Bot Tempur Pharos (Final Version) ---\x1b[0m");
  const privateKeys = Object.keys(process.env)
    .filter((k) => k.startsWith("PRIVATE_KEY_"))
    .map((k) => process.env[k]);
  if (privateKeys.length === 0) throw new Error("Tidak ada PRIVATE_KEY_... di file .env!");

  Logger.info(`Menemukan ${privateKeys.length} dompet.`);
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const wallets = privateKeys.map((pk) => new ethers.Wallet(pk, provider));
  const proxies = config.proxies;

  while (true) {
    let healthyBots = [];
    for (const [i, wallet] of wallets.entries()) {
      const balance = await provider.getBalance(wallet.address);
      if (balance > ethers.parseEther(config.transactions.minimumBalance)) {
        const proxy = proxies.length > 0 ? proxies[i % proxies.length] : null;
        healthyBots.push(new Bot(wallet, proxy));
      } else {
        Logger.warn(`Dompet ${wallet.address.slice(0, 8)}... diistirahatkan karena saldo rendah.`);
      }
    }

    if (healthyBots.length === 0) {
      Logger.error("SEMUA DOMPET TIDAK PUNYA SALDO CUKUP! Coba lagi dalam 1 jam...");
      await utils.countdown(60);
      continue;
    }

    console.log(`\n\x1b[35m--- [SYSTEM] Memulai siklus estafet baru dengan ${healthyBots.length} dompet sehat ---\x1b[0m`);
    healthyBots.forEach((bot) => bot.reset());
    let activeBots = [...healthyBots];

    while (activeBots.length > 0) {
      activeBots = utils.shuffleArray(activeBots);
      for (const bot of activeBots) {
        if (bot.isFinished()) continue;
        await bot.executeNextStep();
        await utils.randomDelay(config.delay.betweenMicroTasksSeconds.min, config.delay.betweenMicroTasksSeconds.max);
      }
      activeBots = activeBots.filter((bot) => !bot.isFinished());
    }

    Logger.info("Semua dompet sehat telah menyelesaikan siklus estafet mereka.");
    const delayMinutes = parseFloat(utils.generateRandomAmount(config.delay.betweenCyclesMinutes.min, config.delay.betweenCyclesMinutes.max));
    await utils.countdown(delayMinutes);
  }
}

main().catch((error) => {
  console.error("\n\x1b[31m[FATAL] Terjadi error tak terduga di fungsi utama:", error, "\x1b[0m");
  process.exit(1);
});
