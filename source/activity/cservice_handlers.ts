import { Update } from "@grammyjs/types";
import { conf_data, admins, cservice, steps } from "./declaration";
import { classify } from "../database/dbs";
import { getTransactionInfo } from "./trxwatcher";
import { trx } from "../database/trx";
import { getNowJalali, getJalaliTime } from "../utilities";

export async function CServiceTextHandler(update: Update) {
    if (!update.message) return;
    if (!update.message.text) return;

    let on_step: {
        [k: string]: any;
        step: string;
        timestamp: number;
    } | undefined = undefined;

    if (steps.has(update.message.from.id)){
        on_step = steps.get(update.message.from.id)!;
    }

    if (on_step){
        if (on_step.step === "getWalletAddress"){
            const watch = classify.walletWatcher.watch({ from: update.message.from.id, address: update.message.text });
            if (!watch.status){
                await cservice.sendMessage(
                    update.message.chat.id,
                    `⚠️ | ${watch.message}, دوباره از اول پروسه رو طی کنید.`
                )
            }
        }

        // continue ...
    }

    if (update.message.text.startsWith("/start")){
        await cservice.sendMessage(
            update.message.chat.id,
            `🚀 | سرویس بات Ceph\n✨ | جهت خرید یا تمدید از این ربات اقدام کنید\n\n💎 | <code>${conf_data.bot_wallet}</code>`,
            {
                parse_mode: "HTML",
                reply_parameters: { message_id: update.message.message_id },
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "خرید", callback_data: `buy_${update.message.from.id}` },
                            { text: "تمدید", callback_data: `relimit_${update.message.from.id}` }
                        ]
                    ]
                }
            }
        );
    }

    if (admins.map((vl) => vl.id).includes(update.message.from.id)){
        if (on_step){
            if (on_step.step === "getToken"){
                on_step.token = update.message.text;
                on_step.timestamp = Date.now();
                steps.set(update.message.from.id, on_step);

                const txt = conf_data.payment.map((vl) => `🔹 | ${vl.days}`).join("\n");
                const keys: any[] = [[]];

                for (const payment of conf_data.payment){
                    if (keys[keys.length - 1]?.length !== 2){
                        keys[keys.length - 1]?.push({ text: payment.days.toString(), callback_data: `manualbuy_${update.message.from.id}_${payment.days}` });
                    } else {
                        keys.push([]);
                        keys[keys.length - 1]?.push({ text: payment.days.toString(), callback_data: `manualbuy_${update.message.from.id}_${payment.days}` });
                    }
                }

                await cservice.sendMessage(
                    update.message.chat.id,
                    txt,
                    {
                        reply_markup: {
                            inline_keyboard: keys
                        },
                        reply_parameters: {
                            message_id: update.message.message_id
                        }
                    }
                );
            }
        }

        if (update.message.text.startsWith("بیلد")){
            if (update.message.chat.type !== "supergroup"){
                return await cservice.sendMessage(
                    update.message.chat.id,
                    `🔴 | این دستور فقط توی سوپر گروه ها کال میشه`,
                    {
                        reply_parameters: {
                            message_id: update.message.message_id
                        }
                    }
                );
            }

            if (!update.message.reply_to_message){
                return await cservice.sendMessage(
                    update.message.chat.id,
                    `🔴 | برای ساخت پورت جدید روی صاحب ریموت ریپلای بکن\n\n⚠️ | این گپ [${update.message.chat.id}] به عنوان گروه لاگ تایین میشه`,
                    {
                        reply_parameters: {
                            message_id: update.message.message_id
                        }
                    }
                );
            }

            steps.set(update.message.from.id, { step: "getToken", timestamp: Date.now(), group_chat: update.message.chat.id, will_owner: update.message.from.id });

            return await cservice.sendMessage(
                update.message.chat.id,
                `📝 | ادمین توکن ربات رو بفرسته`,
                {
                    reply_parameters: {
                        message_id: update.message.message_id
                    }
                }
            );
        }
    }
}

export async function CServiceCallbackHandler(update: Update) {
    if (!update.callback_query) return;
    if (!update.callback_query.data) return;
    if (!update.callback_query.message) return;

    const __spl = update.callback_query.data.split("_");
    const uid = parseInt(__spl[1]!);

    if (uid !== update.callback_query.from.id) return;

    const mode = __spl[0]!;

    switch (mode) {
        case "manualbuy":
            if (!steps.has(update.callback_query.from.id)){
                await cservice.answerCallbackQuery(update.callback_query.id, {
                    text: "درخواست منقضی شده لطفا از اول اقدام کنید",
                    show_alert: true
                });

                return;
            }

            const step_data = steps.get(update.callback_query.from.id)!;
            const manual_buy_days = parseInt(__spl[2]!);

            const new_port_name = await classify.portService.addPort(
                manual_buy_days,
                {
                    status: "active",
                    stores_to: step_data.group_chat,
                    token: step_data.token
                }
            )

            const limited_to = getNowJalali(
                getJalaliTime(Date.now() + classify.portService.daysToMs(manual_buy_days))
            );

            const now_to = getNowJalali( getJalaliTime() );
            await cservice.editMessageText(
                update.callback_query.message.chat.id,
                update.callback_query.message.message_id,
                `🟢 | پورت با موفقیت به سیستم اضافه شد\n\n<blockquote>یونیک آیدی: <code>${new_port_name}</code>\n⌛ | ${manual_buy_days} روز | ${now_to} تا ${limited_to}</blockquote>`,
                {
                    parse_mode: "HTML"
                }
            );

            break;
        
        case "buy":
            const txt = conf_data.payment.map((vl) => `🔹 | ${vl.days} days ~ ${vl.pay} trx`).join("\n");
            const keys: any[] = [[]];

            for (const payment of conf_data.payment){
                if (keys[keys.length - 1]?.length !== 2){
                    keys[keys.length - 1]?.push({ text: payment.days.toString(), callback_data: `getto_${update.callback_query.from.id}_${payment.days}_${payment.pay}` });
                } else {
                    keys.push([]);
                    keys[keys.length - 1]?.push({ text: payment.days.toString(), callback_data: `getto_${update.callback_query.from.id}_${payment.days}_${payment.pay}` });
                }
            }

            await cservice.editMessageText(
                update.callback_query.message.chat.id,
                update.callback_query.message.message_id,
                txt,
                {
                    reply_markup: {
                        inline_keyboard: keys
                    }
                }
            );

            break;

        case "getto":
            const days = parseInt(__spl[2]!);
            const pays = parseInt(__spl[3]!);

            steps.set(update.callback_query.from.id, { step: "getWalletAddress", timestamp: Date.now(), days, pays });

            await cservice.editMessageText(
                update.callback_query.message.chat.id,
                update.callback_query.message.message_id,
                `🔹 | هش ولت مبدا رو ارسال بکن\n\n⚠️ | این کار به منظوره جلوگیری از کلاهبرداری و خوردن حق کاربراست, با ارسال هش ولت مبدا, هش روی آیدی عددی شما [ <code>${update.callback_query.from.id}</code> ] قفل میشه و تا آخرین مرحله خرید به شما وصله`,
                {
                    parse_mode: "HTML"
                }
            );

            break;
    }
}

