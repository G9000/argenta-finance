// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test, console2} from "forge-std/Test.sol";
import {SimpleVault} from "../src/SimpleVault.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {
        _mint(msg.sender, 1000000 * 10**6); // 1M USDC
    }
    
    function decimals() public pure override returns (uint8) {
        return 6;
    }
}

contract SimpleVaultTest is Test {
    SimpleVault public vault;
    MockUSDC public usdc;
    
    address public alice = address(0x1);
    address public bob = address(0x2);
    
    uint256 constant INITIAL_BALANCE = 10000 * 10**6; // 10k USDC
    
    event Deposited(address indexed user, address indexed token, uint256 amount);
    event Withdrawn(address indexed user, address indexed token, uint256 amount);
    
    function setUp() public {
        vault = new SimpleVault();
        usdc = new MockUSDC();
        
        // Fund test accounts
        usdc.transfer(alice, INITIAL_BALANCE);
        usdc.transfer(bob, INITIAL_BALANCE);
    }
    
    function test_Deposit() public {
        uint256 depositAmount = 1000 * 10**6; // 1000 USDC
        
        vm.startPrank(alice);
        usdc.approve(address(vault), depositAmount);
        
        vm.expectEmit(true, true, false, true);
        emit Deposited(alice, address(usdc), depositAmount);
        
        vault.deposit(address(usdc), depositAmount);
        vm.stopPrank();
        
        assertEq(vault.getBalance(alice, address(usdc)), depositAmount);
        assertEq(usdc.balanceOf(alice), INITIAL_BALANCE - depositAmount);
        assertEq(usdc.balanceOf(address(vault)), depositAmount);
    }
    
    function test_MultipleDeposits() public {
        uint256 firstDeposit = 500 * 10**6;
        uint256 secondDeposit = 300 * 10**6;
        
        vm.startPrank(alice);
        usdc.approve(address(vault), firstDeposit + secondDeposit);
        
        vault.deposit(address(usdc), firstDeposit);
        vault.deposit(address(usdc), secondDeposit);
        vm.stopPrank();
        
        assertEq(vault.getBalance(alice, address(usdc)), firstDeposit + secondDeposit);
    }
    
    function test_Withdraw() public {
        uint256 depositAmount = 1000 * 10**6;
        uint256 withdrawAmount = 600 * 10**6;
        
        // First deposit
        vm.startPrank(alice);
        usdc.approve(address(vault), depositAmount);
        vault.deposit(address(usdc), depositAmount);
        
        // Then withdraw
        vm.expectEmit(true, true, false, true);
        emit Withdrawn(alice, address(usdc), withdrawAmount);
        
        vault.withdraw(address(usdc), withdrawAmount);
        vm.stopPrank();
        
        assertEq(vault.getBalance(alice, address(usdc)), depositAmount - withdrawAmount);
        assertEq(usdc.balanceOf(alice), INITIAL_BALANCE - depositAmount + withdrawAmount);
        assertEq(usdc.balanceOf(address(vault)), depositAmount - withdrawAmount);
    }
    
    function test_WithdrawFullBalance() public {
        uint256 depositAmount = 1000 * 10**6;
        
        vm.startPrank(alice);
        usdc.approve(address(vault), depositAmount);
        vault.deposit(address(usdc), depositAmount);
        
        vault.withdraw(address(usdc), depositAmount);
        vm.stopPrank();
        
        assertEq(vault.getBalance(alice, address(usdc)), 0);
        assertEq(usdc.balanceOf(alice), INITIAL_BALANCE);
        assertEq(usdc.balanceOf(address(vault)), 0);
    }
    
    function test_RevertWhen_DepositZeroAmount() public {
        vm.startPrank(alice);
        usdc.approve(address(vault), 1000 * 10**6);
        
        vm.expectRevert(SimpleVault.InvalidAmount.selector);
        vault.deposit(address(usdc), 0);
        vm.stopPrank();
    }
    
    function test_RevertWhen_WithdrawZeroAmount() public {
        vm.startPrank(alice);
        vm.expectRevert(SimpleVault.InvalidAmount.selector);
        vault.withdraw(address(usdc), 0);
        vm.stopPrank();
    }
    
    function test_RevertWhen_WithdrawMoreThanBalance() public {
        uint256 depositAmount = 1000 * 10**6;
        uint256 withdrawAmount = 1500 * 10**6;
        
        vm.startPrank(alice);
        usdc.approve(address(vault), depositAmount);
        vault.deposit(address(usdc), depositAmount);
        
        vm.expectRevert(SimpleVault.InsufficientBalance.selector);
        vault.withdraw(address(usdc), withdrawAmount);
        vm.stopPrank();
    }
    
    function test_MultipleUsers() public {
        uint256 aliceDeposit = 1000 * 10**6;
        uint256 bobDeposit = 500 * 10**6;
        
        // Alice deposits
        vm.startPrank(alice);
        usdc.approve(address(vault), aliceDeposit);
        vault.deposit(address(usdc), aliceDeposit);
        vm.stopPrank();
        
        // Bob deposits
        vm.startPrank(bob);
        usdc.approve(address(vault), bobDeposit);
        vault.deposit(address(usdc), bobDeposit);
        vm.stopPrank();
        
        assertEq(vault.getBalance(alice, address(usdc)), aliceDeposit);
        assertEq(vault.getBalance(bob, address(usdc)), bobDeposit);
        assertEq(usdc.balanceOf(address(vault)), aliceDeposit + bobDeposit);
    }
    
    function testFuzz_Deposit(uint256 amount) public {
        amount = bound(amount, 1, INITIAL_BALANCE);
        
        vm.startPrank(alice);
        usdc.approve(address(vault), amount);
        vault.deposit(address(usdc), amount);
        vm.stopPrank();
        
        assertEq(vault.getBalance(alice, address(usdc)), amount);
    }
    
    function testFuzz_DepositWithdraw(uint256 depositAmount, uint256 withdrawAmount) public {
        depositAmount = bound(depositAmount, 1, INITIAL_BALANCE);
        withdrawAmount = bound(withdrawAmount, 1, depositAmount);
        
        vm.startPrank(alice);
        usdc.approve(address(vault), depositAmount);
        vault.deposit(address(usdc), depositAmount);
        vault.withdraw(address(usdc), withdrawAmount);
        vm.stopPrank();
        
        assertEq(vault.getBalance(alice, address(usdc)), depositAmount - withdrawAmount);
        assertEq(usdc.balanceOf(alice), INITIAL_BALANCE - depositAmount + withdrawAmount);
    }
}