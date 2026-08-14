export const EMPLOYMENT_TYPE_LABELS: Record<string, string> = { full_time: "Full-time", part_time: "Part-time", intern: "Intern", contract: "Contract", remote: "Remote" };
export const WORK_MODE_LABELS: Record<string, string> = { office: "Office", remote: "Remote", hybrid: "Hybrid" };
export const EMPLOYEE_STATUS_LABELS: Record<string, string> = { active: "Active", on_leave: "On Leave", probation: "Probation", resigned: "Resigned", terminated: "Terminated" };
export const GENDER_LABELS: Record<string, string> = { male: "Male", female: "Female", other: "Other" };
export function toOptions(labels: Record<string, string>) { return Object.entries(labels).map(([value, label]) => ({ value, label })); }
