import { model, models, Schema, HydratedDocument, Types } from "mongoose";
import { generateHash } from "../../utils/security/hash.security";
import { emailEvent } from "../../utils/email/email.event";

/* ================= Enums ================= */
export enum GenderEnum {
  male = "male",
  female = "female",
}

export enum RoleEnum {
  user = "user",
  admin = "admin",
  superAdmin = "super-admin",
}

export enum ProviderEnum {
  GOOGLE = "GOOGLE",
  SYSTEM = "SYSTEM",
}

/* ================= Interface MUST match Schema ================= */
export interface IUser {
  firstName: string;
  lastName: string;
  slug: string;

  extra?: {
    name?: string;
  };

  email: string;
  confirmEmailOtp?: string;
  confirmAt?: Date;

  password?: string;
  resetPasswordOtp?: string;

  phone?: string;
  address?: string;
  userName?: string;
  age?: number;
  bio?: string;

  freezedAt?: Date;
  freezedBy?: Types.ObjectId;
  restoredAt?: Date;
  restoredBy?: Types.ObjectId;

  friends?: Types.ObjectId[];

  profileImage?: string;
  temProfileImage?: string;
  coverImages?: string[];

  changeCredentialTime?: Date;

  gender: GenderEnum;
  role: RoleEnum;
  provider: ProviderEnum;

  createdAt?: Date;
  updatedAt?: Date;
}

/* MUST be before schema hooks */
export type HUserDocument = HydratedDocument<IUser>;

/* ================= Schema ================= */
const userSchema = new Schema<IUser>(
  {
    firstName: { type: String, minlength: 2, maxlength: 25 },
    lastName: { type: String, minlength: 2, maxlength: 25 },
    slug: { type: String, minlength: 5, maxlength: 51 },

    extra: {
      name: { type: String },
    },

    email: { type: String, required: true, unique: true },
    confirmEmailOtp: { type: String },
    confirmAt: { type: Date, default: null },

    password: {
      type: String,
      required: function () {
        return this.provider === ProviderEnum.GOOGLE ? false : true;
      },
    },

    resetPasswordOtp: { type: String },

    phone: { type: String },
    address: { type: String },
    userName: { type: String },
    age: { type: Number },
    bio: { type: String },

    freezedAt: { type: Date },
    freezedBy: { type: Types.ObjectId, ref: "User" },
    restoredAt: { type: Date },
    restoredBy: { type: Types.ObjectId, ref: "User" },

    friends: [{ type: Types.ObjectId, ref: "User" }],

    profileImage: { type: String },
    temProfileImage: String,
    coverImages: [String],

    gender: {
      type: String,
      enum: Object.values(GenderEnum),
      default: GenderEnum.male,
    },

    role: {
      type: String,
      enum: Object.values(RoleEnum),
      default: RoleEnum.user,
    },

    provider: {
      type: String,
      enum: Object.values(ProviderEnum),
      default: ProviderEnum.SYSTEM,
    },

    changeCredentialTime: { type: Date },
  },
  {
    timestamps: true,
    strictQuery: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* ================= Virtual Username ================= */
userSchema
  .virtual("username")
  .set(function (value: string) {
    const [firstName, lastName] = value.split(" ") || [];
    this.set({
      firstName,
      lastName,
      slug: value.replace(/\s+/g, "-"),
    });
  })
  .get(function () {
    return `${this.firstName} ${this.lastName}`;
  });

/* ================= Hooks ================= */
userSchema.pre(
  "save",
  async function (
    this: HUserDocument & {
      wasNew: boolean;
      confirmEmailPlainOtp?: string;
    },
    next
  ) {
    this.wasNew = this.isNew;

    if (this.isModified("password") && this.password) {
      this.password = await generateHash(this.password);
    }

    if (this.isModified("confirmEmailOtp") && this.confirmEmailOtp) {
      this.confirmEmailPlainOtp = this.confirmEmailOtp;
      this.confirmEmailOtp = await generateHash(this.confirmEmailOtp);
    }

    next();
  }
);

userSchema.post(
  "save",
  function (
    doc: HUserDocument & {
      wasNew: boolean;
      confirmEmailPlainOtp?: string;
    },
    next
  ) {
    if (doc.wasNew && doc.confirmEmailPlainOtp) {
      emailEvent.emit("confirmEmail", {
        to: doc.email,
        otp: doc.confirmEmailPlainOtp,
      });
    }

    next();
  }
);

/* ================= Paranoid Filter ================= */
userSchema.pre(["find", "findOne"], function (next) {
  const query = this.getQuery();
  if (query.paranoid === false) {
    this.setQuery({ ...query });
  } else {
    this.setQuery({ ...query, freezedAt: { $exists: false } });
  }
  next();
});

/* ================= Export ================= */
export const UserModel =
  models.User || model<IUser>("User", userSchema);
