import path from "path";
import fs from "fs";
import { conf_data } from "../activity/declaration";
import {
  createCipheriv, createDecipheriv,
  randomBytes, KeyObject,
  generateKeyPairSync, constants,
  publicEncrypt, privateDecrypt,
  createPublicKey, createPrivateKey,
  sign as cryptoSign, verify as cryptoVerify,
} from "crypto";


export type Party = "server" | "client";

interface HyperPackage {
  encryptedKey: string;
  iv: string;
  authTag: string;
  ciphertext: string;
  signature: string;
  signerId: string;
  signedAt: string;
  sender: Party;
  recipient: Party;
  algorithms: {
    keyExchange: "RSA-OAEP-256" | "none";
    encryption: "AES-256-GCM";
    signature: "RSA-PSS-SHA256";
  };
}

interface KeyPair {
  publicKey: KeyObject;
  privateKey: KeyObject;
  rawPublicKey: string;
  rawPrivateKey: string;
}

interface EncryptOptions {
  sender: Party;
  recipient: Party;
  senderPrivateKey: KeyObject;
  signerId?: string | undefined;
  recipientPublicKey?: KeyObject | null | undefined;
}

interface DecryptOptions {

  expectedRecipient: Party;
  senderPublicKey: KeyObject;
  recipientPrivateKey?: KeyObject | null;
  maxAgeMs?: number;
  allowExpired?: boolean;
}

interface DecryptResult {
  plaintext: Buffer;
  verified: boolean;
  sender: Party;
  recipient: Party;
  signerId?: string;
  signedAt: Date;
}


export class SignatureVerificationError extends Error {
  constructor(m: string) { super(m); this.name = "SignatureVerificationError"; }
}
export class PackageExpiredError extends Error {
  constructor(m: string) { super(m); this.name = "PackageExpiredError"; }
}
export class RecipientMismatchError extends Error {
  constructor(m: string) { super(m); this.name = "RecipientMismatchError"; }
}
export class InvalidPackageError extends Error {
  constructor(m: string) { super(m); this.name = "InvalidPackageError"; }
}


export class Realme {

  static generateRSAKeyPair(modulusLength: 2048 | 4096 = 4096): KeyPair {
    const { publicKey, privateKey } = generateKeyPairSync("rsa", {
      modulusLength,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });

    return {
      publicKey: createPublicKey(publicKey),
      privateKey: createPrivateKey(privateKey),
      rawPublicKey: publicKey,
      rawPrivateKey: privateKey
    };
  }

  static storeServerKeys(): { publicKey: string, privateKey: string } {
    const serverKeysPath: string = path.join(__dirname, "..", ".keys");
    const serverPubKeyPath: string = path.join(serverKeysPath, ".pub.pem");
    const serverPrvKeyPath: string = path.join(serverKeysPath, ".prv.pem");
    const serverKeys = Realme.generateRSAKeyPair();
    if (!fs.existsSync(serverPubKeyPath) || !fs.existsSync(serverPrvKeyPath)){
        fs.writeFileSync(serverPubKeyPath, serverKeys.rawPublicKey);
        fs.writeFileSync(serverPrvKeyPath, serverKeys.rawPrivateKey);
        return { publicKey: serverKeys.rawPublicKey, privateKey: serverKeys.rawPrivateKey };
    } else {
      const serverExistPublicKey = fs.readFileSync(serverPubKeyPath).toString();
      const serverExistPrivateKey = fs.readFileSync(serverPrvKeyPath).toString();
      return { publicKey: serverExistPublicKey, privateKey: serverExistPrivateKey };
    }
  }
  

  private static buildSignablePayload(
    pkg: Omit<HyperPackage, "signature">
  ): Buffer {
    const payload = {
      encryptedKey: pkg.encryptedKey,
      iv: pkg.iv,
      authTag: pkg.authTag,
      ciphertext: pkg.ciphertext,
      sender: pkg.sender,
      recipient: pkg.recipient,
      signerId: pkg.signerId ?? null,
      signedAt: pkg.signedAt,
      algorithms: pkg.algorithms,
    };

    return Buffer.from(JSON.stringify(payload), "utf8");
  }

  private static sign(data: Buffer, privateKey: KeyObject): Buffer {
    return cryptoSign("sha256", data, {
      key: privateKey,
      padding: constants.RSA_PKCS1_PSS_PADDING,
      saltLength: constants.RSA_PSS_SALTLEN_DIGEST,
    });
  }

  private static verify(
    data: Buffer,
    signature: Buffer,
    publicKey: KeyObject
  ): boolean {
    try {
      return cryptoVerify(
        "sha256",
        data,
        {
          key: publicKey,
          padding: constants.RSA_PKCS1_PSS_PADDING,
          saltLength: constants.RSA_PSS_SALTLEN_DIGEST,
        },
        signature
      );
    } catch {
      return false;
    }
  }

  
  
  

  static encrypt(
    plaintext: string | Buffer,
    options: EncryptOptions
  ): HyperPackage {
    const {
      sender,
      recipient,
      senderPrivateKey,
      signerId,
      recipientPublicKey = null,
    } = options;

    
    const aesKeyOriginal: Buffer = Buffer.isBuffer(conf_data.key)
      ? conf_data.key
      : Buffer.from(conf_data.key as unknown as string, "hex");

    if (aesKeyOriginal.length !== 32) {
      throw new Error(
        `AES key must be 32 bytes (AES-256), got ${aesKeyOriginal.length}`
      );
    }

    const aesKey = Buffer.from(aesKeyOriginal); 

    
    const iv = randomBytes(12);

    
    const cipher = createCipheriv("aes-256-gcm", aesKey, iv, { authTagLength: 16 });
    const data = typeof plaintext === "string"
      ? Buffer.from(plaintext, "utf8")
      : plaintext;
    const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();

    
    let encryptedKey = "";
    let keyExchange: HyperPackage["algorithms"]["keyExchange"] = "none";

    if (recipientPublicKey) {
      const encrypted = publicEncrypt(
        {
          key: recipientPublicKey,
          padding: constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: "sha256",
        },
        aesKey
      );
      encryptedKey = encrypted.toString("base64");
      keyExchange = "RSA-OAEP-256";
    }

    
    const unsignedPackage: Omit<HyperPackage, "signature"> = {
      encryptedKey,
      iv: iv.toString("base64"),
      authTag: authTag.toString("base64"),
      ciphertext: ciphertext.toString("base64"),
      sender,
      recipient,
      signerId: signerId!,
      signedAt: new Date().toISOString(),
      algorithms: {
        keyExchange,
        encryption: "AES-256-GCM",
        signature: "RSA-PSS-SHA256",
      },
    };

    
    const signablePayload = Realme.buildSignablePayload(unsignedPackage);
    const signature = Realme.sign(signablePayload, senderPrivateKey);

    
    aesKey.fill(0);

    return {
      ...unsignedPackage,
      signature: signature.toString("base64"),
    };
  }

  
  
  

  static decrypt(
    pkg: HyperPackage,
    options: DecryptOptions
  ): DecryptResult {
    const {
      expectedRecipient,
      senderPublicKey,
      recipientPrivateKey = null,
      maxAgeMs = 5 * 60 * 1000,
      allowExpired = false,
    } = options;

    
    Realme.validatePackage(pkg);

    
    if (pkg.recipient !== expectedRecipient) {
      throw new RecipientMismatchError(
        `Package is addressed to "${pkg.recipient}", but this party is "${expectedRecipient}"`
      );
    }

    
    const signedAt = new Date(pkg.signedAt);
    if (isNaN(signedAt.getTime())) {
      throw new SignatureVerificationError("Invalid signedAt timestamp");
    }
    const age = Date.now() - signedAt.getTime();
    if (age > maxAgeMs && !allowExpired) {
      throw new PackageExpiredError(
        `Package is ${Math.round(age / 1000)}s old (max: ${Math.round(maxAgeMs / 1000)}s)`
      );
    }

    
    const { signature, ...unsignedPackage } = pkg;
    const signablePayload = Realme.buildSignablePayload(unsignedPackage);
    const verified = Realme.verify(
      signablePayload,
      Buffer.from(signature, "base64"),
      senderPublicKey
    );

    if (!verified) {
      throw new SignatureVerificationError(
        "Signature verification failed — package may be tampered or signed by wrong key"
      );
    }

    
    let aesKey: Buffer;

    if (pkg.encryptedKey) {
      
      if (!recipientPrivateKey) {
        throw new Error(
          "Package contains an encrypted AES key, but no recipientPrivateKey was provided"
        );
      }

      aesKey = privateDecrypt(
        {
          key: recipientPrivateKey,
          padding: constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: "sha256",
        },
        Buffer.from(pkg.encryptedKey, "base64")
      );
    } else {
      
      const source: Buffer = Buffer.isBuffer(conf_data.key)
        ? conf_data.key
        : Buffer.from(conf_data.key as unknown as string, "hex");

      if (source.length !== 32) {
        throw new Error(`AES key must be 32 bytes, got ${source.length}`);
      }
      aesKey = Buffer.from(source); 
    }

    
    const iv = Buffer.from(pkg.iv, "base64");
    const authTag = Buffer.from(pkg.authTag, "base64");
    const ciphertext = Buffer.from(pkg.ciphertext, "base64");

    const decipher = createDecipheriv("aes-256-gcm", aesKey, iv, {
      authTagLength: 16,
    });
    decipher.setAuthTag(authTag);

    try {
      const plaintext = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);

      return {
        plaintext,
        verified: true,
        sender: pkg.sender,
        recipient: pkg.recipient,
        signerId: pkg.signerId,
        signedAt,
      };
    } finally {
      aesKey.fill(0);
    }
  }

  static decryptToString(
    pkg: HyperPackage,
    options: DecryptOptions
  ): Omit<DecryptResult, "plaintext"> & { plaintext: string } {
    const r = Realme.decrypt(pkg, options);
    return { ...r, plaintext: r.plaintext.toString("utf8") };
  }

  private static validatePackage(pkg: unknown): asserts pkg is HyperPackage {
    if (typeof pkg !== "object" || pkg === null) {
      throw new InvalidPackageError("Package must be an object");
    }
    const required = [
      "iv", "authTag", "ciphertext", "signature",
      "sender", "recipient", "signedAt", "algorithms",
    ] as const;

    for (const k of required) {
      if (!(k in pkg)) {
        throw new InvalidPackageError(`Invalid package: missing "${k}"`);
      }
    }

    const p = pkg as Record<string, unknown>;

    if (typeof p.iv !== "string" || typeof p.authTag !== "string" ||
        typeof p.ciphertext !== "string" || typeof p.signature !== "string") {
      throw new InvalidPackageError("Invalid package: crypto fields must be strings");
    }

    if (p.sender !== "server" && p.sender !== "client") {
      throw new InvalidPackageError(`Invalid sender: ${p.sender}`);
    }
    if (p.recipient !== "server" && p.recipient !== "client") {
      throw new InvalidPackageError(`Invalid recipient: ${p.recipient}`);
    }
  }

  static serialize(pkg: HyperPackage): string {
    return JSON.stringify(pkg);
  }

  static deserialize(json: string): HyperPackage {
    const parsed = JSON.parse(json);
    Realme.validatePackage(parsed);
    return parsed;
  }
}


