import { EventEmitter } from "node:events";
import Mail from "nodemailer/lib/mailer";
import { sendEmail } from "../email/send.email";
import { verifyEmail } from "../email/verify.template.email";

export const emailEvent = new EventEmitter();

//
// ====================== Email Confirmation ======================
//
interface IEmail extends Mail.Options {
  otp: number;
}

emailEvent.on("confirmEmail", async (data: IEmail) => {
  try {
    data.subject = "Confirm Your Email";
    data.html = verifyEmail({ otp: data.otp, title: "Email Confirmation" });
    await sendEmail(data);
  } catch (error) {
    console.log("❌ Fail to send confirmation email", error);
  }
});

//
// ====================== Reset Password ======================
//
emailEvent.on("resetPassword", async (data: IEmail) => {
  try {
    data.subject = "Reset Account Password";
    data.html = verifyEmail({ otp: data.otp, title: "Reset Code" });
    await sendEmail(data);
  } catch (error) {
    console.log("❌ Fail to send reset password email", error);
  }
});

//
// ====================== Tag Notification (Post Mentions) ======================
//
interface ITagNotification extends Mail.Options {
  username: string;
  postId: string;
}

emailEvent.on("postTaggedUsers", async (data: ITagNotification) => {
  try {
    data.subject = "You were mentioned in a post";

    data.html = `
      <div style="font-family: Arial, sans-serif; padding:20px;">
        <h2>Hello ${data.username},</h2>
        <p>You were mentioned in a post on our platform.</p>
        <p><strong>Post ID:</strong> ${data.postId}</p>
        <a href="${process.env.FRONT_URL}/post/${data.postId}"
           style="background:#630E2B; color:white; padding:10px 20px; text-decoration:none; border-radius:5px;">
           View Post
        </a>
      </div>
    `;

    await sendEmail(data);
  } catch (error) {
    console.log("❌ Fail to send tag notification", error);
  }
});

//
// ====================== Post Freeze / Unfreeze Notification ======================
//
interface IPostStatusNotification extends Mail.Options {
  username: string;
  postId: string;
  status: "frozen" | "restored";
}

emailEvent.on("postStatusChanged", async (data: IPostStatusNotification) => {
  try {
    const subject =
      data.status === "frozen"
        ? "Your post has been frozen ❄️"
        : "Your post has been restored ✅";

    const message =
      data.status === "frozen"
        ? `
        <div style="font-family: Arial, sans-serif; padding:20px;">
          <h2>Hello ${data.username},</h2>
          <p>Your post (ID: ${data.postId}) has been <strong>frozen</strong> by the admin.</p>
          <p>If you think this was a mistake, please contact support.</p>
        </div>`
        : `
        <div style="font-family: Arial, sans-serif; padding:20px;">
          <h2>Hello ${data.username},</h2>
          <p>Your post (ID: ${data.postId}) has been <strong>restored</strong> and is now visible again.</p>
        </div>`;

    data.subject = subject;
    data.html = message;

    await sendEmail(data);
  } catch (error) {
    console.log("❌ Fail to send post status notification", error);
  }
});
