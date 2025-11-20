"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentModel = void 0;
exports.applyParanoidFilter = applyParanoidFilter;
const mongoose_1 = require("mongoose");
const email_event_1 = require("../../utils/email/email.event");
const commentSchema = new mongoose_1.Schema({
    content: {
        type: String,
        minLength: 2,
        maxLength: 50000,
        required: function () {
            return !this.attachments?.length;
        },
    },
    attachments: [String],
    likes: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "User" }],
    tags: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "User" }],
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    postId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Post",
        required: true,
    },
    commentId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Comment",
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
commentSchema.post("save", async function (doc) {
    try {
        if (!doc.tags?.length)
            return;
        const User = this.model("User");
        const taggedUsers = await User.find({
            _id: { $in: doc.tags },
        })
            .select("email userName")
            .exec();
        taggedUsers.forEach((user) => {
            if (!user?.email)
                return;
            email_event_1.emailEvent.emit("postTaggedUsers", {
                to: user.email,
                username: user.userName,
                postId: doc.postId.toString(),
            });
        });
    }
    catch (error) {
        console.log("❌ Error sending tag email notifications (comment):", error);
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
commentSchema.pre(["find", "findOne", "updateOne", "findOneAndUpdate", "countDocuments"], applyParanoidFilter);
commentSchema.virtual("reply", {
    localField: "_id",
    foreignField: "commentId",
    ref: "Comment",
    justOne: true,
});
exports.CommentModel = mongoose_1.models.Comment || (0, mongoose_1.model)("Comment", commentSchema);
