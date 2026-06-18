const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");

const {
Key,
App,
Config,
Message,
User,
Image
} = require("./models");

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
.then(async () => {

console.log("MongoDB Connected");

let cfg =
await Config.findOne();

if (!cfg) {

await Config.create({
  admin_key: "admin123"
});

console.log(
  "Default admin created"
);

}

})
.catch(err => {
console.error(err);
});

async function getAdminKey() {

const cfg =
await Config.findOne();

return cfg
? cfg.admin_key
: "admin123";
}

async function authAdmin(key) {

const admin =
await getAdminKey();

return key === admin;
}

function calculateExpiry(input) {

if (
input === "vv" ||
input === "vinhvien" ||
input === "forever"
) {
return "forever";
}

const match =
input.match(/(\d+)([dmy])/);

if (!match) {

const d =
  new Date();

d.setDate(
  d.getDate() + 30
);

return d
  .toISOString()
  .slice(0, 19)
  .replace("T", " ");

}

const number =
parseInt(match[1]);

const unit =
match[2];

const date =
new Date();

if (unit === "d")
date.setDate(
date.getDate() + number
);

if (unit === "m")
date.setMonth(
date.getMonth() + number
);

if (unit === "y")
date.setFullYear(
date.getFullYear() + number
);

return date
.toISOString()
.slice(0, 19)
.replace("T", " ");
}


app.get("/", async (req, res) => {

const action = req.query.action;

if (!action) {
    return res.sendFile(
        path.join(__dirname, "index.html")
    );
}

if (action === "create_app") {

const admin =
  req.query.keyadmin;

const appname =
  req.query.appname;

const description =
  req.query.description || "";

if (!(await authAdmin(admin))) {

  return res.json({
    success: false,
    message:
      "Unauthorized"
  });
}

const exists =
  await App.findOne({
    app_name:
      appname
  });

if (exists) {

  return res.json({
    success: false,
    message:
      "App đã tồn tại"
  });
}

const appInfo =
  await App.create({

    app_name:
      appname,

    description,

    created_at:
      new Date()
      .toISOString()
      .slice(0, 19)
      .replace("T", " "),

    total_keys: 0,

    status: "active"
  });

return res.json({
  success: true,
  message:
    "Tạo app thành công",
  data:
    appInfo
});

}

if (action === "list_apps") {

const admin =
  req.query.keyadmin;

if (!(await authAdmin(admin))) {

  return res.json({
    success: false,
    message:
      "Unauthorized"
  });
}

const apps =
  await App.find();

return res.json({
  success: true,
  data: apps
});

}

if (action === "taokey") {

const admin =
  req.query.keyadmin;

const key =
  req.query.key;

const expiry =
  req.query.expiry;

const owner =
  req.query.owner;

const note =
  req.query.note || "";

const appname =
  req.query.appname;

if (!(await authAdmin(admin))) {

  return res.json({
    success: false,
    message:
      "Unauthorized"
  });
}

const appData =
  await App.findOne({
    app_name:
      appname
  });

if (!appData) {

  return res.json({
    success: false,
    message:
      "App không tồn tại"
  });
}

const exists =
  await Key.findOne({
    key
  });

if (exists) {

  return res.json({
    success: false,
    message:
      "Key đã tồn tại"
  });
}

const keyData =
  await Key.create({

    key,

    owner,

    note,

    app_name:
      appname,

    created_at:
      new Date()
      .toISOString()
      .slice(0, 19)
      .replace("T", " "),

    expires_at:
      calculateExpiry(expiry),

    status: "active",

    used_count: 0
  });

appData.total_keys++;

await appData.save();

return res.json({
  success: true,
  message:
    "Tạo key thành công",
  data:
    keyData
});

}
  if (action === "update_key") {

const admin =
  req.query.keyadmin;

const key =
  req.query.key;

if (!(await authAdmin(admin))) {

  return res.json({
    success: false,
    message: "Unauthorized"
  });
}

const item =
  await Key.findOne({
    key
  });

if (!item) {

  return res.json({
    success: false,
    message:
      "Key không tồn tại"
  });
}

if (req.query.owner)
  item.owner =
    req.query.owner;

if (req.query.note)
  item.note =
    req.query.note;

if (req.query.status)
  item.status =
    req.query.status;

if (req.query.expiry)
  item.expires_at =
    calculateExpiry(
      req.query.expiry
    );

await item.save();

return res.json({
  success: true,
  message:
    "Cập nhật thành công"
});

}

if (action === "delete_key") {

const admin =
  req.query.keyadmin;

const key =
  req.query.key;

if (!(await authAdmin(admin))) {

  return res.json({
    success: false,
    message:
      "Unauthorized"
  });
}

const item =
  await Key.findOne({
    key
  });

if (!item) {

  return res.json({
    success: false,
    message:
      "Key không tồn tại"
  });
}

const appData =
  await App.findOne({
    app_name:
      item.app_name
  });

if (
  appData &&
  appData.total_keys > 0
) {

  appData.total_keys--;

  await appData.save();
}

await Key.deleteOne({
  key
});

return res.json({
  success: true,
  message:
    "Xóa key thành công"
});

}

if (action === "listkey") {

const admin =
  req.query.keyadmin;

const filter =
  req.query.app_filter;

if (!(await authAdmin(admin))) {

  return res.json({
    success: false,
    message:
      "Unauthorized"
  });
}

let result;

if (
  filter &&
  filter !== "all"
) {

  result =
    await Key.find({
      app_name:
        filter
    });

} else {

  result =
    await Key.find();
}

return res.json({
  success: true,
  total:
    result.length,
  data:
    result
});

}

if (
action ===
"change_admin_key"
) {

const oldKey =
  req.query.oldkey;

const newKey =
  req.query.newkey;

if (
  !(await authAdmin(oldKey))
) {

  return res.json({
    success: false,
    message:
      "Admin key không đúng"
  });
}

const cfg =
  await Config.findOne();

cfg.admin_key =
  newKey;

await cfg.save();

return res.json({
  success: true,
  message:
    "Đổi admin key thành công"
});

}

if (action === "verify_admin") {

  const keyadmin =
    req.query.keyadmin;

  if (!(await authAdmin(keyadmin))) {

    return res.json({
      success: false,
      message: "Admin key không hợp lệ"
    });

  }

  const apps =
    await App.countDocuments();

  const keys =
    await Key.countDocuments();

  return res.json({
    success: true,
    message: "Login thành công",
    stats: {
      apps,
      keys
    }
  });

}

if (action === "send_message") {
const key = req.query.key;
const message = req.query.message;
if (!key || !message) {
return res.json({ success:false, message:"Thiếu dữ liệu" });
}
const user = await Key.findOne({ key });
if (!user) {
return res.json({ success:false, message:"Key không hợp lệ" });
}
const msg = await Message.create({
sender:user.owner,
owner:user.owner,
message,
type:"text"
});
return res.json({ success:true, data:msg });
}

if (action === "get_messages") {
const messages = await Message.find().sort({ created_at:-1 }).limit(100);
return res.json({ success:true, data:messages });
}

if (action === "clear_messages") {
const admin = req.query.keyadmin;
if (!(await authAdmin(admin))) {
return res.json({ success:false, message:"Unauthorized" });
}
await Message.deleteMany({});
return res.json({ success:true, message:"Đã xóa toàn bộ tin nhắn" });
}

if (action === "set_avatar") {
const key = req.query.key;
const avatar = req.query.avatar;
const item = await Key.findOne({ key });
if (!item) {
return res.json({ success:false, message:"Key không hợp lệ" });
}
let user = await User.findOne({ owner:item.owner });
if (!user) {
user = await User.create({
owner:item.owner,
key:item.key,
avatar
});
} else {
user.avatar = avatar;
await user.save();
}
return res.json({ success:true, avatar:user.avatar });
}

if (action === "get_profile") {
const key = req.query.key;
const item = await Key.findOne({ key });
if (!item) {
return res.json({ success:false, message:"Key không hợp lệ" });
}
const user = await User.findOne({ owner:item.owner });
return res.json({ success:true, data:{ owner:item.owner, avatar:user?.avatar || "" } });
}

return res.json({
success: false,
message:
"Action không hợp lệ"
});

});

app.get(
"/checkkey",
async (req, res) => {

const key =
req.query.key;

if (!key) {

return res.json({
  success: false,
  message:
    "Thiếu key"
});

}

const item =
await Key.findOne({
key
});

if (!item) {

return res.json({
  success: false,
  message:
    "Key không tồn tại",
  status:
    "not_found"
});

}

if (
item.status !==
"active"
) {

return res.json({
  success: false,
  message:
    "Key đã bị vô hiệu hóa",
  status:
    "inactive"
});

}

if (
item.expires_at !==
"forever" &&
new Date(
item.expires_at
) < new Date()
) {

return res.json({
  success: false,
  message:
    "Key đã hết hạn",
  status:
    "expired"
});

}

item.used_count++;

await item.save();

return res.json({
success: true,
message:
"Key hợp lệ",
data: {
key:
item.key,
owner:
item.owner,
app_name:
item.app_name,
note:
item.note,
used_count:
item.used_count,
expires_at:
item.expires_at ===
"forever"
? "Vĩnh viễn"
: item.expires_at,
created_at:
item.created_at,
status:
item.status
}
});

});

const PORT =
process.env.PORT || 3000;

app.listen(PORT, () => {

console.log(
"HEXTEKO MongoDB API Running:",
PORT
);

});
