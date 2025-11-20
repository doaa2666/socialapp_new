"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyEmail = void 0;
const verifyEmail = ({ otp, title, }) => {
    return `<!DOCTYPE html>
  <html>
  <head>
      <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css">
      <style>
          body {
              background-color: #88BDBF;
              margin: 0;
              font-family: Arial, sans-serif;
          }
          table {
              border-collapse: collapse;
          }
      </style>
  </head>
  <body>
      <table border="0" width="50%" style="margin:auto;padding:30px;background-color:#F3F3F3;border:1px solid #630E2B;">
          <tr>
              <td>
                  <table border="0" width="100%">
                      <tr>
                          <td>
                              <h1>
                                  <img width="100px" src="https://res.cloudinary.com/ddajommsw/image/upload/v1670702280/Group_35052_icaysu.png"/>
                              </h1>
                          </td>
                          <td>
                              <p style="text-align:right;">
                                  <a href="http://localhost:4200/#/" target="_blank" style="text-decoration:none;color:#630E2B;">
                                      View In Website
                                  </a>
                              </p>
                          </td>
                      </tr>
                  </table>
              </td>
          </tr>

          <tr>
              <td>
                  <table border="0" cellpadding="0" cellspacing="0" style="text-align:center;width:100%;background-color:#fff;">
                      <tr>
                          <td style="background-color:#630E2B;height:100px;font-size:50px;color:#fff;">
                              <img width="50px" height="50px" src="https://res.cloudinary.com/ddajommsw/image/upload/v1670703716/Screenshot_1100_yne3vo.png">
                          </td>
                      </tr>
                      <tr>
                          <td>
                              <h1 style="padding-top:25px;color:#630E2B;">${title}</h1>
                          </td>
                      </tr>
                      <tr>
                          <td>
                              <p style="padding:0 100px;">
                                  Use the code below to complete your action.
                              </p>
                          </td>
                      </tr>
                      <tr>
                          <td>
                              <p style="margin:10px 0 30px 0;border-radius:4px;padding:10px 20px;border:0;color:#fff;background-color:#630E2B;display:inline-block;font-size:18px;letter-spacing:3px;">
                                  ${otp}
                              </p>
                          </td>
                      </tr>
                  </table>
              </td>
          </tr>

          <tr>
              <td>
                  <table border="0" width="100%" style="border-radius:5px;text-align:center;">
                      <tr>
                          <td>
                              <h3 style="margin-top:10px;color:#000;">Stay in touch</h3>
                          </td>
                      </tr>
                      <tr>
                          <td>
                              <div style="margin-top:20px;">
                                  <a href="${process.env.facebookLink}" style="text-decoration:none;">
                                      <img src="https://res.cloudinary.com/ddajommsw/image/upload/v1670703402/Group35062_erj5dx.png" width="40px" height="40px" style="margin:0 10px;">
                                  </a>
                                  <a href="${process.env.instegram}" style="text-decoration:none;">
                                      <img src="https://res.cloudinary.com/ddajommsw/image/upload/v1670703402/Group35063_zottpo.png" width="40px" height="40px" style="margin:0 10px;">
                                  </a>
                                  <a href="${process.env.twitterLink}" style="text-decoration:none;">
                                      <img src="https://res.cloudinary.com/ddajommsw/image/upload/v1670703402/Group_35064_i8qtfd.png" width="40px" height="40px" style="margin:0 10px;">
                                  </a>
                              </div>
                          </td>
                      </tr>
                  </table>
              </td>
          </tr>
      </table>
  </body>
  </html>`;
};
exports.verifyEmail = verifyEmail;
