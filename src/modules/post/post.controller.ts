import { authentication } from "../../middleware/authentication.middleware";
import { postService} from "./post.service";
import { Router } from "express";
import * as validators from "./post.validation";
import { validation } from "../../middleware/validation.middleware";
import {
    cloudFileUpload,
    fileValidation,
} from "../../utils/multer/cloud.multer";
import { commentRouter } from "../comment";

const router = Router();

/**
 * Create Post
 * - Supports content
 * - Supports attachments (max 2 images)
 * - Supports tags (mentions)
 */

router.use("/:postId/comment" , commentRouter)
router.get(
    "/", 
    authentication(),
    postService.postList
);
router.post(
    "/", 
    authentication(),
    cloudFileUpload({ validation: fileValidation.image }).array("attachments", 2),
    validation(validators.createpost),
    postService.createpost
);

router.patch(
    "/:postId", 
    authentication(),
    cloudFileUpload({ validation: fileValidation.image }).array("attachments", 2),
    validation(validators.updatePost),
    postService.updatePost
);
router.patch(
    "/:postId/like", 
    authentication(),
    validation(validators.likePost),
    postService.likePost
);
export default router;
