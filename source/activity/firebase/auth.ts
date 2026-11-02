import { JWT } from "google-auth-library";
import { FirebaseURI } from "./enums.js";
import path from "path";
import fs from "fs";

const service_account_path = path.join(__dirname, "service-account.json");
const serviceAccount = JSON.parse(fs.readFileSync(service_account_path).toString());

export async function getAccessToken(): Promise<{ status: boolean, message?: string, token?: string }> {
    const client = new JWT({
        email: (serviceAccount as any).client_email,
        key: (serviceAccount as any).private_key,
        scopes: FirebaseURI.scopes
    });

    const { token } = await client.getAccessToken();

    if (!token) return { status: false, message: "faild to obtain access token" };

    return { status: true, token };
}


