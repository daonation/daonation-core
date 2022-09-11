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
    const [owner, otherAccount, beficiary1, beficiary2, donor1, donor2] = await ethers.getSigners();

    const DaonationToken = await ethers.getContractFactory("DaonationToken");
    const daonationToken = await DaonationToken.deploy();

    const StableMockToken = await ethers.getContractFactory("MockToken");
    const stableMockToken = await StableMockToken.deploy('StableMock','STM')

    const VaquinhaLibrary = await ethers.getContractFactory("VaquinhaLibrary")
    const vaquinhaLibrary = await VaquinhaLibrary.deploy()

    const Daonation = await ethers.getContractFactory("Daonation", {
      libraries: {
        VaquinhaLibrary: vaquinhaLibrary.address,
      },
    })

    const votationPeriod = 4*24*3600
    const proposalLockPeriod = 7*24*3600
    const votationTokenRewardRatio = 100 //1%
    const donationPeriod = 7*24*3600
    const daonation = await Daonation.deploy(
      daonationToken.address,
      stableMockToken.address,
      votationPeriod,
      ethers.utils.parseEther('10000'),
      proposalLockPeriod,
      votationTokenRewardRatio,
      donationPeriod
    );

    await daonationToken.approve(daonation.address, ethers.constants.MaxUint256)
    await daonation.addGovernanceTokenRewards(ethers.utils.parseEther('100'))
    
    return { owner, otherAccount, daonationToken, daonation, beficiary1, beficiary2, donor1, donor2, votationPeriod };
  }

  describe("Deployment", function () {

    it("Should be deployed", async function () {
      
      const { daonation } = await loadFixture(deploy);

      expect(daonation.address).to.not.undefined

    });

    it("Should be possible to propose a vaquinha", async function () {
      
      const { daonation, beficiary1 } = await loadFixture(deploy);

      const expectedValue = ethers.utils.parseEther('5000')
      await daonation.proposeVaquinha("test", expectedValue, beficiary1.address)

      const vaquinhasCount = await daonation.vaquinhasCount()

      expect(vaquinhasCount).to.eq(1)
      
      const vaquinhaId = vaquinhasCount.sub(1)

      const vaquinha = await daonation.vaquinhas(vaquinhaId)
      expect(vaquinha.description).to.be.eq("test")
      expect(vaquinha.expectedValue).to.be.eq(expectedValue)
      expect(await daonation.isVoting(vaquinhaId)).to.be.true

    });

    it("Should be possible to vote and approve a vaquinha.", async function () {
      
      const { daonation, daonationToken, owner, beficiary1, votationPeriod } = await loadFixture(deploy);

      const expectedValue = ethers.utils.parseEther('5000')
      await daonation.proposeVaquinha("test", expectedValue, beficiary1.address)

      const vaquinhasCount = await daonation.vaquinhasCount()
      const vaquinhaId = vaquinhasCount.sub(1)

      const vaquinha = await daonation.vaquinhas(vaquinhaId)
      expect(await daonation.isDonating(vaquinhaId)).to.be.false

      await daonationToken.approve(daonation.address, ethers.constants.MaxUint256)
      const initialDaonationTokenBalance = await daonationToken.balanceOf(owner.address)
      const daonationTokenForVoting = initialDaonationTokenBalance.div(10)
      await daonation.voteForVaquinha(vaquinhaId, daonationTokenForVoting);
      const finalDaonationTokenBalance = await daonationToken.balanceOf(owner.address)

      expect(initialDaonationTokenBalance.sub(daonationTokenForVoting))
        .to.be.eq(finalDaonationTokenBalance)

      expect(await daonation.isDonating(vaquinhaId)).to.be.false

      await time.increase(votationPeriod+1)

      expect(await daonation.isDonating(vaquinhaId)).to.be.true

    });

  });
});
