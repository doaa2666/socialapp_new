"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailEvent = void 0;
const node_events_1 = require("node:events");
const send_email_1 = require("../email/send.email");
const verify_template_email_1 = require("../email/verify.template.email");
exports.emailEvent = new node_events_1.EventEmitter();
exports.emailEvent.on("confirmEmail", async (data) => {
    try {
        data.subject = "Confirm Your Email";
        data.html = (0, verify_template_email_1.verifyEmail)({ otp: data.otp, title: "Email Confirmation" });
        await (0, send_email_1.sendEmail)(data);
    }
    catch (error) {
        console.log("❌ Fail to send confirmation email", error);
    }
});
exports.emailEvent.on("resetPassword", async (data) => {
    try {
        data.subject = "Reset Account Password";
        data.html = (0, verify_template_email_1.verifyEmail)({ otp: data.otp, title: "Reset Code" });
        await (0, send_email_1.sendEmail)(data);
    }
    catch (error) {
        console.log("❌ Fail to send reset password email", error);
    }
});
exports.emailEvent.on("postTaggedUsers", async (data) => {
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
        await (0, send_email_1.sendEmail)(data);
    }
    catch (error) {
        console.log("❌ Fail to send tag notification", error);
    }
});
exports.emailEvent.on("postStatusChanged", async (data) => {
    try {
        const subject = data.status === "frozen"
            ? "Your post has been frozen ❄️"
            : "Your post has been restored ✅";
        const message = data.status === "frozen"
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
        await (0, send_email_1.sendEmail)(data);
    }
    catch (error) {
        console.log("❌ Fail to send post status notification", error);
    }
});
