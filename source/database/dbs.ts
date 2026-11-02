import { schemas } from "./schemas";
import { ceph } from "./ceph";
import { tokenService } from "./tokenService";
import { portService } from "./portService";
import { apps } from "./apps";
import { ipBlocker } from "./ipBlocker";
import { steps } from "./steps";
import { actionSession } from "./actionSession";
import { WalletWatcher } from "./walletWatcher";
import { notification } from "./notification";
import { trx } from "./trx";

export const classify = {
    ipblocker: ipBlocker,
    ceph: ceph,
    apps: apps,
    steps: steps,
    session: actionSession,
    notification: notification,
    schemas: schemas,
    portService: portService,
    tokenService: tokenService,
    walletWatcher: WalletWatcher,
    trx
};

