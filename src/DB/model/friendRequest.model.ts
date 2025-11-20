import { model, models, Schema, Types, HydratedDocument } from "mongoose";

export interface IFriendRequest {
  createdBy: Types.ObjectId;
  sendTo: Types.ObjectId;
  acceptedAt?: Date;

  createdAt: Date;
  updatedAt?: Date;
}

export type HFriendRequestDocument = HydratedDocument<IFriendRequest>;

const friendRequestSchema = new Schema<IFriendRequest>(
  {
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    sendTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    acceptedAt: Date,
  },
  {
    timestamps: true,
    strictQuery: true,
  }
);

// ================= Paranoid filter helper =================
function applyParanoidFilter(this: any, next: () => void) {
  const query = this.getQuery();
  if (query?.paranoid === false) {
    this.setQuery({ ...query });
  } else {
    this.setQuery({ ...query, freezedAt: { $exists: false } });
  }
  next();
}

// Apply paranoid filter to common queries
friendRequestSchema.pre(
  ["find", "findOne", "updateOne", "findOneAndUpdate", "countDocuments"],
  applyParanoidFilter
);

export const FriendRequestModel =
  models.FriendRequest || model<IFriendRequest>("FriendRequest", friendRequestSchema);
