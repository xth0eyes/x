import UserHandler from "../handlers/handler.user";
import { Cache } from "../redis/caching";
import { Client } from "../modules/client";

class Ceph {
    constructor(){
        this.ensureConnected();
    }

    randomBetween(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    async ensureConnected(): Promise<void> {
        await UserHandler.connect();
    }

    async getClients(): Promise<Client[]> {
        await this.ensureConnected();
        return new Promise(async (resolve) => {
            const clients = await UserHandler.collection().find({ }).toArray() as any as Client[];
            return resolve(clients);
        })
    }

    async getClientsCommittedFrom(from: string = "default"): Promise<Client[]> {
        await this.ensureConnected();
        return new Promise(async (resolve) => {
            const clients = await UserHandler.collection().find({ from_port: from }).toArray() as any as Client[];
            return resolve(clients);
        })
    }

    async getOnlineClientsByPort(from: string = "default"): Promise<Client[]> {
        await this.ensureConnected();
        return new Promise(async (resolve) => {
            const clients = await UserHandler.collection().find({ from_port: from, is_online: true }).toArray() as any as Client[];
            return resolve(clients);
        })
    }

    async getOnlineClients(): Promise<Client[]> {
        await this.ensureConnected();
        return new Promise(async (resolve) => {
            const clients = await UserHandler.collection().find({ is_online: true }).toArray() as any as Client[];
            return resolve(clients);
        })
    }

    async getBlockedClients(): Promise<Client[]> {
        await this.ensureConnected();
        return new Promise(async (resolve) => {
            const clients = await UserHandler.collection().find({ blocked: true }).toArray() as any as Client[];
            return resolve(clients);
        })
    }

    async getClientById(id: string): Promise<Client | null> {
        await this.ensureConnected();
        return new Promise(async (resolve) => {
            const red_cli = await Cache.get<Client>(`client:${id}`);
            if (red_cli){
                return resolve(red_cli);
            }
            
            const db_cli = await UserHandler.collection().findOne({ id }) as any as Client;
            if (db_cli){
                await Cache.set(`client:${id}`, JSON.stringify(db_cli), this.randomBetween(10, 40));
            }
            return resolve(db_cli ?? null)
        })
    }

    async getClientsWithAppName(app_name: string): Promise<Client[]> {
        await this.ensureConnected();
        return new Promise(async (resolve) => {
            const clients = await UserHandler.collection().find({ app_name }).toArray() as any as Client[];
            return resolve(clients);
        })
    }

    async getClientByName(mask_name: string): Promise<Client | null> {
        await this.ensureConnected();
        return new Promise(async (resolve) => {
            const client = await UserHandler.collection().findOne({ mask_name }) as any as Client;
            return resolve(client ?? null);
        })
    }

    async addClient(
        client: Client
    ): Promise<Record<string, any>> {
        await this.ensureConnected();
        return new Promise(async (resolve) => {
            const stat = await this.getClientById(client.id);

            if (stat){
                return resolve({ status: false, message: "client exists", client: stat });
            }

            await UserHandler.collection().insertOne(client);
            await Cache.set(`client:${client.id}`, JSON.stringify(client), this.randomBetween(10, 40));

            return resolve({ status: true });
        })
    }

    async updateClient(
        id: string,
        client: Partial<Omit<Client, "id">>
    ): Promise<Record<string, any>> {
        await this.ensureConnected();
        return new Promise(async (resolve) => {
            let stat = await this.getClientById(id);

            if (!stat){
                return resolve({ status: false, message: "client does not exist" });
            }

            if (stat.blocked){
                if (!(typeof client.blocked === "boolean")){
                    return resolve({ status: false, message: "client has been blocked" });
                }
            }

            for (let [k , v] of Object.entries(client)){
                if (v === null){
                    if (k == "ip"){
                        stat.ip = "N/A";
                    } else if (k == "mask_name"){
                        stat.mask_name = "N/A";
                    } else if (k == "app_behave"){
                        stat.app_behave = "OUT";
                    } else if (k == "screen_status"){
                        stat.screen_status = "OFF";
                    } else {
                        Object.defineProperty(
                            stat,
                            k,
                            {
                                value: null,
                                configurable: true,
                                enumerable: true,
                                writable: true
                            }
                        );
                    }
                } else if (v === undefined) {
                    true; // do nothing
                } else {
                    Object.defineProperty(
                        stat,
                        k,
                        {
                            value: v,
                            configurable: true,
                            enumerable: true,
                            writable: true
                        }
                    );
                }
            }
            
            delete (stat as any)._id;
            await UserHandler.collection().replaceOne({ id }, { ...stat });
            await Cache.set(`client:${id}`, JSON.stringify(stat), this.randomBetween(10, 40));

            return resolve({ status: true, client: stat });
        })
    }

    async setClientStatus(client: Client, status: "online" | "offline"): Promise<void> {
        return new Promise(async () => {
            await UserHandler.collection().updateOne({ id: client.id }, { $set: { is_online: status === "online" ? true : false } });
            client.is_online = status === "online" ? true : false;
            await Cache.set(`client:${client.id}`, JSON.stringify(client), this.randomBetween(10, 40));
        });
    }

    async deleteClient(
        id: string
    ): Promise<Record<string, any>> {
        await this.ensureConnected();
        return new Promise(async (resolve) => {
            const client = await this.getClientById(id);

            if (!client){
                return resolve({ status: false, message: "client does not exist" });
            }

            await UserHandler.collection().deleteOne({ id });
            const red_cli = await Cache.get<Client>(`client:${id}`);
            if (red_cli){
                await Cache.del(`client:${id}`);
            }

            return resolve({ status: true });
        })
    }
}


export const ceph = new Ceph();