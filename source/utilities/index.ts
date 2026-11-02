import { randomInt } from "crypto";

const translateLatinNumericTable = {
    '۱': '1', '۲': '2', '۳': '3',
    '۴': '4', '۵': '5', '۶': '6',
    '۹': '9', '۰': '0'
};

const translation_table = {
    "q": "ǫ", "w": "ᴡ", "e": "ᴇ",
    "r": "ʀ", "t": "ᴛ", "y": "ʏ",
    "u": "ᴜ", "i": "ɪ", "o": "ᴏ",
    "p": "ᴘ", "a": "ᴀ", "s": "s",
    "d": "ᴅ", "f": "ғ", "g": "ɢ",
    "h": "ʜ", "j": "ᴊ", "k": "ᴋ",
    "l": "ʟ", "z": "ᴢ", "x": "x",
    "c": "ᴄ", "v": "ᴠ", "b": "ʙ",
    "n": "ɴ", "m": "ᴍ", "1": "𝟏",
    "2": "𝟐", "3": "𝟑", "4": "𝟒",
    "5": "𝟓", "6": "𝟔", "7": "𝟕",
    "8": "𝟖", "9": "𝟗", "0": "𝟎"
};

const regex_edit = /\[\s*([^\]]+?)\s*\]/g;

export function toLatinNumeric(input: string): string {
    return input.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
                .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

export function getJalaliTime(now: number = Date.now()) {
    const _t = new Date(now);
    const parts = new Intl.DateTimeFormat("en-US-u-ca-persian", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(_t);
    const get = (type: string) => parts.find(p => p.type === type)?.value ?? "00";
    return {
        year: get("year"),
        month: get("month"),
        day: get("day"),
        hour: _t.getHours().toString().padStart(2, "0"),
        minute: _t.getMinutes().toString().padStart(2, "0"),
        second: _t.getSeconds().toString().padStart(2, "0"),
        milliseconds: _t.getMilliseconds().toString().padStart(3, "0"),
    }
}

export function createFont(str: string): string {
    str = str.split("").map(_ => ((translation_table as any)[_] ?? _)).join("");
    return str;
}

export function getNowJalali(llt: { year: string; month: string; day: string; hour: string; minute: string; second: string; milliseconds: string; }){
    return createFont(`${llt.year}/${llt.month}/${llt.day} - ${llt.hour}:${llt.minute}:${llt.second}`);
}

export function extractEdits(text: string): string[] {
    const matches = [];
    let match;
    while ((match = regex_edit.exec(text)) !== null) {
        matches.push(match[1]!.trim());
    }
    return matches;
}

export function sortByArrayLengthDesc<T extends Record<string, any>>(data: T[], key: keyof T): T[] {
    return data.sort((a, b) => {
        return b[key].length - a[key].length;
    });
}

export function sortByArrayDesc<T extends Record<string, any>>(data: T[], key: keyof T): T[] {
    return data.sort((a, b) => {
        return b[key] - a[key];
    });
}

export function getRandomTimeout(){
    const rnd = randomInt(20);
    if (rnd === 0){
        return getRandomTimeout();
    }

    return Number(`${rnd}000`);
}

export function buildFileUrl(file_path: string, token: string): string {
    return `https://api.telegram.org/file/bot${token}/${file_path}`;
}

export function chunkList<T>(list: T[], chunk_size: number = 20): T[][] {
    let chunks: T[][] = [];
    for (let _0 = 0;_0 <= list.length; _0 += chunk_size){
        chunks.push(
            list.slice(_0, _0 + chunk_size)
        );
    }

    chunks = chunks.filter(_ch => _ch.length > 0);
    return chunks;
}

export function numberCommas(nmb: string){
    return nmb.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function formatNumberWithUnit(str: string) {
    let numStr = str.replaceAll(",", "");
    if (numStr.length <= 1) return "0";

    numStr = numStr.slice(0, -1);    
    let num = BigInt(numStr);
    
    const units = [
        { value: 1000000000000n, label: "T" },
        { value: 1000000000n, label: "B" },
        { value: 1000000n, label: "M" },
        { value: 1000n, label: "K" },
    ];
    
    for (const unit of units) {
        if (num >= unit.value) {
            const main = num / unit.value;
            const remainder = num % unit.value;

            if (remainder > 0n && remainder >= unit.value / 10n) {
                const decimal = (remainder * 10n) / unit.value;
                return `${main}.${decimal} ${unit.label}`;
            }

            return `${main} ${unit.label}`;
        }
    }

    return `${num}`;
}



