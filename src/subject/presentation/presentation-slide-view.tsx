import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type {
  Slide,
  SlideCard,
  SlideChartSeries,
  SlideFact,
  SlideLevel,
  SlideNode,
  SlideVertex,
} from './presentation-parser';
import {
  PRESENTATION_THEMES,
  type SlideThemeTokens,
} from './presentation-theme';

export type SlideViewVariant = 'card' | 'immersive';

type SlideViewProps = {
  slide: Slide;
  pageNum: number;
  total: number;
  variant?: SlideViewVariant;
  /** Resolved colour tokens for this deck's theme. Defaults to academic. */
  tokens?: SlideThemeTokens;
  /** Explicit stage size (used by fullscreen preview to fit the viewport). */
  stageWidth?: number;
  stageHeight?: number;
};

type Palette = {
  primary: string;
  accent: string;
  gold: string;
  bg: string;
  surface: string;
  ink: string;
  secondary: string;
};

function toPalette(t: SlideThemeTokens): Palette {
  return {
    primary: t.colorPrimary,
    accent: t.colorAccent,
    gold: t.colorGold,
    bg: t.colorBackground,
    surface: t.colorSurface,
    ink: t.colorText,
    secondary: t.colorTextSecondary,
  };
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function AccentBar({ large, color }: { large?: boolean; color: string }) {
  return (
    <View
      style={{
        width: large ? 5 : 3,
        height: large ? 48 : 32,
        borderRadius: 2,
        backgroundColor: color,
        marginRight: large ? 14 : 8,
      }}
    />
  );
}

function Bullet({
  text,
  large,
  accent,
  ink,
}: {
  text: string;
  large?: boolean;
  accent: string;
  ink: string;
}) {
  return (
    <View style={[s.bulletRow, large && s.bulletRowLg]}>
      <View style={[s.dot, large && s.dotLg, { backgroundColor: accent }]} />
      <ThemedText
        style={[s.bodyText, large && s.bodyTextLg, { color: ink }]}
        numberOfLines={large ? 6 : 3}>
        {text}
      </ThemedText>
    </View>
  );
}

function ContentHeader({
  title,
  large,
  p,
}: {
  title: string;
  large?: boolean;
  p: Palette;
}) {
  return (
    <View style={[s.contentHeader, large && s.contentHeaderLg, { backgroundColor: p.bg }]}>
      <AccentBar large={large} color={p.accent} />
      <View style={{ flex: 1 }}>
        <ThemedText
          style={[s.contentHeaderText, large && s.contentHeaderTextLg, { color: p.ink }]}
          numberOfLines={2}>
          {title}
        </ThemedText>
        <View
          style={[s.titleUnderline, large && s.titleUnderlineLg, { backgroundColor: p.accent }]}
        />
      </View>
    </View>
  );
}

// ─── Existing text layouts ────────────────────────────────────────────────────

function TitleSlide({ slide, large, p }: { slide: Slide; large?: boolean; p: Palette }) {
  return (
    <View style={[s.fill, { backgroundColor: p.primary }]}>
      <View style={[s.topLine, large && s.topLineLg, { backgroundColor: p.gold }]} />
      <View style={[s.titleContent, large && s.titleContentLg]}>
        <View style={[s.titleBar, large && s.titleBarLg, { backgroundColor: p.accent }]} />
        <View style={{ flex: 1 }}>
          <ThemedText style={[s.heroTitle, large && s.heroTitleLg]} numberOfLines={4}>
            {slide.title}
          </ThemedText>
          {slide.subtitle ? (
            <>
              <View style={[s.titleRule, large && s.titleRuleLg, { backgroundColor: p.accent }]} />
              <ThemedText style={[s.heroSubtitle, large && s.heroSubtitleLg]} numberOfLines={3}>
                {slide.subtitle}
              </ThemedText>
            </>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function SectionSlide({ slide, large, p }: { slide: Slide; large?: boolean; p: Palette }) {
  return (
    <View style={[s.fill, { backgroundColor: p.primary }]}>
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: large ? 120 : 64,
          backgroundColor: p.accent,
          opacity: 0.9,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: large ? 70 : 38,
          left: 0,
          right: 0,
          height: large ? 80 : 44,
          backgroundColor: p.accent,
          opacity: 0.35,
        }}
      />
      <View style={[s.sectionContent, large && s.sectionContentLg]}>
        <ThemedText style={[s.sectionChapter, large && s.sectionChapterLg, { color: p.accent }]}>
          CHAPTER
        </ThemedText>
        <ThemedText style={[s.sectionTitle, large && s.sectionTitleLg]} numberOfLines={3}>
          {slide.title}
        </ThemedText>
        {slide.subtitle ? (
          <ThemedText style={[s.sectionSub, large && s.sectionSubLg]} numberOfLines={2}>
            {slide.subtitle}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

function AgendaSlide({ slide, large, p }: { slide: Slide; large?: boolean; p: Palette }) {
  const items = slide.steps ?? slide.bullets ?? [];
  return (
    <View style={[s.fill, { backgroundColor: p.bg }]}>
      <ContentHeader title={slide.title} large={large} p={p} />
      <ScrollView style={s.body} contentContainerStyle={[s.bodyPad, large && s.bodyPadLg]}>
        {items.map((item, i) => (
          <View key={i} style={[s.agendaRow, large && s.agendaRowLg]}>
            <View style={[s.agendaNum, large && s.agendaNumLg, { backgroundColor: p.accent }]}>
              <ThemedText style={[s.agendaNumText, large && s.agendaNumTextLg]}>{i + 1}</ThemedText>
            </View>
            <ThemedText
              style={[s.agendaText, large && s.agendaTextLg, { color: p.ink }]}
              numberOfLines={2}>
              {item}
            </ThemedText>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function BulletsSlide({ slide, large, p }: { slide: Slide; large?: boolean; p: Palette }) {
  return (
    <View style={[s.fill, { backgroundColor: p.bg }]}>
      <ContentHeader title={slide.title} large={large} p={p} />
      <ScrollView style={s.body} contentContainerStyle={[s.bodyPad, large && s.bodyPadLg]}>
        {(slide.bullets ?? []).map((b, i) => (
          <Bullet key={i} text={b} large={large} accent={p.accent} ink={p.ink} />
        ))}
      </ScrollView>
    </View>
  );
}

function TwoColumnSlide({ slide, large, p }: { slide: Slide; large?: boolean; p: Palette }) {
  return (
    <View style={[s.fill, { backgroundColor: p.bg }]}>
      <ContentHeader title={slide.title} large={large} p={p} />
      <View style={[s.colWrap, large && s.colWrapLg]}>
        {[slide.left, slide.right].map((col, ci) =>
          col ? (
            <View key={ci} style={s.col}>
              <View
                style={[
                  s.colCard,
                  large && s.colCardLg,
                  { backgroundColor: p.surface, borderTopColor: ci === 0 ? p.accent : p.primary },
                ]}>
                <ThemedText
                  style={[s.colHeading, large && s.colHeadingLg, { color: p.primary }]}>
                  {col.heading}
                </ThemedText>
                {col.bullets.map((b, i) => (
                  <Bullet key={i} text={b} large={large} accent={p.accent} ink={p.ink} />
                ))}
              </View>
            </View>
          ) : null,
        )}
      </View>
    </View>
  );
}

function StepsSlide({ slide, large, p }: { slide: Slide; large?: boolean; p: Palette }) {
  const steps = slide.steps ?? [];
  return (
    <View style={[s.fill, { backgroundColor: p.bg }]}>
      <ContentHeader title={slide.title} large={large} p={p} />
      <ScrollView style={s.body} contentContainerStyle={[s.bodyPad, large && s.bodyPadLg]}>
        {steps.map((step, i) => (
          <View key={i}>
            {i > 0 ? (
              <View
                style={[
                  s.stepConnector,
                  large && s.stepConnectorLg,
                  { backgroundColor: p.accent },
                ]}
              />
            ) : null}
            <View style={[s.stepRow, large && s.stepRowLg]}>
              <View style={[s.stepPill, large && s.stepPillLg, { backgroundColor: p.accent }]}>
                <ThemedText style={[s.stepPillNum, large && s.stepPillNumLg]}>{i + 1}</ThemedText>
              </View>
              <View
                style={[s.stepCard, large && s.stepCardLg, { backgroundColor: p.surface }]}>
                <ThemedText
                  style={[s.stepText, large && s.stepTextLg, { color: p.ink }]}
                  numberOfLines={3}>
                  {step}
                </ThemedText>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function QuoteSlide({ slide, large, p }: { slide: Slide; large?: boolean; p: Palette }) {
  return (
    <View style={[s.fill, s.quoteOuter, { backgroundColor: p.bg }]}>
      <View style={[s.goldBar, large && s.goldBarLg, { backgroundColor: p.gold }]} />
      <ThemedText
        style={[s.quoteText, large && s.quoteTextLg, { color: p.primary }]}
        numberOfLines={8}>
        "{slide.quote ?? slide.title}"
      </ThemedText>
      {slide.attribution ? (
        <ThemedText style={[s.attribution, large && s.attributionLg, { color: p.accent }]}>
          — {slide.attribution}
        </ThemedText>
      ) : null}
    </View>
  );
}

function KeyFactsSlide({ slide, large, p }: { slide: Slide; large?: boolean; p: Palette }) {
  const facts: SlideFact[] = slide.facts ?? [];
  return (
    <View style={[s.fill, { backgroundColor: p.bg }]}>
      <ContentHeader title={slide.title} large={large} p={p} />
      <ScrollView style={s.body} contentContainerStyle={[s.bodyPad, large && s.bodyPadLg]}>
        {facts.map((fact, i) => (
          <View
            key={i}
            style={[
              s.factCard,
              large && s.factCardLg,
              {
                backgroundColor: p.surface,
                borderLeftColor: i % 2 === 0 ? p.accent : p.primary,
              },
            ]}>
            <ThemedText style={[s.factLabel, large && s.factLabelLg, { color: p.primary }]}>
              {fact.label}
            </ThemedText>
            <ThemedText
              style={[s.factValue, large && s.factValueLg, { color: p.secondary }]}>
              {fact.value}
            </ThemedText>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function TimelineSlide({ slide, large, p }: { slide: Slide; large?: boolean; p: Palette }) {
  const facts: SlideFact[] = slide.facts ?? [];
  // Horizontal rail for ≤6 items; vertical stack for more
  const horizontal = facts.length <= 6;

  if (horizontal) {
    return (
      <View style={[s.fill, { backgroundColor: p.bg }]}>
        <ContentHeader title={slide.title} large={large} p={p} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.body}
          contentContainerStyle={[s.timelineHorzPad, large && s.timelineHorzPadLg]}>
          {facts.map((fact, i) => (
            <View key={i} style={[s.timelineHorzItem, large && s.timelineHorzItemLg]}>
              {/* Label above the rail */}
              <ThemedText
                style={[s.timelineHorzLabel, large && s.timelineHorzLabelLg, { color: p.accent }]}
                numberOfLines={2}>
                {fact.label}
              </ThemedText>
              {/* Node + connecting line */}
              <View style={s.timelineHorzTrack}>
                {i > 0 ? (
                  <View style={[s.timelineHorzLine, { backgroundColor: p.accent }]} />
                ) : (
                  <View style={s.timelineHorzLineSpacer} />
                )}
                <View
                  style={[s.timelineHorzNode, large && s.timelineHorzNodeLg, { backgroundColor: p.accent }]}
                />
                {i < facts.length - 1 ? (
                  <View style={[s.timelineHorzLine, { backgroundColor: p.accent }]} />
                ) : (
                  <View style={s.timelineHorzLineSpacer} />
                )}
              </View>
              {/* Value below the rail */}
              <ThemedText
                style={[s.timelineHorzValue, large && s.timelineHorzValueLg, { color: p.secondary }]}
                numberOfLines={3}>
                {fact.value}
              </ThemedText>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  // Vertical (>6 items – keep original layout)
  return (
    <View style={[s.fill, { backgroundColor: p.bg }]}>
      <ContentHeader title={slide.title} large={large} p={p} />
      <ScrollView style={s.body} contentContainerStyle={[s.bodyPad, large && s.bodyPadLg]}>
        {facts.map((fact, i) => (
          <View key={i} style={[s.timelineRow, large && s.timelineRowLg]}>
            <View style={s.timelineTrack}>
              <View
                style={[s.timelineNode, large && s.timelineNodeLg, { backgroundColor: p.accent }]}
              />
              {i < facts.length - 1 ? (
                <View style={[s.timelineLine, { backgroundColor: p.accent }]} />
              ) : null}
            </View>
            <View style={[s.timelineContent, large && s.timelineContentLg]}>
              <ThemedText
                style={[s.timelineLabel, large && s.timelineLabelLg, { color: p.accent }]}>
                {fact.label}
              </ThemedText>
              <ThemedText
                style={[s.timelineValue, large && s.timelineValueLg, { color: p.secondary }]}>
                {fact.value}
              </ThemedText>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function CardsSlide({ slide, large, p }: { slide: Slide; large?: boolean; p: Palette }) {
  const cards: SlideCard[] = slide.cards ?? [];
  return (
    <View style={[s.fill, { backgroundColor: p.bg }]}>
      <ContentHeader title={slide.title} large={large} p={p} />
      <View style={[s.cardsWrap, large && s.cardsWrapLg]}>
        {cards.map((card, i) => (
          <View
            key={i}
            style={[
              s.cardTile,
              large && s.cardTileLg,
              {
                backgroundColor: p.surface,
                borderTopColor: i % 2 === 0 ? p.accent : p.primary,
              },
            ]}>
            <ThemedText
              style={[s.cardHeading, large && s.cardHeadingLg, { color: p.primary }]}>
              {card.heading}
            </ThemedText>
            <ThemedText
              style={[s.cardBody, large && s.cardBodyLg, { color: p.secondary }]}
              numberOfLines={large ? 6 : 4}>
              {card.body}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

function ClosingSlide({ slide, large, p }: { slide: Slide; large?: boolean; p: Palette }) {
  return (
    <View style={[s.fill, { backgroundColor: p.primary }]}>
      <View style={[s.closingBand, large && s.closingBandLg, { backgroundColor: p.accent }]} />
      <View style={[s.closingContent, large && s.closingContentLg]}>
        <ThemedText style={[s.closingTitle, large && s.closingTitleLg]}>{slide.title}</ThemedText>
        <View style={[s.closingDivider, { backgroundColor: p.gold }]} />
        {(slide.bullets ?? []).map((b, i) => (
          <View key={i} style={[s.closingBulletRow, large && s.closingBulletRowLg]}>
            <View style={[s.closingDot, large && s.closingDotLg, { backgroundColor: p.gold }]} />
            <ThemedText style={[s.closingBulletText, large && s.closingBulletTextLg]}>
              {b}
            </ThemedText>
          </View>
        ))}
        {slide.subtitle ? (
          <ThemedText style={[s.closingNext, large && s.closingNextLg, { color: p.accent }]}>
            {slide.subtitle}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

// ─── New visual layouts ────────────────────────────────────────────────────────

function InfographicSlide({ slide, large, p }: { slide: Slide; large?: boolean; p: Palette }) {
  const facts: SlideFact[] = slide.facts ?? [];
  return (
    <View style={[s.fill, { backgroundColor: p.bg }]}>
      <ContentHeader title={slide.title} large={large} p={p} />
      <View style={[s.infographicGrid, large && s.infographicGridLg]}>
        {facts.map((fact, i) => (
          <View
            key={i}
            style={[
              s.infographicTile,
              large && s.infographicTileLg,
              {
                backgroundColor: p.surface,
                borderTopColor: i % 3 === 0 ? p.accent : i % 3 === 1 ? p.primary : p.gold,
              },
            ]}>
            <ThemedText
              style={[s.infographicStat, large && s.infographicStatLg, { color: p.primary }]}
              numberOfLines={2}
              adjustsFontSizeToFit>
              {fact.label}
            </ThemedText>
            <ThemedText
              style={[s.infographicDesc, large && s.infographicDescLg, { color: p.secondary }]}
              numberOfLines={3}>
              {fact.value}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Horizontal bar chart (lollipop-style) using proportional View widths. */
function ChartSlide({ slide, large, p }: { slide: Slide; large?: boolean; p: Palette }) {
  const series: SlideChartSeries[] = slide.series ?? [];
  const chartType = slide.chartType ?? 'bar';
  const maxVal = Math.max(...series.map((s) => s.value), 1);

  // ── Bar chart ────────────────────────────────────────────────────────────────
  if (chartType === 'bar') {
    return (
      <View style={[s.fill, { backgroundColor: p.bg }]}>
        <ContentHeader title={slide.title} large={large} p={p} />
        <ScrollView style={s.body} contentContainerStyle={[s.bodyPad, large && s.bodyPadLg]}>
          {series.map((item, i) => {
            const pct = (item.value / maxVal) * 100;
            const barColor = i % 2 === 0 ? p.accent : p.primary;
            return (
              <View key={i} style={[s.barRow, large && s.barRowLg]}>
                <ThemedText
                  style={[s.barLabel, large && s.barLabelLg, { color: p.ink }]}
                  numberOfLines={1}>
                  {item.label}
                </ThemedText>
                <View style={[s.barTrack, large && s.barTrackLg, { backgroundColor: p.surface }]}>
                  <View
                    style={[
                      s.barFill,
                      large && s.barFillLg,
                      { width: `${pct}%` as unknown as number, backgroundColor: barColor },
                    ]}
                  />
                  <ThemedText style={[s.barValue, large && s.barValueLg, { color: barColor }]}>
                    {item.value}
                  </ThemedText>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  // ── Pie chart (proportion rows + color swatch) ───────────────────────────────
  if (chartType === 'pie') {
    const total = series.reduce((acc, s) => acc + s.value, 0) || 1;
    const PIE_COLORS = [p.accent, p.primary, p.gold, p.secondary];
    return (
      <View style={[s.fill, { backgroundColor: p.bg }]}>
        <ContentHeader title={slide.title} large={large} p={p} />
        <ScrollView style={s.body} contentContainerStyle={[s.bodyPad, large && s.bodyPadLg]}>
          {series.map((item, i) => {
            const pct = Math.round((item.value / total) * 100);
            const color = PIE_COLORS[i % PIE_COLORS.length]!;
            return (
              <View key={i} style={[s.pieRow, large && s.pieRowLg]}>
                <View style={[s.pieSwatch, large && s.pieSwatchLg, { backgroundColor: color }]} />
                <ThemedText
                  style={[s.pieLabel, large && s.pieLabelLg, { color: p.ink }]}
                  numberOfLines={1}>
                  {item.label}
                </ThemedText>
                <View style={[s.pieBarWrap, large && s.pieBarWrapLg, { backgroundColor: p.surface }]}>
                  <View
                    style={[
                      s.pieBarFill,
                      { width: `${pct}%` as unknown as number, backgroundColor: color },
                    ]}
                  />
                </View>
                <ThemedText style={[s.piePct, large && s.piePctLg, { color: color }]}>
                  {pct}%
                </ThemedText>
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  // ── Line chart (lollipop dots on a baseline) ─────────────────────────────────
  const CHART_H = large ? 160 : 80;
  const DOT_D = large ? 10 : 6;
  return (
    <View style={[s.fill, { backgroundColor: p.bg }]}>
      <ContentHeader title={slide.title} large={large} p={p} />
      <View style={[s.body, { paddingHorizontal: large ? 36 : 18 }]}>
        {/* Chart area */}
        <View style={{ height: CHART_H, marginTop: large ? 14 : 8, position: 'relative' }}>
          {/* Baseline */}
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 1.5,
              backgroundColor: p.secondary,
              opacity: 0.3,
            }}
          />
          {/* Dots & sticks */}
          {series.map((item, i) => {
            const xPct = series.length < 2 ? 50 : (i / (series.length - 1)) * 90 + 5;
            const yFromBottom = ((item.value / maxVal) * (CHART_H - DOT_D - 8)) + DOT_D / 2 + 4;
            const color = i % 2 === 0 ? p.accent : p.primary;
            return (
              <View key={i}>
                {/* Vertical stick from baseline to dot */}
                <View
                  style={{
                    position: 'absolute',
                    bottom: 1,
                    left: `${xPct}%` as unknown as number,
                    width: 1.5,
                    height: yFromBottom - DOT_D / 2,
                    backgroundColor: color,
                    opacity: 0.4,
                    marginLeft: -0.75,
                  }}
                />
                {/* Dot */}
                <View
                  style={{
                    position: 'absolute',
                    bottom: yFromBottom,
                    left: `${xPct}%` as unknown as number,
                    width: DOT_D,
                    height: DOT_D,
                    borderRadius: DOT_D / 2,
                    backgroundColor: color,
                    marginLeft: -(DOT_D / 2),
                    marginBottom: -(DOT_D / 2),
                  }}
                />
              </View>
            );
          })}
        </View>
        {/* X-axis labels */}
        <View style={[s.lineXLabels, large && s.lineXLabelsLg]}>
          {series.map((item, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center' }}>
              <ThemedText
                style={[s.lineXLabel, large && s.lineXLabelLg, { color: p.secondary }]}
                numberOfLines={2}>
                {item.label}
              </ThemedText>
              <ThemedText
                style={[s.lineXValue, large && s.lineXValueLg, { color: p.accent }]}>
                {item.value}
              </ThemedText>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

/** Flow diagram: nodes as boxes, sequential arrows between them. */
function DiagramSlide({ slide, large, p }: { slide: Slide; large?: boolean; p: Palette }) {
  const nodes: SlideNode[] = slide.nodes ?? [];
  // Build sequential order (respect edges if provided, otherwise use index order)
  return (
    <View style={[s.fill, { backgroundColor: p.bg }]}>
      <ContentHeader title={slide.title} large={large} p={p} />
      <ScrollView
        horizontal={large}
        showsHorizontalScrollIndicator={false}
        style={s.body}
        contentContainerStyle={[
          large ? s.diagramHorzPad : s.diagramVertPad,
          large ? s.diagramHorzPadLg : s.diagramVertPadLg,
        ]}>
        {nodes.map((node, i) => (
          <View key={i} style={large ? s.diagramHorzItem : s.diagramVertItem}>
            {i > 0 ? (
              <View style={large ? s.diagramArrowHorz : s.diagramArrowVert}>
                <ThemedText style={[s.diagramArrowText, { color: p.accent }]}>
                  {large ? '→' : '↓'}
                </ThemedText>
                {/* Edge label from edges array */}
                {(() => {
                  const edge = (slide.edges ?? []).find(
                    (e) => e.to === node.id || e.to === node.label,
                  );
                  return edge?.label ? (
                    <ThemedText
                      style={[s.diagramEdgeLabel, large && s.diagramEdgeLabelLg, { color: p.secondary }]}>
                      {edge.label}
                    </ThemedText>
                  ) : null;
                })()}
              </View>
            ) : null}
            <View
              style={[
                s.diagramBox,
                large && s.diagramBoxLg,
                {
                  backgroundColor: p.surface,
                  borderColor: i % 2 === 0 ? p.accent : p.primary,
                },
              ]}>
              <ThemedText
                style={[s.diagramNodeLabel, large && s.diagramNodeLabelLg, { color: p.primary }]}
                numberOfLines={2}>
                {node.label}
              </ThemedText>
              {node.detail ? (
                <ThemedText
                  style={[s.diagramNodeDetail, large && s.diagramNodeDetailLg, { color: p.secondary }]}
                  numberOfLines={2}>
                  {node.detail}
                </ThemedText>
              ) : null}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

/** Triangle: one tile top-center, two tiles bottom-left / bottom-right. */
function TriangleSlide({ slide, large, p }: { slide: Slide; large?: boolean; p: Palette }) {
  const verts: SlideVertex[] = (slide.vertices ?? []).slice(0, 3);
  const [top, bottomLeft, bottomRight] = verts;
  const tileColors = [p.accent, p.primary, p.gold];

  return (
    <View style={[s.fill, { backgroundColor: p.bg }]}>
      <ContentHeader title={slide.title} large={large} p={p} />
      <View style={[s.triangleBody, large && s.triangleBodyLg]}>
        {/* Top tile */}
        {top ? (
          <View style={s.triangleTopRow}>
            <View
              style={[
                s.triangleTile,
                large && s.triangleTileLg,
                { backgroundColor: p.surface, borderTopColor: tileColors[0] },
              ]}>
              <ThemedText style={[s.triangleHeading, large && s.triangleHeadingLg, { color: tileColors[0] }]}>
                {top.heading}
              </ThemedText>
              <ThemedText style={[s.triangleBody2, large && s.triangleBody2Lg, { color: p.secondary }]} numberOfLines={3}>
                {top.body}
              </ThemedText>
            </View>
          </View>
        ) : null}

        {/* Optional center label */}
        {slide.center ? (
          <ThemedText style={[s.triangleCenter, large && s.triangleCenterLg, { color: p.primary }]}>
            ◆ {slide.center}
          </ThemedText>
        ) : null}

        {/* Bottom two tiles */}
        <View style={s.triangleBottomRow}>
          {[bottomLeft, bottomRight].map((vert, i) =>
            vert ? (
              <View
                key={i}
                style={[
                  s.triangleTile,
                  large && s.triangleTileLg,
                  { backgroundColor: p.surface, borderTopColor: tileColors[i + 1] },
                ]}>
                <ThemedText style={[s.triangleHeading, large && s.triangleHeadingLg, { color: tileColors[i + 1] }]}>
                  {vert.heading}
                </ThemedText>
                <ThemedText style={[s.triangleBody2, large && s.triangleBody2Lg, { color: p.secondary }]} numberOfLines={3}>
                  {vert.body}
                </ThemedText>
              </View>
            ) : null,
          )}
        </View>
      </View>
    </View>
  );
}

/** Pyramid: rows that narrow toward the top (levels[0] = apex). */
function PyramidSlide({ slide, large, p }: { slide: Slide; large?: boolean; p: Palette }) {
  const levels: SlideLevel[] = slide.levels ?? [];
  const n = levels.length;
  // apex gets narrowest width, base gets full width
  // widths: index 0 (apex) = 35%, index n-1 (base) = 100%
  const getWidthPct = (i: number): string => {
    if (n <= 1) return '100%';
    const pct = Math.round(35 + ((i / (n - 1)) * 65));
    return `${pct}%`;
  };

  return (
    <View style={[s.fill, { backgroundColor: p.bg }]}>
      <ContentHeader title={slide.title} large={large} p={p} />
      <View style={[s.pyramidBody, large && s.pyramidBodyLg]}>
        {levels.map((level, i) => {
          const shade = i % 2 === 0 ? p.accent : p.primary;
          return (
            <View
              key={i}
              style={[
                s.pyramidRow,
                large && s.pyramidRowLg,
                {
                  width: getWidthPct(i) as unknown as number,
                  backgroundColor: shade,
                  opacity: 0.85 + i * 0.03,
                },
              ]}>
              <ThemedText
                style={[s.pyramidHeading, large && s.pyramidHeadingLg]}
                numberOfLines={1}>
                {level.heading}
              </ThemedText>
              {level.body ? (
                <ThemedText
                  style={[s.pyramidBodyText, large && s.pyramidBodyTextLg]}
                  numberOfLines={2}>
                  {level.body}
                </ThemedText>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** Cycle: steps arranged in a looping ring. Small = linear with ↻; large = radial. */
function CycleSlide({ slide, large, p }: { slide: Slide; large?: boolean; p: Palette }) {
  const steps = slide.steps ?? [];
  const n = steps.length;

  if (!large || n < 3) {
    // Compact linear layout with loop indicator
    return (
      <View style={[s.fill, { backgroundColor: p.bg }]}>
        <ContentHeader title={slide.title} large={large} p={p} />
        {slide.center ? (
          <ThemedText style={[s.cycleCenterLabel, large && s.cycleCenterLabelLg, { color: p.primary }]}>
            {slide.center}
          </ThemedText>
        ) : null}
        <ScrollView style={s.body} contentContainerStyle={[s.bodyPad, large && s.bodyPadLg]}>
          {steps.map((step, i) => (
            <View key={i}>
              {i > 0 ? (
                <ThemedText style={[s.cycleArrow, { color: p.accent }]}>↓</ThemedText>
              ) : null}
              <View style={[s.cyclePill, large && s.cyclePillLg, { backgroundColor: p.surface, borderColor: p.accent }]}>
                <View style={[s.cycleDot, large && s.cycleDotLg, { backgroundColor: p.accent }]}>
                  <ThemedText style={[s.cycleDotNum, large && s.cycleDotNumLg]}>{i + 1}</ThemedText>
                </View>
                <ThemedText style={[s.cycleStepText, large && s.cycleStepTextLg, { color: p.ink }]} numberOfLines={2}>
                  {step}
                </ThemedText>
              </View>
              {i === steps.length - 1 ? (
                <ThemedText style={[s.cycleArrow, { color: p.gold }]}>↻ loops back to step 1</ThemedText>
              ) : null}
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  // Radial layout: items positioned around a circle using percentage-based absolute positioning.
  // Container is square-ish, positioned in center of the body area.
  const RADIUS = 34; // % from center
  return (
    <View style={[s.fill, { backgroundColor: p.bg }]}>
      <ContentHeader title={slide.title} large={large} p={p} />
      <View style={s.cycleRadialContainer}>
        {/* Center label */}
        <View style={[s.cycleRadialCenter, { borderColor: p.accent }]}>
          <ThemedText style={[s.cycleRadialCenterText, { color: p.primary }]} numberOfLines={3}>
            {slide.center ?? '↻'}
          </ThemedText>
        </View>

        {steps.map((step, i) => {
          // angle starts at top (-90°), goes clockwise
          const angleDeg = (i / n) * 360 - 90;
          const angleRad = (angleDeg * Math.PI) / 180;
          const leftPct = 50 + RADIUS * Math.cos(angleRad);
          const topPct = 50 + RADIUS * Math.sin(angleRad);
          const color = i % 2 === 0 ? p.accent : p.primary;

          return (
            <View
              key={i}
              style={[
                s.cycleRadialPill,
                {
                  position: 'absolute',
                  left: `${leftPct}%` as unknown as number,
                  top: `${topPct}%` as unknown as number,
                  backgroundColor: p.surface,
                  borderColor: color,
                  transform: [{ translateX: -52 }, { translateY: -24 }],
                },
              ]}>
              <View style={[s.cycleRadialNum, { backgroundColor: color }]}>
                <ThemedText style={s.cycleRadialNumText}>{i + 1}</ThemedText>
              </View>
              <ThemedText style={[s.cycleRadialLabel, { color: p.ink }]} numberOfLines={2}>
                {step}
              </ThemedText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** Funnel: stacked centered rows, each narrower than the one above it. */
function FunnelSlide({ slide, large, p }: { slide: Slide; large?: boolean; p: Palette }) {
  const steps = slide.steps ?? [];
  const n = steps.length;
  // First row = 100%, last row ≈ 40%
  const getWidthPct = (i: number): string => {
    if (n <= 1) return '100%';
    const pct = Math.round(100 - (i / (n - 1)) * 60);
    return `${pct}%`;
  };

  return (
    <View style={[s.fill, { backgroundColor: p.bg }]}>
      <ContentHeader title={slide.title} large={large} p={p} />
      <View style={[s.funnelBody, large && s.funnelBodyLg]}>
        {steps.map((step, i) => {
          const shade = i % 2 === 0 ? p.accent : p.primary;
          return (
            <View key={i} style={s.funnelRowWrap}>
              {i > 0 ? (
                <ThemedText style={[s.funnelArrow, { color: p.gold }]}>▾</ThemedText>
              ) : null}
              <View
                style={[
                  s.funnelRow,
                  large && s.funnelRowLg,
                  {
                    width: getWidthPct(i) as unknown as number,
                    backgroundColor: shade,
                    opacity: 1 - i * 0.08,
                  },
                ]}>
                <ThemedText
                  style={[s.funnelText, large && s.funnelTextLg]}
                  numberOfLines={2}>
                  {step}
                </ThemedText>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── Router ────────────────────────────────────────────────────────────────────

function renderLayout(slide: Slide, large: boolean, p: Palette) {
  switch (slide.layout) {
    case 'title':
      return <TitleSlide slide={slide} large={large} p={p} />;
    case 'section':
      return <SectionSlide slide={slide} large={large} p={p} />;
    case 'agenda':
      return <AgendaSlide slide={slide} large={large} p={p} />;
    case 'twoColumn':
    case 'comparison':
      return <TwoColumnSlide slide={slide} large={large} p={p} />;
    case 'steps':
      return <StepsSlide slide={slide} large={large} p={p} />;
    case 'quote':
      return <QuoteSlide slide={slide} large={large} p={p} />;
    case 'keyFacts':
      return <KeyFactsSlide slide={slide} large={large} p={p} />;
    case 'timeline':
      return <TimelineSlide slide={slide} large={large} p={p} />;
    case 'cards':
      return <CardsSlide slide={slide} large={large} p={p} />;
    case 'closing':
      return <ClosingSlide slide={slide} large={large} p={p} />;
    // ── Visual layouts ──────────────────────────────────────────────────────
    case 'infographic':
      return <InfographicSlide slide={slide} large={large} p={p} />;
    case 'chart':
      return <ChartSlide slide={slide} large={large} p={p} />;
    case 'diagram':
      return <DiagramSlide slide={slide} large={large} p={p} />;
    case 'triangle':
      return <TriangleSlide slide={slide} large={large} p={p} />;
    case 'pyramid':
      return <PyramidSlide slide={slide} large={large} p={p} />;
    case 'cycle':
      return <CycleSlide slide={slide} large={large} p={p} />;
    case 'funnel':
      return <FunnelSlide slide={slide} large={large} p={p} />;
    case 'bullets':
    default:
      return <BulletsSlide slide={slide} large={large} p={p} />;
  }
}

export function PresentationSlideView({
  slide,
  pageNum,
  total,
  variant = 'card',
  tokens = PRESENTATION_THEMES.academic,
  stageWidth,
  stageHeight,
}: SlideViewProps) {
  const p = toPalette(tokens);
  const hasExplicitSize =
    typeof stageWidth === 'number' && typeof stageHeight === 'number' && stageWidth > 0 && stageHeight > 0;
  // Desktop-scale type only when the canvas is actually wide. Immersive on a
  // phone is ~360px — using "large" fonts there clips the slide.
  const lg = hasExplicitSize ? stageWidth >= 640 : variant === 'immersive';

  return (
    <View
      style={[
        hasExplicitSize
          ? { width: stageWidth, height: stageHeight, overflow: 'hidden' as const }
          : s.stage,
        lg && s.stageImmersive,
        { backgroundColor: p.bg },
      ]}>
      {slide.layout !== 'title' &&
      slide.layout !== 'section' &&
      slide.layout !== 'closing' ? (
        <View
          style={[s.topAccentLine, lg && s.topAccentLineLg, { backgroundColor: p.accent }]}
        />
      ) : null}
      {/* Content flexes above an in-flow footer so mobile never clips the slide bottom. */}
      <View style={s.contentSlot}>{renderLayout(slide, lg, p)}</View>
      <View style={[s.footer, lg && s.footerLg, { backgroundColor: p.primary }]}>
        <ThemedText style={[s.footerBrand, lg && s.footerBrandLg]}>Sheyon Ai</ThemedText>
        <ThemedText style={[s.footerCount, lg && s.footerCountLg]}>
          {pageNum} / {total}
        </ThemedText>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  // ── Stage ──────────────────────────────────────────────────────────────────
  stage: {
    aspectRatio: 16 / 9,
    width: '100%',
    overflow: 'hidden',
  },
  stageImmersive: {
    alignSelf: 'center',
    borderRadius: 8,
    boxShadow: '0 8px 24px rgba(0,0,0,0.28)',
    elevation: 12,
  },
  /** Shrinkable content area above the in-flow footer. */
  contentSlot: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    overflow: 'hidden',
  },
  fill: { flex: 1, minHeight: 0 },
  topAccentLine: { height: 3, width: '100%', flexShrink: 0 },
  topAccentLineLg: { height: 5 },
  // ── Title ─────────────────────────────────────────────────────────────────
  topLine: { height: 4, width: '100%' },
  topLineLg: { height: 6 },
  titleContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  titleContentLg: { paddingHorizontal: 44, paddingBottom: 20 },
  titleBar: { width: 5, height: 70, borderRadius: 2, marginRight: 16 },
  titleBarLg: { width: 8, height: 110, marginRight: 24 },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  heroTitleLg: { fontSize: 42, lineHeight: 50 },
  titleRule: { height: 2, width: 48, marginVertical: 8, borderRadius: 1 },
  titleRuleLg: { height: 3, width: 80, marginVertical: 12 },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '400',
    lineHeight: 18,
  },
  heroSubtitleLg: { fontSize: 20, lineHeight: 28 },
  // ── Section ───────────────────────────────────────────────────────────────
  sectionContent: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  sectionContentLg: { paddingHorizontal: 48 },
  sectionChapter: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 6,
  },
  sectionChapterLg: { fontSize: 13, marginBottom: 10 },
  sectionTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    lineHeight: 32,
  },
  sectionTitleLg: { fontSize: 40, lineHeight: 50 },
  sectionSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 6 },
  sectionSubLg: { fontSize: 17, marginTop: 12 },
  // ── Content header ─────────────────────────────────────────────────────────
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  contentHeaderLg: { paddingHorizontal: 32, paddingTop: 18, paddingBottom: 12 },
  contentHeaderText: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  contentHeaderTextLg: { fontSize: 24 },
  titleUnderline: { height: 2, width: 36, borderRadius: 1, marginTop: 4 },
  titleUnderlineLg: { height: 3, width: 60, marginTop: 6 },
  // ── Body shared ────────────────────────────────────────────────────────────
  body: { flex: 1 },
  bodyPad: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 8, gap: 6 },
  bodyPadLg: { paddingHorizontal: 36, paddingTop: 10, paddingBottom: 12, gap: 10 },
  // ── Bullets ────────────────────────────────────────────────────────────────
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  bulletRowLg: { gap: 12 },
  dot: { width: 7, height: 7, borderRadius: 4, marginTop: 5 },
  dotLg: { width: 10, height: 10, borderRadius: 5, marginTop: 8 },
  bodyText: { flex: 1, fontSize: 12, lineHeight: 18 },
  bodyTextLg: { fontSize: 18, lineHeight: 28 },
  // ── Two-column ─────────────────────────────────────────────────────────────
  colWrap: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 10,
  },
  colWrapLg: { paddingHorizontal: 28, paddingVertical: 14, gap: 18 },
  col: { flex: 1 },
  colCard: {
    flex: 1,
    borderRadius: 6,
    borderTopWidth: 3,
    padding: 10,
    gap: 5,
  },
  colCardLg: { borderTopWidth: 4, padding: 18, gap: 8, borderRadius: 10 },
  colHeading: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  colHeadingLg: { fontSize: 18, marginBottom: 8 },
  // ── Steps ──────────────────────────────────────────────────────────────────
  stepConnector: { width: 2, height: 8, alignSelf: 'flex-start', marginLeft: 10 },
  stepConnectorLg: { width: 3, height: 12, marginLeft: 15 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  stepRowLg: { gap: 14 },
  stepPill: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepPillLg: { width: 34, height: 34, borderRadius: 17 },
  stepPillNum: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  stepPillNumLg: { fontSize: 16 },
  stepCard: { flex: 1, borderRadius: 5, padding: 8 },
  stepCardLg: { borderRadius: 8, padding: 14 },
  stepText: { fontSize: 12, lineHeight: 17 },
  stepTextLg: { fontSize: 18, lineHeight: 26 },
  // ── Quote ──────────────────────────────────────────────────────────────────
  quoteOuter: { justifyContent: 'center', paddingHorizontal: 24 },
  goldBar: { width: 4, height: 56, borderRadius: 2, marginBottom: 14 },
  goldBarLg: { width: 6, height: 88, marginBottom: 22 },
  quoteText: { fontSize: 15, fontStyle: 'italic', lineHeight: 24, fontWeight: '500' },
  quoteTextLg: { fontSize: 24, lineHeight: 36 },
  attribution: { fontSize: 11, marginTop: 12, fontWeight: '600' },
  attributionLg: { fontSize: 16, marginTop: 18 },
  // ── Key facts ──────────────────────────────────────────────────────────────
  factCard: { borderLeftWidth: 3, borderRadius: 5, padding: 8 },
  factCardLg: { borderLeftWidth: 4, borderRadius: 8, padding: 14 },
  factLabel: { fontSize: 12, fontWeight: '700' },
  factLabelLg: { fontSize: 18 },
  factValue: { fontSize: 11, lineHeight: 16, marginTop: 2 },
  factValueLg: { fontSize: 15, lineHeight: 22, marginTop: 4 },
  // ── Timeline (vertical) ────────────────────────────────────────────────────
  timelineRow: { flexDirection: 'row', gap: 10 },
  timelineRowLg: { gap: 16 },
  timelineTrack: { alignItems: 'center', width: 18 },
  timelineNode: { width: 12, height: 12, borderRadius: 6 },
  timelineNodeLg: { width: 18, height: 18, borderRadius: 9 },
  timelineLine: { width: 2, flex: 1, marginTop: 2, minHeight: 6 },
  timelineContent: { flex: 1, paddingBottom: 8 },
  timelineContentLg: { paddingBottom: 14 },
  timelineLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  timelineLabelLg: { fontSize: 16 },
  timelineValue: { fontSize: 11, lineHeight: 16, marginTop: 1 },
  timelineValueLg: { fontSize: 15, lineHeight: 22, marginTop: 3 },
  // ── Timeline (horizontal) ──────────────────────────────────────────────────
  timelineHorzPad: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 4,
  },
  timelineHorzPadLg: { paddingHorizontal: 28, paddingTop: 10, paddingBottom: 16 },
  timelineHorzItem: {
    alignItems: 'center',
    width: 72,
  },
  timelineHorzItemLg: { width: 120 },
  timelineHorzLabel: {
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  timelineHorzLabelLg: { fontSize: 13, marginBottom: 8 },
  timelineHorzTrack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineHorzNode: {
    width: 12,
    height: 12,
    borderRadius: 6,
    zIndex: 1,
  },
  timelineHorzNodeLg: { width: 18, height: 18, borderRadius: 9 },
  timelineHorzLine: {
    flex: 1,
    height: 2,
    minWidth: 20,
  },
  timelineHorzLineSpacer: { flex: 1, minWidth: 4 },
  timelineHorzValue: {
    fontSize: 9,
    lineHeight: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  timelineHorzValueLg: { fontSize: 12, lineHeight: 18, marginTop: 8 },
  // ── Cards ──────────────────────────────────────────────────────────────────
  cardsWrap: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  cardsWrapLg: { paddingHorizontal: 28, paddingVertical: 14, gap: 14 },
  cardTile: { width: '47%', borderRadius: 7, borderTopWidth: 3, padding: 10 },
  cardTileLg: { borderTopWidth: 4, borderRadius: 10, padding: 18 },
  cardHeading: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  cardHeadingLg: { fontSize: 18, marginBottom: 8 },
  cardBody: { fontSize: 11, lineHeight: 15 },
  cardBodyLg: { fontSize: 15, lineHeight: 22 },
  // ── Agenda ─────────────────────────────────────────────────────────────────
  agendaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  agendaRowLg: { gap: 14 },
  agendaNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agendaNumLg: { width: 34, height: 34, borderRadius: 17 },
  agendaNumText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  agendaNumTextLg: { fontSize: 16 },
  agendaText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '500' },
  agendaTextLg: { fontSize: 20, lineHeight: 28 },
  // ── Closing ────────────────────────────────────────────────────────────────
  closingBand: { height: 4, width: '100%', flexShrink: 0 },
  closingBandLg: { height: 6 },
  closingContent: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, minHeight: 0 },
  closingContentLg: { paddingHorizontal: 48 },
  closingTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  closingTitleLg: { fontSize: 36, marginBottom: 14 },
  closingDivider: { height: 2, width: 48, borderRadius: 1, marginBottom: 12 },
  closingBulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 5 },
  closingBulletRowLg: { gap: 14, marginBottom: 8 },
  closingDot: { width: 7, height: 7, borderRadius: 4, marginTop: 5 },
  closingDotLg: { width: 10, height: 10, borderRadius: 5, marginTop: 8 },
  closingBulletText: {
    flex: 1,
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 18,
  },
  closingBulletTextLg: { fontSize: 18, lineHeight: 26 },
  closingNext: { fontSize: 11, fontWeight: '600', marginTop: 12, letterSpacing: 0.3 },
  closingNextLg: { fontSize: 16, marginTop: 20 },
  // ── Footer ─────────────────────────────────────────────────────────────────
  footer: {
    height: 26,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  footerLg: { height: 36, paddingHorizontal: 24 },
  footerBrand: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  footerBrandLg: { fontSize: 12 },
  footerCount: { color: 'rgba(255,255,255,0.35)', fontSize: 9 },
  footerCountLg: { fontSize: 12 },

  // ══════════════════════════════════════════════════════════════════════════
  // Visual layout styles
  // ══════════════════════════════════════════════════════════════════════════

  // ── Infographic ────────────────────────────────────────────────────────────
  infographicGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 8,
    paddingTop: 4,
    gap: 8,
    alignContent: 'flex-start',
  },
  infographicGridLg: { paddingHorizontal: 24, paddingBottom: 12, paddingTop: 8, gap: 14 },
  infographicTile: {
    width: '47%',
    borderRadius: 8,
    borderTopWidth: 4,
    padding: 10,
    minHeight: 60,
    justifyContent: 'center',
  },
  infographicTileLg: { borderTopWidth: 5, padding: 18, minHeight: 96, borderRadius: 12 },
  infographicStat: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  infographicStatLg: { fontSize: 36, lineHeight: 44 },
  infographicDesc: { fontSize: 10, lineHeight: 14, marginTop: 3 },
  infographicDescLg: { fontSize: 14, lineHeight: 20, marginTop: 6 },

  // ── Bar chart ──────────────────────────────────────────────────────────────
  barRow: { gap: 4 },
  barRowLg: { gap: 6 },
  barLabel: { fontSize: 10, fontWeight: '600' },
  barLabelLg: { fontSize: 14 },
  barTrack: {
    height: 18,
    borderRadius: 3,
    overflow: 'hidden',
    justifyContent: 'center',
    position: 'relative',
  },
  barTrackLg: { height: 28, borderRadius: 5 },
  barFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    borderRadius: 3,
  },
  barFillLg: { borderRadius: 5 },
  barValue: {
    position: 'absolute',
    right: 6,
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 18,
  },
  barValueLg: { right: 10, fontSize: 12, lineHeight: 28 },

  // ── Pie chart ──────────────────────────────────────────────────────────────
  pieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pieRowLg: { gap: 12 },
  pieSwatch: { width: 10, height: 10, borderRadius: 2 },
  pieSwatchLg: { width: 16, height: 16, borderRadius: 3 },
  pieLabel: { fontSize: 10, flex: 1 },
  pieLabelLg: { fontSize: 14 },
  pieBarWrap: {
    flex: 2,
    height: 12,
    borderRadius: 3,
    overflow: 'hidden',
  },
  pieBarWrapLg: { height: 18, borderRadius: 5 },
  pieBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  piePct: { fontSize: 10, fontWeight: '700', minWidth: 30, textAlign: 'right' },
  piePctLg: { fontSize: 14, minWidth: 44 },

  // ── Line chart ─────────────────────────────────────────────────────────────
  lineXLabels: {
    flexDirection: 'row',
    marginTop: 4,
  },
  lineXLabelsLg: { marginTop: 8 },
  lineXLabel: { fontSize: 8, textAlign: 'center' },
  lineXLabelLg: { fontSize: 11 },
  lineXValue: { fontSize: 9, fontWeight: '700', textAlign: 'center' },
  lineXValueLg: { fontSize: 12 },

  // ── Diagram ────────────────────────────────────────────────────────────────
  diagramHorzPad: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  diagramHorzPadLg: { paddingHorizontal: 24, paddingVertical: 24 },
  diagramVertPad: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 0,
  },
  diagramVertPadLg: { paddingHorizontal: 24, paddingVertical: 12 },
  diagramHorzItem: { flexDirection: 'row', alignItems: 'center' },
  diagramVertItem: { alignItems: 'center', width: '100%' },
  diagramArrowHorz: { alignItems: 'center', paddingHorizontal: 4 },
  diagramArrowVert: { alignItems: 'center', paddingVertical: 2 },
  diagramArrowText: { fontSize: 16, fontWeight: '700' },
  diagramEdgeLabel: { fontSize: 7, marginTop: 1 },
  diagramEdgeLabelLg: { fontSize: 10 },
  diagramBox: {
    borderRadius: 6,
    borderWidth: 1.5,
    padding: 8,
    minWidth: 60,
    maxWidth: 100,
    alignItems: 'center',
  },
  diagramBoxLg: { borderRadius: 10, borderWidth: 2, padding: 14, minWidth: 90, maxWidth: 160 },
  diagramNodeLabel: { fontSize: 10, fontWeight: '700', textAlign: 'center' },
  diagramNodeLabelLg: { fontSize: 15 },
  diagramNodeDetail: { fontSize: 8, textAlign: 'center', marginTop: 2 },
  diagramNodeDetailLg: { fontSize: 11, marginTop: 4 },

  // ── Triangle ───────────────────────────────────────────────────────────────
  triangleBody: {
    flex: 1,
    paddingHorizontal: 10,
    paddingBottom: 8,
    paddingTop: 4,
    justifyContent: 'space-evenly',
    minHeight: 0,
  },
  triangleBodyLg: { paddingHorizontal: 20, paddingBottom: 12, paddingTop: 8 },
  triangleTopRow: { alignItems: 'center' },
  triangleBottomRow: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  triangleTile: {
    borderRadius: 7,
    borderTopWidth: 3,
    padding: 10,
    width: '46%',
  },
  triangleTileLg: { borderTopWidth: 4, borderRadius: 10, padding: 16 },
  triangleHeading: { fontSize: 11, fontWeight: '700', marginBottom: 3 },
  triangleHeadingLg: { fontSize: 16, marginBottom: 6 },
  triangleBody2: { fontSize: 10, lineHeight: 14 },
  triangleBody2Lg: { fontSize: 13, lineHeight: 19 },
  triangleCenter: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginVertical: 4,
  },
  triangleCenterLg: { fontSize: 16, marginVertical: 8 },

  // ── Pyramid ────────────────────────────────────────────────────────────────
  pyramidBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 8,
    paddingTop: 6,
    gap: 3,
    minHeight: 0,
  },
  pyramidBodyLg: { paddingBottom: 12, paddingTop: 10, gap: 5 },
  pyramidRow: {
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: 'center',
  },
  pyramidRowLg: { borderRadius: 6, paddingHorizontal: 16, paddingVertical: 9 },
  pyramidHeading: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  pyramidHeadingLg: { fontSize: 15 },
  pyramidBodyText: {
    color: 'rgba(255,255,255,0.80)',
    fontSize: 8,
    textAlign: 'center',
    marginTop: 1,
  },
  pyramidBodyTextLg: { fontSize: 11, marginTop: 3 },

  // ── Cycle (linear / compact) ────────────────────────────────────────────────
  cycleCenterLabel: {
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    paddingVertical: 3,
  },
  cycleCenterLabelLg: { fontSize: 14, paddingVertical: 6 },
  cycleArrow: { textAlign: 'center', fontSize: 14, marginVertical: 1 },
  cyclePill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 8,
  },
  cyclePillLg: { borderRadius: 10, borderWidth: 2, paddingHorizontal: 14, paddingVertical: 10, gap: 12 },
  cycleDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cycleDotLg: { width: 30, height: 30, borderRadius: 15 },
  cycleDotNum: { color: '#FFF', fontSize: 9, fontWeight: '700' },
  cycleDotNumLg: { fontSize: 13 },
  cycleStepText: { flex: 1, fontSize: 11, lineHeight: 15 },
  cycleStepTextLg: { fontSize: 16, lineHeight: 22 },

  // ── Cycle (radial) ──────────────────────────────────────────────────────────
  cycleRadialContainer: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cycleRadialCenter: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    zIndex: 2,
  },
  cycleRadialCenterText: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  cycleRadialPill: {
    borderRadius: 6,
    borderWidth: 1.5,
    paddingHorizontal: 6,
    paddingVertical: 4,
    width: 104,
    alignItems: 'center',
    zIndex: 1,
  },
  cycleRadialNum: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  cycleRadialNumText: { color: '#FFF', fontSize: 8, fontWeight: '700' },
  cycleRadialLabel: { fontSize: 9, textAlign: 'center', lineHeight: 13 },

  // ── Funnel ─────────────────────────────────────────────────────────────────
  funnelBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 8,
    paddingTop: 4,
    minHeight: 0,
  },
  funnelBodyLg: { paddingBottom: 12, paddingTop: 8 },
  funnelRowWrap: { alignItems: 'center', width: '100%' },
  funnelArrow: { fontSize: 14, marginVertical: 1, textAlign: 'center' },
  funnelRow: {
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  funnelRowLg: { borderRadius: 6, paddingHorizontal: 16, paddingVertical: 10 },
  funnelText: { color: '#FFFFFF', fontSize: 10, fontWeight: '600', textAlign: 'center' },
  funnelTextLg: { fontSize: 15 },
});
