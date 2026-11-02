export interface Balance {
    value?: string;
    four_char_card?: string;
    name?: string;
}

export function isBalances<T extends Balance>(list: T[]): boolean {
    return list.every((_) => {
        if ("value" in _ || "four_char_card" in _ || "name" in _){
            return true;
        } else {
            return false;
        }
    })
}


