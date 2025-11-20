import type { Request, Response } from "express";
import { successResponse } from "../../utils/response/success.response";
import { AllowCommentsEnum } from "../../DB/model/post.model";
import { CommentModel } from "../../DB/model/comment.model";
import { PostModel } from "../../DB/model/post.model";
import { UserModel } from "../../DB/model/User.model";
import { CommentRepositry, PostRepositry, UserRepository } from "../../DB/repositry";
import { Types, UpdateQuery } from "mongoose";
import { postAvailability } from "../post";
import { BadRequestException, NotfoundException } from "../../utils/response/error.response";
import { deleteFiles, uploadFiles } from "../../utils/multer/s3.config";
import { StorageEnum } from "../../utils/multer/cloud.multer";

class CommentService {
  private userModel = new UserRepository(UserModel);
  private postModel = new PostRepositry(PostModel);
  private commentModel = new CommentRepositry(CommentModel);

  constructor() {}

  createComment = async (req: Request, res: Response): Promise<Response> => {
    const { postId } = req.params as unknown as { postId: Types.ObjectId };
    const post = await this.postModel.findOne({
      filter: { _id: postId, allowComments: AllowCommentsEnum.allow, $or: postAvailability(req) },
    });
    if (!post) throw new NotfoundException("Post not found or comments disabled");

    if (
      req.body.tags?.length &&
      (await this.userModel.find({ filter: { _id: { $in: req.body.tags, $ne: req.user?._id } } })).length !== req.body.tags.length
    )
      throw new NotfoundException("Some tagged users do not exist");

    let attachments: string[] = [];
    if (req.files?.length) {
      attachments = await uploadFiles({
        storageApproach: StorageEnum.memory,
        files: req.files as Express.Multer.File[],
        path: `users/${post.createdBy}/post/${post.assetsFolderId}`,
      });
    }

    const [comment] =
      (await this.commentModel.create({
        data: [{ ...req.body, attachments, postId, createdBy: req.user?._id }],
      })) || [];

    if (!comment && attachments.length) await deleteFiles({ urls: attachments });
    if (!comment) throw new BadRequestException("Fail to create comment");

    return successResponse({ res, statusCode: 201 });
  };

  replyOnComment = async (req: Request, res: Response): Promise<Response> => {
    const { postId, commentId } = req.params as unknown as { postId: Types.ObjectId; commentId: Types.ObjectId };
    const comment = await this.commentModel.findOne({
      filter: { _id: commentId, postId },
      options: { populate: [{ path: "postId", match: { allowComments: AllowCommentsEnum.allow, $or: postAvailability(req) } }] },
    });
    if (!comment?.postId) throw new NotfoundException("Comment or post not found");

    if (
      req.body.tags?.length &&
      (await this.userModel.find({ filter: { _id: { $in: req.body.tags, $ne: req.user?._id } } })).length !== req.body.tags.length
    )
      throw new NotfoundException("Some tagged users do not exist");

    let attachments: string[] = [];
    if (req.files?.length) {
      const post = comment.postId as any;
      attachments = await uploadFiles({
        storageApproach: StorageEnum.memory,
        files: req.files as Express.Multer.File[],
        path: `users/${post.createdBy}/post/${post.assetsFolderId}`,
      });
    }

    const [reply] =
      (await this.commentModel.create({
        data: [{ ...req.body, attachments, postId, commentId, createdBy: req.user?._id }],
      })) || [];

    if (!reply && attachments.length) await deleteFiles({ urls: attachments });
    if (!reply) throw new BadRequestException("Fail to create reply");

    return successResponse({ res, statusCode: 201 });
  };

  updateComment = async (req: Request, res: Response): Promise<Response> => {
    const { commentId } = req.params as { commentId: string };
    const comment = await this.commentModel.findOne({ filter: { _id: new Types.ObjectId(commentId), createdBy: req.user?._id } });
    if (!comment) throw new NotfoundException("Comment not found");

    if (
      req.body.tags?.length &&
      (await this.userModel.find({ filter: { _id: { $in: req.body.tags, $ne: req.user?._id } } })).length !== req.body.tags.length
    )
      throw new NotfoundException("Some tagged users do not exist");

    let attachments: string[] = [];
    if (req.files?.length) {
      attachments = await uploadFiles({
        storageApproach: StorageEnum.memory,
        files: req.files as Express.Multer.File[],
        path: `users/${comment.createdBy}/post/${comment.postId}`,
      });
    }

    const updated = await this.commentModel.updateOne({
      filter: { _id: comment._id },
      update: [
        {
          $set: {
            content: req.body.content || comment.content,
            attachments: { $setUnion: [{ $setDifference: ["$attachments", req.body.removeAttachments || []] }, attachments] },
            tags: {
              $setUnion: [
                { $setDifference: ["$tags", (req.body.removedTags || []).map((t: string) => new Types.ObjectId(t))] },
                (req.body.tags || []).map((t: string) => new Types.ObjectId(t)),
              ],
            },
          },
        },
      ],
    });

    if (!updated.matchedCount && attachments.length) await deleteFiles({ urls: attachments });
    if (!updated.matchedCount) throw new BadRequestException("Failed to update comment");
    if (req.body.removeAttachments?.length) await deleteFiles({ urls: req.body.removeAttachments });

    return successResponse({ res });
  };

  likeComment = async (req: Request, res: Response): Promise<Response> => {
    const { commentId } = req.params as { commentId: string };
    const { action } = req.query as { action?: "like" | "unlike" };
    const update: UpdateQuery<any> = action === "unlike" ? { $pull: { likes: req.user?._id } } : { $addToSet: { likes: req.user?._id } };
    const comment = await this.commentModel.findOneAndUpdate({ filter: { _id: new Types.ObjectId(commentId) }, update });
    if (!comment) throw new NotfoundException("Comment not found");
    return successResponse({ res });
  };

  freezeComment = async (req: Request, res: Response): Promise<Response> => {
    const { commentId } = req.params as { commentId: string };
    const comment = await this.commentModel.findOne({ filter: { _id: new Types.ObjectId(commentId) } });
    if (!comment) throw new NotfoundException("Comment not found");
    if (comment.freezedAt) throw new BadRequestException("Comment already frozen");

    const updated = await this.commentModel.updateOne({
      filter: { _id: comment._id },
      update: { $set: { freezedAt: new Date(), freezedBy: req.user?._id } },
    });

    if (!updated.matchedCount) throw new BadRequestException("Failed to freeze comment");
    return successResponse({ res, message: "Comment frozen successfully" });
  };

  unfreezeComment = async (req: Request, res: Response): Promise<Response> => {
    const { commentId } = req.params as { commentId: string };
    const comment = await this.commentModel.findOne({ filter: { _id: new Types.ObjectId(commentId) } });
    if (!comment) throw new NotfoundException("Comment not found");
    if (!comment.freezedAt) throw new BadRequestException("Comment is not frozen");

    const updated = await this.commentModel.updateOne({
      filter: { _id: comment._id },
      update: { $unset: { freezedAt: 1, freezedBy: 1 }, $set: { restoredAt: new Date(), restoredBy: req.user?._id } },
    });

    if (!updated.matchedCount) throw new BadRequestException("Failed to unfreeze comment");
    return successResponse({ res, message: "Comment unfrozen successfully" });
  };
}

export default new CommentService();
