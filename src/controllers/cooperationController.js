import nodemailer from "nodemailer";

function escapeHtml(s = "") {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function handleResearchForm(req, res) {
  try {
    const payload = req.body || {};
    const personal = payload.personal || {};
    const education = payload.education || {};
    const additionalInfo = payload.additionalInfo || "";
    const researchAreas = payload.researchAreas || "";
    const researchExperience = payload.researchExperience || "";

    const subject = `فرم همکاری پژوهشی جدید از ${
      personal.fullName || "نامشخص"
    }`;

    const text = `
نام و نام‌خانوادگی: ${personal.fullName}
سازمان / نهاد: ${personal.organization}
سمت: ${personal.position}
تخصص: ${personal.specialty}

تحصیلات:
  مدرک: ${education.degree}
  رشته: ${education.field}
  دانشگاه: ${education.university}
  سال: ${education.year}

زمینه‌های پژوهش: ${researchAreas}
تجربه‌های پژوهشی: ${researchExperience}

توضیحات تکمیلی: ${additionalInfo}
    `;

    const html = `
    <!doctype html>
    <html lang="fa" dir="rtl">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <style>
        body {
          font-family: "Vazirmatn", "Tahoma", sans-serif;
          direction: rtl;
          text-align: right;
          background-color: #f7f7f7;
          color: #222;
          margin: 0;
          padding: 20px;
        }
        .wrap {
          background: #fff;
          border-radius: 12px;
          padding: 24px;
          max-width: 720px;
          margin: 0 auto;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        h2 {
          margin-top: 0;
          color: #0a3d62;
          border-bottom: 2px solid #eee;
          padding-bottom: 6px;
        }
        .section { margin-top: 16px; }
        .item { margin: 4px 0; }
        .label { font-weight: bold; color: #555; display:inline-block; min-width:110px; }
        .mono { background:#fafafa; padding:8px; border-radius:6px; border:1px solid #eee; }
        small { color:#777; font-size:13px; }
      </style>
    </head>
    <body>
      <div class="wrap">
        <h2>درخواست همکاری پژوهشی جدید</h2>

        <div class="section">
          <div class="item"><span class="label">نام و نام‌خانوادگی:</span>${escapeHtml(
            personal.fullName
          )}</div>
          <div class="item"><span class="label">ایمیل:</span>${escapeHtml(
            personal.email || "-"
          )}</div>
          <div class="item"><span class="label">ایمیل:</span>${escapeHtml(
            personal.phone || "-"
          )}</div>
          <div class="item"><span class="label">سازمان / نهاد:</span>${escapeHtml(
            personal.organization
          )}</div>
          <div class="item"><span class="label">سمت:</span>${escapeHtml(
            personal.position
          )}</div>
          <div class="item"><span class="label">تخصص:</span>${escapeHtml(
            personal.specialty
          )}</div>
        </div>

        <div class="section">
          <h3>تحصیلات</h3>
          <div class="item"><span class="label">مدرک:</span>${escapeHtml(
            education.degree
          )}</div>
          <div class="item"><span class="label">رشته:</span>${escapeHtml(
            education.field
          )}</div>
          <div class="item"><span class="label">دانشگاه:</span>${escapeHtml(
            education.university
          )}</div>
          <div class="item"><span class="label">سال:</span>${escapeHtml(
            education.year
          )}</div>
        </div>

        <div class="section">
          <h3>زمینه‌های پژوهش</h3>
          <div class="mono">${escapeHtml(researchAreas)}</div>
        </div>

        <div class="section">
          <h3>تجربه‌های پژوهشی</h3>
          <div class="mono">${escapeHtml(researchExperience)}</div>
        </div>

        <div class="section">
          <h3>توضیحات تکمیلی</h3>
          <div class="mono">${escapeHtml(additionalInfo)}</div>
        </div>

        <hr>
        <small>ارسال‌شده از وب‌سایت RaymandGroup — ${new Date().toLocaleString(
          "fa-IR"
        )}</small>
      </div>
    </body>
    </html>
    `;

    // ✅ Gmail transporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_SECURE == "true", // true for 465, false for 587
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false, // some cPanel hosts require this
      },
    });

    // --- 1️⃣ Send to admin (Raymand) ---
    const adminMail = {
      from: `"فرم همکاری" <${process.env.EMAIL_USER}>`,
      to: "info@raymandgroup.de",
      subject,
      text,
      html,
    };
    await transporter.sendMail(adminMail);

    // --- 2️⃣ Send confirmation to user ---
    if (personal.email) {
      const userMail = {
        from: `"Raymand Group" <${process.env.EMAIL_USER}>`,
        to: personal.email,
        subject: "درخواست همکاری شما با موفقیت ثبت شد ✅",
        html: `
          <html lang="fa" dir="rtl">
          <head>
            <meta charset="utf-8">
            <style>
              body {font-family: "Vazirmatn", "Tahoma", sans-serif; direction:rtl; text-align:right; background:#fafafa; padding:20px;}
              .card {background:#fff; border-radius:12px; padding:24px; max-width:600px; margin:auto; box-shadow:0 2px 8px rgba(0,0,0,0.08);}
              h2 {color:#0a3d62;}
              p {color:#333; line-height:1.8;}
              .footer {color:#888; font-size:13px; margin-top:20px;}
            </style>
          </head>
          <body>
            <div class="card">
              <h2>با سپاس از شما ${escapeHtml(personal.fullName || "")} 🌸</h2>
              <p>درخواست همکاری پژوهشی شما با موفقیت دریافت شد.</p>
              <p>تیم Raymand Group به‌زودی درخواست شما را بررسی کرده و در صورت نیاز با شما تماس خواهد گرفت.</p>
              <p>با احترام<br>واحد همکاری‌های پژوهشی Raymand Group</p>
              <div class="footer">
                <hr>
                <p>این پیام به‌صورت خودکار ارسال شده است.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      };
      await transporter.sendMail(userMail);
    }

    res.status(200).json({ ok: true, message: "ایمیل با موفقیت ارسال شد." });
  } catch (err) {
    console.error("❌ خطا در ارسال ایمیل:", err);
    res
      .status(500)
      .json({ ok: false, message: "خطایی در ارسال ایمیل رخ داد." });
  }
}

export async function handleEducationForm(req, res) {
  try {
    const payload = req.body || {};
    const personal = payload.personal || {};
    const educations = payload.educations || {};
    const experience = payload.experience || "";
    const request = payload.request || "";
    const result = payload.result || "";

    const subject = `فرم همکاری آموزشی جدید از ${
      personal.fullName || "نامشخص"
    }`;

    const text = `
نام و نام‌خانوادگی: ${personal.fullName}
ایمیل: ${personal.email}
محل تولد: ${personal.birthPlace}
سال تولد: ${personal.birthYear}
نام پدر: ${personal.father}
شماره شناسنامه: ${personal.idNumber}
تخصص: ${personal.specialty}

تحصیلات:
  کشور: ${educations.country}
  مدرک: ${educations.degree}
  رشته: ${educations.field}
  دانشگاه: ${educations.university}
  سال: ${educations.year}

سوابق کاری / آموزشی:
${experience}

درخواست همکاری:
${request}

نتیجه یا توضیحات تکمیلی:
${result}
    `;

    const html = `
    <!doctype html>
    <html lang="fa" dir="rtl">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <style>
        body {
          font-family: "Vazirmatn", "Tahoma", sans-serif;
          direction: rtl;
          text-align: right;
          background-color: #f7f7f7;
          color: #222;
          margin: 0;
          padding: 20px;
        }
        .wrap {
          background: #fff;
          border-radius: 12px;
          padding: 24px;
          max-width: 720px;
          margin: 0 auto;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        h2 {
          margin-top: 0;
          color: #0a3d62;
          border-bottom: 2px solid #eee;
          padding-bottom: 6px;
        }
        .section { margin-top: 16px; }
        .item { margin: 4px 0; }
        .label { font-weight: bold; color: #555; display:inline-block; min-width:110px; }
        .mono { background:#fafafa; padding:8px; border-radius:6px; border:1px solid #eee; }
        small { color:#777; font-size:13px; }
      </style>
    </head>
    <body>
      <div class="wrap">
        <h2>درخواست همکاری آموزشی جدید</h2>

        <div class="section">
          <div class="item"><span class="label">نام و نام‌خانوادگی:</span>${escapeHtml(
            personal.fullName
          )}</div>
          <div class="item"><span class="label">ایمیل:</span>${escapeHtml(
            personal.email
          )}</div>
          <div class="item"><span class="label">ایمیل:</span>${escapeHtml(
            personal.phone
          )}</div>
          <div class="item"><span class="label">محل تولد:</span>${escapeHtml(
            personal.birthPlace
          )}</div>
          <div class="item"><span class="label">سال تولد:</span>${escapeHtml(
            personal.birthYear
          )}</div>
          <div class="item"><span class="label">نام پدر:</span>${escapeHtml(
            personal.father
          )}</div>
          <div class="item"><span class="label">شماره شناسنامه:</span>${escapeHtml(
            personal.idNumber
          )}</div>
          <div class="item"><span class="label">تخصص:</span>${escapeHtml(
            personal.specialty
          )}</div>
        </div>

        <div class="section">
          <h3>تحصیلات</h3>
          <div class="item"><span class="label">کشور:</span>${escapeHtml(
            educations.country
          )}</div>
          <div class="item"><span class="label">مدرک:</span>${escapeHtml(
            educations.degree
          )}</div>
          <div class="item"><span class="label">رشته:</span>${escapeHtml(
            educations.field
          )}</div>
          <div class="item"><span class="label">دانشگاه:</span>${escapeHtml(
            educations.university
          )}</div>
          <div class="item"><span class="label">سال:</span>${escapeHtml(
            educations.year
          )}</div>
        </div>

        <div class="section">
          <h3>سوابق کاری / آموزشی</h3>
          <div class="mono">${escapeHtml(experience)}</div>
        </div>

        <div class="section">
          <h3>درخواست همکاری</h3>
          <div class="mono">${escapeHtml(request)}</div>
        </div>

        <div class="section">
          <h3>نتیجه یا توضیحات تکمیلی</h3>
          <div class="mono">${escapeHtml(result)}</div>
        </div>

        <hr>
        <small>ارسال‌شده از وب‌سایت RaymandGroup — ${new Date().toLocaleString(
          "fa-IR"
        )}</small>
      </div>
    </body>
    </html>
    `;

    // --- ✅ SMTP transporter (RaymandGroup) ---
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_SECURE == "true",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    await transporter.verify();

    // --- 1️⃣ Send to admin ---
    await transporter.sendMail({
      from:
        process.env.EMAIL_FROM || `"Raymand Group" <${process.env.EMAIL_USER}>`,
      to: "info@raymandgroup.de",
      subject,
      text,
      html,
    });

    // --- 2️⃣ Send confirmation to user ---
    if (personal.email) {
      await transporter.sendMail({
        from:
          process.env.EMAIL_FROM ||
          `"Raymand Group" <${process.env.EMAIL_USER}>`,
        to: personal.email,
        subject: "درخواست همکاری آموزشی شما با موفقیت ثبت شد ✅",
        html: `
          <html lang="fa" dir="rtl">
          <head>
            <meta charset="utf-8">
            <style>
              body {font-family:"Vazirmatn","Tahoma",sans-serif;direction:rtl;text-align:right;background:#fafafa;padding:20px;}
              .card {background:#fff;border-radius:12px;padding:24px;max-width:600px;margin:auto;box-shadow:0 2px 8px rgba(0,0,0,0.08);}
              h2 {color:#0a3d62;}
              p {color:#333;line-height:1.8;}
              .footer {color:#888;font-size:13px;margin-top:20px;}
            </style>
          </head>
          <body>
            <div class="card">
              <h2>با سپاس از شما ${escapeHtml(personal.fullName || "")} 🌸</h2>
              <p>درخواست همکاری آموزشی شما با موفقیت دریافت شد.</p>
              <p>تیم Raymand Group به‌زودی درخواست شما را بررسی کرده و در صورت نیاز با شما تماس خواهد گرفت.</p>
              <p>با احترام<br>واحد همکاری‌های آموزشی Raymand Group</p>
              <div class="footer">
                <hr>
                <p>این پیام به‌صورت خودکار ارسال شده است.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });
    }

    res.status(200).json({ ok: true, message: "ایمیل با موفقیت ارسال شد." });
  } catch (err) {
    console.error("❌ خطا در ارسال ایمیل آموزشی:", err);
    res
      .status(500)
      .json({ ok: false, message: "خطایی در ارسال ایمیل رخ داد." });
  }
}
