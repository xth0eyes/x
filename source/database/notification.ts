import { customAlphabet } from "nanoid";
import { Bot } from "grammy";
import path from "path";

export interface GreatNotification {
    title: string;
    body: string;
    url: string;
    small_icon_path?: string;
    big_icon_path?: string;
    big_picture_path?: string;
    sound: "default" | "bubble" | "mio";
    click_action: "OPEN_URL";
    message_id: number;
    client_id: string;
    at: number;
}

class Notification {
    notifs: Map<string, GreatNotification> = new Map<string, GreatNotification>();

    async createNotification(config: Omit<GreatNotification, "at">){
        const notif_id = customAlphabet("abcdefghijklmnopqrstuvwxyz1234567890")(10);
        this.notifs.set(notif_id, { ...config, at: Date.now() });
        return { status: true, notif_id };
    }

    async updateNotification(notif_id: string, config: Partial<Omit<GreatNotification, "at" | "message_id" | "client_id">>){
        if (this.notifs.has(notif_id)){
            const notif = this.notifs.get(notif_id)!;
            notif.at = Date.now();
            const updated_notif = { ...notif, ...config };
            this.notifs.set(notif_id, updated_notif);
            return { status: true };
        } else {
            return { status: false, message: "notification session did not find" };
        }
    }

    async deleteNotification(notif_id: string){
        if (this.notifs.has(notif_id)) this.notifs.delete(notif_id);
        return { status: true };
    }

    async createText(config: Partial<Omit<GreatNotification, "at" | "message_id" | "client_id">>, createFontObject: (text: string) => string): Promise<string> {
        return createFontObject(`
🔹 title • `) + config.title + createFontObject(`\n\n📋 body • `) + config.body + createFontObject(`\n
🔗 url • `) + config.url + createFontObject(`\n\n🍃 click action • `) + config.click_action + createFontObject(`\n
🔊 sound • `) + config.sound + createFontObject(`\n\n📷 big icon • `) + path.basename(config.big_icon_path ?? "bigi.png - pre") + createFontObject(`\n
❄️ small icon • `) + path.basename(config.small_icon_path ?? "smalli.png - pre") + createFontObject(`\n\n🎥 big picture • `) + path.basename(config.big_picture_path ?? "bigp.png - pre");
    }

    isThere(notif_id: string){
        if (this.notifs.has(notif_id)){
            return { status: true, notification: this.notifs.get(notif_id)! };
        } else {
            return { status: false };
        }
    }

    async watch(bot: Bot, chat_id: number, createFontObject: (text: string) => string){
        setInterval(async () => {
            for (let [key, notif_config] of this.notifs.entries()){
                if ((notif_config.at + 900000) < Date.now()){
                    this.notifs.delete(key);
                    await bot.api.deleteMessage(chat_id, notif_config.message_id);
                    await bot.api.sendMessage(
                        chat_id,
                        createFontObject(`🌀 notification panel `) + `[ <code>${key}</code> ]` + createFontObject(`has closed - 15 minutes required`),
                        { parse_mode: "HTML" }
                    );
                }
            }
        }, 30000);
    }
}


export const notification = new Notification();