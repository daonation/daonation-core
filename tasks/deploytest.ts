
import { ethers } from "ethers"
import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const { parseEther } = ethers.utils
const { MaxUint256 } = ethers.constants

export const logTransactionAndWait = async(txrp: Promise<ethers.providers.TransactionResponse>, confirmations: number, log=console.log) => {
    const txr = await txrp
    log(txr.nonce, txr.hash);
    await txr.wait(confirmations)
}

task(
    "deploytest",
    "Deploys test contracts.",
    async ({ addressto, teamid }: any, hre: HardhatRuntimeEnvironment) => {
        
        const signer = (await hre.ethers.getSigners())[0]
        const [owner, otherAccount, beneficiary1, beneficiary2, donor1, donor2] = await hre.ethers.getSigners();

        const DaonationToken = await hre.ethers.getContractFactory("DaonationToken");
        const daonationToken = await DaonationToken.deploy();
        console.log('daonationToken', daonationToken.address);
        

        const StableMockToken = await hre.ethers.getContractFactory("MockToken");
        const stableMockToken = await StableMockToken.deploy('StableMock', 'STM')
        console.log('stableMockToken', stableMockToken.address);

        await logTransactionAndWait(
            stableMockToken.mint(donor1.address, parseEther('100000')),
            1
        )
        await logTransactionAndWait(
            stableMockToken.mint(donor2.address, parseEther('100000')),
            1
        )

        const VaquinhaLibrary = await hre.ethers.getContractFactory("VaquinhaLibrary")
        const vaquinhaLibrary = await VaquinhaLibrary.deploy()
        console.log('vaquinhaLibrary', vaquinhaLibrary.address);

        const Daonation = await hre.ethers.getContractFactory("Daonation", {
            libraries: {
                VaquinhaLibrary: vaquinhaLibrary.address,
            },
        })
        const votationPeriod = 10 * 60
        const proposalLockPeriod = 10 * 60
        const votationTokenRewardRatio = 100 //1%
        const donationPeriod = 10 * 60
        const tokensToCreateProposal = ethers.utils.parseEther('10000')
        const daonation = await Daonation.deploy(
            daonationToken.address,
            stableMockToken.address,
            votationPeriod,
            tokensToCreateProposal,
            proposalLockPeriod,
            votationTokenRewardRatio,
            donationPeriod
        );
        console.log('daonation', daonation.address);

        await logTransactionAndWait(daonationToken.connect(owner).approve(daonation.address, MaxUint256), 1)
        await logTransactionAndWait(daonationToken.connect(otherAccount).approve(daonation.address, MaxUint256), 1)
        await logTransactionAndWait(daonationToken.connect(donor1).approve(daonation.address, MaxUint256), 1)
        await logTransactionAndWait(daonationToken.connect(donor2).approve(daonation.address, MaxUint256), 1)

        await logTransactionAndWait(stableMockToken.connect(owner).approve(daonation.address, MaxUint256), 1)
        await logTransactionAndWait(stableMockToken.connect(otherAccount).approve(daonation.address, MaxUint256), 1)
        await logTransactionAndWait(stableMockToken.connect(donor1).approve(daonation.address, MaxUint256), 1)
        await logTransactionAndWait(stableMockToken.connect(donor2).approve(daonation.address, MaxUint256), 1)

    })
