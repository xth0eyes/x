import { fastify as fast } from "fastify";
import { Update } from "@grammyjs/types";
import { steps } from "./declaration";
import { CServiceTextHandler, CServiceCallbackHandler } from "./cservice_handlers";


const app = fast({ logger: false });

app.post("/CService", async (request, reply) => {
    await reply.send("OK");
    const update = request.body as Update;

    if (update.message){
        if (update.message.text){
            await CServiceTextHandler(update);
        }
    } else if (update.callback_query){
        await CServiceCallbackHandler(update);
    }
});


app.listen({ host: "127.0.0.1", port: 10000 }, (err, addr) => {
    if (err) console.error("[cservice] error", err.message);
    if (addr) console.log("[cservice] address", addr);
});

setInterval(async () => {
    for (const ent of steps.entries()){
        if ((ent[1].timestamp + 300000) < Date.now()){
            steps.delete(ent[0]);
        }
    }
}, 7000);
