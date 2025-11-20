"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generlaFields = exports.validation = void 0;
const zod_1 = require("zod");
const error_response_1 = require("../utils/response/error.response");
const mongoose_1 = require("mongoose");
const validation = (schema) => {
    return (req, res, next) => {
        const validationErrors = [];
        for (const key of Object.keys(schema)) {
            const validator = schema[key];
            if (!validator)
                continue;
            if (req.file) {
                req.body.attachments = req.file;
            }
            if (req.files) {
                console.log(req.files);
                req.body.attachments = req.files;
            }
            const validationResult = validator.safeParse(req[key]);
            if (!validationResult.success) {
                const errors = validationResult.error;
                validationErrors.push({
                    key,
                    issues: errors.issues.map((issue) => ({
                        message: issue.message,
                        path: issue.path,
                    })),
                });
            }
        }
        if (validationErrors.length) {
            throw new error_response_1.BadRequestException("validation error", { validationErrors });
        }
        return next();
    };
};
exports.validation = validation;
exports.generlaFields = {
    username: zod_1.z
        .string({
        message: "username is required",
    })
        .min(2, { message: "min username length is 2 char" })
        .max(20, { message: "max username length is 20 char" }),
    email: zod_1.z.string().email({ message: "valid email must be like example@domain.com" }),
    otp: zod_1.z.string().regex(/^\d{6}$/, { message: "OTP must be 6 digits" }),
    password: zod_1.z
        .string()
        .regex(/^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/, {
        message: "password must be strong (min 8 chars, upper, lower, number, special char)",
    }),
    confirmPassword: zod_1.z.string(),
    gender: zod_1.z.enum(["male", "female"], {
        message: "gender must be either male or female",
    }),
    file: function (mimetype) {
        return zod_1.z
            .strictObject({
            fieldname: zod_1.z.string(),
            originalname: zod_1.z.string(),
            encoding: zod_1.z.string(),
            mimetype: zod_1.z.enum(mimetype),
            buffer: zod_1.z.any().optional(),
            path: zod_1.z.string().optional(),
            size: zod_1.z.number(),
        })
            .refine((data) => {
            return data.buffer || data.path;
        }, { message: "neither path or buffer is available", path: ["file"] });
    },
    id: zod_1.z.string().refine((data) => {
        return mongoose_1.Types.ObjectId.isValid(data);
    }, { message: "invalid objectId format" }),
};
