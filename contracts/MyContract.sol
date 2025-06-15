// SPDX-License-Identifier: MIT
// This line is required for open source licensing. Keep it as is.
pragma solidity ^0.8.0;

/**
 * @title MyContract
 * @dev The simplest contract for storing and retrieving a number (uint256).
 * Perfect for learning basic deployment.
 */
contract MyContract {
    // This is a 'variable' or 'storage box' in the blockchain.
    // We set it as 'private' so others must use our function (getValue) to view its contents.
    uint256 private storedValue;

    /**
     * @dev Function to change the stored value.
     * @param _newValue The new value to be stored.
     * This is a 'write' transaction to the blockchain, so it requires gas fees.
     */
    function setValue(uint256 _newValue) public {
        storedValue = _newValue;
    }

    /**
     * @dev Function to read the stored value.
     * 'view' means this function only 'reads' data, doesn't change anything.
     * Since it's just reading, calling this function from outside (off-chain) is FREE, no gas needed.
     * @return Returns the currently stored value.
     */
    function getValue() public view returns (uint256) {
        return storedValue;
    }
}
