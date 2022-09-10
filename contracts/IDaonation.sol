// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

interface IDaonation{

    function proposeVaquinha(string calldata description, uint256 expectedValue) external returns (uint256);

    function votarAprovarVaquinha(uint256 vaquinhaId) external;

    function votarRejeitarVaquinha(uint256 vaquinhaId) external;

    function executarAprovacaoVaquinha(uint256 vaquinhaId) external;

}