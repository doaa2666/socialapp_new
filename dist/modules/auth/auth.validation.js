"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetForgotPassword = exports.verifyForgotPassword = exports.sendForgotPasswordCode = exports.signupWithGmail = exports.confirmEmail = exports.signup = exports.login = void 0;
const zod_1 = require("zod");
const validation_middleware_1 = require("../../middleware/validation.middleware");
exports.login = {
    body: zod_1.z.strictObject({
        email: validation_middleware_1.generlaFields.email,
        password: validation_middleware_1.generlaFields.password,
    })
};
exports.signup = {
    body: exports.login.body.extend({
        username: validation_middleware_1.generlaFields.username,
        email: validation_middleware_1.generlaFields.email,
        password: validation_middleware_1.generlaFields.password,
        confirmPassword: validation_middleware_1.generlaFields.confirmPassword,
        gender: validation_middleware_1.generlaFields.gender,
    })
        .superRefine((data, ctx) => {
        console.log(data, ctx);
        if (data.confirmPassword !== data.password) {
            ctx.addIssue({
                code: "custom",
                path: ["confirmEmail"],
                message: "password mismatch confirmpasword"
            });
        }
    }),
};
exports.confirmEmail = {
    body: zod_1.z.strictObject({
        email: validation_middleware_1.generlaFields.email,
        otp: validation_middleware_1.generlaFields.otp,
    }),
};
exports.signupWithGmail = {
    body: zod_1.z.strictObject({
        idToken: zod_1.z.string()
    }),
};
exports.sendForgotPasswordCode = {
    body: zod_1.z.strictObject({
        email: validation_middleware_1.generlaFields.email,
    }),
};
exports.verifyForgotPassword = {
    body: exports.sendForgotPasswordCode.body.extend({
        otp: validation_middleware_1.generlaFields.otp,
    }),
};
exports.resetForgotPassword = {
    body: exports.verifyForgotPassword.body
        .extend({
        otp: validation_middleware_1.generlaFields.otp,
        password: validation_middleware_1.generlaFields.password,
        confirmPassword: validation_middleware_1.generlaFields.confirmPassword,
    })
        .refine((data) => {
        return data.password === data.confirmPassword;
    }, { message: "password mismatch confirm-password", path: ['confirmPassword'] }),
};
