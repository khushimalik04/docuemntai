"use client";

import {
  ArrowRight,
  CheckCircle2,
  Globe,
  Plug,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

const integrations = [
  {
    id: "zoom",
    name: "Zoom",
    category: "Video meetings",
    description:
      "Sync meeting recordings, transcript files, and follow-up notes directly from your Zoom calls.",
    status: "Linked",
    accent: "bg-[#22c55e]/10 text-[#16a34a]",
    icon: Video,
    connectUrl:
      "https://zoom.us/signin?ampDeviceId=fd048174-f325-4849-8a64-cf2fea3b7d33&ampSessionId=1790347449564&_ics=1790347505385&irclickid=%7E7a4X13XOIPIEFzCsvwmukbc-cjabf%7E71YVMSUJKHAywpjga5VUQH&_gl=1*so5jb9*_gcl_au*MjAxOTE5MDcwMC4xNzkwMzQ3NDQ4*_ga*MTgzNzQ2ODAzNi4xNzczNTAxMDA4*_ga_L8TBF28DDX*czE3NzM1MDEwMDgkbzEkZzAkdDE3NzM1MDEwMDgkajYwJGwwJGgw#/login",
  },
  {
    id: "google-meet",
    name: "Google Meet",
    category: "Meetings",
    description:
      "Capture Google Meet notes and automatically attach summaries back to the event timeline.",
    status: "Linked",
    accent: "bg-[#22c55e]/10 text-[#16a34a]",
    icon: Globe,
    connectUrl: "https://meet.google.com/home",
  },
];

export default function IntegrationsPage() {
  const handleConnect = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-700">
            <Plug size={14} />
            Integrations
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Connected tools for your workflow
          </h1>
        </div>
        <Button variant="primary" size="md">
          Add integration
        </Button>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
        {integrations.map(({ name, category, description, status, accent, icon: Icon, connectUrl }) => (
          <article
            key={name}
            className="rounded-2xl border border-border bg-surface p-5 shadow-sm"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Icon size={20} />
              </div>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium ${accent}`}>
                <CheckCircle2 size={12} />
                {status}
              </span>
            </div>

            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">
              {category}
            </p>
            <h2 className="mt-2 text-lg font-semibold">{name}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{description}</p>

            <div className="mt-5 flex items-center justify-between gap-3">
              <Button variant="secondary" size="sm">
                Manage
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleConnect(connectUrl)}
              >
                <span className="inline-flex items-center gap-1 text-sm font-medium">
                  Connect account <ArrowRight size={14} />
                </span>
              </Button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
