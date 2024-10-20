// const { Gateway, Wallets, TxEventHandler, GatewayOptions, DefaultEventHandlerStrategies, TxEventHandlerFactory } = require('fabric-network');
// const fs = require('fs');
// const path = require("path")
// const log4js = require('log4js');
// const logger = log4js.getLogger('BasicNetwork');
// const util = require('util')

// // const createTransactionEventHandler = require('./MyTransactionEventHandler.ts')

// const helper = require('./helper')

// // const createTransactionEventHandler = (transactionId, network) => {
// //     /* Your implementation here */
// //     const mspId = network.getGateway().getIdentity().mspId;
// //     const myOrgPeers = network.getChannel().getEndorsers(mspId);
// //     return new MyTransactionEventHandler(transactionId, network, myOrgPeers);
// // }

// const invokeTransaction = async (channelName, chaincodeName, fcn, args, username, org_name, transientData) => {
//     try {
//         logger.debug(util.format('\n============ invoke transaction on channel %s ============\n', channelName));

//         // load the network configuration
//         // const ccpPath =path.resolve(__dirname, '..', 'config', 'connection-org3.json');
//         // const ccpJSON = fs.readFileSync(ccpPath, 'utf8')
//         const ccp = await helper.getCCP(org_name) //JSON.parse(ccpJSON);

//         // Create a new file system based wallet for managing identities.
//         const walletPath = await helper.getWalletPath(org_name) //path.join(process.cwd(), 'wallet');
//         console.log("found wallet path")
//         const wallet = await Wallets.newFileSystemWallet(walletPath);
//         console.log("wallet added in FileSystem")
//         console.log(`Wallet path: ${walletPath}`);

//         // Check to see if we've already enrolled the user.
//         let identity = await wallet.get(username);
//         console.log("Identity checking")
//         if (!identity) {
//             console.log(`An identity for the user ${username} does not exist in the wallet, so registering user`);
//             await helper.getRegisteredUser(username, org_name, true)
//             identity = await wallet.get(username);
//             console.log('Run the registerUser.js application before retrying');
//             return;
//         }
//         console.log("Identity found")



//         const connectOptions = {
//             wallet, identity: username, discovery: { enabled: true, asLocalhost: false },
//             eventHandlerOptions: {
//                 commitTimeout: 100,
//                 strategy: DefaultEventHandlerStrategies.NETWORK_SCOPE_ALLFORTX
//             }
//             // transaction: {
//             //     strategy: createTransactionEventhandler()
//             // }
//         }

//         // Create a new gateway for connecting to our peer node.
//         const gateway = new Gateway();
//         await gateway.connect(ccp, connectOptions);

//         // Get the network (channel) our contract is deployed to.
//         const network = await gateway.getNetwork(channelName);

//         const contract = network.getContract(chaincodeName);

//         // let result
//         // let message;
//         // switch (fcn) {
//         //     case "CreateInvoice":
//         //         result = await contract.submitTransaction(fcn, args[0]);
//         //         // obj = JSON.stringify(JSON.parse(args[0]))
//         //         // console.log(JSON.parse(args[0]))
//         //         message = `Successfully added the Invoice Data`
//         //         break;
//         //     case "UpdateInvoice":
//         //         if (org_name == "Org3") {
//         //             return { message: "Only Organization 2 is allowed to add transactions" }
//         //         } else {
//         //             result = await contract.submitTransaction(fcn, args[0], args[1], args[2]);
//         //             // obj = JSON.stringify(JSON.parse(args[0]))
//         //             // console.log(JSON.parse(args[0]))
//         //             message = `Successfully updated the Invoice Data`
//         //             break;
//         //         }


//         //     // case ""

//         //     default:
//         //         return utils.getResponsePayload("Please send correct chaincode function name", null, false)
//         //         break;
//         // }
//         let result
//         let message;
//         if (fcn === "createOffer" 
//             // || fcn === "createPrivateCarImplicitForOrg3"
//             // || fcn == "createPrivateCarImplicitForOrg2"
//         ) {
//             result = await contract.submitTransaction(fcn, args[0], args[1], args[2], args[3], args[4], args[5], args[6] ,args[7] ,args[8]);
//             message = `Successfully added the offer asset with key ${args[0]}`

//         } else if (fcn === "changeCarOwner") {
//             result = await contract.submitTransaction(fcn, args[0], args[1]);
//             message = `Successfully changed car owner with key ${args[0]}`
//         } else if (fcn == "createPrivateCar" || fcn == "updateOffer") {
//             console.log(`Transient data is : ${transientData}`)
//             let offerData = JSON.parse(transientData)
//             console.log(`offer data is : ${JSON.stringify(offerData)}`)
//             let key = Object.keys(offerData)[0]
//             const transientDataBuffer = {}
//             transientDataBuffer[key] = Buffer.from(JSON.stringify(offerData.offer))
//             result = await contract.createTransaction(fcn)
//                 .setTransient(transientDataBuffer)
//                 .submit()
//             message = `Successfully submitted transient data`
//         }
//         else {
//             return `Invocation require either createCar or changeCarOwner as function but got ${fcn}`
//         }
//         await gateway.disconnect();

//         // result = JSON.parse(result.toString());

//         let response = {
//             message: message
//             // result
//         }

//         // let response = {
//         //     message: message,
//         //     result
//         // }

//         return response;


//     } catch (error) {

//         console.log(`Getting error: ${error}`)
//         return error.message

//     }
// }

// exports.invokeTransaction = invokeTransaction;



const { Gateway, Wallets, DefaultEventHandlerStrategies } = require('fabric-network');
const log4js = require('log4js');
const logger = log4js.getLogger('BasicNetwork');
const helper = require('./helper');

// Modified logConnectionConfig to return connection configuration
const logConnectionConfig = (config) => {
    return {
        client: config.client,
        organizations: config.organizations,
        peers: config.peers,
        certificateAuthorities: config.certificateAuthorities
    };
};

const invokeTransaction = async (channelName, chaincodeName, fcn, args, username, org_name, transientData) => {
    try {
        logger.debug(`\n============ Invoking transaction on channel: ${channelName} ============\n`);

        // Load the network configuration
        const ccp = await helper.getCCP(org_name);
        logger.debug(`Loaded network configuration for organization: ${org_name}`);

        // Get the connection configuration data
        const connectionConfig = logConnectionConfig(ccp); // Updated line
        const connectionConfigString = JSON.stringify(connectionConfig, null, 2);
        logger.debug('Connection configuration data:', JSON.stringify(connectionConfig, null, 2));

        // Get the wallet path
        const walletPath = await helper.getWalletPath(org_name);
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        logger.debug(`Wallet path found: ${walletPath}`);

        // Check if the user identity exists in the wallet
        let identity = await wallet.get(username);
        if (!identity) {
            logger.warn(`Identity for user ${username} does not exist in the wallet. Attempting to register user...`);
            await helper.getRegisteredUser(username, org_name, true);
            identity = await wallet.get(username);
            if (!identity) {
                logger.error(`Failed to register user ${username}. Please run the registerUser.js application before retrying.`);
                return;
            }
        }
        logger.debug(`Identity for user ${username} successfully found in the wallet.`);

        // Set up connection options
        const connectOptions = {
            wallet,
            identity: username,
            discovery: { enabled: true, asLocalhost: false },
            eventHandlerOptions: {
                commitTimeout: 100,
                strategy: DefaultEventHandlerStrategies.NETWORK_SCOPE_ALLFORTX
            }
        };
        logger.debug(`Connection options set up for user ${username}.`);

        // Create a new gateway for connecting to the peer node
        const gateway = new Gateway();
        await gateway.connect(ccp, connectOptions);
        logger.debug(`Gateway connected to the network.`);

        // Get the network (channel) and contract
        const network = await gateway.getNetwork(channelName);
        logger.debug(`Network (channel) ${channelName} successfully accessed.`);
        const contract = network.getContract(chaincodeName);
        logger.debug(`Contract ${chaincodeName} successfully accessed.`);

        let result;
        let message;

        // Transaction logic based on the function name
        if (fcn === "createOffer") {
            logger.debug(`Invoking function: ${fcn} with arguments: ${JSON.stringify(args)}`);

            result = await contract.submitTransaction(fcn, ...args);
            message = `Successfully added the offer asset with key ${args[0]}`;
        } else if (fcn === "updateOffer") {
            logger.debug(`Arguments received for update: ${JSON.stringify(args)}`);

            // Extract arguments
            const key = args[0]; // The key or ID of the offer
            const name = args[1]; // Name of the person
            const category = args[2]; // Category
            const position = args[3]; // Position
            const salary = args[4]; // Salary
            const status = args[5]; // Status

            // Construct the updated offer object
            const updatedOffer = {
                key:key,
                name: name,
                category: category,
                position: position,
                salary: salary,
                status: status
            };

            logger.debug(`Updating offer with key: ${key} and data: ${JSON.stringify(updatedOffer, null, 2)}`);

            // Submit the transaction with the regular arguments
            result = await contract.submitTransaction(fcn, ...args);
            message = `Successfully updated the offer with key ${key}`;
        } else {
            logger.error(`Invalid function name: ${fcn}. Please use a valid function.`);
            return `Invocation requires either createOffer, updateOffer but got ${fcn}`;
        }
        let parsedResult = null;
        if (result && result.length > 0) {
            try {
                parsedResult = JSON.parse(result.toString());
            } catch (parseError) {
                logger.error(`Failed to parse transaction result: ${parseError.message}`);
            }
        }
        // Disconnect the gateway
        await gateway.disconnect();
        logger.debug(`Gateway disconnected successfully.` + result);

        // Return response
        return {
            message,
            result: parsedResult,
            connectionConfig // Returning connection configuration as part of the response
        };
    } catch (error) {
        logger.error(`Error occurred during transaction invocation: ${JSON.stringify(error, null, 2)}`);
        return `Error: ${error.message}`;
    }
};

exports.invokeTransaction = invokeTransaction;
