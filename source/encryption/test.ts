import { Realme } from "./enc";
import { conf_data } from "../activity/declaration";
import { createPublicKey, createPrivateKey, KeyObject } from "crypto";
import path from "path";
import fs from "fs";

const keysPath = path.join(__dirname, "..", ".keys");
const pubkey = path.join(keysPath, ".pub.pem");
const prvkey = path.join(keysPath, ".prv.pem");

let serverKeys = Realme.generateRSAKeyPair(4096);

if (!fs.existsSync(pubkey) || !fs.existsSync(prvkey)){
    fs.writeFileSync(pubkey, serverKeys.rawPublicKey);
    fs.writeFileSync(prvkey, serverKeys.rawPrivateKey);
} else {
    Object.defineProperties(serverKeys, {
        publicKey: {
            value: createPublicKey(
                fs.readFileSync(pubkey).toString()
            ),
            enumerable: true,
            configurable: true,
            writable: true
        },
        privateKey: {
            value: createPrivateKey(
                fs.readFileSync(prvkey).toString()
            ),
            enumerable: true,
            configurable: true,
            writable: true
        }
    });
}

// ═══════════════════════════════════════════════════════════
//  Server Setup (یک بار در startup)
// ═══════════════════════════════════════════════════════════

// سرور کلید امضای خودش را دارد


// کلید عمومی کلاینت (باید از قبل تبادل شده باشد)
// ═══════════════════════════════════════════════════════════
//  📤 سناریو ۱: سرور → کلاینت
// ═══════════════════════════════════════════════════════════

export function serverSendToClient(payload: object, clientpubkey: KeyObject): string {
  console.log("📤 [Server] Encrypting + signing for client...");

  const message = JSON.stringify({
    ...payload,
    timestamp: new Date().toISOString(),
  });

  const pkg = Realme.encrypt(message, {
    sender: "server",
    recipient: "client",
    senderPrivateKey: serverKeys.privateKey,
    signerId: "api-server-01",
    recipientPublicKey: clientpubkey
  });

  const wire = Realme.serialize(pkg);
  console.log(`✅ [Server] Package ready (${wire.length} bytes)\n`);
  return wire;
}

// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════

function clientReceiveFromServer(
    wire: string,
    serverPublicKey: KeyObject,
    clientPrivateKey: KeyObject
): unknown {

    console.log("📥 [Client] Verifying + decrypting from server...");

    const pkg = Realme.deserialize(wire);

    const result = Realme.decryptToString(pkg, {
        expectedRecipient: "client",
        recipientPrivateKey: clientPrivateKey,
        senderPublicKey: serverPublicKey,
        maxAgeMs: 5 * 60 * 1000,
    });

    console.log(`✅ [Client] Signature verified: ${result.verified}`);
    console.log(`👤 [Client] Signed by: ${result.sender} (${result.signerId})`);
    console.log(`🕐 [Client] Signed at: ${result.signedAt.toISOString()}`);

    return JSON.parse(result.plaintext);
}

// ═══════════════════════════════════════════════════════════
//  Demo
// ═══════════════════════════════════════════════════════════


// import { customAlphabet } from "nanoid";

// console.log(customAlphabet("qwer+tyuiopas+dfghjklzxc+vbnm1234567890+")(16));

const client_keys = Realme.generateRSAKeyPair();

let t = serverSendToClient({ method: "c" }, client_keys.publicKey);

console.log("server send to client", t);
console.log("\n\n");

// console.log(client_keys.rawPrivateKey);
// console.log();
// console.log(client_keys.rawPublicKey);

let x = clientReceiveFromServer(t, serverKeys.publicKey, client_keys.privateKey);

console.log("clientReceiveFromServer", x);

