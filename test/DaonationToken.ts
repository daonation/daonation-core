import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("DaonationToken", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshopt in every test.
  async function deploy() {

    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners();

    const DaonationToken = await ethers.getContractFactory("DaonationToken");
    const daonationToken = await DaonationToken.deploy();

    return { owner, otherAccount, daonationToken };
  }

  describe("Deployment", function () {
    it("Should be deployed", async function () {
      
      const { daonationToken } = await loadFixture(deploy);

      expect(daonationToken.address).to.not.undefined

    });

    it("Should be possible to transfer tokens", async function () {
      
      const { daonationToken, otherAccount } = await loadFixture(deploy);

      const initialBalance = await daonationToken.balanceOf(otherAccount.address)

      const balanceToTransfer = ethers.utils.parseEther('1')
      await daonationToken.transfer(otherAccount.address, balanceToTransfer)

      const finalBalance = await daonationToken.balanceOf(otherAccount.address)

      expect(finalBalance.sub(initialBalance)).to.eq(balanceToTransfer)

    });

  });
});
