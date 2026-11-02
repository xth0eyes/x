import AppHandler from "../handlers/handler.app";

class Apps {
    constructor(){
        this.ensureConnected();
    }

    async ensureConnected(): Promise<void> {
        await AppHandler.connect();
    }

    async getApps(): Promise<string[]> {
        await this.ensureConnected();
        return new Promise(async (resolve) => {
            let apps = await AppHandler.collection().find({ }).toArray() as any[];
            apps = apps.flatMap((app) => {
                if (app.app_path){
                    return app.app_path;
                }
                return [];
            });
            return resolve(apps);
        })
    }

    async getAppByPath(path: string): Promise<string | null> {
        await this.ensureConnected();
        return new Promise(async (resolve) => {
            let app = await AppHandler.collection().findOne({ app_path: path });
            if (app){
                return resolve(app.app_path);
            }
            return resolve(null);
        })
    }

    async addApp(path: string): Promise<void> {
        await this.ensureConnected();
        return new Promise(async () => {
            const stat = await this.getAppByPath(path);
            if (!stat){
                await AppHandler.collection().insertOne({ app_path: path });
            }
        })
    }

    async deleteApp(path: string): Promise<boolean> {
        await this.ensureConnected();
        return new Promise(async (resolve) => {
            const stat = await this.getAppByPath(path);
            if (stat){
                await AppHandler.collection().deleteOne({ app_path: path });
                resolve(true);
                return;
            } else {
                resolve(false);
                return;
            }
        })
    }
}


export const apps = new Apps();