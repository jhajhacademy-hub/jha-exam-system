import { ManualStudentForm, CsvImportStudentsForm } from "@/components/admin/StudentForms";

export default function AdminNewStudentPage() {
  return (
    <div>
      <h1 className="mb-10 text-lg tracking-wide">受験者ID作成</h1>
      <div className="grid gap-10 md:grid-cols-2">
        <ManualStudentForm />
        <CsvImportStudentsForm />
      </div>
    </div>
  );
}
