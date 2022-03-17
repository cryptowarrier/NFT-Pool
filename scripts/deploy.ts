// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  // const Greeter = await ethers.getContractFactory("Greeter");
  // const greeter = await Greeter.deploy("Hello, Hardhat!");

  // await greeter.deployed();

  // console.log("Greeter deployed to:", greeter.address);

  const Token = await ethers.getContractFactory("Token");
  const token = await Token.deploy(ethers.utils.parseEther("100000"));
  await token.deployed()
  console.log("Test Token: ", token.address);

  const RewardToken = await ethers.getContractFactory("RewardToken");
  const rewardToken = await RewardToken.deploy();
  await rewardToken.deployed();
  console.log("Reward Token: ", rewardToken.address);

  const NFTToken = await ethers.getContractFactory("NFTToken");
  const nftToken = await NFTToken.deploy();
  await nftToken.deployed();
  console.log("NFT Token: ", nftToken.address);

  const NFTPool = await ethers.getContractFactory("NFTPool");
  const nftPool = await NFTPool.deploy(
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
  console.log("NFTPool: ", nftPool.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
