// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IDaonation} from "./IDaonation.sol";
import {VaquinhaLibrary} from "./VaquinhaLibrary.sol";

contract Daonation is IDaonation {

    using SafeERC20 for ERC20;
    
    ERC20 public votationToken;
    ERC20 public donationToken;

    uint64 public votationPeriod; // in seconds
    uint256 public tokensToCreateProposal;

    // in seconds: The period that tokens used for proposal creation will be locked
    uint64 public proposalLockPeriod; // TODO Use it.

    uint64 public donationPeriod; // in seconds

    using VaquinhaLibrary for VaquinhaLibrary.Vaquinha;

    mapping(uint256 => mapping(address => uint256)) lockedTokensByVaquinha;

    mapping(uint256 => uint256) public vaquinhaByProposal;
    VaquinhaLibrary.Vaquinha[] public vaquinhas;
    uint256 public vaquinhasCount;

    uint16 public votationTokenRewardRatio;
    uint16 public constant UNIT_REWARD_RATIO = 10000;

    uint256 public availableRewards = 0;

    constructor(
        ERC20 _votationToken,
        ERC20 _donationToken,
        uint64 _votationPeriod,
        uint256 _tokensToCreateProposal,
        uint64 _proposalLockPeriod,
        uint16 _votationTokenRewardRatio,
        uint64 _donationPeriod
    )
    {
        votationToken = _votationToken;
        votationPeriod = _votationPeriod;
        tokensToCreateProposal = _tokensToCreateProposal;
        proposalLockPeriod = _proposalLockPeriod;
        donationToken = _donationToken;
        votationTokenRewardRatio = _votationTokenRewardRatio;
        donationPeriod = _donationPeriod;
    }

    event RewardsAdded(address sender, uint256 rewardsAmount);

    function addGovernanceTokenRewards(
        uint256 rewardsAmount
    ) public {
        votationToken.safeTransferFrom(msg.sender, address(this), rewardsAmount);
        availableRewards+=rewardsAmount;
        emit RewardsAdded(msg.sender, rewardsAmount);
    }

    function _createVaquinha(string memory description, uint256 expectedValue, address donationsTo) internal returns (uint256){
        uint256 vaquinhaId = vaquinhasCount;
        vaquinhas.push(VaquinhaLibrary.Vaquinha({
            description: description,
            expectedValue: expectedValue,
            votationEndTimestamp: block.timestamp + votationPeriod,
            donationEndTimestamp: block.timestamp + votationPeriod + donationPeriod,
            aprovadores: 0,
            detratores: 0,
            donations: 0,
            donationsTo: donationsTo,
            donationsRedeemed: false
        }));
        vaquinhasCount++;
        return vaquinhaId;
    }

    event VaquinhaProposalCreated(address indexed creator, uint256 indexed vaquinhaId);

    function proposeVaquinha(
        string memory description,
        uint256 expectedValue,
        address donationsTo
    ) public returns (uint256){
        uint256 vaquinhaId = _createVaquinha(description, expectedValue, donationsTo);
        _lockTokensTo(vaquinhaId, tokensToCreateProposal);
        emit VaquinhaProposalCreated(msg.sender, vaquinhaId);
        return vaquinhaId;
    }

    function _lockTokensTo(uint256 vaquinhaId, uint256 tokensToLock) internal{
        lockedTokensByVaquinha[vaquinhaId][msg.sender] = tokensToLock;
        votationToken.safeTransferFrom(msg.sender, address(this), tokensToLock);
    }

    event VoteForVaquinha(uint256 indexed vaquinhaId, uint256 tokensUsed);

    function voteForVaquinha(uint256 vaquinhaId, uint256 tokensToUse) public{
        VaquinhaLibrary.Vaquinha storage vaquinha = vaquinhas[vaquinhaId];
        require(vaquinha.votation(), "NOT VOTATION PERIOD");
        _lockTokensTo(vaquinhaId, tokensToUse);
        vaquinha.aprovadores += tokensToUse;
        emit VoteForVaquinha(vaquinhaId, tokensToUse);
    }

    event VoteAgainstVaquinha(uint256 indexed vaquinhaId, uint256 tokensUsed);

    function voteAgainstVaquinha(uint256 vaquinhaId, uint256 tokensToUse) public{
        VaquinhaLibrary.Vaquinha storage vaquinha = vaquinhas[vaquinhaId];
        require(vaquinha.votation(), "NOT VOTATION PERIOD");
        _lockTokensTo(vaquinhaId, tokensToUse);
        vaquinha.aprovadores += tokensToUse;
        emit VoteAgainstVaquinha(vaquinhaId, tokensToUse);
    }

    event UnlockedTokens(address indexed to, uint256 unlockedAmount);

    function unlockTokens(uint256 vaquinhaId) public{
        VaquinhaLibrary.Vaquinha storage vaquinha = vaquinhas[vaquinhaId];
        require(!vaquinha.votation(), "VOTATION PERIOD");
        uint256 toUnlock = lockedTokensByVaquinha[vaquinhaId][msg.sender];
        require(toUnlock > 0, "NO TOKENS TO UNLOCK");
        votationToken.safeTransfer(msg.sender, toUnlock);
        lockedTokensByVaquinha[vaquinhaId][msg.sender] = 0;
        emit UnlockedTokens(msg.sender, toUnlock);
    }

    event Donation(
        uint256 indexed vaquinhaId,
        address indexed donor,
        address donationToken,
        uint256 donationAmount
    );

    function donate(uint256 vaquinhaId, uint256 donationAmount) external{
        VaquinhaLibrary.Vaquinha storage vaquinha = vaquinhas[vaquinhaId];
        require(vaquinha.donating(), "NOT DONATING STATUS");
        vaquinha.donations+=donationAmount;
        donationToken.safeTransferFrom(msg.sender, address(this), donationAmount);
        uint256 votationTokenReward = donationAmount * votationTokenRewardRatio / UNIT_REWARD_RATIO;
        votationTokenReward = votationTokenReward > availableRewards ? availableRewards : votationTokenReward;
        if (votationTokenReward==0)
            return;
        votationToken.safeTransfer(msg.sender, votationTokenReward);
        availableRewards-=votationTokenReward;
        emit Donation(vaquinhaId, msg.sender, address(donationToken), donationAmount);
    }

    event DonationRedeemed(uint256 indexed vaquinhaId, address indexed donationsTo, uint256 donationsAmount);

    function redeemDonations(uint256 vaquinhaId) external{
        VaquinhaLibrary.Vaquinha storage vaquinha = vaquinhas[vaquinhaId];
        require(vaquinha.finished(), "NOT FINISHED STATUS");
        require(msg.sender == vaquinha.donationsTo, "NOT BENEFICIARY");
        require(!vaquinha.donationsRedeemed, "DONATIONS ALREADY REDEEMED");
        require(vaquinha.donations > 0, "NO DONATIONS");
        donationToken.safeTransfer(vaquinha.donationsTo, vaquinha.donations);
        vaquinha.donationsRedeemed = true;
        emit DonationRedeemed(vaquinhaId, vaquinha.donationsTo, vaquinha.donations);
    }


    function isVoting(uint256 vaquinhaId) public view returns(bool) {
        return vaquinhas[vaquinhaId].votation();
    }

    function isDonating(uint256 vaquinhaId) public view returns(bool) {
        return vaquinhas[vaquinhaId].donating();
    }

    function isFinished(uint256 vaquinhaId) public view returns(bool) {
        return vaquinhas[vaquinhaId].finished();
    }

}