const mongoose = require("mongoose");
const dbconfig = require("./config/database.json");
const db = mongoose.connection;
const crypto = require("crypto");
let _ALL_ACCOUNTS; //_ALL_ACCOUNTS[0]._doc.accounts[0]._doc.currency
let _ALL_USERSAUTH; //_ALL_USERSAUTH[0]._doc.accessKey

function getSavedAccounts() {
  /*
    ACCESSKEY : {
        _id : 'ACCESSKEY',
        accessKey : 'ACCESSKEY',
        accounts : []
    },
    ACCESSKEY2 : {
    } ...
    */
  retJSON = {};
  for (var i in _ALL_ACCOUNTS) {
    let accessKey = _ALL_ACCOUNTS[i]._doc.accessKey;
    let accounts = _ALL_ACCOUNTS[i]._doc.accounts;
    retJSON[accessKey] = {
      _id: accessKey,
      accessKey: accessKey,
      accounts: accounts,
    };
  }
  return retJSON;
}

function getSavedUserAuth() {
  let retJSON = {};
  /*
        {"accessKey" : "secretKey", ...}
    */
  for (var i in _ALL_USERSAUTH) {
    accessKey = _ALL_USERSAUTH[i]._doc.accessKey;
    secretKey = _ALL_USERSAUTH[i]._doc.secretKey;
    retJSON[accessKey] = secretKey;
  }
  return retJSON;
}

async function mongooseConnect() {
  return new Promise((resolve, reject) => {
    mongoose
      .connect(dbconfig.mongodbURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true,
        useFindAndModify: false,
      })
      .then(() => resolve())
      .catch((error) => reject(error));
  });
}

db.on("error", function (err) {
  console.log("Unable to connect to database.  Error: " + err);
});
db.once("open", function () {
  console.log("Mongoose database connection established.");
});
db.on("disconnected", function () {
  console.log("MongoDB disconnected.  Attempting to reconnect...");
});
db.on("reconnected", function () {
  console.log("Mongoose reconnected.");
});

const userAuthStructure = {
  _id: String,
  accessKey: { type: String, unique: true },
  secretKey: String,
  defaultBalance: Number,
};

const orderStructure = {
  _id: String,
  accessKey: String,
  uuid: { type: String, unique: true },
  side: String,
  ord_type: String,
  price: Number,
  avg_price: Number,
  state: String,
  market: String,
  created_at: String,
  volume: Number,
  remaining_volume: String,
  reserved_fee: String,
  remaining_fee: String,
  paid_fee: String,
  locked: String,
  executed_volume: Number,
  trades_count: Number,
};

// const accountStructure = {
//     _id : String,
//     currency : String,
//     balance : String,
//     locked : String,
//     avg_buy_price : String,
//     avg_buy_price_modified : Boolean,
//     unit_currency : String,
//     timestamp : String
// }

const userAccountStructure = {
  _id: String,
  accessKey: { type: String, unique: true },
  accounts: {},
  // 배열로 하지말자...진짜..
};

const userAuthSchema = new mongoose.Schema(userAuthStructure);
const orderSchema = new mongoose.Schema(orderStructure);
const userAccountSchema = new mongoose.Schema(userAccountStructure);
const logSchema = new mongoose.Schema({
  timestamp: String,
  level: String,
  detail: mongoose.Schema.Types.Mixed,
  accessKey: String,
});

const userAuthModel = mongoose.model("userAuthModel", userAuthSchema);
const orderModel = mongoose.model("orderModel", orderSchema);
const userAccountModel = mongoose.model("userAccountModel", userAccountSchema);

async function saveErrorLog(accessKey, detail) {
  var instance = new logSchema({
    timestamp: new Date().toLocaleString("en", { timeZone: "Asia/Seoul" }),
    detail: detail,
    accessKey: accessKey,
  });
  ret = await instance.save();
  return ret;
}

async function saveOrderLog(accessKey, message) {
  try {
    let order = {
      _id: message.uuid,
      accessKey: accessKey,
      uuid: message.uuid,
      side: message.side,
      ord_type: message.ord_type,
      price: message.price,
      avg_price: message.avg_price,
      state: message.state,
      market: message.market,
      created_at: message.created_at,
      volume: message.volume,
      remaining_volume: message.remaining_volume,
      reserved_fee: message.reserved_fee,
      remaining_fee: message.remaining_fee,
      paid_fee: message.paid_fee,
      locked: message.locked,
      executed_volume: message.executed_volume,
      trades_count: message.trades_count,
    };
    var instance = new orderModel(order);
    let ret = await instance.save();
    return ret;
  } catch (E) {
    console.log(E);
    saveErrorLog(accessKey, E);
  }
}

// accessKey : String,
// secretKey : String,
// defaultBalance : Number,
async function addUserAuth(accessKey, secretKey, defaultBalance) {
  var user = new userAuthModel({
    _id: accessKey,
    accessKey: accessKey,
    secretKey: secretKey,
    defaultBalance: defaultBalance,
  });
  ret = await user.save();
  return ret;
}

async function addAccount(accessKey, balance) {
  var account = new userAccountModel({
    _id: accessKey,
    accessKey: accessKey,
    accounts: [
      {
        currency: "KRW",
        balance: balance.toString(),
        //locked:"0.0",
        //avg_buy_price:"0",
        //avg_buy_price_modified:false,
        //unit_currency: "KRW",
        timestamp: new Date().toLocaleString("en", { timeZone: "Asia/Seoul" }),
      },
      {
        currency: "BTC",
        balance: "2.0",
        avg_buy_price: "101000",
        timestamp: new Date().toLocaleString("en", { timeZone: "Asia/Seoul" }),
      },
    ],
    // accounts: {
    //     "KRW" : {
    //     //currency : "KRW",
    //     balance : balance.toString(),
    //     //locked:"0.0",
    //     //avg_buy_price:"0",
    //     //avg_buy_price_modified:false,
    //     //unit_currency: "KRW",
    //     timestamp : new Date().toLocaleString('en', {timeZone: "Asia/Seoul"})
    //     } ,
    //     "BTC" : {
    //     currency:"BTC",
    //     balance:"2.0",
    //     //locked:"0.0",
    //     avg_buy_price:"101000",
    //     //avg_buy_price_modified:false,
    //     //unit_currency:"KRW",
    //     timestamp:new Date().toLocaleString('en', {timeZone: "Asia/Seoul"})
    //     }
  });
  ret = await account.save();
  return ret;
}

async function loadAllAccountAndAuth() {
  ret = await userAccountModel.find();
  _ALL_ACCOUNTS = ret;
  ret = await userAuthModel.find();
  _ALL_USERSAUTH = ret;
}

async function makeAccountAndAuth(accessKey, balance) {
  secretKey = crypto
    .createHash("sha256")
    .update(dbconfig.hashkey + accessKey)
    .digest("base64");
  //var secretKey = crypto.randomBytes(32).toString('hex');
  ret = await addUserAuth(accessKey, secretKey, balance);
  ret = await addAccount(accessKey, balance);
}

async function saveAccount(accessKey, account) {
  timestamp = new Date().toLocaleString("en", { timeZone: "Asia/Seoul" });

  var dynSet = { $set: { accounts: account } };
  //var dynSet = {"accounts":{"KRW":{"balance":KRW_balance, "timestamp":timestamp}}};
  //dynSet.accounts[market] = {balance:market_balance, avg_buy_price:avg_buy_price, timestamp:timestamp}
  result = await userAccountModel.findByIdAndUpdate(accessKey, dynSet, {
    new: true, //true 여야지 반환하는 값이 업데이트된 데이터임.
  });
  return result;
}

//https://backend-intro.vlpt.us/2/05.html

async function getAccount(accessKey) {
  result = await userAccountModel.findById(accessKey);
  return result;
}

async function init() {
  let ret = await mongooseConnect();
  await loadAllAccountAndAuth();
}
//init()
async function initCreate() {
  init();
  testAccessKey = "TEST_ACCESSKEY3";
  try {
    let balance = 1000000;
    ret = await makeAccountAndAuth(testAccessKey, balance);
    console.log(ret);
  } catch (E) {
    console.log(E);
  }
  ret = await getAccount(testAccessKey);
  console.log(ret);
  //ret = await saveAccount(testAccessKey,tmpaccounts)
}
initCreate();

module.exports = {
  init,
  getAccount,
  saveAccount,
  saveErrorLog,
  saveOrderLog,
  _ALL_ACCOUNTS,
  _ALL_USERSAUTH,
  getSavedAccounts,
  getSavedUserAuth,
};
