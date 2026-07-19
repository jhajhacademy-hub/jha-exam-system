"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import {
  createQuestionAction,
  updateQuestionAction,
  importQuestionsCsvAction,
  createCategoryAction,
  type QuestionFormState,
} from "@/app/admin/questions/actions";
import type { Category, Question } from "@/types/database.types";

const initialQuestionFormState: QuestionFormState = { status: "idle", message: "" };

function ResultBox({ state }: { state: QuestionFormState }) {
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

export function QuestionForm({
  categories,
  question,
}: {
  categories: Category[];
  question?: Question;
}) {
  const action = question ? updateQuestionAction : createQuestionAction;
  const [state, formAction, pending] = useActionState(action, initialQuestionFormState);

  return (
    <form action={formAction} className="border border-line p-8">
      {question && <input type="hidden" name="id" value={question.id} />}

      <div className="grid gap-6 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-xs text-ink-soft">カテゴリ</span>
          <select
            name="category_id"
            required
            defaultValue={question?.category_id ?? ""}
            className="h-11 border border-line px-3 text-sm outline-none focus:border-khaki"
          >
            <option value="" disabled>
              選択してください
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs text-ink-soft">問題ID</span>
          <input
            name="question_no"
            required
            defaultValue={question?.question_no}
            placeholder="1-1"
            className="h-11 border border-line px-3 text-sm outline-none focus:border-khaki"
          />
        </label>
      </div>

      <label className="mt-6 flex flex-col gap-2">
        <span className="text-xs text-ink-soft">問題文</span>
        <textarea
          name="question_text"
          required
          defaultValue={question?.question_text}
          rows={3}
          className="border border-line px-3 py-2 text-sm outline-none focus:border-khaki"
        />
      </label>

      <fieldset className="mt-6 flex gap-8">
        <legend className="mb-2 text-xs text-ink-soft">正解</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="answer"
            value="true"
            defaultChecked={question ? question.answer === true : true}
          />
          ◯
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="answer"
            value="false"
            defaultChecked={question ? question.answer === false : false}
          />
          ×
        </label>
      </fieldset>

      <label className="mt-6 flex flex-col gap-2">
        <span className="text-xs text-ink-soft">解説</span>
        <textarea
          name="explanation"
          defaultValue={question?.explanation}
          rows={3}
          className="border border-line px-3 py-2 text-sm outline-none focus:border-khaki"
        />
      </label>

      <label className="mt-6 flex flex-col gap-2">
        <span className="text-xs text-ink-soft">ひっかけのポイント・補足</span>
        <textarea
          name="trap_note"
          defaultValue={question?.trap_note}
          rows={2}
          className="border border-line px-3 py-2 text-sm outline-none focus:border-khaki"
        />
      </label>

      <Button type="submit" disabled={pending} className="mt-8">
        {pending ? "保存中..." : question ? "更新する" : "登録する"}
      </Button>

      <ResultBox state={state} />
    </form>
  );
}

export function CsvImportQuestionsForm() {
  const [state, formAction, pending] = useActionState(
    importQuestionsCsvAction,
    initialQuestionFormState
  );

  return (
    <form action={formAction} className="border border-line p-8">
      <h2 className="mb-2 text-sm tracking-wide">CSV一括登録</h2>
      <p className="mb-6 text-xs text-ink-soft">
        列: category(カテゴリ名), question_no, question_text, answer(◯/×), explanation,
        trap_note
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

export function NewCategoryForm() {
  return (
    <form action={createCategoryAction} className="flex items-end gap-4 border border-line p-6">
      <label className="flex flex-1 flex-col gap-2">
        <span className="text-xs text-ink-soft">新規カテゴリ名</span>
        <input
          name="name"
          required
          className="h-11 border border-line px-3 text-sm outline-none focus:border-khaki"
        />
      </label>
      <Button type="submit" variant="outline">
        追加
      </Button>
    </form>
  );
}
