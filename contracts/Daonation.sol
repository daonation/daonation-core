// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/compatibility/GovernorCompatibilityBravo.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";

import {IDaonation} from "./IDaonation.sol";

import "hardhat/console.sol";

contract Daonation is Governor, GovernorCompatibilityBravo, GovernorVotes, GovernorVotesQuorumFraction, GovernorTimelockControl, IDaonation {
    
    constructor(IVotes _token, TimelockController _timelock)
        Governor("Daonation")
        GovernorVotes(_token)
        GovernorVotesQuorumFraction(1)
        GovernorTimelockControl(_timelock)
    {
    }

    function votingDelay() public pure override returns (uint256) {
        return 0; // delay in blocks when proposal can be voted
    }

    function votingPeriod() public pure override returns (uint256) {
        return 2;//46027; // 1 week
    }

    function proposalThreshold() public pure override returns (uint256) {
        return 0;
    }

    // The functions below are overrides required by Solidity.

    function quorum(uint256 blockNumber)
        public
        view
        override(IGovernor, GovernorVotesQuorumFraction)
        returns (uint256)
    {
        return super.quorum(blockNumber);
    }

    function getVotes(address account, uint256 blockNumber)
        public
        view
        override(IGovernor, Governor)
        returns (uint256)
    {
        return super.getVotes(account, blockNumber);
    }

    function state(uint256 proposalId)
        public
        view
        override(Governor, IGovernor, GovernorTimelockControl)
        returns (ProposalState)
    {
        console.log('super.state(proposalId)', uint256(super.state(proposalId)));
        return super.state(proposalId);
    }

    function propose(address[] memory /*targets*/, uint256[] memory /*values*/, bytes[] memory /*calldatas*/, string memory /*description*/)
        public pure
        override(Governor, GovernorCompatibilityBravo, IGovernor)
        returns (uint256)
    {
        revert('ONLY PRIVATE USAGE');
    }

    struct Vaquinha{
        string description;
        uint256 expectedValue;
        bool aprovada;
        uint256 proposal;
    }

    mapping(uint256 => uint256) public vaquinhaByProposal;
    Vaquinha[] public vaquinhas;
    uint256 public vaquinhasCount;

    event VaquinhaProposalCreated(address indexed creator, uint256 indexed vaquinhaId, uint256 indexed proposal);

    function _createVaquinha(string memory description, uint256 expectedValue) internal returns (uint256){
        uint256 vaquinhaId = vaquinhasCount;
        vaquinhas.push(Vaquinha({
            description: description,
            expectedValue: expectedValue,
            aprovada: false,
            proposal: 0
        }));
        vaquinhasCount++;
        return vaquinhaId;
    }

    function aprovarVaquinha(uint256 vaquinhaId) public {
        require(msg.sender == address(this) || msg.sender == address(timelock()));
        vaquinhas[vaquinhaId].aprovada = true;
    } 

    function proposeVaquinha(string memory description, uint256 expectedValue) public returns (uint256){
        uint256 vaquinhaId = _createVaquinha(description, expectedValue);
        address[] memory targets = new address[](1);
        targets[0] = address(this);
        uint256[] memory values = new uint256[](1);
        values[0] = 0;
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSelector(
            this.aprovarVaquinha.selector,
            vaquinhaId
        );
        uint256 proposal = super.propose(targets, values, calldatas, description);
        vaquinhas[vaquinhaId].proposal = proposal;
        vaquinhaByProposal[proposal] = vaquinhaId;
        emit VaquinhaProposalCreated(msg.sender, vaquinhaId, proposal);
        return proposal;
    }

    function _aprovarVaquinhaByProposal(uint256 proposalId) public {
        uint256 vaquinhaId = vaquinhaByProposal[proposalId];
        vaquinhas[vaquinhaId].aprovada = true;
    }

    function _execute(uint256 proposalId, address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash)
        internal
        override(Governor, GovernorTimelockControl)
    {
        // _aprovarVaquinhaByProposal(proposalId);
        // // TODO Verify if should be removed.
        super._execute(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _cancel(address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash)
        internal
        override(Governor, GovernorTimelockControl)
        returns (uint256)
    {
        // TODO Verify if should be removed.
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    function _executor()
        internal
        view
        override(Governor, GovernorTimelockControl)
        returns (address)
    {
        return super._executor();
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(Governor, IERC165, GovernorTimelockControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function votarAprovarVaquinha(uint256 vaquinhaId) public{
        castVote(vaquinhas[vaquinhaId].proposal, 1);
    }

    function votarRejeitarVaquinha(uint256 vaquinhaId) public{
        castVote(vaquinhas[vaquinhaId].proposal, 0);
    }

    function executarAprovacaoVaquinha(uint256 vaquinhaId) public{
        uint256 proposal = vaquinhas[vaquinhaId].proposal;
        queue(proposal);
        execute(proposal);
    }

}