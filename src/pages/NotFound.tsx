import { LineupStage } from "@/components/chetak/LineupStage";
import { ChetakMark } from "@/components/chetak/primitives";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <motion.main
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex min-h-screen items-center justify-center bg-background px-6 py-12"
    >
      <div className="grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:gap-16">
        <div className="max-w-xl">
          <ChetakMark />
          <p className="label-eyebrow mt-8">Error 404</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em] text-ink text-balance sm:text-5xl">
            This page has left the workshop.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
            The route you asked for is not part of the Ticket Executive
            workspace. Head back to the queue — or take a look at what is on the
            road right now.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="h-11 rounded-full px-6"
            >
              Go to dashboard
              <ArrowRight className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/tickets")}
              className="h-11 rounded-full border-border bg-card px-6 shadow-none"
            >
              View tickets
            </Button>
          </div>
        </div>

        {/* The hero shot has the pixels for a large stage (361x464 native), so
            the 404 is where it beats the smaller per-model cutouts. */}
        <LineupStage
          tone="light"
          mode="hero"
          className="h-[26rem] w-full sm:h-[30rem]"
        />
      </div>
    </motion.main>
  );
}
