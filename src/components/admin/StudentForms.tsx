"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import {
  createStudentAction,
  importStudentsCsvAction,
  type StudentFormState,
} from "@/app/admin/students/actions";

const initialStudentFormState: StudentFormState = { status: "idle", message: "" };

function ResultBox({ state }: { state: StudentFormState }) {
  if (state.status === "idle") return null;
  return (
    <div
      className={`mt-6 border px-4 py-3 text-sm ${
        state.status === "error" ? "border-alert/40 text-alert" : "border-khaki/40 text-khaki"
      }`}
    >
      <p>{state.message}</p>
      {state.detail && state.detail.length > 0 && (
        <ul className="mt-2 list-disc pl-5 text-xs text-ink-soft">
          {state.detail.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ManualStudentForm() {
  const [state, formAction, pending] = useActionState(
    createStudentAction,
    initialStudentFormState
  );

  return (
    <form action={formAction} className="border border-line p-8">
      <h2 className="mb-6 text-sm tracking-wide">1件ずつ登録</h2>

      <div className="grid grid-cols-2 gap-6">
        <label className="flex flex-col gap-2">
          <span className="text-xs text-ink-soft">受講者ID</span>
          <input
            name="studentCode"
            required
            className="h-11 border border-line px-3 text-sm outline-none focus:border-khaki"
            placeholder="JHA-0001"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-xs text-ink-soft">氏名</span>
          <input
            name="name"
            required
            className="h-11 border border-line px-3 text-sm outline-none focus:border-khaki"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-xs text-ink-soft">年齢</span>
          <input
            name="age"
            type="number"
            className="h-11 border border-line px-3 text-sm outline-none focus:border-khaki"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-xs text-ink-soft">メールアドレス（任意）</span>
          <input
            name="email"
            type="email"
            className="h-11 border border-line px-3 text-sm outline-none focus:border-khaki"
          />
        </label>
        <label className="col-span-2 flex flex-col gap-2">
          <span className="text-xs text-ink-soft">初期パスワード（空欄で自動生成）</span>
          <input
            name="password"
            className="h-11 border border-line px-3 text-sm outline-none focus:border-khaki"
          />
        </label>
      </div>

      <Button type="submit" disabled={pending} className="mt-8">
        {pending ? "登録中..." : "登録する"}
      </Button>

      <ResultBox state={state} />
    </form>
  );
}

export function CsvImportStudentsForm() {
  const [state, formAction, pending] = useActionState(
    importStudentsCsvAction,
    initialStudentFormState
  );

  return (
    <form action={formAction} className="border border-line p-8">
      <h2 className="mb-2 text-sm tracking-wide">CSV一括登録</h2>
      <p className="mb-6 text-xs text-ink-soft">
        列: student_code, name, age, email(任意), password(任意・空欄で自動生成)
      </p>

      <input
        name="file"
        type="file"
        accept=".csv,text/csv"
        required
        className="block w-full text-sm file:mr-4 file:h-10 file:border file:border-ink file:bg-paper file:px-4 file:text-sm"
      />

      <Button type="submit" disabled={pending} className="mt-8">
        {pending ? "取り込み中..." : "CSVを取り込む"}
      </Button>

      <ResultBox state={state} />
    </form>
  );
}
