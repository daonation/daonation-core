import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

import * as dotenv from 'dotenv'

dotenv.config()

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.9",
    settings: {
      optimizer: {
        enabled: true,
        runs: 20
      },
    },
  },
  networks: {
    mainnet: {
      url: process.env.MAINNET_URL,
      chainId: 1,
      gasPrice: 5000000000,
    },
    goerli: {
      url: process.env.GOERLI_URL,
      chainId: 5,
      gasPrice: 5000000000,
      accounts: {
        mnemonic: process.env.MNEMONIC
      }
    },
  }
};

export default config;
