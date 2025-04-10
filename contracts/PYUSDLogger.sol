// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PYUSDLogger {
    struct Transfer {
        address from;
        address to;
        uint256 amount;
        uint256 timestamp;
    }

    Transfer[] public transfers;
    mapping(address => uint256) public totalSent;
    mapping(address => uint256) public totalReceived;
    uint256 public totalVolume;
    mapping(uint256 => uint256) public dailyVolume; // Volume by day (timestamp / 86400)

    event TransferLogged(address indexed from, address indexed to, uint256 amount);

    function logTransfer(address from, address to, uint256 amount) external {
        uint256 day = block.timestamp / 86400;
        transfers.push(Transfer(from, to, amount, block.timestamp));
        totalSent[from] += amount;
        totalReceived[to] += amount;
        totalVolume += amount;
        dailyVolume[day] += amount;
        emit TransferLogged(from, to, amount);
    }

    function getTransferCount() external view returns (uint256) {
        return transfers.length;
    }

    function getDailyVolume(uint256 day) external view returns (uint256) {
        return dailyVolume[day];
    }
}