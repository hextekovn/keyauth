const mongoose = require("mongoose");

const KeySchema = new mongoose.Schema({
key: {
type: String,
unique: true
},

owner: String,

note: String,

app_name: String,

created_at: String,

expires_at: String,

status: {
type: String,
default: "active"
},

used_count: {
type: Number,
default: 0
}
});

const AppSchema = new mongoose.Schema({

app_name: {
type: String,
unique: true
},

description: String,

created_at: String,

total_keys: {
type: Number,
default: 0
},

status: {
type: String,
default: "active"
}
});

const ConfigSchema = new mongoose.Schema({

admin_key: {
type: String,
default: "admin123"
}

});

module.exports = {

Key:
mongoose.model(
"Key",
KeySchema
),

App:
mongoose.model(
"App",
AppSchema
),

Config:
mongoose.model(
"Config",
ConfigSchema
)
};
