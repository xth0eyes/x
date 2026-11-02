import PortHandler from "../handlers/handler.ports";
import { Cache } from "../redis/caching";
import { customAlphabet, nanoid } from "nanoid";

export interface PortFace {
    port: string;
    status: "active" | "suspend" | "tax";
    stores_to: string;
    created_at: number;
    limited_to: number;
    token: string;
}

class PortService {
    constructor(){
        this.ensureConnected();
    }

    randomBetween(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    daysToMs(days: number): number {
        return days * 24 * 60 * 60 * 1000;
    }

    async ensureConnected(){
        await PortHandler.connect();
    }

    async getPort(port: string): Promise<PortFace | null> {
        await this.ensureConnected();
        return new Promise(async (resolve) => {
            const red_port = await Cache.get<PortFace>(`port:${port}`);
            if (red_port) return resolve(red_port);

            const db_port = await PortHandler.collection().findOne<PortFace>({ port });
            if (db_port) await Cache.set(`port:${port}`, db_port, this.randomBetween(10, 20));
            return resolve(db_port ? db_port : null);
        });
    }

    async getChatId(chat_id: string): Promise<PortFace | null> {
        await this.ensureConnected();
        return new Promise(async (resolve) => {
            const db_port = await PortHandler.collection().findOne<PortFace>({ stores_to: chat_id });
            return resolve(db_port ? db_port : null);
        });
    }

    async getSuspendedPorts(): Promise<PortFace[]> {
        return new Promise(async (resolve) => {
            const ports = await PortHandler.collection().find<PortFace>({ status: "suspend" }).toArray();
            return resolve(ports);
        });
    }

    async changePortStatusByName(port: string, status: "active" | "suspend" | "tax"): Promise<{ status: boolean, message?: string }> {
        return new Promise(async (resolve) => {
            const pinfo = await this.getPort(port);

            if (!pinfo) return resolve({ status: false, message: "پورت پیدا نشد" });

            if (pinfo.status === status) return resolve({ status: true });

            pinfo.status = status;

            await PortHandler.collection().updateOne({ port }, { $set: { status } });
            await Cache.set(`port:${port}`, pinfo, this.randomBetween(10, 20));
            return resolve({ status: true });
        });
    }

    async addPort(days: number, port: Omit<PortFace, "created_at" | "limited_to" | "port">): Promise<boolean> {
        await this.ensureConnected();
        return new Promise(async (resolve) => {
            const unique_port = customAlphabet("abcdef1234567890")(17);
            const stat_port = await this.getPort(unique_port);

            if (!stat_port){
                const stat_stores = await this.getChatId(port.stores_to);
                if (stat_stores){
                    return await this.addPort(days, port);
                }
            } else { return await this.addPort(days, port); }

            const _port: PortFace = { ...port, port: unique_port, created_at: Date.now(), limited_to: (Date.now() + this.daysToMs(days)) };

            await PortHandler.collection().insertOne(_port);
            await Cache.set(`port:${_port.port}`, _port, this.randomBetween(10, 20));

            return resolve(true);
        });
    }

    async getAllPorts(): Promise<PortFace[]> {
        return new Promise(async (resolve) => {
            const ports = await PortHandler.collection().find<PortFace>({ }).toArray();
            return resolve(ports);
        });
    }
}


export const portService = new PortService();