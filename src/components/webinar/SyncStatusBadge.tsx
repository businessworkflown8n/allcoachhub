import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/** Status pill for a webinar sync job. "skipped" means the destination did not apply the change. */
const SyncStatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case "synced": return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Synced</Badge>;
    case "failed": return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
    case "processing": return <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>;
    case "pending": return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    case "skipped": return <Badge variant="outline" className="text-muted-foreground">Not applied</Badge>;
    case "superseded": return <Badge variant="outline" className="text-muted-foreground">Superseded</Badge>;
    default: return <Badge variant="outline" className="text-muted-foreground">—</Badge>;
  }
};

export default SyncStatusBadge;
