import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const BAN_FOREVER = "876000h";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return json({ error: "Please sign in again." }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData.user) return json({ error: "Please sign in again." }, 401);
    const callerId = userData.user.id;

    const { data: callerRole, error: roleErr } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .maybeSingle();
    if (roleErr) throw roleErr;
    if (callerRole?.role !== "admin") {
      return json({ error: "Only admins can manage employees." }, 403);
    }

    const body = await req.json();

    if (body.action === "create") {
      const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const tempPassword = typeof body.temp_password === "string" ? body.temp_password : "";

      if (!fullName) return json({ error: "Please enter a name." }, 400);
      if (!/^\S+@\S+\.\S+$/.test(email)) return json({ error: "Please enter a valid email." }, 400);
      if (tempPassword.length < 8) {
        return json({ error: "Temporary password must be at least 8 characters." }, 400);
      }

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
      });
      if (createErr || !created.user) {
        const alreadyExists = createErr?.message?.toLowerCase().includes("already");
        return json(
          {
            error: alreadyExists
              ? "An account with this email already exists."
              : "Could not create the account. Please try again.",
          },
          400,
        );
      }

      const newId = created.user.id;

      const { error: profileErr } = await admin.from("profiles").insert({
        id: newId,
        full_name: fullName,
        email,
        must_change_password: true,
      });
      if (profileErr) {
        await admin.auth.admin.deleteUser(newId);
        throw profileErr;
      }

      const { error: newRoleErr } = await admin
        .from("user_roles")
        .insert({ user_id: newId, role: "employee" });
      if (newRoleErr) {
        await admin.from("profiles").delete().eq("id", newId);
        await admin.auth.admin.deleteUser(newId);
        throw newRoleErr;
      }

      return json({ ok: true, id: newId });
    }

    if (body.action === "set_active") {
      const targetId = typeof body.user_id === "string" ? body.user_id : "";
      const isActive = body.is_active === true;

      if (!targetId) return json({ error: "Missing employee." }, 400);
      if (targetId === callerId) {
        return json({ error: "You can't change the status of your own account." }, 400);
      }

      const { data: targetRole, error: targetErr } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", targetId)
        .maybeSingle();
      if (targetErr) throw targetErr;
      if (targetRole?.role !== "employee") {
        return json({ error: "Only employee accounts can be changed here." }, 400);
      }

      const { error: banErr } = await admin.auth.admin.updateUserById(targetId, {
        ban_duration: isActive ? "none" : BAN_FOREVER,
      });
      if (banErr) throw banErr;

      const { error: updateErr } = await admin
        .from("profiles")
        .update({ is_active: isActive })
        .eq("id", targetId);
      if (updateErr) throw updateErr;

      return json({ ok: true });
    }

    return json({ error: "Unknown action." }, 400);
  } catch (err) {
    console.error("manage-employee failed", err);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
