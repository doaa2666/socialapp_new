"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.likePost = exports.updatePost = exports.createpost = void 0;
const zod_1 = require("zod");
const post_model_1 = require("../../DB/model/post.model");
const validation_middleware_1 = require("../../middleware/validation.middleware");
const cloud_multer_1 = require("../../utils/multer/cloud.multer");
exports.createpost = {
    body: zod_1.z
        .strictObject({
        content: zod_1.z.string().min(2).max(50000).optional(),
        attachments: zod_1.z.array(validation_middleware_1.generlaFields.file(cloud_multer_1.fileValidation.image)).max(2).optional(),
        allowComments: zod_1.z
            .enum([post_model_1.AllowCommentsEnum.allow, post_model_1.AllowCommentsEnum.deny])
            .default(post_model_1.AllowCommentsEnum.allow),
        availability: zod_1.z
            .enum([post_model_1.AvailabilityEnum.public, post_model_1.AvailabilityEnum.friends, post_model_1.AvailabilityEnum.onlyMe])
            .default(post_model_1.AvailabilityEnum.public),
        tags: zod_1.z.array(validation_middleware_1.generlaFields.id).max(10).optional(),
    })
        .superRefine((data, ctx) => {
        if (!data.attachments?.length && !data.content) {
            ctx.addIssue({
                code: "custom",
                path: ["content"],
                message: "Post must have content or attachments",
            });
        }
        if (data.tags?.length && data.tags.length !== [...new Set(data.tags)].length) {
            ctx.addIssue({
                code: "custom",
                path: ["tags"],
                message: "Duplicated tagged users",
            });
        }
    }),
};
exports.updatePost = {
    params: zod_1.z.strictObject({
        postId: validation_middleware_1.generlaFields.id,
    }),
    body: zod_1.z
        .strictObject({
        content: zod_1.z.string().min(2).max(50000).optional(),
        attachments: zod_1.z.array(validation_middleware_1.generlaFields.file(cloud_multer_1.fileValidation.image)).max(2).optional(),
        removeAttachments: zod_1.z.array(zod_1.z.string()).max(2).optional(),
        allowComments: zod_1.z.enum([post_model_1.AllowCommentsEnum.allow, post_model_1.AllowCommentsEnum.deny]).optional(),
        availability: zod_1.z
            .enum([post_model_1.AvailabilityEnum.public, post_model_1.AvailabilityEnum.friends, post_model_1.AvailabilityEnum.onlyMe])
            .optional(),
        tags: zod_1.z.array(validation_middleware_1.generlaFields.id).max(10).optional(),
        removedTags: zod_1.z.array(validation_middleware_1.generlaFields.id).max(10).optional(),
    })
        .superRefine((data, ctx) => {
        if (!Object.values(data).some((v) => v !== undefined)) {
            ctx.addIssue({
                code: "custom",
                message: "All fields are empty",
            });
        }
        if (data.tags?.length && data.tags.length !== [...new Set(data.tags)].length) {
            ctx.addIssue({
                code: "custom",
                path: ["tags"],
                message: "Duplicated tagged users",
            });
        }
        if (data.removedTags?.length &&
            data.removedTags.length !== [...new Set(data.removedTags)].length) {
            ctx.addIssue({
                code: "custom",
                path: ["removedTags"],
                message: "Duplicated removedTags users",
            });
        }
    }),
};
exports.likePost = {
    params: zod_1.z.strictObject({
        postId: validation_middleware_1.generlaFields.id,
    }),
    query: zod_1.z.strictObject({
        action: zod_1.z.enum([post_model_1.LikeActionEnum.like, post_model_1.LikeActionEnum.unlike]).default(post_model_1.LikeActionEnum.like),
    }),
};
