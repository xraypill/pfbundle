import {
    Keypair,
    VersionedTransaction,
} from "@solana/web3.js";
import bs58 from "bs58";
import fs from "fs";
import FormData from "form-data";
import { fileURLToPath } from "url";
import path from "path";
import fetch from "node-fetch";
import logger from "node-color-log";


// 1. Import the JitoJsonRpcClient
import { JitoJsonRpcClient } from "jito-js-rpc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Fetches transactions from PumpPortal (or your custom API), signs them, 
 * and sends them to Jito using jito-js-rpc. Then it checks inflight 
 * and final statuses using jitoClient's helper methods.
 * 
 * @param {Object[]} bundledTxArgs - Array of transaction definitions
 * @param {Keypair} mintKeypair - Mint keypair
 * @param {Keypair} devKeyPair - Developer's keypair
 * @param {Keypair[]} buyerKeyPairs - Array of buyer wallets
 */
async function processAndSendTransactions(bundledTxArgs, mintKeypair, devKeyPair, buyerKeyPairs) {
    // Create the Jito client instance (Amsterdam endpoint example).
    // If you have a Jito API key (UUID), pass it as the second argument, otherwise leave empty.
    const jitoClient = new JitoJsonRpcClient(
        "https://amsterdam.mainnet.block-engine.jito.wtf/api/v1",
        ""
    );

    console.log("🚀 Sending request to PumpPortal API...");
    const response = await fetch("https://pumpportal.fun/api/trade-local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bundledTxArgs),
    });

    if (!response.ok) {
        console.error("❌ Error in transaction request:", response.statusText);
        return false;
    }

    const transactions = await response.json();
    if (!Array.isArray(transactions) || transactions.length === 0) {
        console.error("❌ No transactions returned from PumpPortal.");
        return false;
    }

    let signedTransactions = [];

    // For each item in 'transactions', sign:
    // - index 0 => create, sign with (mintKeypair + devKeyPair)
    // - subsequent indexes => chunk of up to 5 buyers
    //   (the transaction includes multiple buy instructions for these 5)
    let buyerIndex = 0;
    for (let i = 0; i < transactions.length; i++) {
        // Deserialize the transaction
        const txBytes = bs58.decode(transactions[i]);
        const tx = VersionedTransaction.deserialize(new Uint8Array(txBytes));

        if (i === 0) {
            // The create transaction
            tx.sign([mintKeypair, devKeyPair]);
        } else {
            // Each subsequent transaction is for up to 5 buyers
            const signers = buyerKeyPairs.slice(buyerIndex, buyerIndex + 5);
            buyerIndex += signers.length;

            tx.sign(signers);
        }

        // Re-serialize it to base58
        signedTransactions.push(bs58.encode(tx.serialize()));
    }

    try {
        // jitoClient.sendBundle requires an array of arrays
        // We'll just put them all in one group for simplicity,
        // or you can split them if you want separate confirmations per chunk
        console.log("📡 Sending Jito Bundle (via jito-js-rpc)...");
        const bundleGroups = [signedTransactions]; // all in one group
        const result = await jitoClient.sendBundle(bundleGroups);

        // The result.result contains the bundle ID
        const bundleId = result.result;
        console.log("✅ Bundle sent successfully! Bundle ID:", bundleId);

        // 3. Confirm inflight bundle with a timeout (e.g., 120 seconds)
        console.log("⌛ Waiting for inflight confirmation...");
        const inflightStatus = await jitoClient.confirmInflightBundle(bundleId, 120000);
        console.log("Inflight bundle status:", inflightStatus);

        if (inflightStatus.confirmation_status === "confirmed") {
            console.log(`Bundle successfully confirmed on-chain at slot ${inflightStatus.slot}`);

            // 4. (Optional) Additional final check
            console.log("🚀 Checking final status with getBundleStatuses...");
            const finalStatus = await jitoClient.getBundleStatuses([[bundleId]]);

            console.log("Final bundle status response:", JSON.stringify(finalStatus, null, 2));
            if (finalStatus?.result?.value?.length > 0) {
                const status = finalStatus.result.value[0];
                console.log("Confirmation status:", status.confirmation_status);
                console.log("Transactions found in this bundle:", status.transactions);
                console.log("Explorer link: https://explorer.jito.wtf/bundle/" + bundleId);
                return true;
            } else {
                console.warn("Unexpected final bundle status response structure.");
                return false;
            }
        } else if (inflightStatus.err) {
            console.error("Bundle processing failed:", inflightStatus.err);
            return false;

        } else {
            console.warn("Bundle not confirmed within the given timeout, or status is unexpected.");
            return false;

        }
    } catch (error) {
        console.error("❌ Error sending or confirming bundle via jitoClient:", error);
        return false;
    }
}

export async function createPumpFunToken(name, ticker, description, x = "", tg = "", web = "") {
    try {
        console.log("🔑 Loading config from config.json...");
        // Read the config file

        const keysPath = path.join(__dirname, "config.json");
        const keysJson = JSON.parse(fs.readFileSync(keysPath, "utf-8"));

        if (!keysJson.dev) {
            logger.bgColorLog('red', "❌❌❌ MISSING CONFIG FILE!!!!")
            return {
                pumpFun: `❌ MISSING CONFIG FILE!`,
                photon: `❌ MISSING CONFIG FILE!`
            }
        }
        // Extract dev wallet
        const devKeyPair = Keypair.fromSecretKey(bs58.decode(keysJson.dev));

        // Extract buyer wallets
        const buyerKeyPairs = keysJson.buyers.map(buyerBase58 => {
            return Keypair.fromSecretKey(bs58.decode(buyerBase58));
        });
        const solValues = keysJson.solValues || [];
        // Extract the first mint keypair (if you have multiple, adjust as needed)
        const firstMintKeyArray = JSON.parse(keysJson.mintKeypairs[0]); // parse the first string into an array
        const mintKeypair = Keypair.fromSecretKey(Uint8Array.from(firstMintKeyArray));
        console.log("🔑 Loaded dev, buyers, and mint key from keys.json.");

        // Load your token image
        console.log("📂 Loading image for token metadata...");
        const imagePath = path.join(__dirname, "image.png");
        if (!fs.existsSync(imagePath)) {
            throw new Error("❌ image.png not found in the directory!");
        }

        // Prepare token metadata
        let tokenMetadata = {
            name: name,
            symbol: ticker,
            description: description,
            twitter: x,
            telegram: tg,
            website: web,
            file: fs.readFileSync(imagePath),
        };

        // Upload metadata to IPFS
        console.log("📂 Uploading token metadata to IPFS...");
        const formData = new FormData();
        formData.append("file", tokenMetadata.file, {
            filename: "image.png",
            contentType: "image/png",
        });
        formData.append("name", tokenMetadata.name);
        formData.append("symbol", tokenMetadata.symbol);
        formData.append("description", tokenMetadata.description || "");
        formData.append("twitter", tokenMetadata.twitter || "");
        formData.append("telegram", tokenMetadata.telegram || "");
        formData.append("website", tokenMetadata.website || "");
        formData.append("showName", "true");

        const metadataResponse = await fetch("https://pump.fun/api/ipfs", {
            method: "POST",
            body: formData,
        });

        if (!metadataResponse.ok) {
            throw new Error(`❌ Metadata upload failed: ${metadataResponse.statusText}`);
        }

        const metadataResponseJSON = await metadataResponse.json();
        console.log("✅ Metadata uploaded:", metadataResponseJSON);

        // Now build the array we send to PumpPortal: the create + the buys
        console.log("📦 Creating pumpportal bundle arguments...");

        // 1) The CREATE transaction
        let bundledTxArgs = [
            {
                publicKey: devKeyPair.publicKey.toBase58(),
                action: "create",
                tokenMetadata: {
                    name: tokenMetadata.name,
                    symbol: tokenMetadata.symbol,
                    uri: metadataResponseJSON.metadataUri,
                },
                mint: mintKeypair.publicKey.toBase58(),
                denominatedInSol: "true",
                amount: 0.1,
                slippage: 50,
                priorityFee: 0.01,
                pool: "pump",
            }
        ];

        // 2) The BUY transactions (one per buyer) using the solValues from config
        let buyTxs = buyerKeyPairs.map((wallet, index) => {
            const amountForBuyer = parseFloat(solValues[index]) || 0.5; // fallback if index out of range or parse fails
            return {
                publicKey: wallet.publicKey.toBase58(),
                action: "buy",
                mint: mintKeypair.publicKey.toBase58(),
                denominatedInSol: "true",
                amount: amountForBuyer, // use the buyer's corresponding solValue
                slippage: 50,
                priorityFee: 0.003,
                pool: "pump",
            };
        });

        // Combine them into one array
        bundledTxArgs.push(...buyTxs);
        // Process, sign, and send the transactions via jitoClient
        const wasSuccessful = await processAndSendTransactions(
            bundledTxArgs,
            mintKeypair,
            devKeyPair,
            buyerKeyPairs
        );

        // If everything was confirmed, return links
        if (wasSuccessful) {
            return {
                deployed: true,
                ca: mintKeypair.publicKey.toBase58(),
                pumpFun: `https://pump.fun/coin/${mintKeypair.publicKey.toBase58()}`,
                photon: `https://photon-sol.tinyastro.io/en/lp/${mintKeypair.publicKey.toBase58()}`
            };
        } else {
            // If not confirmed or failed, return only deployed = false
            return { deployed: false };
        }
    } catch (error) {
        logger.bgColorLog('red', "❌❌❌ SOMETHING WRONG WITH CONFIG FILE!!!!");
        logger.error("❌ Error in createPumpFunToken:", error.message);
        // In case of any error, also return deployed = false
        return { deployed: false };
    }
}