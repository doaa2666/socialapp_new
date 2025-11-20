import { z } from "zod";
import { generlaFields } from "../../middleware/validation.middleware";
import { fileValidation } from "../../utils/multer/cloud.multer";

export const createComment = {
    params: z.strictObject({ postId: generlaFields.id }),
    body: z
        .strictObject({
            content: z.string().min(2).max(50000).optional(),
            attachments: z.array(generlaFields.file(fileValidation.image)).max(2).optional(),
            tags: z.array(generlaFields.id).max(10).optional(),
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

export const replyOnComment = {
    params: createComment.params.extend({ commentId: generlaFields.id }),
    body: createComment.body,
};

export const updateComment = {
    params: z.strictObject({ commentId: generlaFields.id }),
    body: z
        .strictObject({
            content: z.string().min(2).max(50000).optional(),
            attachments: z.array(generlaFields.file(fileValidation.image)).max(2).optional(),
            removeAttachments: z.array(z.string()).max(2).optional(),
            tags: z.array(generlaFields.id).max(10).optional(),
            removedTags: z.array(generlaFields.id).max(10).optional(),
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

export const likeComment = {
    params: z.strictObject({ commentId: generlaFields.id }),
    query: z.strictObject({ action: z.enum(["like", "unlike"]).default("like") }),
};

export const freezeComment = { params: z.strictObject({ commentId: generlaFields.id }) };
export const unfreezeComment = { params: z.strictObject({ commentId: generlaFields.id }) };
