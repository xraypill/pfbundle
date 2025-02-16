import { createPumpFunToken } from "./createPumpFunToken.js";
import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";
import logger from "node-color-log";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tokenRaw = path.join(__dirname, "config.json");
const token = JSON.parse(fs.readFileSync(tokenRaw, "utf-8"));

logger.success("Started to create PumpFun with bundle.");
logger.info(`Starting to deploy ${token.name} $${token.ticker}`);
const mintAddress = await createPumpFunToken(
    token.name,
    token.ticker,
    token.description,
    token.x,
    token.tg,
    token.web
);

if (mintAddress.deployed) {
    let mintMsg = `\n\nCA: \`${mintAddress.ca}\``
    mintMsg += `\n\n${mintAddress.pumpFun}`
    logger.success(mintMsg)
}
