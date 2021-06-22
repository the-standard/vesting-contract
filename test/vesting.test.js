const { expect } = require('chai');

// Import utilities from Test Helpers
const { BN, expectEvent, expectRevert, constants } = require('@openzeppelin/test-helpers');

// Load compiled artifacts
const VestingVault12 = artifacts.require('VestingVault12');
const ERC20Mock = artifacts.require('ERC20Mock');

const SECONDS_IN_A_DAY = 86400;

const timeTravel = require('./timetravel');

contract('VestingVault12', function ([ creator, other ]) {

  const TKN = '0x69a5fd9eed20b81f7edf128dbc162105003cf7bd';

  beforeEach(async function () {
    this.contract = await VestingVault12.new(TKN, { from: creator });
  });

  it('has a token the same as the TKN', async function () {
    expect(await this.contract.token()).to.be.equal(web3.utils.toChecksumAddress(TKN));
  });

  it('has the owner == creator', async function () {
    expect(await this.contract.owner()).to.be.equal(web3.utils.toChecksumAddress(creator));
  });

  it('checks the active grants', async function () {
    const address = '0x2F2E2Ed85CB968FD3315AE402997B45eC7fe0643';
    let grants = await this.contract.getActiveGrants(address);
    expect(grants.length).to.eq(0);
  });

});

contract('VestingVault12CreateGrants', function ([ creator, other ]) {
  const TOTAL_SUPPLY = new BN('10000000000000000000000');

  beforeEach(async function () {
    this.token = await ERC20Mock.new(creator, TOTAL_SUPPLY);
    this.contract = await VestingVault12.new(this.token.address, { from: creator });
  });

  it('checks the events from the addTokenGrant', async function () {
    const address = '0x2F2E2Ed85CB968FD3315AE402997B45eC7fe0643';
    const startTime = Math.floor(new Date().getTime() / 1000);
    const amount = 10000000;
    const duration = 365;
    const cliff = 0;

    // we don't have any funds in the contract so we're expecting an error
    try {
      await this.contract.addTokenGrant(address, startTime, amount, duration, cliff);
      throw null;
    } catch(err) {
      const key = Object.keys(err.data)[0];
      expect(err.data[key].error).to.eq('revert');
    }

    // check we have no active grants
    let grants = await this.contract.getActiveGrants(address);
    expect(grants.length).to.eq(0);

    // this is the good stuff

    // Mint the tokens to the creator
    await this.token.mint(creator, TOTAL_SUPPLY);

    // increase the allowance of the contract
    await this.token.increaseAllowance(this.contract.address, TOTAL_SUPPLY);

    // // check the contract has all the tokens
    expect(await this.token.allowance(creator, this.contract.address)).to.be.bignumber.equal(TOTAL_SUPPLY)

    const { logs } = await this.contract.addTokenGrant(address, startTime, amount, duration, cliff);

    await expectEvent.inLogs(logs, 'GrantAdded', { recipient: address });
    await expectEvent.inLogs(logs, 'GrantAdded', { vestingId: '0' });

    // check the tokenGrant returns correctly
    const ag = await this.contract.tokenGrants(0);
    expect(ag.startTime).to.be.bignumber.eq(startTime.toString());
    expect(ag.amount).to.be.bignumber.eq(amount.toString());
    expect(ag.vestingDuration).to.be.bignumber.eq(duration.toString());
    expect(ag.vestingCliff).to.be.bignumber.eq('0');
    expect(ag.daysClaimed).to.be.bignumber.eq('0');
    expect(ag.recipient).to.eq(address);

    // might as well check the active grants in here
    grants = await this.contract.getActiveGrants(address);
    expect(grants.length).to.eq(1);

    const grant = new BN('0');
    expect(grants[0]).to.be.bignumber.equal(grant)

    // since we have a grant now, lettuce check the data for it
    // Check the tokensVestedPerDay
    const daily = new BN('27397'); // amount / duration;
    const vested = await this.contract.tokensVestedPerDay(0);
    expect(vested).to.be.bignumber.equal(daily);

    // check calculateGrantClaim
    const claim = await this.contract.calculateGrantClaim(0);
    expect(claim[0]).to.be.bignumber.equal(new BN('0'));
    expect(claim[1]).to.be.bignumber.equal(new BN('0'));

    // total vesting count should be 1 now
    expect(await this.contract.totalVestingCount()).to.be.bignumber.eq('1');
  });
  
  it('checks the events from the addTokenGrant with earlier start date', async function () {
    const address = '0x2F2E2Ed85CB968FD3315AE402997B45eC7fe0643';
    const startTime = 0; // setting to 0 will force the starttime to NOW()!
    const amount = 10000000;
    const duration = 10;
    const cliff = 0;

    // Mint the tokens to the creator
    await this.token.mint(creator, TOTAL_SUPPLY);

    // increase the allowance of the contract
    await this.token.increaseAllowance(this.contract.address, TOTAL_SUPPLY);

    // // check the contract has all the tokens
    expect(await this.token.allowance(creator, this.contract.address)).to.be.bignumber.equal(TOTAL_SUPPLY)

    const { logs } = await this.contract.addTokenGrant(address, startTime, amount, duration, cliff);

    await expectEvent.inLogs(logs, 'GrantAdded', { recipient: address });
    await expectEvent.inLogs(logs, 'GrantAdded', { vestingId: '0' });

    // // Check the tokensVestedPerDay
    const daily = new BN('1000000'); // amount / duration;
    const vested = await this.contract.tokensVestedPerDay(0);
    expect(vested).to.be.bignumber.equal(daily);

    // check calculateGrantClaim. This will be zero on day 0 because we can't claim until at least 1 day gone.
    let claim = await this.contract.calculateGrantClaim(0);
    expect(claim[0]).to.be.bignumber.equal(new BN('0'));
    expect(claim[1]).to.be.bignumber.equal(new BN('0'));

    // try and claim some money!
    try {
      let cvt = await this.contract.claimVestedTokens(0);
    } catch(err) {
      const key = Object.keys(err.data)[0];
      expect(err.data[key].error).to.eq('revert');
    }

    // lettuce travel 2 days ahead..... spooky stuff.
    await timeTravel(SECONDS_IN_A_DAY * 2)

    claim = await this.contract.calculateGrantClaim(0);
    expect(claim[0]).to.be.bignumber.equal(new BN('2'));
    expect(claim[1]).to.be.bignumber.equal(new BN('2000000'));
    
    let { logs: logsN } = await this.contract.claimVestedTokens(0);

    // should have the correct event logs
    await expectEvent.inLogs(logsN, 'GrantTokensClaimed') //, { recipient: address });
    expect(logsN[0].args[0]).to.eq(address);
    expect(logsN[0].args[1]).to.be.bignumber.eq('2000000');

    // the grant claim should have reduced
    claim = await this.contract.calculateGrantClaim(0);
    expect(claim[0]).to.be.bignumber.equal(new BN('0'));
    expect(claim[1]).to.be.bignumber.equal(new BN('0'));

    // and we should have tokens in the account
    const balance = await this.token.balanceOf(address);
    expect(balance).to.be.bignumber.eq('2000000');
  });
});

// getActiveGrants
