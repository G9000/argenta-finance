// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script, console2} from "forge-std/Script.sol";
import {SimpleVault} from "../src/SimpleVault.sol";

contract DeployScript is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        
        SimpleVault vault = new SimpleVault();
        
        console2.log("SimpleVault deployed at:", address(vault));
        console2.log("Network:", block.chainid);
        
        vm.stopBroadcast();
    }
}