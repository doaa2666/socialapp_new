import { z } from "zod";
import { AllowCommentsEnum, AvailabilityEnum, LikeActionEnum } from "../../DB/model/post.model";
import { generlaFields } from "../../middleware/validation.middleware";
import { fileValidation } from "../../utils/multer/cloud.multer";

export const createpost = {
  body: z
    .strictObject({
      content: z.string().min(2).max(50000).optional(),
      attachments: z.array(generlaFields.file(fileValidation.image)).max(2).optional(),
      allowComments: z
        .enum([AllowCommentsEnum.allow, AllowCommentsEnum.deny])
        .default(AllowCommentsEnum.allow),
      availability: z
        .enum([AvailabilityEnum.public, AvailabilityEnum.friends, AvailabilityEnum.onlyMe])
        .default(AvailabilityEnum.public),
      tags: z.array(generlaFields.id).max(10).optional(),
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

export const updatePost = {
  params: z.strictObject({
    postId: generlaFields.id,
  }),
  body: z
    .strictObject({
      content: z.string().min(2).max(50000).optional(),
      attachments: z.array(generlaFields.file(fileValidation.image)).max(2).optional(),
      removeAttachments: z.array(z.string()).max(2).optional(),
      allowComments: z.enum([AllowCommentsEnum.allow, AllowCommentsEnum.deny]).optional(),
      availability: z
        .enum([AvailabilityEnum.public, AvailabilityEnum.friends, AvailabilityEnum.onlyMe])
        .optional(),
      tags: z.array(generlaFields.id).max(10).optional(),
      removedTags: z.array(generlaFields.id).max(10).optional(),
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

      if (
        data.removedTags?.length &&
        data.removedTags.length !== [...new Set(data.removedTags)].length
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["removedTags"],
          message: "Duplicated removedTags users",
        });
      }
    }),
};

export const likePost = {
  params: z.strictObject({
    postId: generlaFields.id,
  }),
  query: z.strictObject({
    action: z.enum([LikeActionEnum.like, LikeActionEnum.unlike]).default(LikeActionEnum.like),
  }),
};
