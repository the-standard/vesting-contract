const VestingVault12 = artifacts.require('VestingVault12');

module.exports = async function (deployer) {
  const address = '0x2F2E2Ed85CB968FD3315AE402997B45eC7fe0643';
  const startTime = Math.floor(new Date().getTime() / 1000);
  const amount = 10000000;
  const duration = 365;
  const cliff = 0;

  const contract = '0x69a5fd9eed20b81f7edf128dbc162105003cf7bd';
  await deployer.deploy(VestingVault12, contract);
};
