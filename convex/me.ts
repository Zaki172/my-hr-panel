import { query } from "./_generated/server";
import { getCurrentActor } from "./lib/auth";

export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const { user, role, employee } = await getCurrentActor(ctx);
    let company = null;
    let department = null;
    if (employee) {
      company = await ctx.db.get(employee.companyId);
      department = await ctx.db.get(employee.departmentId);
    }
    return {
      user: { _id: user._id, name: user.name, email: user.email },
      role,
      employee,
      company,
      department,
    };
  },
});
