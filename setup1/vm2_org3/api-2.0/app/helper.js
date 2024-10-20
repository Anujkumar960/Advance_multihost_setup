'use strict';

var { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const FabricCAServices = require('fabric-ca-client');
const fs = require('fs');

const util = require('util');

const getCCP = async (org) => {
    let ccpPath;
    if (org == "Org3") {
        ccpPath = path.resolve(__dirname, '..', 'config', 'connection-org3.json');

    }else
        return null
    const ccpJSON = fs.readFileSync(ccpPath, 'utf8')
    const ccp = JSON.parse(ccpJSON);
    console.log('CCP structure:', ccp);

    return ccp
}

const getCaUrl = async (org, ccp) => {
    let caURL;

    // Log the ccp structure for debugging
    console.log('CCP structure:', JSON.stringify(ccp, null, 2));
    console.log('Certificate Authorities:', ccp.certificateAuthorities);

    if (!ccp || !ccp.certificateAuthorities) {
        console.error("Invalid ccp object provided.");
        throw new Error("Invalid ccp object");
    }

    // Determine the CA key based on the organization
    const caKey = org === "Org3" ? 'ca.org3.example.com' : null;
    console.log(caKey);

    // Check if the CA key is valid and exists in the certificate authorities
    if (caKey) {
        const caEntry = ccp.certificateAuthorities[caKey];
        console.log('line 44',caEntry)
        if (caEntry) {
            caURL = caEntry.url;
            if (caURL) {
                console.log(`CA URL for ${org}: ${caURL}`);
            } else {
                console.error(`URL is undefined for CA key ${caKey}.`);
                throw new Error(`URL is undefined for CA key ${caKey}.`);
            }
        } else {
            console.error(`CA key ${caKey} not found in ccp.`);
            throw new Error(`CA for ${org} not found.`);
        }
    } else {
        console.warn(`Unrecognized organization: ${org}`);
        throw new Error(`Unrecognized organization: ${org}`);
    }

    return caURL;
};



const getWalletPath = async (org) => {
    let walletPath;
    if (org == "Org3") {
        walletPath = path.join(process.cwd(), 'org3-wallet');

    } else
        return null
    return walletPath

}


const getAffiliation = async (org) => {
    return org == "Org3" ? 'org3.department1' : null
}

const getRegisteredUser = async (username, userOrg, isJson) => {
    try {
        let ccp = await getCCP(userOrg);
        console.log('CCP structure:', ccp);

        console.log('Certificate Authorities:', ccp.certificateAuthorities);
        const caURL = await getCaUrl(userOrg, ccp);
        const ca = new FabricCAServices(caURL);
        console.log("CA Details "+ca)

        const walletPath = await getWalletPath(userOrg);
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        const userIdentity = await wallet.get(username);
        if (userIdentity) {
            console.log(`An identity for the user ${username} already exists in the wallet`);
            return { success: true, message: `${username} enrolled successfully` };
        }

        // Check to see if we've already enrolled the admin user.
        let adminIdentity = await wallet.get('admin');
        if (!adminIdentity) {
            console.log('An identity for the admin user "admin" does not exist in the wallet');
            await enrollAdmin(userOrg, ccp);
            adminIdentity = await wallet.get('admin');
            console.log("Admin Enrolled Successfully");
        }

        // Build a user object for authenticating with the CA
        const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
        const adminUser = await provider.getUserContext(adminIdentity, 'admin');
        console.log("Admin Detail"+adminUser)
        console.log("userDetail"+username)
        let secret;

        try {
            if (username === "superuser") {
                // Register the superuser with specific attributes
                secret = await ca.register({ 
                    affiliation: 'org3.department1', 
                    enrollmentID: username, 
                    role: 'client', 
                    attrs: [{ name: 'role', value: 'admin', ecert: true }] 
                }, adminUser);
            } else{
                // Register a standard user
                secret = await ca.register({ 
                    affiliation: await getAffiliation(userOrg), 
                    enrollmentID: username,
                    role: 'client'
                }, adminUser);
            }
        } catch (error) {
            console.error(`Failed to register user ${username}:`, error.message);
            return { success: false, message: `Failed to register user: ${error.message}` };
        }

        let enrollment;
        try {
            if (username === "superuser") {
                enrollment = await ca.enroll({ 
                    enrollmentID: username, 
                    enrollmentSecret: secret, 
                    attr_reqs: [{ name: 'role', optional: false }] 
                });
            } else {
                enrollment = await ca.enroll({ 
                    enrollmentID: username, 
                    enrollmentSecret: secret 
                });
            }
        } catch (error) {
            console.error(`Failed to enroll user ${username}:`, error.message);
            return { success: false, message: `Failed to enroll user: ${error.message}` };
        }

        let x509Identity;
        if (userOrg === "Org3") {
            x509Identity = {
                credentials: {
                    certificate: enrollment.certificate,
                    privateKey: enrollment.key.toBytes(),
                },
                mspId: 'Org3MSP',
                type: 'X.509',
            };
        }

        await wallet.put(username, x509Identity);
        console.log(`Successfully registered and enrolled user ${username} and imported it into the wallet`);

        return { success: true, message: `${username} enrolled successfully` };
    } catch (error) {
        console.error('Error in getRegisteredUser:', error.message);
        return { success: false, message: `Error: ${error.message}` };
    }
};


const isUserRegistered = async (username, userOrg) => {
    const walletPath = await getWalletPath(userOrg)
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    console.log(`Wallet path: ${walletPath}`);

    const userIdentity = await wallet.get(username);
    if (userIdentity) {
        console.log(`An identity for the user ${username} exists in the wallet`);
        return true
    }
    return false
}


const getCaInfo = async (org, ccp) => {
    let caInfo
    if (org == "Org3") {
        caInfo = ccp.certificateAuthorities['ca.org3.example.com'];

    } else
        return null
    return caInfo

}

const enrollAdmin = async (org, ccp) => {

    console.log('calling enroll Admin method')

    try {

        const caInfo = await getCaInfo(org, ccp) //ccp.certificateAuthorities['ca.org3.example.com'];
        const caTLSCACerts = caInfo.tlsCACerts.pem;
        const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);

        // Create a new file system based wallet for managing identities.
        const walletPath = await getWalletPath(org) //path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check to see if we've already enrolled the admin user.
        const identity = await wallet.get('admin');
        if (identity) {
            console.log('An identity for the admin user "admin" already exists in the wallet');
            return;
        }

        // Enroll the admin user, and import the new identity into the wallet.
        const enrollment = await ca.enroll({ enrollmentID: 'admin', enrollmentSecret: 'adminpw' });
        let x509Identity;
        if (org == "Org3") {
            x509Identity = {
                credentials: {
                    certificate: enrollment.certificate,
                    privateKey: enrollment.key.toBytes(),
                },
                mspId: 'Org3MSP',
                type: 'X.509',
            };
        }
        await wallet.put('admin', x509Identity);
        console.log('Successfully enrolled admin user "admin" and imported it into the wallet');
        return
    } catch (error) {
        console.error(`Failed to enroll admin user "admin": ${error}`);
    }
}

const registerAndGerSecret = async (username, userOrg) => {
    let ccp = await getCCP(userOrg)

    const caURL = await getCaUrl(userOrg, ccp)
    const ca = new FabricCAServices(caURL);

    const walletPath = await getWalletPath(userOrg)
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    console.log(`Wallet path: ${walletPath}`);

    const userIdentity = await wallet.get(username);
    if (userIdentity) {
        console.log(`An identity for the user ${username} already exists in the wallet`);
        var response = {
            success: true,
            message: username + ' enrolled Successfully',
        };
        return response
    }

    // Check to see if we've already enrolled the admin user.
    let adminIdentity = await wallet.get('admin');
    if (!adminIdentity) {
        console.log('An identity for the admin user "admin" does not exist in the wallet');
        await enrollAdmin(userOrg, ccp);
        adminIdentity = await wallet.get('admin');
        console.log("Admin Enrolled Successfully")
    }

    // build a user object for authenticating with the CA
    const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
    const adminUser = await provider.getUserContext(adminIdentity, 'admin');
    let secret;
    try {
        // Register the user, enroll the user, and import the new identity into the wallet.
        secret = await ca.register({ affiliation: await getAffiliation(userOrg), enrollmentID: username, role: 'client' }, adminUser);
        // const secret = await ca.register({ affiliation: 'org3.department1', enrollmentID: username, role: 'client', attrs: [{ name: 'role', value: 'approver', ecert: true }] }, adminUser);

    } catch (error) {
        return error.message
    }

    var response = {
        success: true,
        message: username + ' enrolled Successfully',
        secret: secret
    };
    return response

}

exports.getRegisteredUser = getRegisteredUser

module.exports = {
    getCCP: getCCP,
    getWalletPath: getWalletPath,
    getRegisteredUser: getRegisteredUser,
    isUserRegistered: isUserRegistered,
    registerAndGerSecret: registerAndGerSecret

}
