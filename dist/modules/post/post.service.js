"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postService = exports.postAvailability = void 0;
const success_response_1 = require("../../utils/response/success.response");
const repositry_1 = require("../../DB/repositry");
const User_model_1 = require("../../DB/model/User.model");
const post_model_1 = require("../../DB/model/post.model");
const error_response_1 = require("../../utils/response/error.response");
const uuid_1 = require("uuid");
const s3_config_1 = require("../../utils/multer/s3.config");
const mongoose_1 = require("mongoose");
const cloud_multer_1 = require("../../utils/multer/cloud.multer");
const model_1 = require("../../DB/model");
const postAvailability = (req) => {
    return [
        { availability: post_model_1.AvailabilityEnum.public },
        {
            availability: post_model_1.AvailabilityEnum.onlyMe,
            createdBy: new mongoose_1.Types.ObjectId(req.user?._id),
        },
        {
            availability: post_model_1.AvailabilityEnum.friends,
            createdBy: {
                $in: [
                    ...(Array.isArray(req.user?.friends)
                        ? req.user.friends
                            .filter((id) => typeof id === "string")
                            .map(id => new mongoose_1.Types.ObjectId(id))
                        : []),
                    new mongoose_1.Types.ObjectId(req.user?._id),
                ],
            },
        },
        {
            availability: { $ne: post_model_1.AvailabilityEnum.onlyMe },
            tags: { $in: new mongoose_1.Types.ObjectId(req.user?._id) },
        },
    ];
};
exports.postAvailability = postAvailability;
class PostService {
    userModel = new repositry_1.UserRepository(User_model_1.UserModel);
    postModel = new repositry_1.PostRepositry(post_model_1.PostModel);
    commentModel = new repositry_1.CommentRepositry(model_1.CommentModel);
    constructor() { }
    createpost = async (req, res) => {
        if (req.body.tags?.length &&
            (await this.userModel.find({
                filter: { _id: { $in: req.body.tags.map((id) => new mongoose_1.Types.ObjectId(id)), $ne: req.user?._id } },
            })).length !== req.body.tags.length) {
            throw new error_response_1.NotfoundException("Some of the mentioned users do not exist");
        }
        let attachments = [];
        const assetsFolderId = (0, uuid_1.v4)();
        if (req.files?.length) {
            attachments = await (0, s3_config_1.uploadFiles)({
                files: req.files,
                path: `users/${req.user?._id}/post/${assetsFolderId}`,
            });
        }
        const [post] = (await this.postModel.create({
            data: [
                {
                    ...req.body,
                    attachments,
                    assetsFolderId,
                    createdBy: new mongoose_1.Types.ObjectId(req.user?._id),
                },
            ],
        })) || [];
        if (!post) {
            if (attachments.length)
                await (0, s3_config_1.deleteFiles)({ urls: attachments });
            throw new error_response_1.BadRequestException("Failed to create post");
        }
        return (0, success_response_1.successResponse)({ res, statusCode: 201 });
    };
    updatePost = async (req, res) => {
        const { postId } = req.params;
        const post = await this.postModel.findOne({
            filter: { _id: new mongoose_1.Types.ObjectId(postId), createdBy: new mongoose_1.Types.ObjectId(req.user?._id) },
        });
        if (!post)
            throw new error_response_1.NotfoundException("Post not found");
        if (req.body.tags?.length &&
            (await this.userModel.find({
                filter: { _id: { $in: req.body.tags.map((id) => new mongoose_1.Types.ObjectId(id)), $ne: req.user?._id } },
            })).length !== req.body.tags.length) {
            throw new error_response_1.NotfoundException("Some of the mentioned users do not exist");
        }
        let attachments = [];
        if (req.files?.length) {
            attachments = await (0, s3_config_1.uploadFiles)({
                storageApproach: cloud_multer_1.StorageEnum.memory,
                files: req.files,
                path: `users/${post.createdBy}/post/${post.assetsFolderId}`,
            });
        }
        const updatedPost = await this.postModel.updateOne({
            filter: { _id: new mongoose_1.Types.ObjectId(post._id) },
            update: [
                {
                    $set: {
                        content: req.body.content || post.content,
                        allowComments: req.body.allowComments || post.allowComments,
                        availability: req.body.availability || post.availability,
                        attachments: {
                            $setUnion: [{ $setDifference: ["$attachments", req.body.removeAttachments || []] }, attachments],
                        },
                        tags: {
                            $setUnion: [
                                {
                                    $setDifference: [
                                        "$tags",
                                        (req.body.removedTags || []).map((tag) => new mongoose_1.Types.ObjectId(tag)),
                                    ],
                                },
                                (req.body.tags || []).map((tag) => new mongoose_1.Types.ObjectId(tag)),
                            ],
                        },
                    },
                },
            ],
        });
        if (!updatedPost.matchedCount) {
            if (attachments.length)
                await (0, s3_config_1.deleteFiles)({ urls: attachments });
            throw new error_response_1.BadRequestException("Failed to update post");
        }
        else if (req.body.removeAttachments?.length) {
            await (0, s3_config_1.deleteFiles)({ urls: req.body.removeAttachments });
        }
        return (0, success_response_1.successResponse)({ res });
    };
    likePost = async (req, res) => {
        const { postId } = req.params;
        const { action } = req.query;
        let update = { $addToSet: { likes: new mongoose_1.Types.ObjectId(req.user?._id) } };
        if (action === post_model_1.LikeActionEnum.unlike) {
            update = { $pull: { likes: new mongoose_1.Types.ObjectId(req.user?._id) } };
        }
        const post = await this.postModel.findOneAndUpdate({
            filter: { _id: new mongoose_1.Types.ObjectId(postId), $or: (0, exports.postAvailability)(req) },
            update,
        });
        if (!post)
            throw new error_response_1.NotfoundException("Invalid postId or post not found");
        return (0, success_response_1.successResponse)({ res });
    };
    postList = async (req, res) => {
        const { page, size } = req.query;
        const posts = await this.postModel.paginate({
            filter: { $or: (0, exports.postAvailability)(req) },
            options: { populate: [{
                        path: "comments",
                        match: {
                            commentId: { $exists: false },
                            freezedAt: { $exists: false }
                        },
                        populate: [{ path: "reply", match: {
                                    commentId: { $exists: false },
                                    freezedAt: { $exists: false }
                                },
                            }]
                    }] },
            page,
            size,
        });
        return (0, success_response_1.successResponse)({ res, data: { posts } });
    };
    freezePost = async (req, res) => {
        const { postId } = req.params;
        const post = await this.postModel.findOne({ filter: { _id: new mongoose_1.Types.ObjectId(postId) } });
        if (!post)
            throw new error_response_1.NotfoundException("Post not found");
        if (post.freezedAt)
            throw new error_response_1.BadRequestException("Post is already frozen");
        const result = await this.postModel.updateOne({
            filter: { _id: new mongoose_1.Types.ObjectId(post._id) },
            update: { $set: { freezedAt: new Date(), freezedBy: new mongoose_1.Types.ObjectId(req.user?._id) } },
        });
        if (!result.matchedCount)
            throw new error_response_1.BadRequestException("Failed to freeze post");
        return (0, success_response_1.successResponse)({ res, message: "Post has been frozen successfully" });
    };
    unfreezePost = async (req, res) => {
        const { postId } = req.params;
        const post = await this.postModel.findOne({ filter: { _id: new mongoose_1.Types.ObjectId(postId) } });
        if (!post)
            throw new error_response_1.NotfoundException("Post not found");
        if (!post.freezedAt)
            throw new error_response_1.BadRequestException("Post is not frozen");
        const result = await this.postModel.updateOne({
            filter: { _id: new mongoose_1.Types.ObjectId(post._id) },
            update: {
                $unset: { freezedAt: 1, freezedBy: 1 },
                $set: { restoredAt: new Date(), restoredBy: new mongoose_1.Types.ObjectId(req.user?._id) },
            },
        });
        if (!result.matchedCount)
            throw new error_response_1.BadRequestException("Failed to unfreeze post");
        return (0, success_response_1.successResponse)({ res, message: "Post has been unfrozen successfully" });
    };
}
exports.postService = new PostService();
