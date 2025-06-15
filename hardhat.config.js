require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// --- LOGIC TO READ ALL PRIVATE KEYS FROM .env ---
function getPrivateKeys() {
  const keys = [];
  // Loop through all variables in .env
  for (const key in process.env) {
    // If the name starts with "PRIVATE_KEY_"
    if (key.startsWith("PRIVATE_KEY_")) {
      // Add the key to the list
      keys.push(process.env[key]);
    }
  }

  // If no keys are found, throw an error for clarity
  if (keys.length === 0) {
    throw new Error(
      'No PRIVATE_KEY_... found in .env file. Please check again.'
    );
  }
  
  return keys;
}
// ---------------------------------------------------

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20", // Match this with your contract's .sol version
  
  // This is the most important part
  networks: {
    // This is your network "menu". The name must be exactly: pharosTestnet
    pharosTestnet: {
      url: "https://testnet.dplabs-internal.com",
      chainId: 688688,
      // 'accounts' will be automatically filled with all keys from .env
      accounts: getPrivateKeys(), 
    },
  },
  
  etherscan: {
    apiKey: {
      pharosTestnet: "NO_API_KEY_NEEDED",
    },
    customChains: [
      {
        network: "pharosTestnet",
        chainId: 688688,
        urls: {
          apiURL: "https://testnet.pharosscan.xyz/api",
          browserURL: "https://testnet.pharosscan.xyz",
        },
      },
    ],
  },
};
