//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface INFT {
    function mint(address _to) external;
}

contract NFTPool is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    struct AprInfo {
        uint256 percent;
        uint256 duration;
    }

    address public ERC721Token;
    IERC20 public token;
    IERC20 public rewardToken;

    uint256 public minAmount = 0;
    uint256 mintPeriod = 20 days;

    mapping(address => uint256) public lastUpdate;
    mapping(address => uint256) public unlockTime;
    mapping(address => uint256) public deposits;

    uint256 public aprPercent = 15;

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);

    constructor (
        address ERC721Token_,
        address token_,
        address rewardToken_
    ) {
        ERC721Token = ERC721Token_;
        token = IERC20(token_);
        rewardToken = IERC20(rewardToken_);
    }

    function balanceOf(address account) external view returns (uint256) {
        return deposits[account] + pendingReward(account);
    }

    function setMinAmount(uint256 _minAmount) public onlyOwner{
        minAmount = _minAmount;
    }

    function stake(uint256 amount) public virtual {
        uint256 reward = pendingReward(msg.sender);
        if (reward > 0) {
            rewardToken.safeTransfer(msg.sender, reward);
        }
        deposits[msg.sender] = deposits[msg.sender] + amount;        
        lastUpdate[msg.sender] = block.timestamp;
        unlockTime[msg.sender] = 0;
        if (deposits[msg.sender] >= minAmount) {
            unlockTime[msg.sender] = block.timestamp + mintPeriod;
        }        
        token.safeTransferFrom(msg.sender, address(this), amount);
        emit Staked(msg.sender, amount);
    }

    function unstake(uint256 amount) public virtual {
        require(deposits[msg.sender] >= amount, "Not enough user balance to withdraw");
        uint256 reward = pendingReward(msg.sender);
        if (reward > 0) {
            rewardToken.safeTransfer(msg.sender, reward);
        }
        deposits[msg.sender] -= amount;
        lastUpdate[msg.sender] = block.timestamp;
        unlockTime[msg.sender] = 0;
        if(deposits[msg.sender] >= minAmount) {
            unlockTime[msg.sender] = block.timestamp + mintPeriod;
        }
        token.safeTransfer(msg.sender, amount);
        emit Unstaked(msg.sender, amount);
    }

    function getApr(address account) public view returns (AprInfo memory _a) {
        uint256 stakedTime = block.timestamp - lastUpdate[account];
        AprInfo memory _aprInfo;
        _aprInfo.percent = aprPercent;
        _aprInfo.duration = 30 days;
        if ( stakedTime >= 90 days) {
            _aprInfo.percent = 25;
            _aprInfo.duration = 180 days;
        } else if ( stakedTime >= 30 days ) {
            _aprInfo.percent = 20;
            _aprInfo.duration = 90 days;
        }
        return _aprInfo;
    }

    function pendingReward(address account) public view returns (uint256) {
        uint256 stakedTime = block.timestamp - lastUpdate[account];
        AprInfo memory aprInfo = getApr(msg.sender);
        return deposits[account] * aprInfo.percent / 1000 * stakedTime / aprInfo.duration;
    }

    function harvest() external {
        require (deposits[msg.sender] > 0, "No balance to withdraw");
        uint256 reward = pendingReward(msg.sender);
        if (reward > 0) {
            rewardToken.transfer(msg.sender, reward);
        }
        lastUpdate[msg.sender] = block.timestamp;
        if (block.timestamp > unlockTime[msg.sender]) {
            INFT(ERC721Token).mint(msg.sender);
            unlockTime[msg.sender] = block.timestamp + mintPeriod;
        }
    }

    function nftClaimable(address account) external view returns (bool) {
        return deposits[msg.sender] >= minAmount && block.timestamp > unlockTime[account] && unlockTime[account] != 0;
    }

    function claimNFT() external {
        require (deposits[msg.sender] >= minAmount && block.timestamp > unlockTime[msg.sender] && unlockTime[msg.sender] != 0, "You can't mint");
        INFT(ERC721Token).mint(msg.sender);
        unlockTime[msg.sender] = block.timestamp + mintPeriod;
    }

    function withdrawToken(IERC20 _token, uint256 amount) external onlyOwner {
        _token.transfer(msg.sender, amount);
    }
}