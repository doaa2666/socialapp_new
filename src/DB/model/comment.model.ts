import { model, models, Schema, Types, HydratedDocument } from "mongoose";
import { emailEvent } from "../../utils/email/email.event";

/* =========== Interface =========== */
export interface IComment {
  _id?: Types.ObjectId;

  createdBy: Types.ObjectId;
  postId: Types.ObjectId;
  commentId?: Types.ObjectId;

  content?: string;
  attachments?: string[];

  tags?: Types.ObjectId[];
  likes?: Types.ObjectId[];

  freezedAt?: Date;
  freezedBy?: Types.ObjectId;

  restoredAt?: Date;
  restoredBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export type HCommentDocument = HydratedDocument<IComment>;

/* =========== Schema =========== */
const commentSchema = new Schema<IComment>(
  {
    content: {
      type: String,
      minLength: 2,
      maxLength: 50000,
      required: function () {
        return !this.attachments?.length;
      },
    },

    attachments: [String],

    likes: [{ type: Schema.Types.ObjectId, ref: "User" }],

    tags: [{ type: Schema.Types.ObjectId, ref: "User" }],

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    postId: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },

    commentId: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
    },

    freezedAt: { type: Date },
    freezedBy: { type: Schema.Types.ObjectId, ref: "User" },

    restoredAt: { type: Date },
    restoredBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
    strictQuery: true,
  }
);

/* =========== Notify tagged users after save =========== */
commentSchema.post("save", async function (doc) {
  try {
    if (!doc.tags?.length) return;

    // استخدام model بدل UserModel لتجنب circular import
    const User = this.model("User");

    const taggedUsers = await User.find({
      _id: { $in: doc.tags },
    })
      .select("email userName")
      .exec();

    taggedUsers.forEach((user: any) => {
      if (!user?.email) return;

      emailEvent.emit("postTaggedUsers", {
        to: user.email,
        username: user.userName,
        postId: doc.postId.toString(),
      });
    });
  } catch (error) {
    console.log("❌ Error sending tag email notifications (comment):", error);
  }
});

/* =========== Paranoid Filter =========== */
export function applyParanoidFilter(this: any, next: () => void) {
  const query = this.getQuery();
  if (query?.paranoid === false) {
    this.setQuery({ ...query });
  } else {
    this.setQuery({ ...query, freezedAt: { $exists: false } });
  }
  next();
}

commentSchema.pre(
  ["find", "findOne", "updateOne", "findOneAndUpdate", "countDocuments"],
  applyParanoidFilter
);

/* =========== Virtual Reply =========== */
commentSchema.virtual("reply", {
  localField: "_id",
  foreignField: "commentId",
  ref: "Comment",
  justOne: true,
});

/* =========== Export =========== */
export const CommentModel =
  models.Comment || model<IComment>("Comment", commentSchema);
