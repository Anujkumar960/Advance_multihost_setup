'use strict';
const { Contract } = require("fabric-contract-api");

class offerContract extends Contract {

    async initLedger(ctx) {
        console.log("Initializing the ledger");
    }

    formatTimestamp() {
        const now = new Date();
        const optionsDate = { day: 'numeric', month: 'long', year: 'numeric' };
        const formattedDate = now.toLocaleDateString('en-US', optionsDate);
        const optionsTime = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
        const formattedTime = now.toLocaleTimeString('en-US', optionsTime);
        return `${formattedDate} at ${formattedTime}`;
    }

    async createOffer(ctx, uniqueId, name, company, position, salary, email, dateOfJoining, status, expirationDate) {
        if (!uniqueId || !name || !company || !position || isNaN(salary) || !email || !dateOfJoining || !status || !expirationDate) {
            throw new Error("Invalid input data. Please check the required fields.");
        }

        const existingOfferJSON = await ctx.stub.getState(uniqueId);
        if (existingOfferJSON && existingOfferJSON.length > 0) {
            const existingOffer = JSON.parse(existingOfferJSON.toString());
            if (existingOffer.name === name &&
                existingOffer.company === company &&
                existingOffer.position === position &&
                existingOffer.salary === salary &&
                existingOffer.email === email &&
                existingOffer.dateOfJoining === dateOfJoining &&
                existingOffer.status === status &&
                existingOffer.expirationDate === expirationDate) {
                throw new Error(`An identical offer with ID ${uniqueId} already exists`);
            }
        }

        const timestamp = this.formatTimestamp();
        const offer = {
            uniqueId,
            name,
            company,
            position,
            salary: parseFloat(salary),
            email,
            dateOfJoining,
            status,
            expirationDate,
            docType: 'offer',
            organization: ctx.clientIdentity.getMSPID(),
            createdAt: timestamp,  // Set creation timestamp
            updatedAt: timestamp,  // Set updated timestamp
            updateCount: 0,        // Initialize update count
        };

        await ctx.stub.putState(uniqueId, Buffer.from(JSON.stringify(offer)));
        console.log(`Offer letter for ${name} added to ledger`);
    }

    async readOffer(ctx, uniqueId) {
        const offerAsBytes = await ctx.stub.getState(uniqueId);
        if (!offerAsBytes || offerAsBytes.length === 0) {
            throw new Error(`${uniqueId} does not exist`);
        }
        return offerAsBytes.toString();
    }

    async updateOffer(ctx, uniqueId, name, company, position, salary, status) {
        const existingOfferBytes = await ctx.stub.getState(uniqueId);
        if (!existingOfferBytes || existingOfferBytes.length === 0) {
            throw new Error(`Cannot update. Offer with uniqueId ${uniqueId} does not exist.`);
        }

        const offerData = JSON.parse(existingOfferBytes.toString());
        const offer = {
            uniqueId,
            name: name || offerData.name,
            company: company || offerData.company,
            position: position || offerData.position,
            salary: salary ? parseFloat(salary) : offerData.salary,
            status: status || offerData.status,
            docType: 'offer',
            organization: ctx.clientIdentity.getMSPID(),
            createdAt: offerData.createdAt,    // Keep original creation date
            updatedAt: this.formatTimestamp(),  // Update timestamp
            updateCount: offerData.updateCount + 1, // Increment update count
        };

        await ctx.stub.putState(uniqueId, Buffer.from(JSON.stringify(offer)));
        console.log(`Offer letter for ${name} updated in the ledger`);
    }

    async deleteOffer(ctx, uniqueId) {
        const existingOfferBytes = await ctx.stub.getState(uniqueId);
        if (!existingOfferBytes || existingOfferBytes.length === 0) {
            throw new Error(`Cannot delete. Offer with uniqueId ${uniqueId} does not exist.`);
        }

        await ctx.stub.deleteState(uniqueId);
        console.log(`Offer letter ${uniqueId} deleted from the ledger`);
    }

    async queryAllOffers(ctx) {
        const startKey = '';
        const endKey = '';
        const iterator = await ctx.stub.getStateByRange(startKey, endKey);
        const allResults = [];

        while (true) {
            const res = await iterator.next();
            if (res.done) {
                break;
            }
            const key = res.value.key;
            const value = res.value.value.toString('utf8');
            allResults.push({ Key: key, Record: JSON.parse(value) });
        }
        iterator.close();
        console.log('All offers retrieved from the ledger');
        return JSON.stringify(allResults);
    }

    async getHistoryForKey(ctx, assetID) {
        const resultIterator = await ctx.stub.getHistoryForKey(assetID);
        const results = [];

        try {
            let res = await resultIterator.next();
            while (!res.done) {
                if (res.value) {
                    const jsonRes = {
                        TxId: res.value.txId || 'unknown',
                        Timestamp: this.formatTimestamp(new Date(res.value.timestamp.seconds * 1000)), // Custom formatting if needed
                        IsDelete: res.value.is_delete ? res.value.is_delete.toString() : 'false',
                        Asset: JSON.parse(res.value.value.toString('utf8')),
                    };
                    results.push(jsonRes);
                }
                res = await resultIterator.next();
            }
        } catch (error) {
            console.error('Error while iterating through resultIterator:', error);
        } finally {
            await resultIterator.close();
        }

        return JSON.stringify(results);
    }
}

// Export the offerContract class for use in other modules
module.exports = offerContract;
