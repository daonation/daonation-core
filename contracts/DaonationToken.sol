// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract DaonationToken is ERC20 {

    constructor() ERC20('DAOnation Governance Token','DOAR'){
        _mint(msg.sender, 1000000 ether);
    }

}