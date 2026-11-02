export interface Contact {
    name?: string;
    number?: string;
}

export function isContacts<T extends Contact>(list: T[]): boolean {
    return list.every((_) => {
        if ("name" in _ || "number" in _){
            return true;
        } else {
            return false;
        }
    });
}


