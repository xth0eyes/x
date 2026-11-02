import IPHandler from "../handlers/handler.ip";
import { Cache } from "../redis/caching";

class IPBlocker {
    constructor(){
        this.ensureConnected();
    }

    randomBetween(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    async ensureConnected(): Promise<void> {
        await IPHandler.connect();
    }

    async getIPs(): Promise<string[]> {
        await this.ensureConnected();
        return new Promise(async (resolve) => {
            let ips = await IPHandler.collection().find({ }).toArray() as any[];
            ips = ips.flatMap((ip) => {
                if (ip.ip){
                    return ip.ip;
                }
                return [];
            });
            return resolve(ips);
        })
    }

    async getIP(ip: string): Promise<string | null> {
        await this.ensureConnected();
        return new Promise(async (resolve) => {
            const red_ip = await Cache.get<{ ip: string }>(`blockedip:${ip}`);
            if (red_ip){
                return resolve(red_ip.ip);
            }

            let _ip = await IPHandler.collection().findOne({ ip }) as any as Record<string, string>;
            if (_ip){
                await Cache.set(`blockedip:${ip}`, JSON.stringify({ ip }), this.randomBetween(60, 120));
            }

            return resolve(_ip?.ip ?? null);
        })
    }

    async addIP(ip: string): Promise<void> {
        await this.ensureConnected();
        return new Promise(async () => {
            const stat = await this.getIP(ip);
            if (!stat){
                await IPHandler.collection().insertOne({ ip });
                await Cache.set(`blockedip:${ip}`, JSON.stringify({ ip }), this.randomBetween(60, 120));
            }
        })
    }

    async deleteIP(ip: string): Promise<void> {
        await this.ensureConnected();
        return new Promise(async () => {
            const stat = await this.getIP(ip);
            if (stat){
                await IPHandler.collection().deleteOne({ ip });
                const __t = await Cache.get<{ ip: string }>(`blockedip:${ip}`);
                if (__t){
                    await Cache.del(`blockedip:${ip}`);
                }
            }
        })
    }
}


export const ipBlocker = new IPBlocker();