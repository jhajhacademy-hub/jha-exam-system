export type RoleType = "admin" | "student";
export type SessionStatus = "in_progress" | "completed";

export type Profile = {
  id: string;
  role: RoleType;
  student_code: string | null;
  name: string;
  age: number | null;
  email: string | null;
  created_at: string;
};

export type Category = {
  id: string;
  name: string;
  sort_order: number;
};

export type Question = {
  id: string;
  category_id: string;
  question_no: string;
  question_text: string;
  answer: boolean;
  explanation: string;
  trap_note: string;
  created_at: string;
  updated_at: string;
};

export type ExamSession = {
  id: string;
  student_id: string;
  status: SessionStatus;
  question_ids: string[];
  current_index: number;
  started_at: string;
  finished_at: string | null;
  duration_seconds: number | null;
  total_score: number | null;
  passed: boolean | null;
};

export type ExamAnswer = {
  id: string;
  session_id: string;
  question_id: string;
  category_id: string;
  order_index: number;
  user_answer: boolean;
  is_correct: boolean;
  answered_at: string;
};

export type SiteSettings = {
  id: number;
  logo_url: string | null;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & Pick<Profile, "id" | "name">;
        Update: Partial<Profile>;
        Relationships: [];
      };
      categories: {
        Row: Category;
        Insert: Partial<Category> & Pick<Category, "name">;
        Update: Partial<Category>;
        Relationships: [];
      };
      questions: {
        Row: Question;
        Insert: Partial<Question> &
          Pick<Question, "category_id" | "question_no" | "question_text" | "answer">;
        Update: Partial<Question>;
        Relationships: [
          {
            foreignKeyName: "questions_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      exam_sessions: {
        Row: ExamSession;
        Insert: Partial<ExamSession> & Pick<ExamSession, "student_id" | "question_ids">;
        Update: Partial<ExamSession>;
        Relationships: [
          {
            foreignKeyName: "exam_sessions_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      exam_answers: {
        Row: ExamAnswer;
        Insert: Partial<ExamAnswer> &
          Pick<
            ExamAnswer,
            "session_id" | "question_id" | "category_id" | "order_index" | "user_answer" | "is_correct"
          >;
        Update: Partial<ExamAnswer>;
        Relationships: [
          {
            foreignKeyName: "exam_answers_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "exam_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "exam_answers_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "exam_answers_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      site_settings: {
        Row: SiteSettings;
        Insert: Partial<SiteSettings>;
        Update: Partial<SiteSettings>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
