import { model, models, Schema, Types, HydratedDocument } from "mongoose";
import { emailEvent } from "../../utils/email/email.event";

export enum AllowCommentsEnum {
  allow = "allow",
  deny = "deny",
}

export enum AvailabilityEnum {
  public = "public",
  friends = "friends",
  onlyMe = "only-me",
}

export enum LikeActionEnum {
  like = "like",
  unlike = "unlike",
}

export interface IPost {
  _id?: Types.ObjectId;
  content?: string;
  attachments?: string[];
  assetsFolderId: string;

  allowComments: AllowCommentsEnum;
  availability: AvailabilityEnum;

  tags?: Types.ObjectId[];
  likes?: Types.ObjectId[];

  createdBy: Types.ObjectId;

  freezedAt?: Date;
  freezedBy?: Types.ObjectId;

  restoredAt?: Date;
  restoredBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export type HPostDocument = HydratedDocument<IPost>;

const postSchema = new Schema<IPost>(
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

    assetsFolderId: {
      type: String,
      required: true,
    },

    availability: {
      type: String,
      enum: Object.values(AvailabilityEnum),
      default: AvailabilityEnum.public,
    },

    allowComments: {
      type: String,
      enum: Object.values(AllowCommentsEnum),
      default: AllowCommentsEnum.allow,
    },

    likes: [{ type: Schema.Types.ObjectId, ref: "User" }],

    tags: [{ type: Schema.Types.ObjectId, ref: "User" }],

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
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

// ================= Hook بعد الحفظ =================
postSchema.post("save", async function (doc: HPostDocument) {
 try {
    const User = this.model("User");
  if (doc.tags?.length) {
    const taggedUsers = await User.find({ _id: { $in: doc.tags } })
      .select("email userName")
      .lean()
      .exec() as { email?: string; userName?: string }[];

    taggedUsers.forEach((user) => {
      if (!user?.email) return;
      emailEvent.emit("postTaggedUsers", {
        to: user.email,
        username: user.userName,
        postId: doc._id?.toString(),
      });
    });
  }

  if (!doc.createdBy) return;

  const postOwner = await User.findById(doc.createdBy)
    .select("email userName")
    .lean()
    .exec() as { email: string; userName: string } | null;

  if (!postOwner) return;

  if (doc.freezedAt && doc.freezedBy) {
    emailEvent.emit("postStatusChanged", {
      to: postOwner.email,
      username: postOwner.userName,
      status: "frozen",
      postId: doc._id?.toString(),
    });
  }

  if (doc.restoredAt && doc.restoredBy) {
    emailEvent.emit("postStatusChanged", {
      to: postOwner.email,
      username: postOwner.userName,
      status: "restored",
      postId: doc._id?.toString(),
    });
  }
} catch (error) {
  console.log("❌ Error in post save hook:", error);
}
 
});

// ================= Paranoid filter =================
function applyParanoidFilter(this: any, next: () => void) {
  const query = this.getQuery();
  if (query?.paranoid === false) {
    this.setQuery({ ...query });
  } else {
    this.setQuery({ ...query, freezedAt: { $exists: false } });
  }
  next();
}

postSchema.pre(
  ["find", "findOne", "updateOne", "findOneAndUpdate", "countDocuments"],
  applyParanoidFilter
);

// ================= Virtual للـ Comments =================
postSchema.virtual("comments", {
  localField: "_id",
  foreignField: "postId",
  ref: "Comment",
  justOne: false, // يجب أن يكون false لأن كل بوست له أكثر من تعليق
});

export const PostModel = models.Post || model<IPost>("Post", postSchema);
