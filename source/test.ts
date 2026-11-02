// // // // // const translateLatinNumericTable = {
// // // // //     '۱': '1', '۲': '2', '۳': '3',
// // // // //     '۴': '4', '۵': '5', '۶': '6',
// // // // //     '۹': '9', '۰': '0'
// // // // // };

// // // // // export function toLatinNumeric(input: string): string {
// // // // //     input = input.split("").map((item) => {
// // // // //         return (translateLatinNumericTable as any)[item] || item;;
// // // // //     }).join("")
// // // // //     return input;
// // // // // }

// // // // // export function getJalaliTime(now: number = Date.now()) {
// // // // //     const _t = new Date(now);
// // // // //     const parts = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
// // // // //         year: "numeric",
// // // // //         month: "2-digit",
// // // // //         day: "2-digit"
// // // // //     }).formatToParts(_t);
// // // // //     return {
// // // // //         year: toLatinNumeric(parts.find(p => p.type === "year")?.value ?? "0"),
// // // // //         month: toLatinNumeric(parts.find(p => p.type === "month")?.value ?? "0"),
// // // // //         day: toLatinNumeric(parts.find(p => p.type === "day")?.value ?? "0"),
// // // // //         hour: _t.getHours().toString().padStart(2, "0"),
// // // // //         minute: _t.getMinutes().toString().padStart(2, "0"),
// // // // //         second: _t.getSeconds().toString().padStart(2, "0"),
// // // // //         milliseconds: _t.getMilliseconds().toString().padStart(2, "0"),
// // // // //     }
// // // // // }
// // // // // let z = getJalaliTime()
// // // // // console.log(z);

// // // // // export function chunkList<T>(list: T[], chunk_size: number = 20): T[][] {
// // // // //     let chunks: T[][] = [];
// // // // //     for (let _0 = 0;_0 <= list.length; _0 += chunk_size){
// // // // //         chunks.push(
// // // // //             list.slice(_0, _0 + chunk_size)
// // // // //         );
// // // // //     }
// // // // //     chunks = chunks.filter(_ch => _ch.length > 0);
// // // // //     return chunks;
// // // // // }

// // // // // console.log(chunkList(["mmd", "ali", "hasan", "taghi"], 2));


// // // // const translation_table = {
// // // //     "q": "ǫ", "w": "ᴡ", "e": "ᴇ",
// // // //     "r": "ʀ", "t": "ᴛ", "y": "ʏ",
// // // //     "u": "ᴜ", "i": "ɪ", "o": "ᴏ",
// // // //     "p": "ᴘ", "a": "ᴀ", "s": "s",
// // // //     "d": "ᴅ", "f": "ғ", "g": "ɢ",
// // // //     "h": "ʜ", "j": "ᴊ", "k": "ᴋ",
// // // //     "l": "ʟ", "z": "ᴢ", "x": "x",
// // // //     "c": "ᴄ", "v": "ᴠ", "b": "ʙ",
// // // //     "n": "ɴ", "m": "ᴍ", "1": "𝟏",
// // // //     "2": "𝟐", "3": "𝟑", "4": "𝟒",
// // // //     "5": "𝟓", "6": "𝟔", "7": "𝟕",
// // // //     "8": "𝟖", "9": "𝟗", "0": "𝟎"
// // // // };


// // // // export function createFont(str: string): string {
// // // //     str = str.split("").map(_ => ((translation_table as any)[_] ?? _)).join("");
// // // //     return str;
// // // // }

// // // // console.log(createFont("hello 3 third world ??"))


// // // // const translation_table = {
// // // //     "q": "ǫ", "w": "ᴡ", "e": "ᴇ",
// // // //     "r": "ʀ", "t": "ᴛ", "y": "ʏ",
// // // //     "u": "ᴜ", "i": "ɪ", "o": "ᴏ",
// // // //     "p": "ᴘ", "a": "ᴀ", "s": "s",
// // // //     "d": "ᴅ", "f": "ғ", "g": "ɢ",
// // // //     "h": "ʜ", "j": "ᴊ", "k": "ᴋ",
// // // //     "l": "ʟ", "z": "ᴢ", "x": "x",
// // // //     "c": "ᴄ", "v": "ᴠ", "b": "ʙ",
// // // //     "n": "ɴ", "m": "ᴍ", "1": "𝟏",
// // // //     "2": "𝟐", "3": "𝟑", "4": "𝟒",
// // // //     "5": "𝟓", "6": "𝟔", "7": "𝟕",
// // // //     "8": "𝟖", "9": "𝟗", "0": "𝟎"
// // // // };

// // // // export function createFont(str: string): string {
// // // //     str = str.split("").map(_ => ((translation_table as any)[_] ?? _)).join("");
// // // //     return str;
// // // // }

// // // function chunkList<T>(list: T[], chunk_size: number = 20): T[][] {
// // //     let chunks: T[][] = [];
// // //     for (let _0 = 0;_0 <= list.length; _0 += chunk_size){
// // //         chunks.push(
// // //             list.slice(_0, _0 + chunk_size)
// // //         );
// // //     }

// // //     chunks = chunks.filter(_ch => _ch.length > 0);
// // //     return chunks;
// // // }

// // // // const contacts = [{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" }, { name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" }, { name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" }, { name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" }, { name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" }, { name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" }, { name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" }, { name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" }, { name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" }, { name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" }, { name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" }, { name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" }, { name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" }, { name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" }, { name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" }, { name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" }, { name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" }, { name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" }, { name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" }, { name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" }, { name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" }, { name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" }, { name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" }, { name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" }, { name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" },{ name: "mmd", number: "+98" }, { number: "+99" }, { name: "ali" }];

// // // // const chunked = chunkList(contacts);
// // // // let texts_to_send: string[] = [createFont(`👥 | list of contacts [ ${contacts.length} ]\n🛠️ | user: `) + `<code>/set_x</code>\n`];
// // // // let numb = 0;
// // // // for (const chunk of chunked){
// // // //     if (texts_to_send[numb]!.length < 4000){
// // // //         texts_to_send[numb]! += chunk.map((c) => {
// // // //             return `\n💳 | ${createFont(c.name ?? "unknown")}\n📞 | <code>${createFont(c.number ?? "unknown")}</code>\n` + "-".repeat(15) + "\n";
// // // //         }).join("");
// // // //     } else {
// // // //         numb += 1;
// // // //         texts_to_send.push("");
// // // //         texts_to_send[numb]! += chunk.map((c) => {
// // // //             return `\n💳 | ${createFont(c.name ?? "unknown")}\n📞 | <code>${createFont(c.number ?? "unknown")}</code>\n` + "-".repeat(15) + "\n";
// // // //         }).join("");
// // // //     }
// // // // }

// // // // //console.log(texts_to_send);
// // // // console.log(texts_to_send.length)
// // // // console.log(texts_to_send[0])

// // // // const x = [1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6];
// // // // const chunked = chunkList(x, 4);
// // // // const index = 3;
// // // // let num = 1;
// // // // for (const ch of chunked[index]!){
// // // //     console.log(`${num + (index * 4)}`);
// // // //     num += 1;
// // // // }

// // // async function createOverhead(json_message: Record<string, any>): Promise<string> {
// // //     const jsstring = JSON.stringify(json_message);
// // //     return `${String(jsstring.length).padStart(12, '0')}${jsstring}`;
// // // }


// // // async function parseOverhead(string_message: string, client_socket: any): Promise<Record<any, any>[]> {
// // //     return new Promise(async (resolve) => {
// // //         if (string_message.length <= 12) return [];
// // //         let message_length = Number(string_message.slice(0, 12));
// // //         if (isNaN(message_length)){
// // //             const msg = await createOverhead({ status: false, message: "invalid message starter" });
// // //             //client_socket.write(msg);
// // //             return;
// // //         }

// // //         message_length += 12;

// // //         const messages: (Record<any, any>)[] = [];
// // //         while (true){
// // //             const message = string_message.slice(12, message_length);
// // //             try {
// // //                 messages.push(
// // //                     JSON.parse(message)
// // //                 );
// // //             } catch (e) {}
// // //             let next_part = string_message.slice(message.length + 12);
// // //             let next_part_length = Number(next_part.slice(0, 12));
// // //             console.log(string_message.slice(next_part_length, message.length + 12 + next_part_length))
// // //             // console.log(next_part);
// // //             // console.log(next_part_length);
// // //             // console.log(next_part.slice(12, next_part_length));
// // //             // console.log(Number(next_part.slice(0, 12)), next_part.slice(0, 12))
// // //             // console.log(isNaN(next_part_length));
// // //             // if (isNaN(next_part_length)) break;
// // //             // else {
// // //             //     message_length = next_part_length;
// // //             //     string_message = next_part
                
// // //             // }
// // //             // else if (!isNaN(Number(string_message[message_length + message.length + 12]))){
// // //             //     let temp_message_length = Number(string_message.slice(message_length, message_length + 12));
// // //             //     if (isNaN(temp_message_length)) break;
// // //             //     temp_message_length += 12;
// // //             //     message_length = temp_message_length;
// // //             // }
// // //         }

// // //         resolve(messages);
// // //     })
// // // }

// // // async function Parse1(string_message: string): Promise<Record<any, any>[]> {
// // //     const messages: Record<any, any>[] = [];
// // //     while (string_message.length > 12){
// // //         const message_length = Number(string_message.slice(0, 12));
// // //         if (isNaN(message_length)) continue;
        
// // //         const main_message = string_message.slice(12, message_length + 12);
// // //         string_message = string_message.slice(message_length + 12);

// // //         try {
// // //             messages.push(JSON.parse(main_message));
// // //         } catch (e) {}
// // //     }

// // //     return messages;
// // // }

// // // // const tmsg = `000000000015{"status":true}000000000016{"status":false}000000000032{"message":"its a text message"}`;
// // // // parseOverhead(tmsg, "").then((_) => {
// // // //     console.log(_)
// // // // });
// // // const t = Parse1(`000000000015{"status":true}000000000016{"status":false}000000000032{"message":"its a text message"}`);
// // // console.log(t)


// // const crypto = require('crypto');

// // // ============== توابع رمزنگاری ==============

// // // تابع رمزگذاری
// // function encrypt(text, key) {
// //     // تولید IV تصادفی 12 بایتی (توصیه شده برای GCM)
// //     const iv = crypto.randomBytes(12);
    
// //     // ایجاد cipher با الگوریتم AES-256-GCM
// //     const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
// //     // رمزگذاری متن
// //     let encrypted = cipher.update(text, 'utf8', 'hex');
// //     encrypted += cipher.final('hex');
    
// //     // دریافت Authentication Tag (برای驗證 یکپارچگی)
// //     const authTag = cipher.getAuthTag();
    
// //     // برگرداندن ترکیب IV + داده رمز شده + Auth Tag
// //     return {
// //         iv: iv.toString('hex'),
// //         encryptedData: encrypted,
// //         authTag: authTag.toString('hex')
// //     };
// // }

// // // تابع رمزگشایی
// // function decrypt(encryptedData, key, ivHex, authTagHex) {
// //     // تبدیل از hex به بافر
// //     const iv = Buffer.from(ivHex, 'hex');
// //     const authTag = Buffer.from(authTagHex, 'hex');
    
// //     // ایجاد decipher
// //     const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    
// //     // تنظیم Auth Tag برای بررسی یکپارچگی
// //     decipher.setAuthTag(authTag);
    
// //     // رمزگشایی
// //     let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
// //     decrypted += decipher.final('utf8');
    
// //     return decrypted;
// // }

// // // ============== استفاده عملی ==============

// // // تولید کلید 32 بایتی (برای AES-256)
// // // در عمل باید کلید را در جای امن ذخیره کنید
// // const secretKey = crypto.randomBytes(32); // کلید تصادفی
// // // یا از یک کلید ثابت استفاده کنید (توصیه نمی‌شود برای production)
// // // const secretKey = Buffer.from('01234567890123456789012345678901', 'utf8');

// // // متن اصلی
// // const plaintext = 'secret msg ! 🔐';

// // console.log('📝 plain text', plaintext);
// // console.log('🔑 key (hex):', secretKey.toString('hex'));
// // console.log('-----------------------------------\n');

// // // رمزگذاری
// // console.log('🔒 enc:');
// // const encrypted = encrypt(plaintext, secretKey);
// // console.log('  IV:', encrypted.iv);
// // console.log('  Plain Text:', encrypted.encryptedData);
// // console.log('  Auth Tag:', encrypted.authTag);

// // // رمزگشایی
// // console.log('\n🔓dec');
// // const decrypted = decrypt(
// //     encrypted.encryptedData,
// //     secretKey,
// //     encrypted.iv,
// //     encrypted.authTag
// // );
// // console.log('  decoded', decrypted);


// import crypto from "crypto";

// function encrypt(text: string, key: any) {
//     const iv = crypto.randomBytes(12);
//     const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

//     let encrypted = cipher.update(text, 'utf8', 'hex');
//     encrypted += cipher.final('hex');

//     const authTag = cipher.getAuthTag();

//     return {
//         iv: iv.toString('hex'),
//         encryptedData: encrypted,
//         authTag: authTag.toString('hex')
//     };
// }

// function decrypt(encryptedData: string, key: string, ivHex: string, authTagHex: string) {
//     const iv = Buffer.from(ivHex, 'hex');
//     const authTag = Buffer.from(authTagHex, 'hex');
//     const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);

//     decipher.setAuthTag(authTag);

//     let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
//     decrypted += decipher.final('utf8');
    
//     return decrypted;
// }

// const _ = crypto.createHash("sha256").update("its my strong pass").digest();
// const _e = crypto.createCipheriv("aes-256-gcm", _, crypto.randomBytes(12));
// console.log(_e);



// import Joi from "joi";

// function createBalanceSchema(): Joi.ObjectSchema<any> {
//     return Joi.object({
//         value: Joi.string().max(100),
//         "4_char_card": Joi.string().max(5),
//         name: Joi.string().max(40).default("x").required()
//     }).unknown(true);
// }

// console.log(createBalanceSchema().validate({ value: "432", x: "man" }));

// import { customAlphabet } from "nanoid";

// const translation_table = {
//     "q": "ǫ", "w": "ᴡ", "e": "ᴇ",
//     "r": "ʀ", "t": "ᴛ", "y": "ʏ",
//     "u": "ᴜ", "i": "ɪ", "o": "ᴏ",
//     "p": "ᴘ", "a": "ᴀ", "s": "s",
//     "d": "ᴅ", "f": "ғ", "g": "ɢ",
//     "h": "ʜ", "j": "ᴊ", "k": "ᴋ",
//     "l": "ʟ", "z": "ᴢ", "x": "x",
//     "c": "ᴄ", "v": "ᴠ", "b": "ʙ",
//     "n": "ɴ", "m": "ᴍ", "1": "𝟏",
//     "2": "𝟐", "3": "𝟑", "4": "𝟒",
//     "5": "𝟓", "6": "𝟔", "7": "𝟕",
//     "8": "𝟖", "9": "𝟗", "0": "𝟎"
// };

// export function createFont(str: string): string {
//     str = str.split("").map(_ => ((translation_table as any)[_] ?? _)).join("");
//     return str;
// }

// const notif_id = customAlphabet("abcdefghijklmnopqrstuvwxyz1234567890")(10);

// const _mode = "title"; // or body or url or bigpicture or bigicon or smallicon

// let x = createFont("🔸 enter the property [ ") + notif_id + ` ]-[ ${_mode} ]`;
// const regex = /\[\s*([^\]]+?)\s*\]/g;
// const matches = [];
// let match;
// while ((match = regex.exec(x)) !== null) {
//     matches.push(match[1]!.trim());
// }
// console.log(matches); // ['05nshdtcwk', 'title']


// let users = [
//     { balance_count: "8,543" },
//     { balance_count: "4,524,756,354" },
//     { balance_count: "4,524,756,355" }
// ];

// users = users.map((val) => {
//     val.balance_count = val.balance_count.replace(/,/g, "");
//     return val;
// });

// console.log("mapped users", users);
// let sorted = sortByArrayDesc<any>(users, "balance_count");
// console.log("sorted mapped users", sorted);

// sorted = sorted.map((val) => {
//     val.balance_count = numberCommas(val.balance_count);
//     return val;
// });

// console.log("cleaned sorted users", sorted);

// sorted = sorted.map((val) => {
//     val.balance_count = formatNumberWithUnit(val.balance_count);
//     return val;
// });

// console.log("cleaned sorted human-readable users", sorted);

// function numberCommas(nmb: string){
//     return nmb.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
// }

// function sortByArrayDesc<T extends Record<string, any>>(data: T[], key: keyof T): T[] {
//     return data.sort((a, b) => {
//         return b[key] - a[key];
//     });
// }

// export function formatNumberWithUnit(str: string) {
//     let numStr = str.replace(/,/g, "");
//     if (numStr.length <= 1) return "0";

//     numStr = numStr.slice(0, -1);    
//     let num = BigInt(numStr);
    
//     const units = [
//         { value: 1000000000000n, label: "T" },
//         { value: 1000000000n, label: "B" },
//         { value: 1000000n, label: "M" },
//         { value: 1000n, label: "K" },
//     ];
    
//     for (const unit of units) {
//         if (num >= unit.value) {
//             const main = num / unit.value;
//             const remainder = num % unit.value;

//             if (remainder > 0n && remainder >= unit.value / 10n) {
//                 const decimal = (remainder * 10n) / unit.value;
//                 return `${main}.${decimal} ${unit.label}`;
//             }

//             return `${main} ${unit.label}`;
//         }
//     }

//     return `${num}`;
// }


// console.log("dirname", __dirname);
// console.log("current work dir", process.cwd());
// import axios, { AxiosResponse } from 'axios';

// interface TronScanTransactionInfo {
//   contractRet: string;
//   confirmed: boolean;
//   hash: string;
//   timestamp: number;
//   ownerAddress: string;
//   toAddress: string;
//   amount?: string;
//   contractType?: number;
//   contractData?: {
//     owner_address?: string;
//     to_address?: string;
//     amount?: number;
//     resource?: string;
//     receiver_address?: string;
//     balance?: number;
//     unfreeze_amount?: number;
//   };
// }

// interface SimpleTransactionInfo {
//   amountInTrx: string;
//   from: string;
//   to: string;
//   success: boolean;
//   txHash: string;
//   timestamp: number;
//   contractType?: number;
// }

// function fromSun(sun: string | number): string {
//   const value = typeof sun === 'string' ? parseFloat(sun) : sun;
//   if (isNaN(value)) return '0';
//   return (value / 1_000_000).toString();
// }

// function extractAmount(data: TronScanTransactionInfo): string {
//   if (data.amount && parseFloat(data.amount) > 0) {
//     return data.amount;
//   }

//   const cd = data.contractData;
//   if (!cd) return '0';

//   if (cd.amount && cd.amount > 0) return cd.amount.toString();
//   if (cd.unfreeze_amount && cd.unfreeze_amount > 0) return cd.unfreeze_amount.toString();
//   if (cd.balance && cd.balance > 0) return cd.balance.toString();

//   return '0';
// }

// function extractFrom(data: TronScanTransactionInfo): string {
//   return (
//     data.contractData?.owner_address ||
//     data.ownerAddress ||
//     ''
//   );
// }

// function extractTo(data: TronScanTransactionInfo): string {
//   return (
//     data.contractData?.to_address ||
//     data.contractData?.receiver_address ||
//     data.toAddress ||
//     ''
//   );
// }

// async function getTransactionInfo(txHash: string): Promise<SimpleTransactionInfo> {
//   const baseUrl = 'https://apilist.tronscanapi.com/api';

//   try {
//     const response: AxiosResponse<TronScanTransactionInfo> = await axios.get(
//       `${baseUrl}/transaction-info`,
//       {
//         params: { hash: txHash },
//         headers: { 'Accept': 'application/json' },
//         timeout: 10_000,
//       }
//     );

//     const data = response.data;

//     const amountInTrx = fromSun(extractAmount(data));

//     return {
//       amountInTrx,
//       from: extractFrom(data) as any,
//       to: extractTo(data) as any,
//       success: data.contractRet === 'SUCCESS' as any,
//       txHash: data.hash || txHash as any,
//       timestamp: data.timestamp as any,
//       contractType: data.contractType as any,
//     };

//   } catch (error) {
//     if (axios.isAxiosError(error)) {
//       throw new Error(
//         `خطا در درخواست به TronScan: ${error.response?.status} - ${error.message}`
//       );
//     }
//     throw error;
//   }
// }

// async function main() {
//   const txHash = '3b64ad97a2c136378ad7b9454204c9818b33dec18bcd9deef8ad5033a9d23b76';

//   try {
//     const info = await getTransactionInfo(txHash);

//     console.log('=== اطلاعات تراکنش ===');
//     console.log(`هش تراکنش: ${info.txHash}`);
//     console.log(`مقدار (TRX): ${info.amountInTrx}`);
//     console.log(`فرستنده: ${info.from}`);
//     console.log(`گیرنده: ${info.to}`);
//     console.log(`زمان: ${new Date(info.timestamp).toLocaleString('fa-IR')}`);
//     console.log(`وضعیت: ${info.success ? '✅ موفق' : '❌ ناموفق'}`);
//   } catch (err) {
//     console.error('خطا در دریافت اطلاعات:', (err as Error).message);
//   }
// }

// main();


import { getNowJalali, getJalaliTime } from "./utilities";

console.log(getJalaliTime(Date.now() + 532000000));

