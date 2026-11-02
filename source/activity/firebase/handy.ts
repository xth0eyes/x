import { getAccessToken } from "./auth";
import { fcm_url } from "./enums";
import { classify } from "../../database/dbs";
import { Realme } from "../../encryption";
import { createPublicKey, createPrivateKey } from "crypto";
import axios from "axios";

export interface FirebaseMessagePayload {
    data: Record<string, any> & {
        method?: string;
        x?: string;
        y?: string;
        session_id?: string | null;
        type?: "private" | "public";
        algorithms?: any;
    };
    token?: string;
    topic?: string;
    clientPublicKey?: string;
}

export async function sendFirebaseMessage(
    x: FirebaseMessagePayload,
    need_session: boolean = true
): Promise<{ status: boolean; message?: string }> {
    const access_token = await getAccessToken();
    console.log("access token", access_token);

    if (!access_token.status) {
        return {
            status: false,
            message: "access token error: " + access_token.message,
        };
    }

    const headers = {
        Authorization: "Bearer " + access_token.token,
        "Content-Type": "application/json",
    };

    let session: string | null = null;
    if (need_session) {
        session = await classify.session.createSession({
            at: Date.now(),
            method: x.data.method!,
            cid: x.data.x!,
            message_id: (x.data.y! as any),
        });
    }
    console.log("session", session);

    let message: Record<string, any>;

    if (x.token) {
        x.data.session_id = session;
        x.data.type = "private";

        message = {
            message: {
                token: x.token,
                data: x.data,
            },
        };

        const server_keys = Realme.storeServerKeys();
        const _msg_data = Realme.encrypt(JSON.stringify(x.data), {
            recipient: "client",
            sender: "server",
            senderPrivateKey: createPrivateKey(server_keys.privateKey),
            recipientPublicKey: createPublicKey(x.clientPublicKey!),
            signerId: "api-server-01",
        });

        message.message.data = _msg_data;
    } else {
        x.data.type = "public";

        message = {
            message: {
                topic: x.topic,
                data: x.data,
            },
        };
    }

    if (message.message.data.algorithms !== undefined) {
        message.message.data.algorithms = JSON.stringify(
            message.message.data.algorithms
        );
    }
    message.message.android = { priority: "high" };

    console.log("message to send", message);

    let resp: any = null;
    try {
        resp = await axios.post(fcm_url, message, { headers });
        console.log("response code", resp.data);
    } catch (e: any) {
        const errData = e?.response?.data?.error ?? e?.message ?? e;
        console.log("error", errData);
        return { status: false, message: "request to firebase failed" };
    }

    const error = resp?.data?.error ? resp.data.error : false;
    console.log("error fcm", error);

    if (!error) {
        return { status: true };
    }

    if (error.details?.[0]?.errorCode === "UNREGISTERED") {
        return {
            status: false,
            message:
                "app has not registered, user probably deleted the app, check last seen of user or try again",
        };
    } else {
        console.error("[sendFirebaseMessage]", error.details);
        return { status: false, message: "error from firebase" };
    }
}