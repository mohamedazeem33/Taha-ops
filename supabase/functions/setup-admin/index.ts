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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: existingAdmin, error: existingErr } = await admin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin")
      .limit(1)
      .maybeSingle();
    if (existingErr) throw existingErr;
    if (existingAdmin) {
      return json({ error: "An admin account already exists." }, 403);
    }

    const body = await req.json();
    const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!fullName) return json({ error: "Please enter your name." }, 400);
    if (!/^\S+@\S+\.\S+$/.test(email)) return json({ error: "Please enter a valid email." }, 400);
    if (password.length < 8) {
      return json({ error: "Password must be at least 8 characters." }, 400);
    }

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createErr || !created.user) {
      return json({ error: "Could not create the admin account. Please try again." }, 400);
    }

    const userId = created.user.id;

    const { error: profileErr } = await admin.from("profiles").insert({
      id: userId,
      full_name: fullName,
      email,
    });
    if (profileErr) {
      await admin.auth.admin.deleteUser(userId);
      throw profileErr;
    }

    const { error: roleErr } = await admin
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" });
    if (roleErr) {
      await admin.from("profiles").delete().eq("id", userId);
      await admin.auth.admin.deleteUser(userId);
      throw roleErr;
    }

    return json({ ok: true });
  } catch (err) {
    console.error("setup-admin failed", err);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
