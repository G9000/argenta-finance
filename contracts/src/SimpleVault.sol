// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SimpleVault is ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    mapping(address => mapping(address => uint256)) public balances;
    
    event Deposited(address indexed user, address indexed token, uint256 amount);
    event Withdrawn(address indexed user, address indexed token, uint256 amount);
    
    error InvalidAmount();
    error InsufficientBalance();
    
    function deposit(address token, uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidAmount();
        
        uint256 balanceBefore = IERC20(token).balanceOf(address(this));
        
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        uint256 balanceAfter = IERC20(token).balanceOf(address(this));
        uint256 actualAmount = balanceAfter - balanceBefore;
        
        balances[msg.sender][token] += actualAmount;
        
        emit Deposited(msg.sender, token, actualAmount);
    }
    
    function withdraw(address token, uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidAmount();
        if (balances[msg.sender][token] < amount) revert InsufficientBalance();
        
        balances[msg.sender][token] -= amount;
        
        IERC20(token).safeTransfer(msg.sender, amount);
        
        emit Withdrawn(msg.sender, token, amount);
    }
    
    function getBalance(address user, address token) external view returns (uint256) {
        return balances[user][token];
    }
}