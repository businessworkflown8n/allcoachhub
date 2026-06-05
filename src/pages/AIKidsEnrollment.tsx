import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Sparkles, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const CLASSES = ["Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"];
const MEDIUMS = ["English", "Hindi", "Regional Language"];
const RELATIONS = ["Father", "Mother", "Guardian", "Other"];
const COURSES = [
  { value: "AI Kids Pro Foundation", label: "AI Kids Pro Foundation (Class 5–7)" },
  { value: "AI Kids Pro Explorer", label: "AI Kids Pro Explorer (Class 8–10)" },
  { value: "AI Kids Pro Advanced", label: "AI Kids Pro Advanced (Class 11–12)" },
];
const COUNTRY_CODES = ["+91", "+1", "+44", "+971", "+61", "+65", "+27", "+966"];

const initial = {
  student_name: "",
  student_class: "",
  school_name: "",
  medium_of_education: "",
  city: "",
  enrolled_by: "",
  parent_name: "",
  mobile_country_code: "+91",
  mobile_number: "",
  whatsapp_country_code: "+91",
  whatsapp_number: "",
  same_as_mobile: true,
  email: "",
  interested_course: "",
  has_laptop: "yes",
  learning_reason: "",
  consent_accepted: false,
};

const AIKidsEnrollment = () => {
  useSEO({
    title: "AI Kids Pro Enrollment | AI Coach Portal",
    description: "Enroll your child (Class 5–12) in the AI Kids Pro Future Skills Program. Learn AI, build projects, create the future.",
    canonical: "https://www.aicoachportal.com/ai-kids/enrollment",
  });
  const navigate = useNavigate();
  const [form, setForm] = useState(initial);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ ref: string } | null>(null);

  const set = (k: keyof typeof form, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.consent_accepted) {
      toast({ title: "Please accept consent to continue", variant: "destructive" });
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      toast({ title: "Please enter a valid email", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const payload = {
      student_name: form.student_name.trim(),
      student_class: form.student_class,
      school_name: form.school_name.trim(),
      medium_of_education: form.medium_of_education,
      city: form.city.trim(),
      enrolled_by: form.enrolled_by,
      parent_name: form.parent_name.trim(),
      mobile_country_code: form.mobile_country_code,
      mobile_number: form.mobile_number.trim(),
      whatsapp_country_code: form.same_as_mobile ? form.mobile_country_code : form.whatsapp_country_code,
      whatsapp_number: (form.same_as_mobile ? form.mobile_number : form.whatsapp_number).trim(),
      email: form.email.trim().toLowerCase(),
      interested_course: form.interested_course,
      has_laptop: form.has_laptop === "yes",
      learning_reason: form.learning_reason.trim() || null,
      consent_accepted: form.consent_accepted,
    };

    const { data, error } = await (supabase as any)
      .from("ai_kids_enrollments")
      .insert(payload)
      .select("reference_id")
      .maybeSingle();

    setSubmitting(false);
    if (error) {
      toast({ title: "Submission failed", description: error.message, variant: "destructive" });
      return;
    }
    setSuccess({ ref: data?.reference_id || "—" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/15 text-primary">
            <CheckCircle2 className="h-12 w-12" />
          </div>
          <h1 className="mb-3 text-3xl font-bold text-foreground sm:text-4xl">🎉 Enrollment Submitted Successfully</h1>
          <p className="mb-2 text-muted-foreground">Thank you for enrolling in AI Kids Pro. Our team will contact you shortly.</p>
          <div className="mt-4 rounded-xl border border-primary/30 bg-primary/10 px-5 py-3 text-sm">
            <span className="text-muted-foreground">Reference ID: </span>
            <span className="font-mono font-bold text-primary">{success.ref}</span>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button variant="outline" onClick={() => navigate("/")}><ArrowLeft className="mr-2 h-4 w-4" />Back To Home</Button>
            <Button onClick={() => navigate("/courses")}>Browse Courses</Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto max-w-3xl px-4 py-10 sm:py-16">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Future Skills Academy
          </div>
          <h1 className="mb-2 text-3xl font-bold text-foreground sm:text-4xl">🚀 AI Kids Pro Enrollment</h1>
          <p className="text-muted-foreground">Future Skills Program for Students from Class 5 to Class 12</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-8">
          {/* Section 1 */}
          <section className="rounded-2xl border border-border bg-card/60 p-5 backdrop-blur sm:p-7">
            <h2 className="mb-4 text-lg font-bold text-foreground">Student Details</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Student Full Name" required>
                <Input required value={form.student_name} onChange={(e) => set("student_name", e.target.value)} />
              </Field>
              <Field label="Class / Grade" required>
                <Select value={form.student_class} onValueChange={(v) => set("student_class", v)} required>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>{CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="School Name" required>
                <Input required value={form.school_name} onChange={(e) => set("school_name", e.target.value)} />
              </Field>
              <Field label="Medium of Education" required>
                <Select value={form.medium_of_education} onValueChange={(v) => set("medium_of_education", v)} required>
                  <SelectTrigger><SelectValue placeholder="Select medium" /></SelectTrigger>
                  <SelectContent>{MEDIUMS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="City" required>
                <Input required value={form.city} onChange={(e) => set("city", e.target.value)} />
              </Field>
            </div>
          </section>

          {/* Section 2 */}
          <section className="rounded-2xl border border-border bg-card/60 p-5 backdrop-blur sm:p-7">
            <h2 className="mb-4 text-lg font-bold text-foreground">Parent Details</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Enrolled By" required>
                <Select value={form.enrolled_by} onValueChange={(v) => set("enrolled_by", v)} required>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{RELATIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Parent / Guardian Name" required>
                <Input required value={form.parent_name} onChange={(e) => set("parent_name", e.target.value)} />
              </Field>
              <Field label="Mobile Number" required>
                <div className="flex gap-2">
                  <Select value={form.mobile_country_code} onValueChange={(v) => set("mobile_country_code", v)}>
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>{COUNTRY_CODES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input required type="tel" inputMode="numeric" value={form.mobile_number} onChange={(e) => set("mobile_number", e.target.value.replace(/[^0-9]/g, ""))} />
                </div>
              </Field>
              <Field label="WhatsApp Number">
                <div className="flex gap-2">
                  <Select value={form.same_as_mobile ? form.mobile_country_code : form.whatsapp_country_code} onValueChange={(v) => set("whatsapp_country_code", v)} disabled={form.same_as_mobile}>
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>{COUNTRY_CODES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input disabled={form.same_as_mobile} value={form.same_as_mobile ? form.mobile_number : form.whatsapp_number} onChange={(e) => set("whatsapp_number", e.target.value.replace(/[^0-9]/g, ""))} />
                </div>
                <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Checkbox checked={form.same_as_mobile} onCheckedChange={(v) => set("same_as_mobile", !!v)} />
                  Same as Mobile Number
                </label>
              </Field>
              <Field label="Email Address" required className="sm:col-span-2">
                <Input required type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </Field>
            </div>
          </section>

          {/* Section 3 */}
          <section className="rounded-2xl border border-border bg-card/60 p-5 backdrop-blur sm:p-7">
            <h2 className="mb-4 text-lg font-bold text-foreground">Learning Details</h2>
            <div className="space-y-4">
              <Field label="Interested Course" required>
                <Select value={form.interested_course} onValueChange={(v) => set("interested_course", v)} required>
                  <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                  <SelectContent>{COURSES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Laptop/Desktop Access" required>
                <div className="flex gap-3">
                  {["yes", "no"].map((v) => (
                    <label key={v} className={`flex-1 cursor-pointer rounded-lg border px-4 py-2.5 text-center text-sm font-medium capitalize transition-all ${form.has_laptop === v ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-foreground hover:border-primary/40"}`}>
                      <input type="radio" name="has_laptop" value={v} checked={form.has_laptop === v} onChange={() => set("has_laptop", v)} className="sr-only" />
                      {v}
                    </label>
                  ))}
                </div>
              </Field>
              <Field label="Why Do You Want Your Child To Learn AI? (Optional)">
                <Textarea rows={4} value={form.learning_reason} onChange={(e) => set("learning_reason", e.target.value)} />
              </Field>
            </div>
          </section>

          {/* Consent */}
          <section className="rounded-2xl border border-border bg-card/60 p-5 backdrop-blur sm:p-7">
            <label className="flex items-start gap-3 text-sm text-foreground">
              <Checkbox checked={form.consent_accepted} onCheckedChange={(v) => set("consent_accepted", !!v)} className="mt-0.5" />
              <span className="text-muted-foreground">
                I agree to be contacted regarding course enrollment, class schedules, assignments, certificates, course updates, promotional offers, and learning resources.
              </span>
            </label>
          </section>

          <Button type="submit" disabled={submitting} className="h-14 w-full bg-primary text-base font-bold text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90">
            {submitting ? (<><Loader2 className="mr-2 h-5 w-5 animate-spin" />Submitting...</>) : "Enroll Now & Start Your AI Journey"}
          </Button>
        </form>
      </main>
      <Footer />
    </div>
  );
};

const Field = ({ label, required, className, children }: { label: string; required?: boolean; className?: string; children: React.ReactNode }) => (
  <div className={className}>
    <Label className="mb-1.5 block text-sm">{label}{required && <span className="ml-0.5 text-destructive">*</span>}</Label>
    {children}
  </div>
);

export default AIKidsEnrollment;
