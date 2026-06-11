export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  is_admin?: boolean;
  is_premium?: boolean;
  projects_count?: number;
  created_at: string;
}

export type ProjectStatus = "active" | "archived";
export type OwnerType = "particulier" | "societe";
export type PermitType = "permis" | "declaration" | "aucune";

export interface ProjectStats {
  tasks_total: number;
  tasks_done: number;
  completion_percent: number;
  budget_quote: number;
  budget_invoice: number;
}

export interface Project {
  id: number;
  user_id?: number;
  name: string;
  address?: string;
  description?: string;
  cover_photo_url?: string;
  status: ProjectStatus;
  is_premium: boolean;
  budget_initial?: number;
  date_start?: string;
  date_end_target?: string;
  date_end_real?: string;
  created_at: string;
  updated_at: string;
  my_role?: "owner" | "editor" | "viewer";
  owner_type?: OwnerType;
  permit_type?: PermitType | null;
  has_gros_oeuvre?: boolean | null;
  stats?: ProjectStats;
  // deprecated flat fields — kept for backward compat
  tasks_total?: number;
  tasks_done?: number;
  completion_percent?: number;
  budget_quote?: number;
  budget_invoice?: number;
  phases?: Phase[];
  documents?: Document[];
}

export interface BudgetSummary {
  budget_initial: number;
  budget_quote: number;
  budget_invoice: number;
  budget_remaining: number;
  tasks_done: number;
  tasks_total: number;
  completion_percent: number;
  by_status: Record<string, { count: number; amount_quote: number; amount_invoice: number }>;
}

export interface ProjectMember {
  id: number;
  role: "owner" | "editor" | "viewer";
  user: { id: number; name: string; email: string };
}

export interface Phase {
  id: number;
  project_id: number;
  title: string;
  description?: string;
  order: number;
  tasks?: Task[];
  tasks_total?: number;
  tasks_done?: number;
  completion_percent?: number;
}

export type TaskStatus = "todo" | "inprogress" | "done" | "blocked" | "na";
export type TaskType = "default" | "custom";
export type PaymentStatus = "none" | "pending" | "deposit" | "paid";

export interface Task {
  id: number;
  phase_id: number;
  project_id: number;
  title: string;
  description?: string;
  type: TaskType;
  room?: string | null;
  status: TaskStatus;
  payment_status: PaymentStatus;
  is_required: boolean;
  order: number;
  duration_days?: number;
  date_target?: string;
  date_real?: string;
  amount_quote?: number;
  amount_invoice?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  documents?: Document[];
  contacts?: Contact[];
}

export interface Document {
  id: number;
  task_id?: number;
  contact_id?: number;
  project_id?: number;
  name: string;
  type: "photo" | "quote" | "invoice" | "certificate" | "permit" | "cil" | "other";
  file_path?: string;
  url: string;
  created_at: string;
}

export interface Contact {
  id: number;
  project_id: number;
  name: string;
  company?: string;
  role?: string;
  specialty?: string;
  phone?: string;
  email?: string;
  address?: string;
  siret?: string;
  insurance_number?: string;
  insurance_company?: string;
  insurance_expiry?: string;
  notes?: string;
  created_at: string;
  documents?: Document[];
}

export interface Event {
  id: number;
  project_id: number;
  task_id?: number;
  contact_id?: number;
  title: string;
  description?: string;
  date_start: string;
  date_end?: string;
  reminder_days?: number;
  created_at: string;
  task?: Pick<Task, "id" | "title">;
  contact?: Pick<Contact, "id" | "name">;
}

export interface Expense {
  id: number;
  project_id: number;
  task_id?: number;
  contact_id?: number;
  label: string;
  amount: number;
  category?: string;
  payment_date?: string;
  notes?: string;
  created_at: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface AuthResponse {
  token: string;
  user: User;
}
