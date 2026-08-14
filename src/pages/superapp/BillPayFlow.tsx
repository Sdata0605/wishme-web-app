import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { SuperAppShell } from "@/components/superapp/SuperAppShell";
import { AppSidebar } from "@/components/superapp/AppSidebar";
import { PageTitle, Panel } from "@/components/superapp/ServiceIcon";

const billersByCategory: Record<string, { id: string; name: string; hint: string }[]> = {
  electricity: [
    { id: "bescom", name: "BESCOM", hint: "Karnataka electricity" },
    { id: "tata", name: "Tata Power", hint: "Mumbai / Delhi" },
    { id: "bses", name: "BSES Rajdhani", hint: "Delhi" },
  ],
  water: [
    { id: "bwssb", name: "BWSSB", hint: "Bengaluru water" },
    { id: "delhi-jal", name: "Delhi Jal Board", hint: "Delhi" },
  ],
  gas: [
    { id: "indane", name: "Indane Gas", hint: "LPG" },
    { id: "hp", name: "HP Gas", hint: "LPG" },
  ],
  mobile: [
    { id: "airtel", name: "Airtel Postpaid", hint: "Mobile" },
    { id: "jio", name: "Jio Postpaid", hint: "Mobile" },
  ],
  broadband: [
    { id: "act", name: "ACT Fibernet", hint: "Broadband" },
    { id: "airtel-bb", name: "Airtel Xstream", hint: "Broadband" },
  ],
};

export default function BillPayFlow() {
  const [params] = useSearchParams();
  const category = (params.get("category") || "electricity").toLowerCase();
  const billers = billersByCategory[category] || billersByCategory.electricity;

  const [billerId, setBillerId] = useState(billers[0]?.id || "");
  const [consumer, setConsumer] = useState("");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"select" | "details" | "confirm" | "done">("select");
  const [message, setMessage] = useState("");

  const biller = useMemo(() => billers.find((b) => b.id === billerId) || billers[0], [billers, billerId]);

  function fetchBill() {
    if (!consumer.trim()) {
      setMessage("Enter consumer / account number.");
      return;
    }
    setAmount(category === "electricity" ? "2450.00" : "599.00");
    setStep("details");
    setMessage("");
  }

  function pay() {
    if (!amount || Number(amount) <= 0) {
      setMessage("Invalid amount.");
      return;
    }
    setStep("done");
    setMessage(`Payment of ₹${Number(amount).toFixed(2)} to ${biller?.name} ready.`);
  }

  return (
    <SuperAppShell nav="bills">
      <div className="flex gap-5">
        <AppSidebar section="bills" />
        <div className="min-w-0 flex-1">
          <PageTitle
            title="Pay a bill"
            subtitle={`${category.charAt(0).toUpperCase() + category.slice(1)} via BBPS`}
            actions={
              <Link to="/bills" className="inline-flex h-10 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium hover:bg-slate-50">
                <ArrowLeft className="h-4 w-4" /> Back to bills
              </Link>
            }
          />

          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <Panel>
              {step === "select" || step === "details" ? (
                <>
                  <h2 className="text-sm font-semibold text-slate-900">1. Choose biller</h2>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {billers.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setBillerId(b.id)}
                        className={`rounded-lg border p-3 text-left ${
                          billerId === b.id ? "border-[#ff5c00] bg-orange-50" : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <p className="text-sm font-semibold text-slate-900">{b.name}</p>
                        <p className="text-xs text-slate-500">{b.hint}</p>
                      </button>
                    ))}
                  </div>

                  <h2 className="mt-5 text-sm font-semibold text-slate-900">2. Account details</h2>
                  <label className="mt-2 block">
                    <span className="mb-1 block text-xs font-medium text-slate-500">Consumer / account number</span>
                    <input
                      value={consumer}
                      onChange={(e) => setConsumer(e.target.value)}
                      className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#ff5c00]"
                      placeholder="e.g. 1234567890"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={fetchBill}
                    className="mt-3 h-11 rounded-lg bg-[#ff5c00] px-4 text-sm font-semibold text-white hover:bg-[#ea580c]"
                  >
                    Fetch bill
                  </button>
                </>
              ) : null}

              {step === "details" || step === "confirm" ? (
                <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <h2 className="text-sm font-semibold text-slate-900">3. Amount</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {biller?.name} · {consumer || "—"}
                  </p>
                  <label className="mt-3 block">
                    <span className="mb-1 block text-xs font-medium text-slate-500">Payable amount (₹)</span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#ff5c00]"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setStep("confirm")}
                    className="mt-3 mr-2 h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium"
                  >
                    Review
                  </button>
                  <button
                    type="button"
                    onClick={pay}
                    className="mt-3 h-10 rounded-lg bg-[#ff5c00] px-4 text-sm font-semibold text-white hover:bg-[#ea580c]"
                  >
                    Pay now
                  </button>
                </div>
              ) : null}

              {step === "done" ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <p className="font-semibold text-emerald-800">Payment initiated</p>
                  <p className="mt-1 text-sm text-emerald-700">{message}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link to="/passbook" className="h-9 rounded-lg bg-emerald-700 px-3 text-sm font-semibold leading-9 text-white">
                      View passbook
                    </Link>
                    <Link to="/bills" className="h-9 rounded-lg border border-emerald-300 bg-white px-3 text-sm font-medium leading-9 text-emerald-800">
                      More bills
                    </Link>
                  </div>
                </div>
              ) : null}

              {message && step !== "done" ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
            </Panel>

            <aside className="space-y-4">
              <Panel className="bg-orange-50 border-orange-100">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-[#ea580c]" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">BBPS secure</p>
                    <p className="text-xs text-slate-600">Aadhaar-verified billers. Instant confirmation after live settlement is wired.</p>
                  </div>
                </div>
              </Panel>
              <Panel>
                <p className="text-sm font-semibold text-slate-900">Quick categories</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {Object.keys(billersByCategory).map((c) => (
                    <Link
                      key={c}
                      to={`/bills/pay?category=${c}`}
                      className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium capitalize text-slate-700 hover:bg-slate-50"
                    >
                      {c}
                    </Link>
                  ))}
                </div>
              </Panel>
            </aside>
          </div>
        </div>
      </div>
    </SuperAppShell>
  );
}
