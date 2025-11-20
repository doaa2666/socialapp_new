import { z } from "zod";
import { createComment, replyOnComment, updateComment, likeComment, freezeComment, unfreezeComment } from "./comment.validation";

// ======= CREATE COMMENT =======
export type CreateCommentParamsDto = z.infer<typeof createComment.params>;
export type CreateCommentBodyDto = z.infer<typeof createComment.body>;

// ======= REPLY ON COMMENT =======
export type ReplyCommentParamsDto = z.infer<typeof replyOnComment.params>;
export type ReplyCommentBodyDto = z.infer<typeof replyOnComment.body>;

// ======= UPDATE COMMENT =======
export type UpdateCommentParamsDto = z.infer<typeof updateComment.params>;
export type UpdateCommentBodyDto = z.infer<typeof updateComment.body>;

// ======= LIKE / UNLIKE COMMENT =======
export type LikeCommentParamsDto = z.infer<typeof likeComment.params>;
export type LikeCommentQueryDto = z.infer<typeof likeComment.query>;

// ======= FREEZE / UNFREEZE COMMENT =======
export type FreezeCommentParamsDto = z.infer<typeof freezeComment.params>;
export type UnfreezeCommentParamsDto = z.infer<typeof unfreezeComment.params>;
