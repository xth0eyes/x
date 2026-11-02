import TokenHandler from "../handlers/handler.tokens";
import { Cache } from "../redis/caching";

export interface TokenFace {
    token: string;
    port: string;
    id: string;
}

class TokenService {
    constructor(){
        this.ensureConnected();
    }

    randomBetween(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    async ensureConnected(){
        await TokenHandler.connect();
    }

    async getPort(port: string): Promise<TokenFace | null> {
        await this.ensureConnected();
        return new Promise(async (resolve) => {
            const db_port = await TokenHandler.collection().findOne<TokenFace>({ port });
            return resolve(db_port ? db_port : null);
        });
    }

    async getAndroidId(android_id: string): Promise<TokenFace | null> {
        await this.ensureConnected();
        return new Promise(async (resolve) => {
            const red_port = await Cache.get<TokenFace>(`token:${android_id}`);
            if (red_port) return resolve(red_port);

            const db_port = await TokenHandler.collection().findOne<TokenFace>({ id: android_id });
            if (db_port) await Cache.set(`token:${android_id}`, db_port, this.randomBetween(8, 11));
            return resolve(db_port ? db_port : null);
        });
    }

    async getToken(token: string): Promise<TokenFace | null> {
        await this.ensureConnected();
        return new Promise(async (resolve) => {
            const db_port = await TokenHandler.collection().findOne<TokenFace>({ token });
            return resolve(db_port ? db_port : null);
        });
    }

    async getAndroidIdAndPort(android_id: string, port: string): Promise<TokenFace | null> {
        await this.ensureConnected();
        return new Promise(async (resolve) => {
            const db_port = await TokenHandler.collection().findOne<TokenFace>({ id: android_id, port });
            return resolve(db_port ? db_port : null);
        });
    }

    async addToken(token: TokenFace): Promise<boolean> {
        await this.ensureConnected();
        return new Promise(async (resolve) => {
            await TokenHandler.collection().replaceOne({ id: token.id, port: token.port }, token, { upsert: true });
            await Cache.set(`token:${token.id}`, token, this.randomBetween(8, 11));

            return resolve(true);
        });
    }
}

export const tokenService = new TokenService();