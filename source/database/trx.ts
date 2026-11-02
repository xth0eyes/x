import TrxHandler from "../handlers/handler.trx";

class Trx {
    async doesExist(trx: string): Promise<boolean> {
        return new Promise(async (resolve) => {
            let clean_trx = trx;

            if (trx.startsWith("https://tronscan.org/#/transaction/")){
                clean_trx = trx.replaceAll("https://tronscan.org/#/transaction/", "");
            }

            const does = await TrxHandler.collection().findOne({ trx: clean_trx });
            return resolve(does === null ? false : true);
        });
    }

    async addTrx(trx: string): Promise<void> {
        return new Promise(async (resolve) => {
            let clean_trx = trx;

            if (trx.startsWith("https://tronscan.org/#/transaction/")){
                clean_trx = trx.replaceAll("https://tronscan.org/#/transaction/", "");
            }

            const _does = await this.doesExist(clean_trx);

            if (!_does){
                await TrxHandler.collection().insertOne({ trx: clean_trx });
            }
        });
    }
}

export const trx = new Trx();
