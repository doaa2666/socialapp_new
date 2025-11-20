"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = exports.ProviderEnum = exports.RoleEnum = exports.GenderEnum = void 0;
const mongoose_1 = require("mongoose");
const hash_security_1 = require("../../utils/security/hash.security");
const email_event_1 = require("../../utils/email/email.event");
var GenderEnum;
(function (GenderEnum) {
    GenderEnum["male"] = "male";
    GenderEnum["female"] = "female";
})(GenderEnum || (exports.GenderEnum = GenderEnum = {}));
var RoleEnum;
(function (RoleEnum) {
    RoleEnum["user"] = "user";
    RoleEnum["admin"] = "admin";
    RoleEnum["superAdmin"] = "super-admin";
})(RoleEnum || (exports.RoleEnum = RoleEnum = {}));
var ProviderEnum;
(function (ProviderEnum) {
    ProviderEnum["GOOGLE"] = "GOOGLE";
    ProviderEnum["SYSTEM"] = "SYSTEM";
})(ProviderEnum || (exports.ProviderEnum = ProviderEnum = {}));
const userSchema = new mongoose_1.Schema({
    firstName: { type: String, minlength: 2, maxlength: 25 },
    lastName: { type: String, minlength: 2, maxlength: 25 },
    slug: { type: String, minlength: 5, maxlength: 51 },
    extra: {
        name: { type: String },
    },
    email: { type: String, required: true, unique: true },
    confirmEmailOtp: { type: String },
    confirmAt: { type: Date, default: null },
    password: {
        type: String,
        required: function () {
            return this.provider === ProviderEnum.GOOGLE ? false : true;
        },
    },
    resetPasswordOtp: { type: String },
    phone: { type: String },
    address: { type: String },
    userName: { type: String },
    age: { type: Number },
    bio: { type: String },
    freezedAt: { type: Date },
    freezedBy: { type: mongoose_1.Types.ObjectId, ref: "User" },
    restoredAt: { type: Date },
    restoredBy: { type: mongoose_1.Types.ObjectId, ref: "User" },
    friends: [{ type: mongoose_1.Types.ObjectId, ref: "User" }],
    profileImage: { type: String },
    temProfileImage: String,
    coverImages: [String],
    gender: {
        type: String,
        enum: Object.values(GenderEnum),
        default: GenderEnum.male,
    },
    role: {
        type: String,
        enum: Object.values(RoleEnum),
        default: RoleEnum.user,
    },
    provider: {
        type: String,
        enum: Object.values(ProviderEnum),
        default: ProviderEnum.SYSTEM,
    },
    changeCredentialTime: { type: Date },
}, {
    timestamps: true,
    strictQuery: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
userSchema
    .virtual("username")
    .set(function (value) {
    const [firstName, lastName] = value.split(" ") || [];
    this.set({
        firstName,
        lastName,
        slug: value.replace(/\s+/g, "-"),
    });
})
    .get(function () {
    return `${this.firstName} ${this.lastName}`;
});
userSchema.pre("save", async function (next) {
    this.wasNew = this.isNew;
    if (this.isModified("password") && this.password) {
        this.password = await (0, hash_security_1.generateHash)(this.password);
    }
    if (this.isModified("confirmEmailOtp") && this.confirmEmailOtp) {
        this.confirmEmailPlainOtp = this.confirmEmailOtp;
        this.confirmEmailOtp = await (0, hash_security_1.generateHash)(this.confirmEmailOtp);
    }
    next();
});
userSchema.post("save", function (doc, next) {
    if (doc.wasNew && doc.confirmEmailPlainOtp) {
        email_event_1.emailEvent.emit("confirmEmail", {
            to: doc.email,
            otp: doc.confirmEmailPlainOtp,
        });
    }
    next();
});
userSchema.pre(["find", "findOne"], function (next) {
    const query = this.getQuery();
    if (query.paranoid === false) {
        this.setQuery({ ...query });
    }
    else {
        this.setQuery({ ...query, freezedAt: { $exists: false } });
    }
    next();
});
exports.UserModel = mongoose_1.models.User || (0, mongoose_1.model)("User", userSchema);
