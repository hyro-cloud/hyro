import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { ArchitectureSection } from '@/components/landing/architecture-section';
import { CliSection } from '@/components/landing/cli-section';
import { FaqSection } from '@/components/landing/faq-section';
import { FeaturesSection } from '@/components/landing/features-section';
import { HeroSection } from '@/components/landing/hero-section';
import { IntegrationsStrip } from '@/components/landing/integrations-strip';
import { McpSection } from '@/components/landing/mcp-section';
import { MemorySection } from '@/components/landing/memory-section';
import { RoadmapSection } from '@/components/landing/roadmap-section';
import { SectionShell } from '@/components/landing/section-shell';
import { StatsSection } from '@/components/landing/stats-section';
import { TickerBar } from '@/components/landing/ticker-bar';

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <HeroSection />
        <StatsSection />
        <TickerBar />
        <FeaturesSection />
        <SectionShell
          id="integrations"
          index="02"
          label="integrations"
          title="B20 · Base MCP · x402 · Bankr"
          description="Onchain agents on Base, USDC pay-per-call, and Bankr-compatible flows — wired through HYRO MCP on your VPS."
          className="border-y border-hyro-line bg-hyro-panel/20"
        >
          <IntegrationsStrip hideLabel />
        </SectionShell>
        <McpSection />
        <MemorySection />
        <CliSection />
        <ArchitectureSection />
        <RoadmapSection />
        <FaqSection />
      </main>
      <SiteFooter />
    </>
  );
}
