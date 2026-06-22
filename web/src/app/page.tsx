import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { ArchitectureSection } from '@/components/landing/architecture-section';
import { CliSection } from '@/components/landing/cli-section';
import { FaqSection } from '@/components/landing/faq-section';
import { FeaturesSection } from '@/components/landing/features-section';
import { HeroSection } from '@/components/landing/hero-section';
import { McpSection } from '@/components/landing/mcp-section';
import { MemorySection } from '@/components/landing/memory-section';
import { RoadmapSection } from '@/components/landing/roadmap-section';
import { TickerBar } from '@/components/landing/ticker-bar';

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <HeroSection />
        <TickerBar />
        <FeaturesSection />
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
