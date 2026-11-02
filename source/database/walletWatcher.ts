export class WalletWatcherClass {
    private wallets: { from: number, address: string, /*pay: number*/ }[] = [];

    isSuspect(wallet: { from: number, address: string, /*pay: number*/ }): boolean {
        return this.wallets.find((wall) => wall.from === wallet.from || wall.address === wallet.address) ? true : false;
    }
    
    watch(wallet: { from: number, address: string, /*pay: number*/ }): { status: boolean, message?: string } {
        const does_exist = this.isSuspect(wallet);
        if (does_exist) return { status: false, message: "شما درحال انجام خرید هستید یا شخصی درحال انجام خرید با آدرس ولت شماست" };

        this.wallets.push(wallet);
        return { status: true };
    }

    remove(from: number): boolean {
        let indexed: number | null = null;
        const does_exist = this.wallets.find((wall, indx) => {
            if (wall.from === from){
                indexed = indx;
                return true;
            }
        });

        if (does_exist){
            this.wallets.splice(indexed!, 1);
            return true;
        } else {
            return false;
        }
    }
}

export const WalletWatcher = new WalletWatcherClass();

