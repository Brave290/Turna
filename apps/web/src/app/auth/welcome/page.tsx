import Link from "next/link";
import { Compass, PlusCircle, Users } from "lucide-react";
import { Logo } from "@/components/logo";

const actions = [
  {
    title: "Create a Circle",
    description:
      "Start a new savings circle and invite your members by email.",
    icon: PlusCircle,
  },
  {
    title: "Join a Circle",
    description:
      "Got an invite? Join your circle and start contributing together.",
    icon: Users,
  },
  {
    title: "Explore Turna",
    description:
      "Take a look around the dashboard and see how your circles work.",
    icon: Compass,
  },
];

export default function WelcomePage() {
  return (
    <div className="animate-fade-in">
      <div className="text-center mb-10">
        <div className="flex justify-center mb-4"><Logo variant="on-dark" size={48} /></div>
        <h1 className="font-display text-3xl font-bold tracking-tight mb-3">
          Welcome to Turna
        </h1>
        <p className="text-white/55 leading-relaxed">
          You&apos;re ready to start or join your first savings circle.
        </p>
      </div>

      <div className="space-y-4">
        {actions.map((action) => (
          <Link
            key={action.title}
            href="/dashboard"
            className="card block text-forest group transition-all duration-200 hover:border-primary/50 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10"
          >
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center transition-colors group-hover:bg-primary group-hover:text-white">
                <action.icon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-semibold text-forest mb-1 group-hover:text-primary transition-colors">
                  {action.title}
                </h2>
                <p className="text-sm text-muted leading-relaxed">
                  {action.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
