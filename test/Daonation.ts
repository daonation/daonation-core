import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

const { parseEther } = ethers.utils
const { MaxUint256 } = ethers.constants

async function mineNBlocks(n: number) {
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
        const [owner, otherAccount, beneficiary1, beneficiary2, donor1, donor2] = await ethers.getSigners();

        const DaonationToken = await ethers.getContractFactory("DaonationToken");
        const daonationToken = await DaonationToken.deploy();

        const StableMockToken = await ethers.getContractFactory("MockToken");
        const stableMockToken = await StableMockToken.deploy('StableMock', 'STM')
        await stableMockToken.mint(donor1.address, parseEther('100000'))
        await stableMockToken.mint(donor2.address, parseEther('100000'))

        const VaquinhaLibrary = await ethers.getContractFactory("VaquinhaLibrary")
        const vaquinhaLibrary = await VaquinhaLibrary.deploy()

        const Daonation = await ethers.getContractFactory("Daonation", {
            libraries: {
                VaquinhaLibrary: vaquinhaLibrary.address,
            },
        })

        const votationPeriod = 4 * 24 * 3600
        const proposalLockPeriod = 7 * 24 * 3600
        const votationTokenRewardRatio = 100 //1%
        const donationPeriod = 7 * 24 * 3600
        const daonation = await Daonation.deploy(
            daonationToken.address,
            stableMockToken.address,
            votationPeriod,
            ethers.utils.parseEther('10000'),
            proposalLockPeriod,
            votationTokenRewardRatio,
            donationPeriod
        );

        await daonationToken.connect(owner).approve(daonation.address, MaxUint256)
        await daonationToken.connect(otherAccount).approve(daonation.address, MaxUint256)
        await daonationToken.connect(donor1).approve(daonation.address, MaxUint256)
        await daonationToken.connect(donor2).approve(daonation.address, MaxUint256)

        await stableMockToken.connect(owner).approve(daonation.address, MaxUint256)
        await stableMockToken.connect(otherAccount).approve(daonation.address, MaxUint256)
        await stableMockToken.connect(donor1).approve(daonation.address, MaxUint256)
        await stableMockToken.connect(donor2).approve(daonation.address, MaxUint256)

        await daonation.addGovernanceTokenRewards(ethers.utils.parseEther('100'))

        return {
            owner, otherAccount, daonationToken, daonation,
            beneficiary1, beneficiary2, donor1, donor2,
            votationPeriod, donationPeriod, votationTokenRewardRatio,
            stableMockToken
        };
    }

    describe("Deployment", function () {

        it("Should be deployed", async function () {

            const { daonation } = await loadFixture(deploy);

            expect(daonation.address).to.not.undefined

        });

    });

    describe("Simple Scenarios", function () {

        it("Should be possible to propose a vaquinha", async function () {

            const { daonation, beneficiary1 } = await loadFixture(deploy);

            const expectedValue = ethers.utils.parseEther('5000')
            await daonation.proposeVaquinha("test", expectedValue, beneficiary1.address)

            const vaquinhasCount = await daonation.vaquinhasCount()

            expect(vaquinhasCount).to.eq(1)

            const vaquinhaId = vaquinhasCount.sub(1)

            const vaquinha = await daonation.vaquinhas(vaquinhaId)
            expect(vaquinha.description).to.be.eq("test")
            expect(vaquinha.expectedValue).to.be.eq(expectedValue)
            expect(await daonation.isVoting(vaquinhaId)).to.be.true

        });

        it("Should be possible to vote and approve a vaquinha.", async function () {

            const { daonation, daonationToken, owner, beneficiary1: beficiary1, votationPeriod } = await loadFixture(deploy);

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

            await time.increase(votationPeriod + 1)

            expect(await daonation.isDonating(vaquinhaId)).to.be.true

        });

        it("Should be possible to donate to vaquinha.", async function () {

            const {
                daonation, daonationToken, owner, beneficiary1: beficiary1,
                votationPeriod, donationPeriod, votationTokenRewardRatio,
                donor1, stableMockToken
            } = await loadFixture(deploy);

            const expectedValue = ethers.utils.parseEther('5000')
            await daonation.proposeVaquinha("test", expectedValue, beficiary1.address)

            const vaquinhasCount = await daonation.vaquinhasCount()
            const vaquinhaId = vaquinhasCount.sub(1)

            const vaquinha = await daonation.vaquinhas(vaquinhaId)

            await daonationToken.approve(daonation.address, ethers.constants.MaxUint256)
            const initialDaonationTokenBalance = await daonationToken.balanceOf(owner.address)
            const daonationTokenForVoting = initialDaonationTokenBalance.div(10)
            await daonation.voteForVaquinha(vaquinhaId, daonationTokenForVoting);

            await time.increase(votationPeriod + 1)

            const initialDonorStableTokenBalance = await stableMockToken.balanceOf(donor1.address)
            const initialDaonationStableTokenBalance = await stableMockToken.balanceOf(daonation.address)
            const initialDaonationGovernanceTokenBalance = await daonationToken.balanceOf(daonation.address)
            const initialDonorGovernanceTokenBalance = await daonationToken.balanceOf(donor1.address)
            const donationAmount = parseEther('100')
            const expectedReward = donationAmount.mul(votationTokenRewardRatio).div(await daonation.UNIT_REWARD_RATIO())
            const initialAvailableRewards = await daonation.availableRewards()
            const initialVaquinhaDonations = await (await daonation.vaquinhas(vaquinhaId)).donations
            await daonation.connect(donor1).donate(vaquinhaId, donationAmount)
            const finalDonorStableTokenBalance = await stableMockToken.balanceOf(donor1.address)
            const finalDaonationStableTokenBalance = await stableMockToken.balanceOf(daonation.address)
            const finalDaonationGovernanceTokenBalance = await daonationToken.balanceOf(daonation.address)
            const finalDonorGovernanceTokenBalance = await daonationToken.balanceOf(donor1.address)
            const finalAvailableRewards = await daonation.availableRewards()
            const finalVaquinhaDonations = await (await daonation.vaquinhas(vaquinhaId)).donations

            expect(initialDonorStableTokenBalance.sub(donationAmount))
                .to.be.eq(finalDonorStableTokenBalance, "Donor stable token balance should be the expected")
            expect(initialDaonationStableTokenBalance.add(donationAmount))
                .to.be.eq(finalDaonationStableTokenBalance, "Daonation stable token balance should be the expected")
            expect(initialDaonationGovernanceTokenBalance.sub(expectedReward))
                .to.be.eq(finalDaonationGovernanceTokenBalance, "Daonation governance token balance should be the expected")
            expect(initialDonorGovernanceTokenBalance.add(expectedReward))
                .to.be.eq(finalDonorGovernanceTokenBalance, "Donor governance token balance should be the expected")
            expect(initialAvailableRewards.sub(expectedReward))
                .to.be.eq(finalAvailableRewards, "Registered available reward should be the expected")
            expect(initialVaquinhaDonations.add(donationAmount))
                .to.be.eq(finalVaquinhaDonations, "Registered vaquinha donations should be the expected")

        });

        it("Should be possible to redeem donations.", async function () {

            const {
                daonation, daonationToken, owner, beneficiary1,
                votationPeriod, donationPeriod, votationTokenRewardRatio,
                donor1, stableMockToken
            } = await loadFixture(deploy);

            const expectedValue = ethers.utils.parseEther('5000')
            await daonation.proposeVaquinha("test", expectedValue, beneficiary1.address)

            const vaquinhasCount = await daonation.vaquinhasCount()
            const vaquinhaId = vaquinhasCount.sub(1)

            const vaquinha = await daonation.vaquinhas(vaquinhaId)

            await daonationToken.approve(daonation.address, ethers.constants.MaxUint256)
            const initialDaonationTokenBalance = await daonationToken.balanceOf(owner.address)
            const daonationTokenForVoting = initialDaonationTokenBalance.div(10)
            await daonation.voteForVaquinha(vaquinhaId, daonationTokenForVoting);

            await time.increase(votationPeriod + 1)

            const donationAmount = parseEther('100')
            await daonation.connect(donor1).donate(vaquinhaId, donationAmount)

            expect(await daonation.isFinished(vaquinhaId), 'Should not be finished.').to.be.false

            await time.increase(donationPeriod + 1)

            expect(await daonation.isFinished(vaquinhaId), 'Should be finished.').to.be.true

            const initialBeneficiaryStableTokenBalance = await stableMockToken.balanceOf(beneficiary1.address)

            await daonation.connect(beneficiary1).redeemDonations(vaquinhaId)

            const finalBeneficiaryStableTokenBalance = await stableMockToken.balanceOf(beneficiary1.address)

            expect(initialBeneficiaryStableTokenBalance.add(donationAmount))
                .to.be.eq(finalBeneficiaryStableTokenBalance, "Beneficiary stable token balance should be the expected")

        });

    });

});
