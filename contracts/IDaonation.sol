// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

interface IDaonation{

    function addGovernanceTokenRewards(
        uint256 rewardsAmount
    ) external;

    /**
    * Proposta de vaquinha para ser votada.
    * token.allowance(msg.sender, address(this)) > tokensToCreateProposal
    */
    function proposeVaquinha(
        string calldata description,
        uint256 expectedValue,
        address donationsTo
    ) external returns (uint256);

    /**
    * Votar pela aprovação.
    * token.allowance(msg.sender, address(this)) > tokensToUse
    */
    function voteForVaquinha(
        uint256 vaquinhaId,
        uint256 tokensToUse
    ) external;

    /**
    * Votar pela rejeição.
    * token.allowance(msg.sender, address(this)) > tokensToUse
    */
    function voteAgainstVaquinha(
        uint256 vaquinhaId,
        uint256 tokensToUse
    ) external;

    /**
    * Recupera os tokens bloqueados na vaquinha por ter votado ou por ter criado a proposta.
    */
    function unlockTokens(
        uint256 vaquinhaId
    ) external;

    /**
    * Recupera os tokens bloqueados na vaquinha por ter votado ou por ter criado a proposta.
    */
    function donate(
        uint256 vaquinhaId,
        uint256 donationAmount
    ) external;

    // /**
    // * Recupera as recompensas do token de governança ganhados pelos doadores.
    // */
    // function redeemRewards() external;

    /**
    * Envia as doações para o beneficiario.
    */
    function redeemDonations(uint256 vaquinhaId) external;


}