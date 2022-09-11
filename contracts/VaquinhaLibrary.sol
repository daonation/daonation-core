// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

library VaquinhaLibrary{

    struct Vaquinha{
        string description;
        uint256 expectedValue;
        uint256 votationEndTimestamp;
        uint256 donationEndTimestamp;
        uint256 aprovadores;
        uint256 detratores;
        uint256 donations;
        address donationsTo;
        bool donationsRedeemed;
    }

    enum VaquinhaStatus{
        Votation,
        Rejected,
        Donating,
        Finished
    }

    function status(
        Vaquinha storage self
    ) public view returns(VaquinhaStatus){
        
        if (block.timestamp <= self.votationEndTimestamp){
            return VaquinhaStatus.Votation;
        }

        if (self.detratores > self.aprovadores){
            return VaquinhaStatus.Rejected;
        }

        if (block.timestamp <= self.donationEndTimestamp){
            return VaquinhaStatus.Donating;
        }

        return VaquinhaStatus.Finished;

    }

    function votation(Vaquinha storage self) public view returns(bool){

        return status(self) == VaquinhaStatus.Votation;

    }

    function donating(Vaquinha storage self) public view returns(bool){

        return status(self) == VaquinhaStatus.Donating;

    }

    function finished(Vaquinha storage self) public view returns(bool){

        return status(self) == VaquinhaStatus.Finished;

    }

}

