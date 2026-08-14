import { useState } from "react";
import { Link } from "react-router-dom";
import { Smartphone } from "lucide-react";
import { SuperAppShell } from "@/components/superapp/SuperAppShell";
import { AppSidebar } from "@/components/superapp/AppSidebar";
import { PageTitle, Panel } from "@/components/superapp/ServiceIcon";
import { cn } from "@/lib/utils";

const operators = ["Airtel", "Jio", "Vi", "BSNL"];
const plans = [
  { id: "1", price: 299, validity: "28 days", data: "2GB/day", tag: "Popular" },
  { id: "2", price: 199, validity: "28 days", data: "1.5GB/day", tag: "" },
  { id: "3", price: 666, validity: "84 days", data: "1.5GB/day", tag: "Best value" },
  { id: "4", price: 19, validity: "1 day", data: "1GB", tag: "" },
];

export default function RechargePage() {
  const [mobile, setMobile] = useState("");
  const [operator, setOperator] = useState("Airtel");
  const [planId, setPlanId] = useState("1");
  const [status, setStatus] = useState("");

  const plan = plans.find((p) => p.id === planId)!;

  function recharge() {
    if (!/^\d{10}$/.test(mobile)) {
      setStatus("Enter a valid 10-digit mobile number.");
      return;
    }
    setStatus(`Recharge of ₹${plan.price} for ${mobile} (${operator}) ready to confirm.`);
  }

  return (
    <SuperAppShell nav="bills">
      <div className="flex gap-5">
        <AppSidebar section="bills" />
        <div className="min-w-0 flex-1">
          <PageTitle title="Mobile recharge" subtitle="Prepaid plans via WishMe" />

          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <Panel>
              <label className="block">
                <span className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-500">
                  <Smartphone className="h-3.5 w-3.5" /> Mobile number
                </span>
                <input
                  inputMode="numeric"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="10-digit number"
                  className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#6d28d9]"
                />
              </label>

              <p className="mb-2 mt-4 text-xs font-medium text-slate-500">Operator</p>
              <div className="flex flex-wrap gap-2">
                {operators.map((op) => (
                  <button
                    key={op}
                    type="button"
                    onClick={() => setOperator(op)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-sm font-medium",
                      operator === op ? "border-[#ff5c00] bg-orange-50 text-[#ea580c]" : "border-slate-200 text-slate-700"
                    )}
                  >
                    {op}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={recharge}
                className="mt-5 h-11 w-full rounded-lg bg-[#ff5c00] text-sm font-semibold text-white hover:bg-[#ea580c]"
              >
                Recharge ₹{plan.price}
              </button>
              {status ? <p className="mt-2 text-sm text-slate-600">{status}</p> : null}
            </Panel>

            <Panel>
              <h2 className="text-sm font-semibold text-slate-900">Plans</h2>
              <ul className="mt-3 space-y-2">
                {plans.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setPlanId(p.id)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg border p-3 text-left",
                        planId === p.id ? "border-[#6d28d9] bg-violet-50" : "border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">₹{p.price}</p>
                        <p className="text-xs text-slate-500">
                          {p.data} · {p.validity}
                        </p>
                      </div>
                      {p.tag ? (
                        <span className="rounded bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-[#ea580c]">
                          {p.tag}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
              <Link to="/bills" className="mt-3 inline-block text-sm font-medium text-[#6d28d9] hover:underline">
                Pay postpaid bills instead
              </Link>
            </Panel>
          </div>
        </div>
      </div>
    </SuperAppShell>
  );
}
