"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const success_response_1 = require("../../utils/response/success.response");
const post_model_1 = require("../../DB/model/post.model");
const comment_model_1 = require("../../DB/model/comment.model");
const post_model_2 = require("../../DB/model/post.model");
const User_model_1 = require("../../DB/model/User.model");
const repositry_1 = require("../../DB/repositry");
const mongoose_1 = require("mongoose");
const post_1 = require("../post");
const error_response_1 = require("../../utils/response/error.response");
const s3_config_1 = require("../../utils/multer/s3.config");
const cloud_multer_1 = require("../../utils/multer/cloud.multer");
class CommentService {
    userModel = new repositry_1.UserRepository(User_model_1.UserModel);
    postModel = new repositry_1.PostRepositry(post_model_2.PostModel);
    commentModel = new repositry_1.CommentRepositry(comment_model_1.CommentModel);
    constructor() { }
    createComment = async (req, res) => {
        const { postId } = req.params;
        const post = await this.postModel.findOne({
            filter: { _id: postId, allowComments: post_model_1.AllowCommentsEnum.allow, $or: (0, post_1.postAvailability)(req) },
        });
        if (!post)
            throw new error_response_1.NotfoundException("Post not found or comments disabled");
        if (req.body.tags?.length &&
            (await this.userModel.find({ filter: { _id: { $in: req.body.tags, $ne: req.user?._id } } })).length !== req.body.tags.length)
            throw new error_response_1.NotfoundException("Some tagged users do not exist");
        let attachments = [];
        if (req.files?.length) {
            attachments = await (0, s3_config_1.uploadFiles)({
                storageApproach: cloud_multer_1.StorageEnum.memory,
                files: req.files,
                path: `users/${post.createdBy}/post/${post.assetsFolderId}`,
            });
        }
        const [comment] = (await this.commentModel.create({
            data: [{ ...req.body, attachments, postId, createdBy: req.user?._id }],
        })) || [];
        if (!comment && attachments.length)
            await (0, s3_config_1.deleteFiles)({ urls: attachments });
        if (!comment)
            throw new error_response_1.BadRequestException("Fail to create comment");
        return (0, success_response_1.successResponse)({ res, statusCode: 201 });
    };
    replyOnComment = async (req, res) => {
        const { postId, commentId } = req.params;
        const comment = await this.commentModel.findOne({
            filter: { _id: commentId, postId },
            options: { populate: [{ path: "postId", match: { allowComments: post_model_1.AllowCommentsEnum.allow, $or: (0, post_1.postAvailability)(req) } }] },
        });
        if (!comment?.postId)
            throw new error_response_1.NotfoundException("Comment or post not found");
        if (req.body.tags?.length &&
            (await this.userModel.find({ filter: { _id: { $in: req.body.tags, $ne: req.user?._id } } })).length !== req.body.tags.length)
            throw new error_response_1.NotfoundException("Some tagged users do not exist");
        let attachments = [];
        if (req.files?.length) {
            const post = comment.postId;
            attachments = await (0, s3_config_1.uploadFiles)({
                storageApproach: cloud_multer_1.StorageEnum.memory,
                files: req.files,
                path: `users/${post.createdBy}/post/${post.assetsFolderId}`,
            });
        }
        const [reply] = (await this.commentModel.create({
            data: [{ ...req.body, attachments, postId, commentId, createdBy: req.user?._id }],
        })) || [];
        if (!reply && attachments.length)
            await (0, s3_config_1.deleteFiles)({ urls: attachments });
        if (!reply)
            throw new error_response_1.BadRequestException("Fail to create reply");
        return (0, success_response_1.successResponse)({ res, statusCode: 201 });
    };
    updateComment = async (req, res) => {
        const { commentId } = req.params;
        const comment = await this.commentModel.findOne({ filter: { _id: new mongoose_1.Types.ObjectId(commentId), createdBy: req.user?._id } });
        if (!comment)
            throw new error_response_1.NotfoundException("Comment not found");
        if (req.body.tags?.length &&
            (await this.userModel.find({ filter: { _id: { $in: req.body.tags, $ne: req.user?._id } } })).length !== req.body.tags.length)
            throw new error_response_1.NotfoundException("Some tagged users do not exist");
        let attachments = [];
        if (req.files?.length) {
            attachments = await (0, s3_config_1.uploadFiles)({
                storageApproach: cloud_multer_1.StorageEnum.memory,
                files: req.files,
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
                                { $setDifference: ["$tags", (req.body.removedTags || []).map((t) => new mongoose_1.Types.ObjectId(t))] },
                                (req.body.tags || []).map((t) => new mongoose_1.Types.ObjectId(t)),
                            ],
                        },
                    },
                },
            ],
        });
        if (!updated.matchedCount && attachments.length)
            await (0, s3_config_1.deleteFiles)({ urls: attachments });
        if (!updated.matchedCount)
            throw new error_response_1.BadRequestException("Failed to update comment");
        if (req.body.removeAttachments?.length)
            await (0, s3_config_1.deleteFiles)({ urls: req.body.removeAttachments });
        return (0, success_response_1.successResponse)({ res });
    };
    likeComment = async (req, res) => {
        const { commentId } = req.params;
        const { action } = req.query;
        const update = action === "unlike" ? { $pull: { likes: req.user?._id } } : { $addToSet: { likes: req.user?._id } };
        const comment = await this.commentModel.findOneAndUpdate({ filter: { _id: new mongoose_1.Types.ObjectId(commentId) }, update });
        if (!comment)
            throw new error_response_1.NotfoundException("Comment not found");
        return (0, success_response_1.successResponse)({ res });
    };
    freezeComment = async (req, res) => {
        const { commentId } = req.params;
        const comment = await this.commentModel.findOne({ filter: { _id: new mongoose_1.Types.ObjectId(commentId) } });
        if (!comment)
            throw new error_response_1.NotfoundException("Comment not found");
        if (comment.freezedAt)
            throw new error_response_1.BadRequestException("Comment already frozen");
        const updated = await this.commentModel.updateOne({
            filter: { _id: comment._id },
            update: { $set: { freezedAt: new Date(), freezedBy: req.user?._id } },
        });
        if (!updated.matchedCount)
            throw new error_response_1.BadRequestException("Failed to freeze comment");
        return (0, success_response_1.successResponse)({ res, message: "Comment frozen successfully" });
    };
    unfreezeComment = async (req, res) => {
        const { commentId } = req.params;
        const comment = await this.commentModel.findOne({ filter: { _id: new mongoose_1.Types.ObjectId(commentId) } });
        if (!comment)
            throw new error_response_1.NotfoundException("Comment not found");
        if (!comment.freezedAt)
            throw new error_response_1.BadRequestException("Comment is not frozen");
        const updated = await this.commentModel.updateOne({
            filter: { _id: comment._id },
            update: { $unset: { freezedAt: 1, freezedBy: 1 }, $set: { restoredAt: new Date(), restoredBy: req.user?._id } },
        });
        if (!updated.matchedCount)
            throw new error_response_1.BadRequestException("Failed to unfreeze comment");
        return (0, success_response_1.successResponse)({ res, message: "Comment unfrozen successfully" });
    };
}
exports.default = new CommentService();
