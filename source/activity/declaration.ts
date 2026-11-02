import { EnvTokens } from "../modules";
import { Bot } from "grammy";
import fs from "fs";
import path from "path";

const config_path = path.join(__dirname, "..", ".conf", ".envtokens.json");
export const conf_data = JSON.parse(fs.readFileSync(config_path).toString()) as EnvTokens;
export const scarlett = new Bot(conf_data.scarlett_token);
export const middlegirl = new Bot(conf_data.middlegirl_token);
export const cservice = new Bot(conf_data.cservice_token).api;
export let admins = conf_data.admins;
export const steps = new Map<number, { step: string, timestamp: number, [k: string]: any }>();
