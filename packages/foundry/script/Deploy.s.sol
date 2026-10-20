// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {StakingPool} from "../contracts/StakingPool.sol";
import {MockERC20} from "../contracts/mocks/MockERC20.sol";

contract Deploy is Script {
    function run() external {
        vm.startBroadcast();

        MockERC20 stakingToken = new MockERC20("Stake", "STK");
        MockERC20 rewardToken  = new MockERC20("Reward", "RWD");

        StakingPool pool = new StakingPool(
            address(stakingToken),
            address(rewardToken)
        );

        // fund 7 days of rewards at 1 token/sec
        rewardToken.mint(address(pool), 7 days * 1e18);
        pool.notifyRewardAmount(7 days * 1e18);

        vm.stopBroadcast();

        console.log("StakingToken:", address(stakingToken));
        console.log("RewardToken: ", address(rewardToken));
        console.log("StakingPool: ", address(pool));
    }
}