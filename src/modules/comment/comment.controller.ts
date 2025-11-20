import { Router } from "express";
import { authentication } from "../../middleware/authentication.middleware";
import { cloudFileUpload, fileValidation } from "../../utils/multer/cloud.multer";
import commentService from "./comment.service";
import * as validators from "./comment.validation";
import { validation } from "../../middleware/validation.middleware";

const router = Router({ mergeParams: true });

router.post(
    "/",
    authentication(),
    cloudFileUpload({ validation: fileValidation.image }).array("attachments", 2),
    validation(validators.createComment),
    commentService.createComment
);

router.post(
    "/commentId/reply",
    authentication(),
    cloudFileUpload({ validation: fileValidation.image }).array("attachments", 2),
    validation(validators.replyOnComment),
    commentService.replyOnComment
);

router.patch(
    "/:commentId",
    authentication(),
    cloudFileUpload({ validation: fileValidation.image }).array("attachments", 2),
    validation(validators.updateComment),
    commentService.updateComment
);

router.patch(
    "/:commentId/like",
    authentication(),
    validation(validators.likeComment),
    commentService.likeComment
);

router.patch(
    "/:commentId/freeze",
    authentication(),
    validation(validators.freezeComment),
    commentService.freezeComment
);

router.patch(
    "/:commentId/unfreeze",
    authentication(),
    validation(validators.unfreezeComment),
    commentService.unfreezeComment
);

export default router;
