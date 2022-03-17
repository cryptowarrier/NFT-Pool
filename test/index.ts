import { expect } from "chai";
import { ethers, network } from "hardhat";
import { Contract } from 'ethers';
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";


let token: Contract;
let rewardToken: Contract;
let nftToken: Contract;
let nftPool: Contract;
let owner: SignerWithAddress;

describe("Farming", function () {
  it("Deploy smart contracts", async function () {
    const Token = await ethers.getContractFactory("Token");
    token = await Token.deploy(ethers.utils.parseEther("100000"));
    await token.deployed();

    const RewardToken = await ethers.getContractFactory("RewardToken");
    rewardToken = await RewardToken.deploy();
    await rewardToken.deployed();

    const NFTToken = await ethers.getContractFactory("NFTToken");
    nftToken = await NFTToken.deploy();
    await nftToken.deployed();

    const NFTPool = await ethers.getContractFactory("NFTPool");
    nftPool = await NFTPool.deploy(
      nftToken.address,
      token.address,
      rewardToken.address
    );
    await nftPool.deployed();
    const totalSupply = ethers.utils.formatEther(await rewardToken.totalSupply());
    const approveTx = await rewardToken.approve(nftPool.address, ethers.utils.parseEther(String(totalSupply)));
    await approveTx.wait();
    const transferTx = await rewardToken.transfer(nftPool.address, ethers.utils.parseEther(String(totalSupply)));
    await transferTx.wait();
  });
  it("Staking", async function () {
    [owner] = await ethers.getSigners();
    // approve
    const approveTx = await token.approve(nftPool.address, ethers.utils.parseEther("1000"));
    await approveTx.wait();
    // staking
    await nftPool.stake(ethers.utils.parseEther("1000"));
    const stakedBalance = ethers.utils.formatEther(await nftPool.deposits(owner.address));
    expect(stakedBalance).to.eq("1000.0");
  });

  it("UnStaking", async function () {
    // get staked balance
    const stakedBalance = ethers.utils.formatEther(await nftPool.deposits(owner.address));
    // console.log(stakedBalance);
    // unstake
    const unstakeTx = await nftPool.unstake(ethers.utils.parseEther(String(stakedBalance)));
    await unstakeTx.wait();
    const currentDeposit = ethers.utils.formatEther(await nftPool.deposits(owner.address));
    expect(currentDeposit).to.eq("0.0");
  });

  it("withdrawReward", async function () {
    // staking
    const approveTx = await token.approve(nftPool.address, ethers.utils.parseEther("1000"));
    await approveTx.wait();
    const stakeTx = await nftPool.stake(ethers.utils.parseEther("1000"));
    await stakeTx.wait();
    // increase time 
    let reward = await nftPool.getApr(owner.address);
    let apr = Number(reward.percent);
    expect(apr).to.eq(15);
    // increase time 
    await network.provider.send("evm_increaseTime", [86400 * 30 * 1]); 
    await network.provider.send("evm_mine");
    reward = await nftPool.getApr(owner.address);
    apr = Number(reward.percent);
    expect(apr).to.eq(20);
    // increase time 
    await network.provider.send("evm_increaseTime", [86400 * 30 * 2]); 
    await network.provider.send("evm_mine");
    reward = await nftPool.getApr(owner.address);
    apr = Number(reward.percent);
    expect(apr).to.eq(25);
    const unstakeTx = await nftPool.unstake(ethers.utils.parseEther("1000"));
    await unstakeTx.wait();
    const deposit = Number(await nftPool.deposits(owner.address));
    expect(deposit).to.eq(0);
  });
  it("mint", async function () {
    //approve
    const approveTx = await token.approve(nftPool.address, ethers.utils.parseEther("1000"));
    await approveTx.wait();
    // set min amount
    const setMinTx = await nftPool.setMinAmount(ethers.utils.parseEther("100"));
    await setMinTx.wait();
    const minAmount = ethers.utils.formatEther(await nftPool.minAmount());
    expect(minAmount).to.eq("100.0");
    // stake
    const stakeTx = await nftPool.stake(ethers.utils.parseEther("90"));
    await stakeTx.wait();
    // increase time
    await network.provider.send("evm_increaseTime", [86400 * 20 + 1]); 
    await network.provider.send("evm_mine");
    let claimable = await nftPool.nftClaimable(owner.address);
    expect(claimable).to.false;
    // stake more
    const stakeMoreTx = await nftPool.stake(ethers.utils.parseEther("20"));
    await stakeMoreTx.wait();
    // increse time
    await network.provider.send("evm_increaseTime", [86400 * 20 + 1]); 
    await network.provider.send("evm_mine");
    // check claimable
    claimable = await nftPool.nftClaimable(owner.address);
    expect(claimable).to.true;
    // claim nft
    const claimNFTTX = await nftPool.claimNFT();
    await claimNFTTX.wait();
    // unstake
    const unstakeTx = await nftPool.unstake(ethers.utils.parseEther("10"));
    await unstakeTx.wait();
    // increase time
    await network.provider.send("evm_increaseTime", [86400 * 20 + 1]); 
    await network.provider.send("evm_mine");
    // check claimable
    claimable = await nftPool.nftClaimable(owner.address);
    expect(claimable).to.true;
    // unstake more
    const unstakeMoreTx = await nftPool.unstake(ethers.utils.parseEther("10"));
    await unstakeMoreTx.wait();
    // increase time
    await network.provider.send("evm_increaseTime", [86400 * 20 + 1]); 
    await network.provider.send("evm_mine");
    // check claimable again
    claimable = await nftPool.nftClaimable(owner.address);
    expect(claimable).to.false;
  })
});