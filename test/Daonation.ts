import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

async function mineNBlocks(n:number) {
  for (let index = 0; index < n; index++) {
    await ethers.provider.send('evm_mine', []);
  }
}

describe("Daonation", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshopt in every test.
  async function deploy() {

    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners();

    const DaonationToken = await ethers.getContractFactory("DaonationToken");
    const daonationToken = await DaonationToken.deploy();

    const DaonationTimeLock = await ethers.getContractFactory("DaonationTimeLock");
    const timeLock = await DaonationTimeLock.deploy(0, [], [])

    const Daonation = await ethers.getContractFactory("Daonation");
    const daonation = await Daonation.deploy(daonationToken.address, timeLock.address);

    return { owner, otherAccount, daonationToken, daonation };
  }

  describe.only("Deployment", function () {

    it("Should be deployed", async function () {
      
      const { daonation } = await loadFixture(deploy);

      expect(daonation.address).to.not.undefined

    });

    it("Should be possible to propose a vaquinha", async function () {
      
      const { daonation } = await loadFixture(deploy);

      const expectedValue = ethers.utils.parseEther('5000')
      await daonation.proposeVaquinha("test", expectedValue)

      const vaquinhasCount = await daonation.vaquinhasCount()

      expect(vaquinhasCount).to.eq(1)

      const vaquinha = await daonation.vaquinhas(vaquinhasCount.sub(1))
      expect(vaquinha.aprovada).to.be.eq(false)
      expect(vaquinha.description).to.be.eq("test")
      expect(vaquinha.expectedValue).to.be.eq(expectedValue)
      expect(await daonation.state(vaquinha.proposal)).to.be.eq(0)

    });

    it("Should be possible to vote and approve a vaquinha.", async function () {
      
      const { daonation, daonationToken, owner } = await loadFixture(deploy);

      const expectedValue = ethers.utils.parseEther('5000')
      await daonation.proposeVaquinha("test", expectedValue)

      const vaquinhasCount = await daonation.vaquinhasCount()
      const vaquinhaId = vaquinhasCount.sub(1)

      const vaquinha = await daonation.vaquinhas(vaquinhaId)
      expect(vaquinha.aprovada).to.be.eq(false)

      expect(await daonation.hasVoted(vaquinha.proposal, owner.address)).to.be.false

      await daonationToken.delegate(owner.address)

      await daonation.votarAprovarVaquinha(vaquinhaId);

      expect(await daonation.hasVoted(vaquinha.proposal, owner.address)).to.be.true

      console.log('await ethers.provider.getBlockNumber()', await ethers.provider.getBlockNumber());
      await time.increase(3600*24*30)
      console.log('await ethers.provider.getBlockNumber()', await ethers.provider.getBlockNumber());
      
      console.log('daonation.proposalDeadline(vaquinha.proposal)', await daonation.proposalDeadline(vaquinha.proposal));

      // await daonation.executarAprovacaoVaquinha(vaquinhaId);
      await daonation["queue(uint256)"](vaquinha.proposal);

    });

  });
});
