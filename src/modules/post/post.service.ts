import type { Request, Response } from "express";
import { successResponse } from "../../utils/response/success.response";
import { CommentRepositry, PostRepositry, UserRepository } from "../../DB/repositry";
import { UserModel } from "../../DB/model/User.model";
import { AvailabilityEnum, HPostDocument, LikeActionEnum, PostModel } from "../../DB/model/post.model";
import { BadRequestException, NotfoundException } from "../../utils/response/error.response";
import { v4 as uuid } from "uuid";
import { deleteFiles, uploadFiles } from "../../utils/multer/s3.config";
import { LikePostQueryInputsDto } from "./post.dto";
import { Types, UpdateQuery } from "mongoose";
import { StorageEnum } from "../../utils/multer/cloud.multer";
import { CommentModel } from "../../DB/model";

// ================== AVAILABILITY HELPER ==================
export const postAvailability = (req: Request) => {
  return [
    { availability: AvailabilityEnum.public },
    {
      availability: AvailabilityEnum.onlyMe,
      createdBy: new Types.ObjectId(req.user?._id),
    },
    {
      availability: AvailabilityEnum.friends,
      createdBy: {
     $in: [
  ...(Array.isArray(req.user?.friends) 
        ? req.user.friends
            .filter((id: any): id is string => typeof id === "string")
            .map(id => new Types.ObjectId(id))
        : []),
  new Types.ObjectId(req.user?._id),
],


      },
    },
    {
      availability: { $ne: AvailabilityEnum.onlyMe },
      tags: { $in: new Types.ObjectId(req.user?._id) },
    },
  ];
};

class PostService {
  private userModel = new UserRepository(UserModel);
  private postModel = new PostRepositry(PostModel);
 private commentModel = new CommentRepositry(CommentModel);

  constructor() {}

  // ================== CREATE POST ==================
  createpost = async (req: Request, res: Response): Promise<Response> => {
    if (
      req.body.tags?.length &&
      (
        await this.userModel.find({
          filter: { _id: { $in: req.body.tags.map((id: string) => new Types.ObjectId(id)), $ne: req.user?._id } },
        })
      ).length !== req.body.tags.length
    ) {
      throw new NotfoundException("Some of the mentioned users do not exist");
    }

    let attachments: string[] = [];
    const assetsFolderId: string = uuid();

    if (req.files?.length) {
      attachments = await uploadFiles({
        files: req.files as Express.Multer.File[],
        path: `users/${req.user?._id}/post/${assetsFolderId}`,
      });
    }

    const [post] =
      (await this.postModel.create({
        data: [
          {
            ...req.body,
            attachments,
            assetsFolderId,
            createdBy: new Types.ObjectId(req.user?._id),
          },
        ],
      })) || [];

    if (!post) {
      if (attachments.length) await deleteFiles({ urls: attachments });
      throw new BadRequestException("Failed to create post");
    }

    return successResponse({ res, statusCode: 201 });
  };

  // ================== UPDATE POST ==================
  updatePost = async (req: Request, res: Response): Promise<Response> => {
    const { postId } = req.params as unknown as { postId: string };

    const post = await this.postModel.findOne({
      filter: { _id: new Types.ObjectId(postId), createdBy: new Types.ObjectId(req.user?._id) },
    });
    if (!post) throw new NotfoundException("Post not found");

    if (
      req.body.tags?.length &&
      (
        await this.userModel.find({
          filter: { _id: { $in: req.body.tags.map((id: string) => new Types.ObjectId(id)), $ne: req.user?._id } },
        })
      ).length !== req.body.tags.length
    ) {
      throw new NotfoundException("Some of the mentioned users do not exist");
    }

    let attachments: string[] = [];

    if (req.files?.length) {
      attachments = await uploadFiles({
        storageApproach: StorageEnum.memory,
        files: req.files as Express.Multer.File[],
        path: `users/${post.createdBy}/post/${post.assetsFolderId}`,
      });
    }

    const updatedPost = await this.postModel.updateOne({
      filter: { _id: new Types.ObjectId(post._id) },
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
                    (req.body.removedTags || []).map((tag: string) => new Types.ObjectId(tag)),
                  ],
                },
                (req.body.tags || []).map((tag: string) => new Types.ObjectId(tag)),
              ],
            },
          },
        },
      ],
    });

    if (!updatedPost.matchedCount) {
      if (attachments.length) await deleteFiles({ urls: attachments });
      throw new BadRequestException("Failed to update post");
    } else if (req.body.removeAttachments?.length) {
      await deleteFiles({ urls: req.body.removeAttachments });
    }

    return successResponse({ res });
  };

  // ================== LIKE / UNLIKE ==================
  likePost = async (req: Request, res: Response): Promise<Response> => {
    const { postId } = req.params as { postId: string };
    const { action } = req.query as LikePostQueryInputsDto;

    let update: UpdateQuery<HPostDocument> = { $addToSet: { likes: new Types.ObjectId(req.user?._id) } };

    if (action === LikeActionEnum.unlike) {
      update = { $pull: { likes: new Types.ObjectId(req.user?._id) } };
    }

    const post = await this.postModel.findOneAndUpdate({
      filter: { _id: new Types.ObjectId(postId), $or: postAvailability(req) },
      update,
    });

    if (!post) throw new NotfoundException("Invalid postId or post not found");

    return successResponse({ res });
  };

  // ================== POST LIST ==================
  postList = async (req: Request, res: Response): Promise<Response> => {
   const { page, size } = req.query as unknown as { page: number; size: number };

   const posts = await this.postModel.paginate({
   filter: { $or: postAvailability(req) },
   options:{populate:
    [{
    path:"comments",
     match:{
      commentId:{$exists:false}, 
      freezedAt:{$exists:false}
    },
    populate:[{path:"reply",  match:{
      commentId:{$exists:false}, 
      freezedAt:{$exists:false}
    },
  }]
  }]},
      page,
    size,
   });
 
    return successResponse({ res, data: { posts } });
  };

  // ================== FREEZE / UNFREEZE ==================
  freezePost = async (req: Request, res: Response): Promise<Response> => {
    const { postId } = req.params as { postId: string };
    const post = await this.postModel.findOne({ filter: { _id: new Types.ObjectId(postId) } });
    if (!post) throw new NotfoundException("Post not found");

    if (post.freezedAt) throw new BadRequestException("Post is already frozen");

    const result = await this.postModel.updateOne({
      filter: { _id: new Types.ObjectId(post._id) },
      update: { $set: { freezedAt: new Date(), freezedBy: new Types.ObjectId(req.user?._id) } },
    });

    if (!result.matchedCount) throw new BadRequestException("Failed to freeze post");

    return successResponse({ res, message: "Post has been frozen successfully" });
  };

  unfreezePost = async (req: Request, res: Response): Promise<Response> => {
    const { postId } = req.params as { postId: string };
    const post = await this.postModel.findOne({ filter: { _id: new Types.ObjectId(postId) } });
    if (!post) throw new NotfoundException("Post not found");

    if (!post.freezedAt) throw new BadRequestException("Post is not frozen");

    const result = await this.postModel.updateOne({
      filter: { _id: new Types.ObjectId(post._id) },
      update: {
        $unset: { freezedAt: 1, freezedBy: 1 },
        $set: { restoredAt: new Date(), restoredBy: new Types.ObjectId(req.user?._id) },
      },
    });

    if (!result.matchedCount) throw new BadRequestException("Failed to unfreeze post");

    return successResponse({ res, message: "Post has been unfrozen successfully" });
  };
}

export const postService = new PostService();
