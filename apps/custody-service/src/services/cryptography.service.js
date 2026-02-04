"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var CryptographyService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CryptographyService = void 0;
const common_1 = require("@nestjs/common");
const crypto = __importStar(require("crypto"));
let CryptographyService = CryptographyService_1 = class CryptographyService {
    logger = new common_1.Logger(CryptographyService_1.name);
    /**
     * Generate a digital signature for custody transfer data
     */
    generateDigitalSignature(data, privateKey) {
        try {
            // Create canonical string representation of the data
            const canonicalData = this.createCanonicalString(data);
            if (privateKey) {
                // Use provided private key for signing
                const sign = crypto.createSign('SHA256');
                sign.update(canonicalData);
                return sign.sign(privateKey, 'hex');
            }
            else {
                // Fallback to HMAC-based signature (for demo purposes)
                const secret = process.env.CUSTODY_SIGNATURE_SECRET || 'default-secret-key';
                return crypto.createHmac('sha256', secret).update(canonicalData).digest('hex');
            }
        }
        catch (error) {
            this.logger.error('Failed to generate digital signature', error);
            throw new Error('Failed to generate digital signature');
        }
    }
    /**
     * Verify a digital signature
     */
    verifyDigitalSignature(data, signature, publicKey) {
        try {
            const canonicalData = this.createCanonicalString(data);
            if (publicKey) {
                // Use provided public key for verification
                const verify = crypto.createVerify('SHA256');
                verify.update(canonicalData);
                return verify.verify(publicKey, signature, 'hex');
            }
            else {
                // Fallback to HMAC-based verification
                const secret = process.env.CUSTODY_SIGNATURE_SECRET || 'default-secret-key';
                const expectedSignature = crypto.createHmac('sha256', secret).update(canonicalData).digest('hex');
                return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'));
            }
        }
        catch (error) {
            this.logger.error('Failed to verify digital signature', error);
            return false;
        }
    }
    /**
     * Calculate hash for a custody record
     */
    calculateRecordHash(record) {
        try {
            const data = {
                parcelId: record.parcelId,
                fromParty: record.fromParty,
                toParty: record.toParty,
                timestamp: record.timestamp.toISOString(),
                location: record.location,
                metadata: record.metadata,
            };
            const canonicalData = this.createCanonicalString(data);
            return crypto.createHash('sha256').update(canonicalData).digest('hex');
        }
        catch (error) {
            this.logger.error('Failed to calculate record hash', error);
            throw new Error('Failed to calculate record hash');
        }
    }
    /**
     * Calculate hash for an entire custody chain
     */
    calculateChainHash(records) {
        try {
            if (records.length === 0) {
                return crypto.createHash('sha256').update('empty-chain').digest('hex');
            }
            // Sort records by timestamp to ensure consistent ordering
            const sortedRecords = [...records].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
            // Create chain data by concatenating record hashes
            const chainData = sortedRecords
                .map(record => this.calculateRecordHash(record))
                .join('|');
            return crypto.createHash('sha256').update(chainData).digest('hex');
        }
        catch (error) {
            this.logger.error('Failed to calculate chain hash', error);
            throw new Error('Failed to calculate chain hash');
        }
    }
    /**
     * Verify the integrity of a custody chain
     */
    verifyChainIntegrity(records) {
        const errors = [];
        try {
            if (records.length === 0) {
                return { valid: true, errors: [] };
            }
            // Sort records by timestamp
            const sortedRecords = [...records].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
            // Check chronological order
            for (let i = 1; i < sortedRecords.length; i++) {
                if (sortedRecords[i].timestamp <= sortedRecords[i - 1].timestamp) {
                    errors.push(`Record ${i} timestamp is not after previous record`);
                }
            }
            // Check custody chain continuity
            for (let i = 1; i < sortedRecords.length; i++) {
                if (sortedRecords[i].fromParty !== sortedRecords[i - 1].toParty) {
                    errors.push(`Custody chain break between records ${i - 1} and ${i}: ${sortedRecords[i - 1].toParty} -> ${sortedRecords[i].fromParty}`);
                }
            }
            // Verify digital signatures
            for (let i = 0; i < sortedRecords.length; i++) {
                const record = sortedRecords[i];
                const signatureData = {
                    parcelId: record.parcelId,
                    fromParty: record.fromParty,
                    toParty: record.toParty,
                    timestamp: record.timestamp.toISOString(),
                    location: record.location,
                    metadata: record.metadata,
                };
                if (!this.verifyDigitalSignature(signatureData, record.digitalSignature)) {
                    errors.push(`Invalid digital signature for record ${i}`);
                }
            }
            // Check for duplicate records
            const recordHashes = new Set();
            for (let i = 0; i < sortedRecords.length; i++) {
                const hash = this.calculateRecordHash(sortedRecords[i]);
                if (recordHashes.has(hash)) {
                    errors.push(`Duplicate record detected at position ${i}`);
                }
                recordHashes.add(hash);
            }
            return {
                valid: errors.length === 0,
                errors,
            };
        }
        catch (error) {
            this.logger.error('Failed to verify chain integrity', error);
            return {
                valid: false,
                errors: [`Verification failed: ${error.message}`],
            };
        }
    }
    /**
     * Generate a unique record ID based on custody transfer data
     */
    generateRecordId(transfer, timestamp) {
        try {
            const data = `${transfer.parcelId}-${transfer.fromParty}-${transfer.toParty}-${timestamp.toISOString()}`;
            return crypto.createHash('sha256').update(data).digest('hex');
        }
        catch (error) {
            this.logger.error('Failed to generate record ID', error);
            throw new Error('Failed to generate record ID');
        }
    }
    /**
     * Create a canonical string representation of signature data
     */
    createCanonicalString(data) {
        // Create a deterministic string representation
        const canonical = {
            parcelId: data.parcelId,
            fromParty: data.fromParty,
            toParty: data.toParty,
            timestamp: data.timestamp,
            location: {
                latitude: Number(data.location.latitude.toFixed(6)), // Normalize precision
                longitude: Number(data.location.longitude.toFixed(6)),
            },
            metadata: data.metadata ? this.sortObjectKeys(data.metadata) : undefined,
        };
        return JSON.stringify(canonical);
    }
    /**
     * Recursively sort object keys for deterministic serialization
     */
    sortObjectKeys(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        if (Array.isArray(obj)) {
            return obj.map(item => this.sortObjectKeys(item));
        }
        const sortedObj = {};
        Object.keys(obj)
            .sort()
            .forEach(key => {
            sortedObj[key] = this.sortObjectKeys(obj[key]);
        });
        return sortedObj;
    }
};
exports.CryptographyService = CryptographyService;
exports.CryptographyService = CryptographyService = CryptographyService_1 = __decorate([
    (0, common_1.Injectable)()
], CryptographyService);
//# sourceMappingURL=cryptography.service.js.map