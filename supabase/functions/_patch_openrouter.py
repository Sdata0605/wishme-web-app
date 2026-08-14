from pathlib import Path

root = Path(r"C:\Users\dell\Documents\Wish-Me\wishmefinal-webapp-latest\supabase\functions")
changed = []
for p in root.rglob("index.ts"):
    t = p.read_text(encoding="utf-8")
    n = t.replace(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        "https://openrouter.ai/api/v1/chat/completions",
    )
    n = n.replace(
        "Deno.env.get('LOVABLE_API_KEY')",
        "Deno.env.get('OPENROUTER_API_KEY') || Deno.env.get('LOVABLE_API_KEY')",
    )
    n = n.replace(
        'Deno.env.get("LOVABLE_API_KEY")',
        'Deno.env.get("OPENROUTER_API_KEY") || Deno.env.get("LOVABLE_API_KEY")',
    )
    doubled = "Deno.env.get('OPENROUTER_API_KEY') || Deno.env.get('OPENROUTER_API_KEY') || Deno.env.get('LOVABLE_API_KEY')"
    n = n.replace(doubled, "Deno.env.get('OPENROUTER_API_KEY') || Deno.env.get('LOVABLE_API_KEY')")
    doubled2 = 'Deno.env.get("OPENROUTER_API_KEY") || Deno.env.get("OPENROUTER_API_KEY") || Deno.env.get("LOVABLE_API_KEY")'
    n = n.replace(doubled2, 'Deno.env.get("OPENROUTER_API_KEY") || Deno.env.get("LOVABLE_API_KEY")')
    if n != t:
        p.write_text(n, encoding="utf-8")
        changed.append(str(p.relative_to(root)))
print("changed", len(changed))
print("\n".join(changed))
