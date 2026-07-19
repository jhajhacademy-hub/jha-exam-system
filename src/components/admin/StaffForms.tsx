"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import {
  createStaffAction,
  updateStaffAction,
  type StaffFormState,
} from "@/app/admin/users/actions";
import type { Profile } from "@/types/database.types";

const initialStaffFormState: StaffFormState = { status: "idle", message: "" };

function ResultBox({ state }: { state: StaffFormState }) {
  if (state.status === "idle") return null;
  return (
    <div
      className={`mt-6 border px-4 py-3 text-sm ${
        state.status === "error" ? "border-alert/40 text-alert" : "border-khaki/40 text-khaki"
      }`}
    >
      {state.message}
    </div>
  );
}

export function StaffForm({
  staff,
  isSelf,
}: {
  staff?: Profile;
  isSelf?: boolean;
}) {
  const action = staff ? updateStaffAction : createStaffAction;
  const [state, formAction, pending] = useActionState(action, initialStaffFormState);

  return (
    <form action={formAction} className="border border-line p-8">
      {staff && <input type="hidden" name="id" value={staff.id} />}

      <label className="mb-5 flex flex-col gap-2">
        <span className="text-xs text-ink-soft">氏名</span>
        <input
          name="name"
          required
          defaultValue={staff?.name}
          className="h-11 border border-line px-3 text-sm outline-none focus:border-khaki"
        />
      </label>

      <label className="mb-5 flex flex-col gap-2">
        <span className="text-xs text-ink-soft">メールアドレス</span>
        <input
          name="email"
          type="email"
          required
          disabled={!!staff}
          defaultValue={staff?.email ?? ""}
          className="h-11 border border-line bg-paper px-3 text-sm outline-none focus:border-khaki disabled:bg-khaki-pale disabled:text-ink-soft"
        />
      </label>

      {!staff && (
        <label className="mb-5 flex flex-col gap-2">
          <span className="text-xs text-ink-soft">初期パスワード(空欄で自動生成)</span>
          <input
            name="password"
            className="h-11 border border-line px-3 text-sm outline-none focus:border-khaki"
          />
        </label>
      )}

      <fieldset className="mb-5 flex gap-8">
        <legend className="mb-2 text-xs text-ink-soft">権限</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="role"
            value="admin"
            defaultChecked={staff ? staff.role === "admin" : false}
            disabled={isSelf}
          />
          システム管理者
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="role"
            value="operator"
            defaultChecked={staff ? staff.role === "operator" : true}
            disabled={isSelf}
          />
          運用担当者
        </label>
      </fieldset>

      {staff && (
        <fieldset className="mb-5 flex gap-8">
          <legend className="mb-2 text-xs text-ink-soft">ステータス</legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="status"
              value="active"
              defaultChecked={staff.status === "active"}
              disabled={isSelf}
            />
            有効
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="status"
              value="inactive"
              defaultChecked={staff.status === "inactive"}
              disabled={isSelf}
            />
            無効
          </label>
        </fieldset>
      )}

      {isSelf && (
        <p className="mb-5 text-xs text-ink-soft">
          自分自身の権限・ステータスは変更できません。
        </p>
      )}

      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? "保存中..." : staff ? "更新する" : "登録する"}
      </Button>

      <ResultBox state={state} />
    </form>
  );
}
