const express = require("express");
const cors = require("cors");
const fs = require("fs");

const app = express();

app.use(cors());
app.use(express.json());

const DB_FILE = "./keys.json";

function readDB() {
if (!fs.existsSync(DB_FILE)) {
const initData = {
keys: [],
admin_keys: ["admin123"],
apps: []
};

fs.writeFileSync(
  DB_FILE,
  JSON.stringify(initData, null, 2)
);

return initData;

}

return JSON.parse(
fs.readFileSync(DB_FILE, "utf8")
);
}

function writeDB(data) {
fs.writeFileSync(
DB_FILE,
JSON.stringify(data, null, 2)
);
}

function authAdmin(key, db) {
return (
db.admin_keys.includes(key) ||
key === "admin123"
);
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

const d = new Date();

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

const unit = match[2];

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

app.get("/", (req, res) => {

const action =
req.query.action;

const db = readDB();

if (!action) {

return res.json({
  success: true,
  message: "HEXTEKO API Online"
});

}

if (action === "create_app") {

const admin =
  req.query.keyadmin;

const appname =
  req.query.appname;

const description =
  req.query.description || "";

if (
  !authAdmin(admin, db)
) {
  return res.json({
    success: false,
    message:
      "Unauthorized"
  });
}

const exists =
  db.apps.find(
    x =>
      x.app_name === appname
  );

if (exists) {

  return res.json({
    success: false,
    message:
      "App đã tồn tại"
  });
}

const appInfo = {
  app_name: appname,
  description,
  created_at:
    new Date()
      .toISOString()
      .slice(0, 19)
      .replace(
        "T",
        " "
      ),
  total_keys: 0,
  status: "active"
};

db.apps.push(appInfo);

writeDB(db);

return res.json({
  success: true,
  message:
    "Tạo app thành công",
  data: appInfo
});

}

if (action === "list_apps") {

const admin =
  req.query.keyadmin;

if (
  !authAdmin(admin, db)
) {
  return res.json({
    success: false,
    message:
      "Unauthorized"
  });
}

return res.json({
  success: true,
  data: db.apps
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

if (
  !authAdmin(admin, db)
) {
  return res.json({
    success: false,
    message:
      "Unauthorized"
  });
}

const app =
  db.apps.find(
    x =>
      x.app_name === appname
  );

if (!app) {

  return res.json({
    success: false,
    message:
      "App không tồn tại"
  });
}

const exists =
  db.keys.find(
    x =>
      x.key === key
  );

if (exists) {

  return res.json({
    success: false,
    message:
      "Key đã tồn tại"
  });
}

const data = {
  key,
  owner,
  note,
  app_name: appname,
  created_at:
    new Date()
      .toISOString()
      .slice(0, 19)
      .replace(
        "T",
        " "
      ),
  expires_at:
    calculateExpiry(
      expiry
    ),
  status: "active",
  used_count: 0
};

db.keys.push(data);

app.total_keys++;

writeDB(db);

return res.json({
  success: true,
  message:
    "Tạo key thành công",
  data
});

}

if (action === "update_key") {

const admin =
  req.query.keyadmin;

const key =
  req.query.key;

if (
  !authAdmin(admin, db)
) {
  return res.json({
    success: false,
    message:
      "Unauthorized"
  });
}

const item =
  db.keys.find(
    x =>
      x.key === key
  );

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

writeDB(db);

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

if (
  !authAdmin(admin, db)
) {
  return res.json({
    success: false,
    message:
      "Unauthorized"
  });
}

const index =
  db.keys.findIndex(
    x =>
      x.key === key
  );

if (index === -1) {

  return res.json({
    success: false,
    message:
      "Key không tồn tại"
  });
}

const item =
  db.keys[index];

db.keys.splice(
  index,
  1
);

const app =
  db.apps.find(
    x =>
      x.app_name ===
      item.app_name
  );

if (
  app &&
  app.total_keys > 0
) {
  app.total_keys--;
}

writeDB(db);

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

if (
  !authAdmin(admin, db)
) {
  return res.json({
    success: false,
    message:
      "Unauthorized"
  });
}

let result =
  db.keys;

if (
  filter &&
  filter !== "all"
) {

  result =
    result.filter(
      x =>
        x.app_name ===
        filter
    );
}

return res.json({
  success: true,
  total:
    result.length,
  data: result
});

}

return res.json({
success: false,
message:
"Action không hợp lệ"
});
});

app.get(
"/checkkey",
(req, res) => {

const key =
  req.query.key;

if (!key) {

  return res.json({
    success: false,
    message:
      "Thiếu key"
  });
}

const db =
  readDB();

const item =
  db.keys.find(
    x =>
      x.key === key
  );

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

writeDB(db);

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

}
);

const PORT =
process.env.PORT || 3000;

app.listen(PORT, () => {
console.log(
"HEXTEKO API Running:",
PORT
);
});
