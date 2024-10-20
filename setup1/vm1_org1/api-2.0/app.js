'use strict';
const log4js = require('log4js');
const logger = log4js.getLogger('BasicNetwork');
const bodyParser = require('body-parser');
const http = require('http')
const util = require('util');
const express = require('express')
const app = express();
const expressJWT = require('express-jwt');
const jwt = require('jsonwebtoken');
const bearerToken = require('express-bearer-token');
const cors = require('cors');
const constants = require('./config/constants.json')

const host = process.env.HOST || constants.host;
const port = process.env.PORT || constants.port;


const helper = require('./app/helper')
const invoke = require('./app/invoke')
const qscc = require('./app/qscc')
const query = require('./app/query')

app.options('*', cors());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));
// set secret variable
app.set('secret', 'thisismysecret');
app.use(expressJWT({
    secret: 'thisismysecret'
}).unless({
    path: ['/users','/users/login', '/register']
}));
app.use(bearerToken());

logger.level = 'debug';


app.use((req, res, next) => {
    // Log the incoming request's URL for debugging purposes
    logger.debug('New request for %s', req.originalUrl);

    // List of routes that do not require authentication
    const publicRoutes = ['/users', '/users/login', '/register'];

    // Check if the request URL matches any public route
    // If it does, skip the authentication process and move to the next middleware
    if (publicRoutes.some(route => req.originalUrl.startsWith(route))) {
        return next();
    }

    // Extract the token from the request
    const token = req.token;

    // Verify the JWT token using the secret stored in the app configuration
    jwt.verify(token, app.get('secret'), (err, decoded) => {
        if (err) {
            // If token verification fails, log the error
            logger.error(`Token verification failed: ${err}`);
            // Respond with a 401 Unauthorized status and an error message
            return res.status(401).send({
                success: false,
                message: 'Failed to authenticate token. Include the token returned from /users in the authorization header as a Bearer token.'
            });
        }

        // If the token is valid, attach user information to the request object
        req.username = decoded.username; // Extract username from the decoded token
        req.orgname = decoded.orgName;   // Extract organization name from the decoded token
        logger.debug(`Decoded JWT: username - ${decoded.username}, orgname - ${decoded.orgName}`);

        // Call the next middleware or route handler in the stack
        return next();
    });
});


var server = http.createServer(app).listen(port, function () { console.log(`Server started on ${port}`) });
logger.info('****************** SERVER STARTED ************************');
logger.info('***************  http://%s:%s  ******************', host, port);
server.timeout = 240000;

function getErrorMessage(field) {
    var response = {
        success: false,
        message: field + ' field is missing or Invalid in the request'
    };
    return response;
}

// Register and enroll user
app.post('/users', async function (req, res) {
    // Extract username and organization name from the request body
    const username = req.body.username;
    const orgName = req.body.orgName;

    // Log the endpoint and received values for debugging
    logger.debug('Endpoint: /users');
    logger.debug('Username: %s', username);
    logger.debug('Organization Name: %s', orgName);

    // Validate input: Check if username and orgName are provided
    if (!username) {
        return res.json(getErrorMessage('\'username\' is required.'));
    }
    if (!orgName) {
        return res.json(getErrorMessage('\'orgName\' is required.'));
    }

    logger.debug("Generating JWT token...");
    
    // Generate a JWT token with expiration time and user info
    const token = jwt.sign({
        exp: Math.floor(Date.now() / 1000) + parseInt(constants.jwt_expiretime), // Set expiration
        username: username,
        orgName: orgName
    }, app.get('secret'));

    logger.debug('Generated Token: %s', token);
    
    // Register the user and get the response
    const response =await helper.getRegisteredUser(username, orgName, true);

    logger.debug('Returned from registering username %s for organization %s', username, orgName);

    // Check the response and send appropriate JSON response
    if (response && typeof response !== 'string') {
        logger.debug('Successfully registered username %s for organization %s', username, orgName);
        response.token = token; // Attach token to the response
        return res.json(response); // Send success response
    } else {
        logger.debug('Failed to register username %s for organization %s. Reason: %s', username, orgName, response);
        return res.json({ success: false, message: response }); // Send error response
    }
});


// Register and enroll user
app.post('/register', async function (req, res) {
    // Extract username and organization name from the request body
    const username = req.body.username;
    const orgName = req.body.orgName;

    // Log the endpoint and received values for debugging
    logger.debug('Endpoint: /register');
    logger.debug('Username: %s', username);
    logger.debug('Organization Name: %s', orgName);

    // Validate input: Check if username and orgName are provided
    if (!username) {
        return res.json(getErrorMessage('\'username\' is required.'));
    }
    if (!orgName) {
        return res.json(getErrorMessage('\'orgName\' is required.'));
    }

    // Generate a JWT token with expiration time and user info
    const token = jwt.sign({
        exp: Math.floor(Date.now() / 1000) + parseInt(constants.jwt_expiretime), // Set expiration time
        username: username,
        orgName: orgName
    }, app.get('secret'));

    logger.debug('Generated Token: %s', token);

    // Register the user and get the response
    let response = await helper.registerAndGerSecret(username, orgName);

    logger.debug('Returned from registering username %s for organization %s', username, orgName);

    // Check the response and send appropriate JSON response
    if (response && typeof response !== 'string') {
        logger.debug('Successfully registered username %s for organization %s', username, orgName);
        response.token = token; // Attach token to the response
        return res.json(response); // Send success response
    } else {
        logger.debug('Failed to register username %s for organization %s. Reason: %s', username, orgName, response);
        return res.json({ success: false, message: response }); // Send error response
    }
});


// Login and get jwt
app.post('/users/login', async function (req, res) {
    // Extract username and organization name from the request body
    const username = req.body.username;
    const orgName = req.body.orgName;

    // Log the endpoint and received values for debugging
    logger.debug('Endpoint: /users/login');
    logger.debug('Username: %s', username);
    logger.debug('Organization Name: %s', orgName);

    // Validate input: Check if username and orgName are provided
    if (!username) {
        return res.json(getErrorMessage('\'username\' is required.'));
    }
    if (!orgName) {
        return res.json(getErrorMessage('\'orgName\' is required.'));
    }

    // Generate a JWT token with expiration time and user info
    const token = jwt.sign({
        exp: Math.floor(Date.now() / 1000) + parseInt(constants.jwt_expiretime), // Set expiration time
        username: username,
        orgName: orgName
    }, app.get('secret'));

    // Check if the user is registered
    let isUserRegistered = await helper.isUserRegistered(username, orgName);

    // Send appropriate response based on user registration status
    if (isUserRegistered) {
        logger.debug('User %s is registered with organization %s. Sending token.', username, orgName);
        return res.json({ success: true, message: { token: token } }); // Send success response with token
    } else {
        logger.debug('User %s is not registered with organization %s. Prompting for registration.', username, orgName);
        return res.json({ 
            success: false, 
            message: `User with username ${username} is not registered with ${orgName}. Please register first.` 
        }); // Send error response
    }
});



// Invoke transaction on chaincode on target peers
app.post('/channels/:channelName/chaincodes/:chaincodeName', async function (req, res) {
    try {
        logger.debug('==================== INVOKE ON CHAINCODE ==================');
        
        // Extract parameters and body content
        const peers = req.body.peers;
        const chaincodeName = req.params.chaincodeName;
        const channelName = req.params.channelName;
        const fcn = req.body.fcn;
        const args = req.body.args;
        const transient = req.body.transient;

        // Log the extracted values for debugging
        logger.debug('Channel Name: %s', channelName);
        logger.debug('Chaincode Name: %s', chaincodeName);
        logger.debug('Function: %s', fcn);
        logger.debug('Arguments: %j', args); // Use %j for JSON.stringify output
        logger.debug('Transient Data: %j', transient);

        // Validate required fields
        if (!chaincodeName) {
            return res.json(getErrorMessage('\'chaincodeName\' is required.'));
        }
        if (!channelName) {
            return res.json(getErrorMessage('\'channelName\' is required.'));
        }
        if (!fcn) {
            return res.json(getErrorMessage('\'fcn\' is required.'));
        }
        if (!args) {
            return res.json(getErrorMessage('\'args\' is required.'));
        }

        // Invoke the chaincode transaction
        let message = await invoke.invokeTransaction(channelName, chaincodeName, fcn, args, req.username, req.orgname, transient);
        logger.debug('Transaction result: %j', message);

        // Prepare and send the response payload
        const responsePayload = {
            result: message,
            error: null,
            errorData: null
        };
        return res.send(responsePayload);

    } catch (error) {
        // Handle errors and prepare the response payload
        logger.error('Error invoking chaincode: %s', error.message);
        const responsePayload = {
            result: null,
            error: error.name,
            errorData: error.message
        };
        return res.send(responsePayload);
    }
});


app.get('/channels/:channelName/chaincodes/:chaincodeName', async function (req, res) {
    try {
        logger.debug('==================== QUERY BY CHAINCODE ==================');

        // Extract parameters from the request
        const channelName = req.params.channelName;
        const chaincodeName = req.params.chaincodeName;
        let fcn = req.query.fcn;
        let args;
        if(fcn!=="queryAllOffers"){
            args = req.query.args;
        }
        const peer = req.query.peer; // Note: peer is extracted but not used, consider its necessity

        // Log the extracted values for debugging
        logger.debug('Channel Name: %s', channelName);
        logger.debug('Chaincode Name: %s', chaincodeName);
        logger.debug('Function: %s', fcn);
        if(fcn!=="queryAllOffers"){
        logger.debug('Arguments: %s', args);
        }

        // Validate required fields
        if (!chaincodeName) {
            return res.json(getErrorMessage('\'chaincodeName\' is required.'));
        }
        if (!channelName) {
            return res.json(getErrorMessage('\'channelName\' is required.'));
        }
        if (!fcn) {
            return res.json(getErrorMessage('\'fcn\' is required.'));
        }
        if (fcn !== "queryAllOffers" && !args) {
            return res.json(getErrorMessage('\'args\' is required.'));
        }

        // // Prepare arguments for the query
        // logger.debug('Raw args received: %s', args);
        // const formattedArgs = args.replace(/'/g, '"'); // Replace single quotes with double quotes
        // const parsedArgs = JSON.parse(formattedArgs); // Parse the JSON string into an object
        // logger.debug('Parsed args: %j', parsedArgs);

        // Conditional argument validation
        let parsedArgs = [];
        if (fcn !== "queryAllOffers") {
            if (!args) {
                return res.json(getErrorMessage('\'args\' is required.'));
            }

            // Prepare arguments for the query
            logger.debug('Raw args received: %s', args);
            const formattedArgs = args.replace(/'/g, '"'); // Replace single quotes with double quotes
            parsedArgs = JSON.parse(formattedArgs); // Parse the JSON string into an object
            logger.debug('Parsed args: %j', parsedArgs);
        }

        // Query the chaincode
        let message = await query.query(channelName, chaincodeName, parsedArgs, fcn, req.username, req.orgname);

        // Prepare and send the response payload
        const responsePayload = {
            result: message,
            error: null,
            errorData: null
        };
        return res.send(responsePayload);

    } catch (error) {
        // Handle errors and prepare the response payload
        logger.error('Error querying chaincode: %s', error.message);
        const responsePayload = {
            result: null,
            error: error.name,
            errorData: error.message
        };
        return res.send(responsePayload);
    }
});


app.get('/qscc/channels/:channelName/chaincodes/:chaincodeName', async function (req, res) {
    try {
        logger.debug('==================== QUERY BY CHAINCODE ==================');

        // Extract parameters from the request
        const channelName = req.params.channelName;
        const chaincodeName = req.params.chaincodeName;
        const args = req.query.args;
        const fcn = req.query.fcn;

        // Log the extracted values for debugging
        logger.debug('Channel Name: %s', channelName);
        logger.debug('Chaincode Name: %s', chaincodeName);
        logger.debug('Function: %s', fcn);
        logger.debug('Arguments: %s', args);

        // Validate required fields
        if (!chaincodeName) {
            return res.json(getErrorMessage('\'chaincodeName\' is required.'));
        }
        if (!channelName) {
            return res.json(getErrorMessage('\'channelName\' is required.'));
        }
        if (!fcn) {
            return res.json(getErrorMessage('\'fcn\' is required.'));
        }
        if (!args) {
            return res.json(getErrorMessage('\'args\' is required.'));
        }

        // Prepare and parse the arguments
        logger.debug('Raw args received: %s', args);
        const formattedArgs = args.replace(/'/g, '"'); // Replace single quotes with double quotes
        const parsedArgs = JSON.parse(formattedArgs); // Parse the JSON string into an object
        logger.debug('Parsed args: %j', parsedArgs);

        // Query the chaincode using the QSCC function
        let responsePayload = await qscc.qscc(channelName, chaincodeName, parsedArgs, fcn, req.username, req.orgname);

        // Send the response payload
        return res.send(responsePayload);

    } catch (error) {
        // Handle errors and prepare the response payload
        logger.error('Error querying chaincode: %s', error.message);
        const responsePayload = {
            result: null,
            error: error.name,
            errorData: error.message
        };
        return res.send(responsePayload);
    }
});
