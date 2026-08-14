import { useState } from "react";
import {
  Baby,
  Bookmark,
  Cake,
  CalendarDays,
  Check,
  Download,
  Heart,
  Lock,
  Mail,
  MessageCircle,
  PartyPopper,
  Pencil,
  RefreshCw,
  Share2,
  Sparkles,
} from "lucide-react";
import { SuperAppShell } from "@/components/superapp/SuperAppShell";
import { PageTitle, Panel } from "@/components/superapp/ServiceIcon";
import { cn } from "@/lib/utils";

const occasions = [
  { id: "birthday", label: "Birthday", icon: Cake },
  { id: "anniversary", label: "Anniversary", icon: Heart },
  { id: "congrats", label: "Congratulations", icon: PartyPopper },
  { id: "festival", label: "Festival", icon: Sparkles },
  { id: "thanks", label: "Thank You", icon: Mail },
  { id: "newborn", label: "New Born", icon: Baby },
];

const styles = [
  { id: "elegant", label: "Elegant", tone: "from-rose-100 to-rose-200" },
  { id: "fun", label: "Fun & Colorful", tone: "from-amber-100 to-yellow-200" },
  { id: "minimal", label: "Minimal", tone: "from-emerald-50 to-lime-100" },
  { id: "hand", label: "Handwritten", tone: "from-stone-100 to-orange-100" },
  { id: "3d", label: "3D Illustration", tone: "from-violet-100 to-fuchsia-100" },
  { id: "water", label: "Watercolor", tone: "from-sky-100 to-indigo-100" },
];

const cards = [
  {
    id: "1",
    title: "Happy Birthday!",
    body: "Wishing you a day filled with laughter and your favourite people.",
    bg: "bg-orange-50",
  },
  {
    id: "2",
    title: "Happy Birthday!",
    body: "May your year be as awesome and wonderful as you are.",
    bg: "bg-[#4c1d95] text-white",
  },
  {
    id: "3",
    title: "Happy Birthday!",
    body: "Here's to another year of smiles, adventures and cake.",
    bg: "bg-sky-50",
  },
];

export default function AIGreetings() {
  const [prompt, setPrompt] = useState(
    "Create a warm birthday wish for my best friend. Keep it fun, with balloons and a smiley theme."
  );
  const [occasion, setOccasion] = useState("birthday");
  const [style, setStyle] = useState("fun");
  const [selectedCard, setSelectedCard] = useState("2");
  const [delivery, setDelivery] = useState("whatsapp");
  const [name, setName] = useState("");
  const [generated, setGenerated] = useState(true);

  return (
    <SuperAppShell nav="greetings">
      <PageTitle
        title="Greeting cards"
        subtitle="Describe a wish, pick occasion and style, then share"
      />

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr_0.85fr]">
        <div className="space-y-4">
          <Panel>
            <h2 className="text-sm font-semibold text-slate-900">1. Describe your wish</h2>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value.slice(0, 500))}
              className="mt-2 min-h-[110px] w-full resize-none rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-[#ff5c00]"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setPrompt("Write a short anniversary note for my parents. Warm and grateful.")
                }
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Suggest prompt
              </button>
              <span className="ml-auto text-xs text-slate-500">{prompt.length}/500</span>
              <button
                type="button"
                onClick={() => setGenerated(true)}
                className="inline-flex h-9 items-center gap-1 rounded-lg bg-[#ff5c00] px-3 text-xs font-semibold text-white hover:bg-[#ea580c]"
              >
                <Sparkles className="h-3.5 w-3.5" /> Generate
              </button>
            </div>
          </Panel>

          <Panel>
            <h2 className="mb-2 text-sm font-semibold text-slate-900">2. Occasion</h2>
            <div className="flex flex-wrap gap-2">
              {occasions.map((item) => {
                const Icon = item.icon;
                const active = occasion === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setOccasion(item.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium",
                      active ? "border-[#ff5c00] bg-orange-50 text-[#ea580c]" : "border-slate-200 text-slate-700"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel>
            <h2 className="mb-2 text-sm font-semibold text-slate-900">3. Style</h2>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 xl:grid-cols-3">
              {styles.map((item) => {
                const active = style === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setStyle(item.id)}
                    className={cn(
                      "relative overflow-hidden rounded-lg border p-2 text-left",
                      active ? "border-[#ff5c00]" : "border-slate-200"
                    )}
                  >
                    {active ? (
                      <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#ff5c00] text-white">
                        <Check className="h-2.5 w-2.5" />
                      </span>
                    ) : null}
                    <div className={cn("mb-1.5 h-10 rounded-md bg-gradient-to-br", item.tone)} />
                    <p className="text-[11px] font-medium text-slate-800">{item.label}</p>
                  </button>
                );
              })}
            </div>
          </Panel>
        </div>

        <Panel>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">4. Generated cards</h2>
            {!generated ? <span className="text-xs text-slate-500">Generate to preview</span> : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
            {cards.map((card) => {
              const active = selectedCard === card.id;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => setSelectedCard(card.id)}
                  className={cn(
                    "relative rounded-xl border p-4 text-left",
                    card.bg,
                    active ? "border-[#ff5c00] ring-2 ring-[#ff5c00]/25" : "border-transparent"
                  )}
                >
                  {active ? (
                    <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#ff5c00] text-white">
                      <Check className="h-3 w-3" />
                    </span>
                  ) : null}
                  <p className="font-semibold">{card.title}</p>
                  <p className="mt-2 text-xs leading-relaxed opacity-90">{card.body}</p>
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              { label: "Regenerate", icon: RefreshCw, onClick: () => setGenerated(true) },
              { label: "Edit", icon: Pencil },
              { label: "Save", icon: Bookmark },
              { label: "Share", icon: Share2 },
            ].map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <action.icon className="h-3.5 w-3.5" />
                {action.label}
              </button>
            ))}
          </div>
        </Panel>

        <Panel>
          <h2 className="mb-3 text-sm font-semibold text-slate-900">5. Finalise & share</h2>
          <p className="mb-2 text-xs font-medium text-slate-500">Delivery</p>
          <div className="mb-4 grid grid-cols-3 gap-2">
            {[
              { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
              { id: "email", label: "Email", icon: Mail },
              { id: "download", label: "Download", icon: Download },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setDelivery(opt.id)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg border p-2.5 text-[11px] font-medium",
                  delivery === opt.id ? "border-[#ff5c00] bg-orange-50 text-[#ea580c]" : "border-slate-200 text-slate-700"
                )}
              >
                <opt.icon className="h-4 w-4" />
                {opt.label}
              </button>
            ))}
          </div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Personalise name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 30))}
            placeholder="Recipient name"
            className="mb-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#ff5c00]"
          />
          <p className="mb-3 text-right text-[11px] text-slate-500">{name.length}/30</p>
          <label className="mb-1 block text-xs font-medium text-slate-500">Schedule</label>
          <button
            type="button"
            className="mb-4 flex h-10 w-full items-center justify-between rounded-lg border border-slate-200 px-3 text-sm font-medium"
          >
            Send now
            <CalendarDays className="h-4 w-4 text-slate-400" />
          </button>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-slate-600">Total</span>
            <span className="text-lg font-semibold text-[#ea580c]">₹149.00</span>
          </div>
          <button
            type="button"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#ff5c00] text-sm font-semibold text-white hover:bg-[#ea580c]"
          >
            <Lock className="h-4 w-4" /> Preview & pay
          </button>
        </Panel>
      </div>
    </SuperAppShell>
  );
}
