const HDWalletProvider = require('@truffle/hdwallet-provider');
const fs = require('fs');
const rinksecret = fs.readFileSync(".secret").toString().trim();

module.exports = {
  networks: {
    rinkeby: {
      provider: () => new HDWalletProvider(rinksecret, `https://rinkeby.infura.io/v3/${process.env.INFURA_ID}`),
      network_id: 4,       // Ropsten's id
      gas: 6500000,        // Ropsten has a lower block limit than mainnet
      gasPrice: 100000000000
    },
  },

  compilers: {
    solc: {
      version: "0.4.24"
    }
  },

  db: {
    enabled: false
  }
};

