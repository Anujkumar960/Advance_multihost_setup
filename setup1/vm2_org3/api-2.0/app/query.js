const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require("path");
const log4js = require('log4js');
const logger = log4js.getLogger('BasicNetwork');
const util = require('util');

const helper = require('./helper');

const query = async (channelName, chaincodeName, args, fcn, username, org_name) => {
    try {
        console.log(`Arguments type: ${typeof args}`);
        console.log(`Length of args: ${args.length}`);

        // Load the network configuration
        const ccp = await helper.getCCP(org_name);

        // Create a new file system-based wallet for managing identities.
        const walletPath = await helper.getWalletPath(org_name);
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check if we've already enrolled the user.
        let identity = await wallet.get(username);
        if (!identity) {
            const msg = `An identity for the user ${username} does not exist in the wallet.`;
            console.error(msg);
            await helper.getRegisteredUser(username, org_name, true);
            identity = await wallet.get(username);
            if (!identity) {
                console.error('User registration failed. Please run the registerUser.js application before retrying.');
                return { error: 'User registration failed.' };
            }
        }

        // Create a new gateway for connecting to our peer node.
        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet, identity: username, discovery: { enabled: true, asLocalhost: false }
        });

        // Get the network (channel) our contract is deployed to.
        const network = await gateway.getNetwork(channelName);

        // Get the contract from the network.
        const contract = network.getContract(chaincodeName);
        let result;

        if (fcn === "getHistoryForKey") {
            console.log(`Executing function: ${fcn} with args: ${JSON.stringify(args)}`);
            result = await contract.evaluateTransaction(fcn, args[0]);
            return JSON.parse(result.toString());
        } else if (fcn === "queryAllOffers") {
            console.log(`Executing function: ${fcn}`);
            result = await contract.evaluateTransaction(fcn);
            const offers = JSON.parse(result.toString());

            if (!Array.isArray(offers)) {
                throw new Error(`Expected an array from queryAllOffers but received: ${typeof offers}`);
            }

            // Fetch history for each offer
            const offerDetails = await Promise.all(offers.map(async (offer) => {
                const key = offer.Key; // Make sure this key corresponds to the expected format
                try {
                    const historyResult = await contract.evaluateTransaction("getHistoryForKey", key);
                    const history = JSON.parse(historyResult.toString());
                    return {
                        ...offer, // Include all offer properties
                        history // Add history for this offer
                    };
                } catch (err) {
                    console.error(`Failed to get history for key ${key}: ${err.message}`);
                    return { ...offer, history: { error: err.message } }; // Include error in the history
                }
            }));
            
            return { offers: offerDetails };
        } else {
            throw new Error(`Function ${fcn} is not recognized.`);
        }

        // console.log(`Transaction has been evaluated, result is: ${result.toString()}`);
        // return JSON.parse(result.toString());

    } catch (error) {
        console.error(`Failed to evaluate transaction: ${error.message}`);
        if (error.stack) {
            console.error(`Error stack: ${error.stack}`);
        }
        return { error: error.message };
    }
};

exports.query = query;
