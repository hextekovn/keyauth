const mongoose = require("mongoose");

const KeySchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    owner: {
      type: String,
      index: true
    },
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
  },
  { timestamps: true }
);

// Add compound index for app_name queries
KeySchema.index({ app_name: 1, status: 1 });

const AppSchema = new mongoose.Schema(
  {
    app_name: {
      type: String,
      unique: true,
      required: true,
      index: true
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
  },
  { timestamps: true }
);

const ConfigSchema = new mongoose.Schema({
  admin_key: {
    type: String,
    default: "admin123"
  }
});

const MessageSchema = new mongoose.Schema(
  {
    sender: {
      type: String,
      required: true,
      index: true
    },
    owner: {
      type: String,
      index: true
    },
    message: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ["text", "image"],
      default: "text"
    },
    created_at: {
      type: Date,
      default: Date.now,
      index: -1
    }
  },
  { timestamps: true }
);

// Add compound index for efficient queries
MessageSchema.index({ created_at: -1, type: 1 });

const UserSchema = new mongoose.Schema(
  {
    owner: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    key: String,
    avatar: {
      type: String,
      default: ""
    },
    last_seen: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

const ImageSchema = new mongoose.Schema(
  {
    sender: {
      type: String,
      required: true,
      index: true
    },
    image_url: {
      type: String,
      required: true
    },
    created_at: {
      type: Date,
      default: Date.now
    },
    expire_at: {
      type: Date,
      required: true,
      index: true
    }
  },
  { timestamps: true }
);

// TTL Index - MongoDB automatically deletes documents when expire_at is passed
// Remove expireAfterSeconds: 0 to use actual expiry time, set to negative to delete immediately at expiry
ImageSchema.index({ expire_at: 1 }, { expireAfterSeconds: 0 });

const Key = mongoose.model("Key", KeySchema);
const App = mongoose.model("App", AppSchema);
const Config = mongoose.model("Config", ConfigSchema);
const Message = mongoose.model("Message", MessageSchema);
const User = mongoose.model("User", UserSchema);
const Image = mongoose.model("Image", ImageSchema);

module.exports = {
  Key,
  App,
  Config,
  Message,
  User,
  Image
};
