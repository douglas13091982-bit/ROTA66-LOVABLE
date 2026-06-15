export function UrlPublica({ slug }: { slug: string }) {
  return (
    <div className="p-4 bg-background rounded-md border border-border">
      <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
        URL pública (catálogo)
      </div>
      <code className="text-primary">/c/{slug}</code>
    </div>
  );
}
