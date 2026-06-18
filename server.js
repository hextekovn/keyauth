const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const http = require("http");
const socketIO = require("socket.io");

const {
Key,
App,
Config,
Message,
User,
Image
} = require("./models");

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// Ensure uploads directory exists
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = ["image/jpeg", "image/png", "image/webp"];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only jpg, png, webp are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Rate limiting for messages
const messageRateLimit = new Map();

// LỖI 4: Thêm cleanup cho messageRateLimit Map để tránh memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, time] of messageRateLimit) {
    if (now - time > 60000) {
      messageRateLimit.delete(key);
    }
  }
}, 60000);

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

// Auto cleanup expired images every 60 seconds
setInterval(async () => {
  try {
    const expiredImages = await Image.find({
      expire_at: { $lt: new Date() }
    });

    for (const img of expiredImages) {
      // LỖI 1: Sửa đường dẫn file
      const filePath = path.join(__dirname, img.image_url.replace("/uploads/", "uploads/"));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      // Delete from database
      await Image.deleteOne({ _id: img._id });
    }
  } catch (err) {
    console.error("Cleanup error:", err);
  }
}, 60000);

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

// Validate key
async function validateKey(key) {
  if (!key || typeof key !== "string" || key.trim().length === 0) {
    return null;
  }

  const item = await Key.findOne({ key });
  
  if (!item) return null;
  
  if (item.status !== "active") return null;
  
  if (item.expires_at !== "forever" && new Date(item.expires_at) < new Date()) {
    return null;
  }

  return item;
}

// Check spam
function checkSpamLimit(key) {
  const now = Date.now();
  const limit = messageRateLimit.get(key) || 0;
  
  if (now - limit < 1000) {
    return true; // Spam detected
  }
  
  messageRateLimit.set(key, now);
  return false;
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
  return res.json({ success: false, message: "Thiếu dữ liệu" });
}

// Validate message length
if (message.length > 1000) {
  return res.json({ success: false, message: "Tin nhắn vượt quá 1000 ký tự" });
}

// Check spam
if (checkSpamLimit(key)) {
  return res.json({ success: false, message: "Bạn đang gửi tin nhắn quá nhanh" });
}

const user = await validateKey(key);
if (!user) {
  return res.json({ success: false, message: "Key không hợp lệ" });
}

const msg = await Message.create({
  sender: user.owner,
  owner: user.owner,
  message: message.trim(),
  type: "text"
});

// Emit via Socket.IO
io.emit("new_message", {
  _id: msg._id,
  sender: msg.sender,
  message: msg.message,
  created_at: msg.created_at
});

return res.json({ success: true, data: msg });
}

if (action === "get_messages") {
const key = req.query.key;
const page = parseInt(req.query.page) || 1;
const limit = parseInt(req.query.limit) || 20;

if (!key) {
  return res.json({ success: false, message: "Thiếu key" });
}

const user = await validateKey(key);
if (!user) {
  return res.json({ success: false, message: "Key không hợp lệ" });
}

const skip = (page - 1) * limit;

const [messages, total] = await Promise.all([
  Message.find()
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(limit),
  Message.countDocuments()
]);

return res.json({
  success: true,
  data: messages.reverse(),
  pagination: {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit)
  }
});
}

if (action === "clear_messages") {
const admin = req.query.keyadmin;

if (!(await authAdmin(admin))) {
  return res.json({ success: false, message: "Unauthorized" });
}

await Message.deleteMany({});
return res.json({ success: true, message: "Đã xóa toàn bộ tin nhắn" });
}

if (action === "set_avatar") {
const key = req.query.key;
const avatar = req.query.avatar;

if (!key || !avatar) {
  return res.json({ success: false, message: "Thiếu dữ liệu" });
}

// Validate URL
if (!/^https?:\/\/.+/.test(avatar)) {
  return res.json({ success: false, message: "URL không hợp lệ" });
}

const item = await validateKey(key);
if (!item) {
  return res.json({ success: false, message: "Key không hợp lệ" });
}

let user = await User.findOne({ owner: item.owner });

if (!user) {
  user = await User.create({
    owner: item.owner,
    key: item.key,
    avatar
  });
} else {
  user.avatar = avatar;
  await user.save();
}

return res.json({ success: true, avatar: user.avatar });
}

if (action === "get_profile") {
const key = req.query.key;

if (!key) {
  return res.json({ success: false, message: "Thiếu key" });
}

const item = await validateKey(key);
if (!item) {
  return res.json({ success: false, message: "Key không hợp lệ" });
}

const user = await User.findOne({ owner: item.owner });

return res.json({
  success: true,
  data: {
    owner: item.owner,
    avatar: user?.avatar || "",
    app_name: item.app_name,
    created_at: item.created_at
  }
});
}

return res.json({
success: false,
message:
"Action không hợp lệ"
});

});

// Profile API - /profile?key=
app.get("/profile", async (req, res) => {
const key = req.query.key;

if (!key) {
  return res.json({ success: false, message: "Thiếu key" });
}

const item = await validateKey(key);
if (!item) {
  return res.json({ success: false, message: "Key không hợp lệ" });
}

const user = await User.findOne({ owner: item.owner });

// Update last_seen
if (user) {
  user.last_seen = new Date();
  await user.save();
}

// LỖI 5: Xóa used_count khỏi response
return res.json({
  success: true,
  data: {
    owner: item.owner,
    avatar: user?.avatar || "",
    app_name: item.app_name,
    created_at: item.created_at
  }
});
});

// CheckKey API - increment used_count on successful validation
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

// Increment used_count on successful validation
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

// Upload image
app.post("/upload", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.json({ success: false, message: "Không có file" });
  }

  const key = req.query.key;
  if (!key) {
    return res.json({ success: false, message: "Thiếu key" });
  }

  const user = await validateKey(key);
  if (!user) {
    return res.json({ success: false, message: "Key không hợp lệ" });
  }

  const imageUrl = `/uploads/${req.file.filename}`;
  const expireAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  const img = await Image.create({
    sender: user.owner,
    image_url: imageUrl,
    expire_at: expireAt
  });

  // LỖI 3: Thêm emit realtime sau khi upload ảnh
  const msg = await Message.create({
    sender: user.owner,
    owner: user.owner,
    message: imageUrl,
    type: "image"
  });

  io.emit("new_message", {
    _id: msg._id,
    sender: msg.sender,
    message: msg.message,
    type: "image",
    created_at: msg.created_at
  });

  return res.json({
    success: true,
    image_url: imageUrl,
    expire_at: expireAt,
    data: img
  });
});

// Socket.IO connection
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });

  // LỖI 2: Đổi tất cả socket.emit("error") thành socket.emit("chat_error")
  socket.on("send_message", async (data) => {
    try {
      const { key, message } = data;

      if (!key || !message) {
        socket.emit("chat_error", { message: "Thiếu dữ liệu" });
        return;
      }

      if (message.length > 1000) {
        socket.emit("chat_error", { message: "Tin nhắn vượt quá 1000 ký tự" });
        return;
      }

      if (checkSpamLimit(key)) {
        socket.emit("chat_error", { message: "Bạn đang gửi tin nhắn quá nhanh" });
        return;
      }

      const user = await validateKey(key);
      if (!user) {
        socket.emit("chat_error", { message: "Key không hợp lệ" });
        return;
      }

      const msg = await Message.create({
        sender: user.owner,
        owner: user.owner,
        message: message.trim(),
        type: "text"
      });

      io.emit("new_message", {
        _id: msg._id,
        sender: msg.sender,
        message: msg.message,
        created_at: msg.created_at
      });
    } catch (err) {
      socket.emit("chat_error", { message: "Lỗi server" });
    }
  });
});

const PORT =
process.env.PORT || 3000;

server.listen(PORT, () => {

console.log(
"HEXTEKO MongoDB API Running:",
PORT
);

});
