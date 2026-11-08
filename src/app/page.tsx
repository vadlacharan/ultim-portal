"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgePercent,
  CalendarCheck,
  Dumbbell,
  HeartPulse,
  MapPin,
  QrCode,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Store,
  Trophy,
} from "lucide-react";
import { LandingEnquiryForm } from "@/components/portal/landing-enquiry-form";
import { Logo } from "@/components/portal/logo";
import { useAuth } from "@/components/portal/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { API_URL, type Tenant } from "@/lib/api";

type FeaturedFacility = {
  id: number;
  name: string;
  city: string;
  image: string | null;
  activities: string[];
};

async function getFeaturedFacilities(): Promise<{ facilities: FeaturedFacility[]; total: number }> {
  try {
    const res = await fetch(`${API_URL}/api/tenants?limit=6&depth=1&sort=-createdAt`, {
      cache: "no-store",
    });
    if (!res.ok) return { facilities: [], total: 0 };
    const data = (await res.json()) as { docs?: Tenant[]; totalDocs?: number };

    const facilities = (data.docs ?? []).map((tenant) => {
      const firstImage = tenant.facilityImages?.[0]?.facilityImage;
      const rawUrl = firstImage && typeof firstImage !== "number" ? firstImage.url : null;
      return {
        id: tenant.id,
        name: tenant.Facility ?? `Facility #${tenant.id}`,
        city: tenant.city ?? "India",
        image: rawUrl ? (rawUrl.startsWith("http") ? rawUrl : `${API_URL}${rawUrl}`) : null,
        activities: (tenant.activities ?? [])
          .map((activity) => String(activity.activity).toLowerCase())
          .slice(0, 4),
      };
    });

    return { facilities, total: data.totalDocs ?? facilities.length };
  } catch {
    return { facilities: [], total: 0 };
  }
}

const HOW_IT_WORKS = [
  {
    icon: MapPin,
    title: "Discover nearby",
    body: "Browse gyms, courts and studios around you with live availability and transparent pricing.",
  },
  {
    icon: Store,
    title: "Activate at the center",
    body: "Register at reception, pay the center directly and get your credit balance loaded onto your pass.",
  },
  {
    icon: QrCode,
    title: "Book & scan in",
    body: "Book sessions with your credits and show your QR pass at the gate — in and out, contactless.",
  },
];

const CATEGORIES = [
  { icon: Dumbbell, title: "Fitness", body: "Gyms, crossfit boxes, yoga and pilates studios." },
  { icon: Trophy, title: "Sports", body: "Badminton, pickleball, turf cricket and more." },
  { icon: HeartPulse, title: "Health", body: "Swimming, recovery and wellness centers." },
];

const PARTNER_POINTS = [
  { icon: CalendarCheck, text: "A booking and check-in desk that runs itself" },
  { icon: BadgePercent, text: "Sell plans with credits, discounts and part-payments" },
  { icon: ScanLine, text: "Gate scanner with live QR verification" },
  { icon: ShieldCheck, text: "Member ledger, leads pipeline and staff accounts" },
];

const FAQS = [
  {
    q: "What is ULTIM?",
    a: "ULTIM is a hyper-local sports and fitness platform. Members discover centers nearby, activate a membership at the reception desk, and use a single credit balance to book sessions across activities.",
  },
  {
    q: "How do memberships and credits work?",
    a: "You pick a plan at the center and the reception desk loads credits onto your ULTIM pass. Credits are shared across the activities your plan supports — spend them on 1-hour or longer sessions, and top up or renew at the desk anytime.",
  },
  {
    q: "Do I pay inside the app?",
    a: "No. Memberships are purchased directly at the center so you can see the facilities, meet the team and get verified on the spot. The app handles discovery, bookings and your QR pass.",
  },
  {
    q: "What do partners get?",
    a: "Partners get a full web workspace: sell and manage plans, activate members, record payments, run the bookings board, scan QR passes at the gate, track leads and manage front-desk staff.",
  },
  {
    q: "How do I list my facility?",
    a: "Send us your details through the form below. Our partnerships team will set up your facility profile, plans and staff accounts with you.",
  },
];

export default function LandingPage() {
  const { user: session } = useAuth();
  const [facilities, setFacilities] = useState<FeaturedFacility[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getFeaturedFacilities().then((result) => {
      if (cancelled) return;
      setFacilities(result.facilities);
      setTotal(result.total);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-4">
          <Link href="/" aria-label="ULTIM home">
            <Logo />
          </Link>
          <nav className="ml-4 hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#how" className="transition-colors hover:text-foreground">How it works</a>
            <a href="#facilities" className="transition-colors hover:text-foreground">Facilities</a>
            <a href="#partners" className="transition-colors hover:text-foreground">For partners</a>
            <a href="#faq" className="transition-colors hover:text-foreground">FAQ</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {session ? (
              <Button asChild size="sm">
                <Link href="/app">
                  Open portal
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                  <Link href="/app">Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <a href="#partners">Partner with us</a>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_480px_at_85%_-10%,rgba(255,90,31,0.20),transparent_60%),radial-gradient(700px_400px_at_-5%_110%,rgba(233,181,76,0.10),transparent_55%)]" />
          <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-4 py-20 lg:grid-cols-2 lg:py-28">
            <div>
              <Badge variant="outline" className="mb-5 gap-2 border-primary/30 bg-primary/5 text-primary">
                <Sparkles className="size-3.5" />
                Hyper-local sports & fitness
              </Badge>
              <h1 className="arena-display text-[clamp(48px,6vw,84px)] font-semibold text-foreground">
                One pass.
                <br />
                <span className="text-primary">Every court & gym.</span>
              </h1>
              <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground">
                Find fitness centers and sports courts near you, activate your membership at the
                reception desk, then book sessions with a single shared credit balance — verified
                by QR at the gate.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <a href="#partners">
                    Become a partner
                    <ArrowRight className="size-4" />
                  </a>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/app">Partner sign in</Link>
                </Button>
              </div>
              <div className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-border pt-6">
                <div>
                  <p className="arena-numeral text-[30px] leading-none font-semibold">{total > 0 ? `${total}+` : "—"}</p>
                  <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                    Facilities
                  </p>
                </div>
                <div>
                  <p className="arena-numeral text-[30px] leading-none font-semibold">3</p>
                  <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                    Categories
                  </p>
                </div>
                <div>
                  <p className="arena-numeral text-[30px] leading-none font-semibold">1 QR</p>
                  <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                    For every entry
                  </p>
                </div>
              </div>
            </div>

            {/* Pass card mock */}
            <div className="relative mx-auto w-full max-w-sm">
              <div className="absolute -inset-6 rounded-[2rem] bg-primary/10 blur-2xl" aria-hidden />
              <div className="surface-glass relative rounded-[22px] p-6">
                <div className="flex items-center justify-between">
                  <span className="flex size-10 items-center justify-center rounded-full bg-primary/12 text-primary">
                    <Dumbbell className="size-5" />
                  </span>
                  <div className="text-right">
                    <p className="text-2xl font-bold tracking-tight">120</p>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      Credits left
                    </p>
                  </div>
                </div>
                <p className="mt-6 text-xl font-semibold tracking-tight">Iron Yard Fitness</p>
                <p className="text-sm text-muted-foreground">Hybrid pass · 3 months</p>
                <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-foreground/10">
                  <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-[#ff8a50] to-[#ff5a1f]" />
                </div>
                <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Expires 30 Sep</span>
                  <span className="flex items-center gap-1 text-primary">
                    <QrCode className="size-3.5" />
                    QR pass
                  </span>
                </div>
              </div>
              <div className="surface-glass absolute -bottom-6 -left-4 hidden rounded-2xl px-4 py-3 sm:block">
                <p className="text-xs text-muted-foreground">Next session</p>
                <p className="text-sm font-medium">Badminton · Court 2 · 6:00 PM</p>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="border-t border-border py-20">
          <div className="mx-auto w-full max-w-6xl px-4">
            <div className="max-w-2xl">
              <p className="arena-eyebrow">How it works</p><h2 className="arena-display mt-2 text-[clamp(34px,4vw,48px)] font-semibold">How ULTIM works</h2>
              <p className="mt-3 text-muted-foreground">
                Three steps between you and your next session.
              </p>
            </div>
            <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
              {HOW_IT_WORKS.map((step, index) => (
                <div key={step.title} className="surface-glass rounded-[22px] p-6">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <step.icon className="size-4" />
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Step {index + 1}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-medium">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="border-t border-border py-20">
          <div className="mx-auto w-full max-w-6xl px-4">
            <p className="arena-eyebrow">Categories</p><h2 className="arena-display mt-2 text-[clamp(34px,4vw,48px)] font-semibold">Built for every kind of sweat</h2>
            <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
              {CATEGORIES.map((category) => (
                <div
                  key={category.title}
                  className="group relative overflow-hidden rounded-[22px] border border-border bg-card p-6 transition-colors hover:border-primary/30"
                >
                  <div className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-primary/8 blur-2xl transition-opacity group-hover:opacity-100" />
                  <category.icon className="size-6 text-primary" />
                  <h3 className="mt-4 text-xl font-semibold">{category.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{category.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Featured facilities */}
        <section id="facilities" className="border-t border-border py-20">
          <div className="mx-auto w-full max-w-6xl px-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="arena-eyebrow">Network</p><h2 className="arena-display mt-2 text-[clamp(34px,4vw,48px)] font-semibold">Live on ULTIM</h2>
                <p className="mt-3 text-muted-foreground">
                  A growing network of partner facilities.
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <a href="#partners">
                  List your facility
                  <ArrowRight className="size-4" />
                </a>
              </Button>
            </div>

            {facilities.length === 0 ? (
              <div className="surface-glass mt-10 rounded-[22px] py-16 text-center text-sm text-muted-foreground">
                Facility listings are coming online — check back shortly.
              </div>
            ) : (
              <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {facilities.map((facility) => (
                  <div
                    key={facility.id}
                    className="group overflow-hidden rounded-[22px] border border-border bg-card"
                  >
                    <div className="relative h-40 overflow-hidden bg-accent">
                      {facility.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={facility.image}
                          alt={facility.name}
                          className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center">
                          <Store className="size-7 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="font-medium">{facility.name}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3" />
                        {facility.city}
                      </p>
                      {facility.activities.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {facility.activities.map((activity) => (
                            <Badge
                              key={activity}
                              variant="outline"
                              className="text-[10px] capitalize"
                            >
                              {activity}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Partners */}
        <section id="partners" className="border-t border-border py-20">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-12 px-4 lg:grid-cols-2">
            <div>
              <Badge variant="outline" className="mb-5 border-gold/40 bg-gold/10 text-gold">
                For facility owners
              </Badge>
              <p className="arena-eyebrow">For facility owners</p><h2 className="arena-display mt-2 text-[clamp(34px,4vw,48px)] font-semibold">Run your facility like a front desk should</h2>
              <p className="mt-4 text-muted-foreground">
                ULTIM gives your team one workspace for memberships, payments, bookings and gate
                entry — while the app brings members through your door.
              </p>
              <ul className="mt-8 space-y-4">
                {PARTNER_POINTS.map((point) => (
                  <li key={point.text} className="flex items-center gap-3 text-sm">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <point.icon className="size-4" />
                    </span>
                    {point.text}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <a href="#partners">
                    Apply to partner
                    <ArrowRight className="size-4" />
                  </a>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/app">I already have an account</Link>
                </Button>
              </div>
            </div>

            <div className="lg:pt-10">
              <LandingEnquiryForm />
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="border-t border-border py-20">
          <div className="mx-auto w-full max-w-3xl px-4">
            <p className="arena-eyebrow text-center">FAQ</p><h2 className="arena-display mt-2 text-center text-[clamp(34px,4vw,48px)] font-semibold">Frequently asked questions</h2>
            <div className="mt-10 space-y-3">
              {FAQS.map((faq) => (
                <details
                  key={faq.q}
                  className="surface-glass group rounded-2xl px-5 py-4 [&_summary::-webkit-details-marker]:hidden"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-4 text-sm font-medium">
                    {faq.q}
                    <span className="text-muted-foreground transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-6 px-4 sm:flex-row">
          <div className="flex items-center gap-4">
            <Logo />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
            <a href="#how" className="transition-colors hover:text-foreground">How it works</a>
            <a href="#partners" className="transition-colors hover:text-foreground">Partners</a>
            <a href="mailto:partners@ultim.app" className="transition-colors hover:text-foreground">
              partners@ultim.app
            </a>
            <Link href="/app" className="transition-colors hover:text-foreground">Staff sign in</Link>
          </div>
          <p className="text-xs text-muted-foreground">
            ULTIM © {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
