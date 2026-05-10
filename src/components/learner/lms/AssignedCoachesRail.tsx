import { Link } from "react-router-dom";
import { MessageCircle, Mail, Calendar, User } from "lucide-react";

interface Coach {
  user_id: string;
  full_name: string;
  avatar_url?: string | null;
  bio?: string | null;
  slug?: string | null;
  course_count: number;
  email?: string | null;
  whatsapp?: string | null;
}

const AssignedCoachesRail = ({ coaches }: { coaches: Coach[] }) => {
  if (!coaches.length) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-foreground">Your Assigned Coaches</h2>
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
        {coaches.map((c) => (
          <div key={c.user_id} className="snap-start min-w-[280px] max-w-[280px] rounded-2xl border border-border/60 bg-card p-4 space-y-3 shrink-0">
            <div className="flex items-center gap-3">
              {c.avatar_url ? (
                <img src={c.avatar_url} alt={c.full_name} className="h-12 w-12 rounded-full object-cover border border-border" />
              ) : (
                <div className="h-12 w-12 rounded-full bg-primary/15 grid place-items-center text-primary"><User className="h-5 w-5" /></div>
              )}
              <div className="min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">{c.full_name}</p>
                <p className="text-xs text-muted-foreground">{c.course_count} course{c.course_count === 1 ? "" : "s"} with you</p>
              </div>
            </div>
            {c.bio && <p className="text-xs text-muted-foreground line-clamp-2">{c.bio}</p>}
            <div className="flex items-center gap-2 pt-1">
              <Link to={`/coach/${c.slug || c.user_id}`} className="flex-1 text-center rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:brightness-110">
                <Calendar className="h-3 w-3 inline mr-1" /> Book
              </Link>
              {c.email && (
                <a href={`mailto:${c.email}`} className="rounded-lg border border-border px-2 py-1.5 hover:bg-secondary" title="Email">
                  <Mail className="h-3.5 w-3.5" />
                </a>
              )}
              {c.whatsapp && (
                <a href={`https://wa.me/${c.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="rounded-lg border border-border px-2 py-1.5 hover:bg-secondary" title="WhatsApp">
                  <MessageCircle className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default AssignedCoachesRail;
