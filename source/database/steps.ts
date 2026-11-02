import StepHandler from "../handlers/handler.step";
import { Collection, Document } from "mongodb";

class Steps {
    constructor(){
        this.ensureConnected();
    }

    async ensureConnected(): Promise<void> {
        await StepHandler.connect();
    }

    async getInstance(): Promise<Collection<Document>> {
        return StepHandler.collection();
    }

    async getAllSteps(): Promise<(Record<string, any>)[]> {
        await this.ensureConnected();
        return new Promise(async (resolve) => {
            const stp = await StepHandler.collection().find({ }).toArray() as any as Record<string, any>[];
            return resolve(stp);
        });
    }

    async getStep(user_id: number): Promise<Record<string, any> | null> {
        await this.ensureConnected();
        return new Promise(async (resolve) => {
            const stp = await StepHandler.collection().findOne({ user_id });
            return resolve(stp ?? null);
        });
    }

    async add(
        user_id: number,
        other: Record<string, any>
    ): Promise<void> {
        await this.ensureConnected();
        return new Promise(async () => {
            const stat = await this.getStep(user_id);
            if (stat){
                const newData = { ...stat, ...other };
                delete newData._id;
                await StepHandler.collection().replaceOne({ user_id }, newData);
            } else {
                await StepHandler.collection().insertOne({ user_id, ...other });
            }
        });
    }

    async deleteStep(user_id: number): Promise<void> {
        await this.ensureConnected();
        return new Promise(async () => {
            const stat = await this.getStep(user_id);
            if (stat){
                await StepHandler.collection().deleteOne({ user_id });
            }
        });
    }
}


export const steps = new Steps();