import "server-only";
import nodemailer from "nodemailer";

export type ExamCompletionNotice = {
  name: string;
  age: number | null;
  studentCode: string | null;
  email: string | null;
  finishedAt: Date;
  score: number;
  passed: boolean;
};

function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendExamCompletionEmail(
  recipients: string[],
  notice: ExamCompletionNotice
) {
  if (recipients.length === 0) return;

  const transport = getTransport();
  if (!transport) {
    console.error("SMTP設定(SMTP_HOST/SMTP_USER/SMTP_PASS)が未設定のため通知メールを送信できません。");
    return;
  }

  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER!;

  const finishedAtLabel = notice.finishedAt.toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const subject = `【JHA試験システム】${notice.name}様 受験結果通知(${notice.passed ? "合格" : "不合格"})`;

  const text = [
    "受験者が試験を完了しました。",
    "",
    `受験日時: ${finishedAtLabel}`,
    `氏名: ${notice.name}`,
    `年齢: ${notice.age != null ? `${notice.age}歳` : "未登録"}`,
    `受験番号: ${notice.studentCode ?? "未登録"}`,
    `メールアドレス: ${notice.email ?? "未登録"}`,
    `点数: ${notice.score}点`,
    `合否: ${notice.passed ? "合格" : "不合格"}`,
  ].join("\n");

  try {
    await transport.sendMail({ from, to: recipients, subject, text });
  } catch (err) {
    console.error("受験完了通知メールの送信に失敗しました:", err);
  }
}

export type RetakeRequestNotice = {
  name: string;
  age: number | null;
  studentCode: string | null;
  email: string | null;
  requestedAt: Date;
};

export async function sendRetakeRequestEmail(recipients: string[], notice: RetakeRequestNotice) {
  if (recipients.length === 0) return;

  const transport = getTransport();
  if (!transport) {
    console.error("SMTP設定(SMTP_HOST/SMTP_USER/SMTP_PASS)が未設定のため通知メールを送信できません。");
    return;
  }

  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER!;

  const requestedAtLabel = notice.requestedAt.toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const subject = `【JHA試験システム】${notice.name}様より再受験申請`;

  const text = [
    "受験者から再受験の申請がありました。管理画面から承認・却下してください。",
    "",
    `申請日時: ${requestedAtLabel}`,
    `氏名: ${notice.name}`,
    `年齢: ${notice.age != null ? `${notice.age}歳` : "未登録"}`,
    `受験番号: ${notice.studentCode ?? "未登録"}`,
    `メールアドレス: ${notice.email ?? "未登録"}`,
  ].join("\n");

  try {
    await transport.sendMail({ from, to: recipients, subject, text });
  } catch (err) {
    console.error("再受験申請通知メールの送信に失敗しました:", err);
  }
}
