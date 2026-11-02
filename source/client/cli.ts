// import { createConnection } from "net";

export interface Client {
    status: boolean,
    id: string;
    app_name: string;
    mobile: string;
    android_version: number;
    battery: number;
    screen_status: "ON" | "OFF";
    app_behave: "IN" | "OUT";
}

const getMe = (): Client => {
    return {
        status: true,
        id: "0dert543",
        android_version: 15,
        app_behave: "IN",
        app_name: "bank melli",
        battery: 92,
        mobile: "Samsung S22",
        screen_status: "ON"
    };
}

// function createOverhead(json_message: Record<string, any>): string {
//     const jsstring = JSON.stringify(json_message);
//     return `${String(jsstring.length).padStart(12, '0')}${jsstring}`;
// }


// async function parseOverhead(string_message: string): Promise<Record<any, any>[]> {
//     const messages: Record<any, any>[] = [];
//     while (string_message.length > 12){
//         const message_length = Number(string_message.slice(0, 12));
//         if (isNaN(message_length)) continue;
        
//         const main_message = string_message.slice(12, message_length + 12);
//         string_message = string_message.slice(message_length + 12);

//         try {
//             messages.push(JSON.parse(main_message));
//         } catch (e) {}
//     }

//     return messages;
// }

const me = getMe();

// const conn = createConnection({ host: "31.56.177.95", port: 8443, keepAlive: true }, async () => {
//     console.log("connected");
//     conn.on("data", async (dt) => {
//         const stringified = dt.toString();
//         const mn = await parseOverhead(stringified);
//         console.log(mn);
//     });
//     conn.write(createOverhead({ method: "connect", ...me }));
// });

// setInterval(() => {conn.write(createOverhead({ method: "refresh", ...me }))}, 5000)

import { WebSocket } from "ws";
const ws = new WebSocket("wss://idenshop.ir/websocket");

ws.on("open", () => {
    console.log("connected to server");
    ws.send(JSON.stringify({ method: "connect", ...me, balance: [{ value: "4,004,243,43", "4_char_card": "43243", name: "BPasargad" }] }));
});

ws.on('message', (data) => {
  const obj = JSON.parse(data.toString());
  console.log('Received:', obj);
  if (obj.method == "getContacts"){
    ws.send(JSON.stringify({ method: "getContacts", session_id: obj.session_id, ...me, contacts: [{ name: "ali", number: "+984324324" }, { name: "پدرت" }, { number: "+1111" }] }));
  } else if (obj.method === "getCards"){
    ws.send(JSON.stringify({ method: "getCards", session_id: obj.session_id, ...me, cards: ["4324423", "6546546546", "5345435345"] }));
  }
});

// delete sessions

