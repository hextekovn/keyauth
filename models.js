const mongoose = require("mongoose");

const KeySchema = new mongoose.Schema({
key: String,
owner: String,
note: String,
app_name: String,
created_at: String,
expires_at: String,
status: String,
used_count: Number
});

const AppSchema = new mongoose.Schema({
app_name: String,
description: String,
created_at: String,
total_keys: Number,
status: String
});

const ConfigSchema = new mongoose.Schema({
admin_key: String
});

const MessageSchema = new mongoose.Schema({
sender: String,
owner: String,
message: String,
type: {
type: String,
default: "text"
},
created_at: {
type: Date,
default: Date.now
}
});

const UserSchema = new mongoose.Schema({
owner: String,
key: String,
avatar: {
type: String,
default: ""
},
last_seen: {
type: Date,
default: Date.now
}
});

const ImageSchema = new mongoose.Schema({
sender: String,
image_url: String,
created_at: {
type: Date,
default: Date.now
},
expire_at: Date
});

const Key = mongoose.model(
"Key",
KeySchema
);

const App = mongoose.model(
"App",
AppSchema
);

const Config = mongoose.model(
"Config",
ConfigSchema
);

const Message = mongoose.model(
"Message",
MessageSchema
);

const User = mongoose.model(
"User",
UserSchema
);

const Image = mongoose.model(
"Image",
ImageSchema
);

module.exports = {
Key,
App,
Config,
Message,
User,
Image
};
