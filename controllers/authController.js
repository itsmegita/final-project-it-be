const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const sendEmail = require("../config/emailConfig");

// helper untuk mengirim otp
const sendOTP = async (user, type = "verifikasi") => {
  const otp = crypto.randomInt(100000, 999999).toString();
  user.otp = otp;
  user.otpExpires = Date.now() + 30 * 1000;
  await user.save();

  const subject = "[No Reply] - Kode OTP Verifikasi";
  const textContent = `Dear ${User.name},

Terima kasih telah mendaftar di Cura-Cents. Untuk mengaktifkan akun anda, silahkan gunakan One-Time Password (OTP) berikut:

Kode OTP: ${otp}

Kode OTP ini berlaku selama 1 menit. Jika kode OTP kadaluarsa, anda bisa request OTP baru melalui halaman aktivasi.

Terima kasih atas perhatiannya

Salam hangat,
Cura Cents`;

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
                <h1 style="margin: 0; color: #80b4d4">Cura-Cents</h1>
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
                <h1 style="margin: 0">Welcome to Cura-Cents!</h1>
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
                  Dear ${User.name},
                </p>
                <p
                  style="
                    margin: 16px 0 0 0;
                    font-size: 16px;
                    line-height: 1.5;
                    color: #333333;
                  "
                >
                  Terima kasih telah mendaftar di Cura-Cents. Untuk mengaktifkan
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
                  Kode OTP ini berlaku selama 1 menit. Jika kode OTP kadaluarsa,
                  anda bisa request OTP baru melalui halaman aktivasi
                  <br />
                  Terima kasih atas perhatiannya
                  <br />
                  <br />
                  Salam hangat,
                  <br />
                  <br />
                  <br />
                  Cura-Cents
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
                  &copy; 2025 Cura-Cents. All rights reserved.
                </p>
                <p style="margin: 10px 0 0 0; font-size: 12px">
                  Cura-Cents Email System
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

// Register
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // cek apakah email sudah terdaftar
    if (await User.findOne({ email })) {
      return res.status(400).json({ message: "Email sudah terdaftar" });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // simpan user baru ke database
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    // kirim email verifikasi untuk otp
    await sendOTP(user, "verifikasi");

    res.status(201).json({
      status: "Success",
      message:
        "Registrasi berhasil, Silahkan cek email anda untuk aktivasi akun",
    });
  } catch (err) {
    console.error(err);

    // jika terjadi error validasi di MongoDB
    if (err.name === "ValidationError") {
      return res.status(400).json({
        status: "Error",
        message: "Data yang dikirim tidak valid",
        error: err.message,
      });
    }

    // jika error lain yang tidak diketahui (server error)
    res.status(500).json({
      status: "Error",
      message: "Terjadi kesalahan pada server",
      error: err.message,
    });
  }
};

// Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // cek apakah user ada di database
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        status: "Error",
        message: "Email atau password salah",
      });
    }

    // cek apakah password cocok
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: "Error",
        message: "Email atau password salah",
      });
    }

    // Cek apakah akun sudah diverifikasi
    if (!user.isVerified) {
      return res.status(403).json({
        status: "Error",
        message:
          "Akun belum diverifikasi. Silakan cek email untuk verifikasi OTP.",
      });
    }

    // generate token JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(200).json({
      status: "Success",
      message: "Login berhasil",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      status: "Error",
      message: "Terjadi kesalahan pada server",
      error: err.message,
    });
  }
};

// Verifikasi OTP
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // cari user berdasarkan email
    const user = await User.findOne({ email });

    // validasi apakah user ada dan otp sesuai
    if (!user) {
      return res.status(404).json({
        status: "Error",
        message: "Akun tidak ditemukan",
      });
    }

    if (!user.otp || new Date(user.otpExpires) <= Date.now()) {
      return res.status(400).json({
        status: "Error",
        message: "OTP kadaluwarsa. Silahkan minta OTP baru",
      });
    }

    if (user.otp !== otp) {
      return res.status(400).json({
        status: "Error",
        message: "OTP tidak valid. Silahkan coba lagi",
      });
    }

    // perbarui status user
    user.isVerified = true;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    return res.status(200).json({
      status: "Success",
      message: "Verifikasi berhasil. Silahkan login kembali",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: "Error",
      message: "Terjadi kesalahan pada server",
      error: err.message,
    });
  }
};

// Resend OTP
const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: "Error",
        message: "Email harus diisi",
      });
    }

    // cek apakah email sudah terdaftar
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        status: "Error",
        message: "Email tidak ditemukan",
      });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 30 * 1000);
    await user.save();
    await sendOTP(user, "verifikasi");

    res.status(200).json({
      status: "Success",
      message: "OTP baru telah dikirim ke email anda",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: "Error",
      message: "Terjadi kesalahan pada server",
      error: err.message,
    });
  }
};

// Request Forget Password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // cek apakah user terdaftar
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        status: "Error",
        message: "Email tidak ditemukan",
      });
    }

    // generate token reset password
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // simpan token di database dengan masa berlaku selama 15 menit
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    await user.save();

    // buat link untuk reset password
    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    // kirim email dengan link reset password
    await sendEmail(
      email,
      "[No Reply] - Reset Password",
      `Dear ${User.name},

        Kami menerima permintaan untuk mereset password akun Anda. Silahkan klik tombol di bawah ini untuk mereset password anda
        
        Klik tombol berikut:

        ${resetLink}

        Link ini hanya berlaku selama 15 menit. Jika Anda tidak meminta reset password, silahkan abaikan email ini.

        Terima kasih atas perhatiannya

        Salam hangat,
        
        Cura-Cents`,
      `<!DOCTYPE html>
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
                <h1 style="margin: 0; color: #80b4d4">Cura-Cents</h1>
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
                <h1 style="margin: 0">Welcome to Cura-Cents!</h1>
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
                  Dear ${User.name},
                </p>
                <p
                  style="
                    margin: 16px 0 0 0;
                    font-size: 16px;
                    line-height: 1.5;
                    color: #333333;
                  "
                >
                  Kami menerima permintaan untuk mereset password akun anda.
                  Silahkan klik tombol di bawah ini untuk mereset password anda
                </p>
                <p style="margin-top: 30px; text-align: center; color: black">
                  <b>Klik tombol berikut:</b>
                </p>
                <p style="text-align: center; margin-top: 30px">
                  <a
                    href="${resetLink}"
                    style="
                      display: inline-block;
                      background-color: #2980b9;
                      color: white;
                      text-decoration: none;
                      font-size: 16px;
                      padding: 12px 24px;
                      border-radius: 5px;
                      font-weight: bold;
                    "
                  >
                    Reset Password
                  </a>
                </p>
                <p
                  style="
                    margin: 0 0 0 0;
                    font-size: 16px;
                    line-height: 1.5;
                    color: #333333;
                  "
                >
                  Link ini hanya berlaku selama 15 menit. Jika anda tidak
                  meminta reset password, silahkan abaikan email ini
                  <br />
                  Terima kasih atas perhatiannya
                  <br />
                  <br />
                  Salam hangat,
                  <br />
                  <br />
                  <br />
                  Cura-Cents
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
                  &copy; 2025 Cura-Cents. All rights reserved.
                </p>
                <p style="margin: 10px 0 0 0; font-size: 12px">
                  Cura-Cents Email System
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
    );

    return res.status(200).json({
      status: "Success",
      message:
        "Email untuk reset password telah dikirim. Silahkan cek email anda",
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      status: "Error",
      message: "Terjadi kesalahan pada server",
      error: err.message,
    });
  }
};

// Reset Password
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    // validasi input
    if (!token || !password || !confirmPassword) {
      return res.status(400).json({
        status: "Error",
        message: "Token dan password wajib diisi!",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        status: "Error",
        message: "Password dan konfirmasi tidak cocok",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        status: "Error",
        message: "Password harus minimal 8 karakter",
      });
    }

    // hash token untuk mencocokkan dengan database
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // cari user berdasarkan token dan memastikan token belum expired
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        status: "Error",
        message: "Token tidak valid atau sudah kadaluwarsa",
      });
    }

    // hash password baru
    user.password = await bcrypt.hash(password, 10);

    // hapus token reset password setelah berhasil digunakan
    delete user.resetPasswordToken;
    delete user.resetPasswordExpires;

    await user.save();

    return res.status(200).json({
      status: "Success",
      message: "Password berhasil direset! Silahkan login kembali",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: "Error",
      message: "Terjadi kesalahan pada server.",
      error: err.message,
    });
  }
};

// Request otp untuk update email
// const requestEmailUpdateOTP = async (req, res, next) => {
//   try {
//     const { newEmail } = req.body;
//     const userId = req.user.id;

//     // cek apakah email baru sudah digunakan oleh user lain
//     if (await User.findOne({ email: newEmail })) {
//       return res.status(400).json({
//         status: "Error",
//         message: "Email sudah terdaftar",
//       });
//     }

//     // generate OTP
//     const otp = crypto.randomInt(100000, 999999).toString();
//     const otpExpires = Date.now() + 5 * 60 * 1000;

//     // simpan OTP dan email baru sementara di database
//     await User.findByIdAndUpdate(userId, {
//       newEmail,
//       emailOTP: otp,
//       emailOTPExpires: otpExpires,
//     });

//     await sendOTP(user, "verifikasi");

//     res.status(200).json({
//       status: "Success",
//       message: "OTP telah dikirimkan ke email yang baru",
//     });
//   } catch (err) {
//     console.error(err);

//     res.status(500).json({
//       status: "Error",
//       message: "Terjadi kesalahan pada server",
//       error: err.message,
//     });
//   }
// };

module.exports = {
  register,
  login,
  verifyOTP,
  forgotPassword,
  resetPassword,
  resendOTP,
};
