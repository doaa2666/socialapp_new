"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unfreezeComment = exports.freezeComment = exports.likeComment = exports.updateComment = exports.replyOnComment = exports.createComment = void 0;
const zod_1 = require("zod");
const validation_middleware_1 = require("../../middleware/validation.middleware");
const cloud_multer_1 = require("../../utils/multer/cloud.multer");
exports.createComment = {
    params: zod_1.z.strictObject({ postId: validation_middleware_1.generlaFields.id }),
    body: zod_1.z
        .strictObject({
        content: zod_1.z.string().min(2).max(50000).optional(),
        attachments: zod_1.z.array(validation_middleware_1.generlaFields.file(cloud_multer_1.fileValidation.image)).max(2).optional(),
        tags: zod_1.z.array(validation_middleware_1.generlaFields.id).max(10).optional(),
    })
        .superRefine((data, ctx) => {
        if (!data.attachments?.length && !data.content) {
            ctx.addIssue({
                code: "custom",
                path: ["content"],
                message: "Cannot create comment without content or attachments",
            });
        }
        if (data.tags && data.tags.length !== [...new Set(data.tags)].length) {
            ctx.addIssue({
                code: "custom",
                path: ["tags"],
                message: "Duplicated tagged users",
            });
        }
    }),
};
exports.replyOnComment = {
    params: exports.createComment.params.extend({ commentId: validation_middleware_1.generlaFields.id }),
    body: exports.createComment.body,
};
exports.updateComment = {
    params: zod_1.z.strictObject({ commentId: validation_middleware_1.generlaFields.id }),
    body: zod_1.z
        .strictObject({
        content: zod_1.z.string().min(2).max(50000).optional(),
        attachments: zod_1.z.array(validation_middleware_1.generlaFields.file(cloud_multer_1.fileValidation.image)).max(2).optional(),
        removeAttachments: zod_1.z.array(zod_1.z.string()).max(2).optional(),
        tags: zod_1.z.array(validation_middleware_1.generlaFields.id).max(10).optional(),
        removedTags: zod_1.z.array(validation_middleware_1.generlaFields.id).max(10).optional(),
    })
        .superRefine((data, ctx) => {
        if (!Object.values(data).some((v) => v)) {
            ctx.addIssue({
                code: "custom",
                message: "All fields are empty",
            });
        }
    }),
};
exports.likeComment = {
    params: zod_1.z.strictObject({ commentId: validation_middleware_1.generlaFields.id }),
    query: zod_1.z.strictObject({ action: zod_1.z.enum(["like", "unlike"]).default("like") }),
};
exports.freezeComment = { params: zod_1.z.strictObject({ commentId: validation_middleware_1.generlaFields.id }) };
exports.unfreezeComment = { params: zod_1.z.strictObject({ commentId: validation_middleware_1.generlaFields.id }) };
