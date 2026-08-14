import { v } from "convex/values";
import { query } from "./_generated/server";
import { getCurrentActor } from "./lib/auth";

type SearchResult = {
  type: "employee" | "task" | "project" | "document";
  id: string;
  label: string;
  path: string;
};

export const quickSearch = query({
  args: { term: v.string() },
  handler: async (ctx, args): Promise<SearchResult[]> => {
    await getCurrentActor(ctx);
    const term = args.term.toLowerCase();
    const results: SearchResult[] = [];

    const employees = await ctx.db.query("employees").take(200);
    for (const e of employees) {
      if (e.fullName.toLowerCase().includes(term) || e.position.toLowerCase().includes(term)) {
        results.push({ type: "employee", id: e._id, label: `${e.fullName} — ${e.position}`, path: `/employees/${e._id}` });
      }
      if (results.length >= 15) break;
    }

    const projects = await ctx.db.query("projects").take(200);
    for (const p of projects) {
      if (p.name.toLowerCase().includes(term)) {
        results.push({ type: "project", id: p._id, label: p.name, path: `/tasks` });
      }
      if (results.length >= 20) break;
    }

    const tasks = await ctx.db.query("tasks").take(200);
    for (const t of tasks) {
      if (t.name.toLowerCase().includes(term)) {
        results.push({ type: "task", id: t._id, label: t.name, path: `/tasks` });
      }
      if (results.length >= 25) break;
    }

    return results.slice(0, 10);
  },
});
