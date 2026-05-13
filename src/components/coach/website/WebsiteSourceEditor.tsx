import { useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Layout, Globe, FileCode2, Github, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

export type SourceMode = "builder" | "external_url" | "html_file" | "github";

interface Props {
  sourceMode: SourceMode;
  externalUrl: string;
  customHtml: string;
  githubRepoUrl: string;
  onChange: (patch: {
    source_mode?: SourceMode;
    external_url?: string;
    custom_html?: string;
    github_repo_url?: string;
  }) => void;
}

const OPTIONS: { id: SourceMode; label: string; desc: string; icon: any }[] = [
  { id: "builder", label: "Built-in Builder", desc: "Use the section-based premium builder below.", icon: Layout },
  { id: "external_url", label: "External URL", desc: "Embed any Lovable app or live website by URL.", icon: Globe },
  { id: "html_file", label: "HTML File", desc: "Upload or paste a self-contained HTML file.", icon: FileCode2 },
  { id: "github", label: "GitHub Repo", desc: "Link a GitHub repo + the deployed live URL.", icon: Github },
];

const WebsiteSourceEditor = ({ sourceMode, externalUrl, customHtml, githubRepoUrl, onChange }: Props) => {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleHtmlUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".html") && file.type !== "text/html") {
      toast({ title: "Please upload a .html file", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 2 MB.", variant: "destructive" });
      return;
    }
    const text = await file.text();
    onChange({ custom_html: text });
    toast({ title: "HTML loaded", description: "Click Save Draft to keep it." });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Globe className="h-4 w-4" /> Website Source
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-xs text-muted-foreground">
          Choose how your public coach website is delivered. You can use the built-in builder, embed an external URL (e.g. a Lovable app), upload a custom HTML file, or connect a GitHub repository.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {OPTIONS.map((o) => {
            const Icon = o.icon;
            const active = sourceMode === o.id;
            return (
              <button
                type="button"
                key={o.id}
                onClick={() => onChange({ source_mode: o.id })}
                className={cn(
                  "text-left p-3 rounded-xl border transition-all",
                  active
                    ? "border-primary bg-primary/10 ring-1 ring-primary"
                    : "border-border bg-card hover:bg-muted"
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground")} />
                  <span className="text-sm font-semibold">{o.label}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">{o.desc}</p>
              </button>
            );
          })}
        </div>

        {sourceMode === "external_url" && (
          <div className="space-y-2">
            <Label>External URL</Label>
            <Input
              placeholder="https://your-site.lovable.app"
              value={externalUrl}
              onChange={(e) => onChange({ external_url: e.target.value })}
            />
            <p className="text-[11px] text-muted-foreground">
              We embed this URL inside your coach page. Make sure the site allows iframe embedding.
            </p>
          </div>
        )}

        {sourceMode === "html_file" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".html,text/html"
                hidden
                onChange={(e) => e.target.files?.[0] && handleHtmlUpload(e.target.files[0])}
              />
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" /> Upload .html file
              </Button>
              {customHtml && (
                <span className="text-[11px] text-muted-foreground">
                  {(customHtml.length / 1024).toFixed(1)} KB loaded
                </span>
              )}
            </div>
            <Label className="text-xs">Or paste HTML</Label>
            <Textarea
              rows={8}
              placeholder="<!doctype html>..."
              value={customHtml}
              onChange={(e) => onChange({ custom_html: e.target.value })}
              className="font-mono text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              HTML is rendered inside a sandboxed iframe for safety. Inline CSS/JS work; cross-origin requests follow the browser's normal rules.
            </p>
          </div>
        )}

        {sourceMode === "github" && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>GitHub Repository URL</Label>
              <Input
                placeholder="https://github.com/yourname/your-site"
                value={githubRepoUrl}
                onChange={(e) => onChange({ github_repo_url: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Deployed Live URL</Label>
              <Input
                placeholder="https://yourname.github.io/your-site"
                value={externalUrl}
                onChange={(e) => onChange({ external_url: e.target.value })}
              />
              <p className="text-[11px] text-muted-foreground">
                We embed the deployed URL. Connect your repo to GitHub Pages, Vercel, Netlify, or Lovable, then paste the live URL above.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WebsiteSourceEditor;
