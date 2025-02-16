# 🚀 PumpFun Auto-Deployment & Trading Bot  

This repository provides an automated setup for launching a **PumpFun** token, along with an initial **purchase distribution across 15 wallets**. It handles everything from deployment to trading execution.  

---

## 📌 Installation  

Before starting, install all required dependencies:  

```sh
npm install
```

---

## ⚙️ Configuration (`config.json`)  

The **`config.json`** file contains all necessary settings for launching and trading the token. Below is a breakdown of each field:  

```json
{
    "name": "Name Of The Token",
    "ticker": "TICKER",
    "description": "Description of the token",
    "x": "https://x.com/link_to_x",
    "tg": "https://t.me/link_to_tg",
    "web": "https://website.com",
    "dev": "PRIVATE_KEY_OF_DEV",
    "buyers": [
        "PRIVATE_KEY_OF_BUYER",
        "PRIVATE_KEY_OF_BUYER",
        "PRIVATE_KEY_OF_BUYER",
        "PRIVATE_KEY_OF_BUYER",
        "PRIVATE_KEY_OF_BUYER",
        "PRIVATE_KEY_OF_BUYER",
        "PRIVATE_KEY_OF_BUYER",
        "PRIVATE_KEY_OF_BUYER",
        "PRIVATE_KEY_OF_BUYER",
        "PRIVATE_KEY_OF_BUYER",
        "PRIVATE_KEY_OF_BUYER",
        "PRIVATE_KEY_OF_BUYER",
        "PRIVATE_KEY_OF_BUYER",
        "PRIVATE_KEY_OF_BUYER",
        "PRIVATE_KEY_OF_BUYER"
    ],
    "solValues": [
        "0.5",
        "0.5",
        "0.5",
        "0.5",
        "0.5",
        "0.5",
        "0.5",
        "0.5",
        "0.5",
        "0.5",
        "0.5",
        "1",
        "1",
        "1",
        "1"
    ],
    "mintKeypairs": [
        "[133,103,71,25,212,130,167,3,143,157,18,193,92,234,142,235,100,24,113,241,177,55,107,7,227,91,160,25,24,61,162,2,9,155,206,172,164,57,164,171,74,6,255,133,253,94,135,45,94,224,126,1,212,156,92,72,175,192,80,182,67,202,177,95]"
    ]
}
```

### 🛠 Config Explanation  

#### **🔹 `dev`**  
The private key of the **developer wallet** (used for deploying the token). (Dev initially buying only 0.1sol (there should be atleast 0.25 sol)) 

#### **🔹 `buyers`**  
An array containing the **private keys of buyer wallets** that will execute purchases in a bundle.  

#### **🔹 `solValues`**  
The **amount of SOL each wallet will use for the purchase**, in order from top to bottom.  
- It's recommended to **add an extra 0.03 SOL** to each wallet for transaction fees.  
- If a wallet is set to buy **0.5 SOL**, ensure it has at least **0.54 SOL** loaded.  

#### **🔹 `mintKeypairs`**  
The **private key of the token mint wallet**, which is required for managing liquidity and supply.  

---

## 🔑 Generating `mintKeypairs`   

You need to **generate a new mint keypair** with pump sufix before deploying your token. Use the following command:  

```sh
solana-keygen grind --ends-with pump:1
```

Then, open the private key from file ***pump.json.
Copy the **array of numbers** and paste it inside `"mintKeypairs"` in `config.json`.  

---

## 🖼 Setting the Token Image

This repository includes a placeholder file image.png. To set your token's image, simply replace image.png with your own .png file (keeping the same filename and format).

Make sure the file is correctly formatted and is a square image for the best display results on Solana platforms (500x500 for example);

---

## 🚀 Running the Bot  

Once everything is configured, start the process:  

```sh
node start.js
```

The bot will:  
✅ Deploy the token  
✅ Execute initial purchases from 15 wallets  
✅ Manage transactions automatically  

---

## 📢 Notes  

- Ensure all wallets have **enough SOL** for buying and selling, considering transaction fees.  
- Double-check that `config.json` contains valid private keys.  
- This setup **automates deployment**, making it **ideal for PumpFun launches**.  

---

### 🎯 **You're ready to go!** Happy trading! 🚀🔥

