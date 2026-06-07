import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Accessibility Plugin" },
      { name: "description", content: "Accessibility Plugin" },
      { property: "og:title", content: "Accessibility Plugin" },
      { property: "og:description", content: "Accessibility Plugin" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <h1 className="text-4xl font-semibold text-foreground">Accessibility Plugin</h1>
    </div>
  );
}
