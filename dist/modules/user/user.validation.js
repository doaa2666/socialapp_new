"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hardDelete = exports.updateEmail = exports.updatePassword = exports.updateBasicInfo = exports.restoreAccount = exports.freezeAccount = exports.changeRole = exports.acceptFriendRequest = exports.sendFriendRequest = exports.logout = void 0;
const zod_1 = require("zod");
const token_security_1 = require("../../utils/security/token.security");
const mongoose_1 = require("mongoose");
const validation_middleware_1 = require("../../middleware/validation.middleware");
const model_1 = require("../../DB/model");
exports.logout = {
    body: zod_1.z.strictObject({
        flag: zod_1.z.enum([token_security_1.LogoutEnum.only, token_security_1.LogoutEnum.all]).default(token_security_1.LogoutEnum.only),
    }),
};
exports.sendFriendRequest = {
    params: zod_1.z.strictObject({
        userId: validation_middleware_1.generlaFields.id,
    }),
};
exports.acceptFriendRequest = {
    params: zod_1.z.strictObject({
        requestId: validation_middleware_1.generlaFields.id,
    }),
};
exports.changeRole = {
    params: exports.sendFriendRequest.params,
    body: zod_1.z.strictObject({
        role: zod_1.z.enum(model_1.RoleEnum),
    }),
};
exports.freezeAccount = {
    params: zod_1.z.object({
        userId: zod_1.z.string().optional(),
    }).optional().refine(data => {
        return data?.userId ? mongoose_1.Types.ObjectId.isValid(data.userId) : true;
    }, { error: "invalid objectId format ",
        path: ["userId"] }),
};
exports.restoreAccount = {
    params: zod_1.z.object({
        userId: zod_1.z.string(),
    }).refine(data => {
        return mongoose_1.Types.ObjectId.isValid(data.userId);
    }, { error: "invalid objectId format ",
        path: ["userId"] }),
};
exports.updateBasicInfo = {
    body: zod_1.z
        .strictObject({
        userName: zod_1.z.string().min(3).max(30).optional(),
        age: zod_1.z.number().min(10).max(100).optional(),
        phone: zod_1.z
            .string()
            .regex(/^01[0-9]{9}$/, "Phone must be a valid Egyptian number")
            .optional(),
        bio: zod_1.z.string().max(200).optional(),
    })
        .refine((data) => Object.keys(data).length > 0, "At least one field must be provided"),
};
exports.updatePassword = {
    body: zod_1.z.strictObject({
        oldPassword: zod_1.z.string().min(6, "Old password is too short"),
        newPassword: zod_1.z
            .string()
            .min(6, "New password must be at least 6 characters")
            .refine((val) => /[A-Z]/.test(val) && /\d/.test(val), "Password must contain at least one uppercase letter and one number"),
    }),
};
exports.updateEmail = {
    body: zod_1.z.strictObject({
        newEmail: zod_1.z.string().email("Invalid email format"),
        otp: zod_1.z
            .string()
            .length(6, "OTP must be exactly 6 digits")
            .regex(/^\d+$/, "OTP must contain only digits"),
    }),
};
exports.hardDelete = exports.restoreAccount;
