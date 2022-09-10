// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract GovernanceToken is ERC20 {
    constructor() ERC20('DAOnation Governance Token','DOAR'){
        _mint(msg.sender, 1000000 ether);
    }
}