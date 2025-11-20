"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostModel = exports.LikeActionEnum = exports.AvailabilityEnum = exports.AllowCommentsEnum = void 0;
const mongoose_1 = require("mongoose");
const email_event_1 = require("../../utils/email/email.event");
var AllowCommentsEnum;
(function (AllowCommentsEnum) {
    AllowCommentsEnum["allow"] = "allow";
    AllowCommentsEnum["deny"] = "deny";
})(AllowCommentsEnum || (exports.AllowCommentsEnum = AllowCommentsEnum = {}));
var AvailabilityEnum;
(function (AvailabilityEnum) {
    AvailabilityEnum["public"] = "public";
    AvailabilityEnum["friends"] = "friends";
    AvailabilityEnum["onlyMe"] = "only-me";
})(AvailabilityEnum || (exports.AvailabilityEnum = AvailabilityEnum = {}));
var LikeActionEnum;
(function (LikeActionEnum) {
    LikeActionEnum["like"] = "like";
    LikeActionEnum["unlike"] = "unlike";
})(LikeActionEnum || (exports.LikeActionEnum = LikeActionEnum = {}));
const postSchema = new mongoose_1.Schema({
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
    likes: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "User" }],
    tags: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "User" }],
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    freezedAt: { type: Date },
    freezedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    restoredAt: { type: Date },
    restoredBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
}, {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
    strictQuery: true,
});
postSchema.post("save", async function (doc) {
    try {
        const User = this.model("User");
        if (doc.tags?.length) {
            const taggedUsers = await User.find({ _id: { $in: doc.tags } })
                .select("email userName")
                .lean()
                .exec();
            taggedUsers.forEach((user) => {
                if (!user?.email)
                    return;
                email_event_1.emailEvent.emit("postTaggedUsers", {
                    to: user.email,
                    username: user.userName,
                    postId: doc._id?.toString(),
                });
            });
        }
        if (!doc.createdBy)
            return;
        const postOwner = await User.findById(doc.createdBy)
            .select("email userName")
            .lean()
            .exec();
        if (!postOwner)
            return;
        if (doc.freezedAt && doc.freezedBy) {
            email_event_1.emailEvent.emit("postStatusChanged", {
                to: postOwner.email,
                username: postOwner.userName,
                status: "frozen",
                postId: doc._id?.toString(),
            });
        }
        if (doc.restoredAt && doc.restoredBy) {
            email_event_1.emailEvent.emit("postStatusChanged", {
                to: postOwner.email,
                username: postOwner.userName,
                status: "restored",
                postId: doc._id?.toString(),
            });
        }
    }
    catch (error) {
        console.log("❌ Error in post save hook:", error);
    }
});
function applyParanoidFilter(next) {
    const query = this.getQuery();
    if (query?.paranoid === false) {
        this.setQuery({ ...query });
    }
    else {
        this.setQuery({ ...query, freezedAt: { $exists: false } });
    }
    next();
}
postSchema.pre(["find", "findOne", "updateOne", "findOneAndUpdate", "countDocuments"], applyParanoidFilter);
postSchema.virtual("comments", {
    localField: "_id",
    foreignField: "postId",
    ref: "Comment",
    justOne: false,
});
exports.PostModel = mongoose_1.models.Post || (0, mongoose_1.model)("Post", postSchema);
