const crypto = require("crypto");
const sendEmail = require("../config/emailConfig");

const sendOTP = async (user, type = "verifikasi") => {
  const otp = crypto.randomInt(100000, 999999).toString();
  user.otp = otp;
  user.otpExpires = Date.now() + 3 * 60 * 1000;
  await user.save();

  const subject = "[No Reply] - Kode OTP Verifikasi";
  const textContent = `Dear ${user.name},

Terima kasih telah mendaftar di OmzetDapur. Untuk mengaktifkan akun anda, silahkan gunakan One-Time Password (OTP) berikut:

Kode OTP: ${otp}

Kode OTP ini berlaku selama 3 menit. Jika kode OTP kadaluarsa, anda bisa request OTP baru melalui halaman aktivasi.

Terima kasih atas perhatiannya

Salam hangat,
OmzetDapur`;

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
  <body
    style="
      margin: 0;
      padding: 0;
      font-family: Arial, sans-serif;
      background-color: #f4f4f4;
    "
  >
    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      style="background-color: #f4f4f4; padding: 20px"
    >
      <tr>
        <td>
          <table
            width="600"
            cellpadding="0"
            cellspacing="0"
            border="0"
            align="center"
            style="
              background-color: #ffffff;
              padding: 20px;
              border: 1px solid #dddddd;
            "
          >
            <tr>
              <td style="text-align: center; padding: 20px 0">
                <h1 style="margin: 0; color: #80b4d4">OmzetDapur</h1>
              </td>
            </tr>
            <tr>
              <td
                style="
                  padding: 15px;
                  text-align: center;
                  background-color: #2980b9;
                  color: #ffffff;
                "
              >
                <h1 style="margin: 0">Welcome to OmzetDapur!</h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 20px">
                <p
                  style="
                    margin: 0;
                    font-size: 16px;
                    line-height: 1.5;
                    color: #333333;
                  "
                >
                  Dear ${user.name},
                </p>
                <p
                  style="
                    margin: 16px 0 0 0;
                    font-size: 16px;
                    line-height: 1.5;
                    color: #333333;
                  "
                >
                  Terima kasih telah mendaftar di OmzetDapur. Untuk mengaktifkan
                  akun anda, silakan gunakan One-Time Password (OTP) berikut:
                </p>
                <p style="margin-top: 30px; text-align: center">
                  <b>Kode OTP:</b>
                </p>
                <p
                  style="
                    margin: 0px auto 30px auto;
                    background-color: #2980b9;
                    text-align: center;
                    max-width: 200px;
                    font-size: 32px;
                    line-height: 1.5;
                    color: white;
                    padding: 15px;
                  "
                >
                  <b>${otp}</b>
                </p>
                <p
                  style="
                    margin: 0 0 0 0;
                    font-size: 16px;
                    line-height: 1.5;
                    color: #333333;
                  "
                >
                  Kode OTP ini berlaku selama 3 menit. Jika kode OTP kadaluarsa,
                  anda bisa request OTP baru melalui halaman aktivasi
                  <br />
                  Terima kasih atas perhatiannya
                  <br />
                  <br />
                  Salam hangat,
                  <br />
                  <br />
                  <br />
                  OmzetDapur
                </p>
              </td>
            </tr>
            <tr>
              <td
                style="
                  padding: 20px;
                  text-align: center;
                  background-color: #f4f4f4;
                  color: #777777;
                "
              >
                <p style="margin: 0; font-size: 12px">
                  &copy; 2025 OmzetDapur. All rights reserved.
                </p>
                <p style="margin: 10px 0 0 0; font-size: 12px">
                  OmzetDapur Email System
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  await sendEmail(user.email, subject, textContent, htmlContent);
};

module.exports = {
  sendOTP,
};
