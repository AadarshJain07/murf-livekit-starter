import { useState } from "react";
import { PhoneCall, X, Loader2, CheckCircle2, Sparkles, AlertCircle, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (refId: string) => void;
};

export function RequestCallModal({ isOpen, onClose, onSuccess }: Props) {
  const [student, setStudent] = useState("");
  const [sipAddress, setSipAddress] = useState("");
  const [topic, setTopic] = useState("");
  const [reason, setReason] = useState("");
  const [language, setLanguage] = useState("Hinglish");
  const [urgency, setUrgency] = useState("high");

  const [loading, setLoading] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sipAddress.trim()) {
      setError("Please enter your Linphone SIP address so a teacher can call you.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/request-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student: student.trim() || "Student",
          phone_number: sipAddress.trim(),           // reuse phone_number field for SIP
          topic: topic.trim() || "General Study Doubt",
          reason: reason.trim() || "Requested a Linphone SIP call from a human teacher.",
          language_preference: language,
          urgency,
          follow_up_method: `Linphone SIP: ${sipAddress.trim()}`,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to dispatch call request.");
      }

      setSubmittedRef(data.reference_id);
      if (onSuccess) onSuccess(data.reference_id);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Could not submit call request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetAndClose = () => {
    setSubmittedRef(null);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-rise">
      <div className="glass-strong relative w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border-white/20">
        {/* Close Button */}
        <button
          type="button"
          onClick={handleResetAndClose}
          className="absolute top-5 right-5 grid h-8 w-8 place-items-center rounded-full bg-white/10 text-muted-foreground transition hover:bg-white/20 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        {!submittedRef ? (
          <div>
            {/* Header */}
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-brand text-primary-foreground shadow-[var(--glow-brand)]">
                <PhoneCall className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-display text-lg font-bold text-foreground">
                  Request a Teacher Call
                </h3>
                <p className="text-xs text-muted-foreground">
                  A teacher will call you back on <span className="font-semibold text-brand-cyan">Linphone</span>.
                </p>
              </div>
            </div>

            {/* Linphone Info Banner */}
            <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-brand-cyan/30 bg-brand-cyan/8 p-3.5">
              <Radio className="mt-0.5 h-4 w-4 shrink-0 text-brand-cyan" />
              <div className="text-[11px] leading-relaxed text-muted-foreground">
                <span className="block font-semibold text-brand-cyan mb-0.5">Using Linphone (SIP)</span>
                Share your Linphone SIP address — e.g.{" "}
                <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-foreground">
                  sip:yourname@sip.linphone.org
                </code>{" "}
                or just your username. The teacher will call you directly via Linphone.
              </div>
            </div>

            {error && (
              <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/15 p-3 text-xs text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  value={student}
                  onChange={(e) => setStudent(e.target.value)}
                  placeholder="e.g. Aadarsh Jain"
                  className="w-full rounded-xl glass px-3.5 py-2.5 text-xs text-foreground outline-none border border-white/15 focus:border-brand-purple bg-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Linphone SIP Address <span className="text-brand-cyan">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={sipAddress}
                    onChange={(e) => setSipAddress(e.target.value)}
                    placeholder="sip:yourname@sip.linphone.org"
                    className="w-full rounded-xl glass px-3.5 py-2.5 pl-8 text-xs text-foreground outline-none border border-white/15 focus:border-brand-cyan bg-transparent font-mono"
                  />
                  <Radio className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-brand-cyan" />
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground/70">
                  Find this in Linphone → Settings → SIP Account
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Subject / Topic
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Physics - Motion"
                    className="w-full rounded-xl glass px-3.5 py-2.5 text-xs text-foreground outline-none border border-white/15 bg-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full rounded-xl glass px-3.5 py-2.5 text-xs text-foreground outline-none border border-white/15 bg-card"
                  >
                    <option value="Hinglish">Hinglish</option>
                    <option value="English">English</option>
                    <option value="Hindi">हिन्दी (Hindi)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Doubt / What do you need help with?
                </label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Briefly describe the topic or doubt..."
                  className="w-full rounded-xl glass px-3.5 py-2 text-xs text-foreground outline-none border border-white/15 bg-transparent resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Urgency
                </label>
                <div className="flex gap-2">
                  {[
                    { id: "high", label: "🔴 Immediate" },
                    { id: "medium", label: "🟡 Within 1 hr" },
                    { id: "low", label: "🟢 Today" },
                  ].map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setUrgency(u.id)}
                      className={`flex-1 rounded-xl py-2 text-xs font-semibold border transition ${
                        urgency === u.id
                          ? "bg-gradient-brand text-primary-foreground border-transparent shadow-sm"
                          : "glass text-muted-foreground hover:text-foreground border-white/10"
                      }`}
                    >
                      {u.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleResetAndClose}
                  className="rounded-full px-5 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="rounded-full bg-gradient-brand px-6 text-xs font-bold text-primary-foreground shadow-[var(--glow-brand)]"
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <PhoneCall className="mr-2 h-4 w-4" />
                  )}
                  {loading ? "Dispatching…" : "Request Linphone Call"}
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <div className="py-4 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-brand text-primary-foreground shadow-[var(--glow-brand)]">
              <CheckCircle2 className="h-7 w-7" />
            </div>

            <h3 className="mt-4 font-display text-xl font-bold text-foreground">
              Linphone Call Dispatched! 📞
            </h3>

            <p className="mt-2 text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
              Your teacher call request has been sent to our support team on Discord. A teacher will call you on Linphone at:
            </p>

            <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-brand-cyan/30 bg-brand-cyan/10 px-4 py-2 text-xs font-mono font-bold text-brand-cyan">
              <Radio className="h-3.5 w-3.5" />
              {sipAddress}
            </div>

            <p className="mt-2 text-[11px] text-muted-foreground">
              Make sure Linphone is open and you&apos;re signed in to receive the call.
            </p>

            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-mono font-semibold text-foreground">
              <Sparkles className="h-3.5 w-3.5 text-brand-cyan" />
              Ref: {submittedRef}
            </div>

            <div className="mt-5">
              <Button
                onClick={handleResetAndClose}
                className="rounded-full bg-gradient-brand px-8 text-xs font-bold text-primary-foreground shadow-[var(--glow-brand)]"
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
