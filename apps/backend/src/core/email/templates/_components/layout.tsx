import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'react-email';
import * as React from 'react';

// F-03.2, F-09.5: the look every HobbyHub e-mail shares. Mail clients know
// nothing of CSS variables, so these are the values of the light theme in
// apps/frontend/src/styles/global.css, copied here. Change them together with
// the tokens.
export const COLOR = {
  background: '#fbfafc',
  foreground: '#1f1a29',
  mutedForeground: '#6a6277',
  primary: '#6d28d9',
  primaryForeground: '#ffffff',
  accent: '#ede7fb',
  accentForeground: '#4c1d95',
  border: '#e3deea',
};

export const FONT_HEADING =
  "Outfit, Inter, 'Helvetica Neue', Arial, sans-serif";
export const FONT_BODY = "Inter, 'Helvetica Neue', Arial, sans-serif";

export const paragraph: React.CSSProperties = {
  fontSize: 16,
  lineHeight: '24px',
  margin: '16px 0 0',
};

export const smallMuted: React.CSSProperties = {
  color: COLOR.mutedForeground,
  fontSize: 14,
  lineHeight: '20px',
  margin: 0,
};

export const finePrint: React.CSSProperties = {
  color: COLOR.mutedForeground,
  fontSize: 12,
  lineHeight: '18px',
  margin: 0,
};

// The tinted box: how long a link lasts, the organizer's words.
export const callout: React.CSSProperties = {
  backgroundColor: COLOR.accent,
  color: COLOR.accentForeground,
  borderRadius: 8,
  fontSize: 14,
  lineHeight: '20px',
  padding: '12px 16px',
  margin: 0,
};

export const inlineLink: React.CSSProperties = {
  color: COLOR.accentForeground,
  textDecoration: 'underline',
};

type LayoutProps = {
  // The line mail clients show next to the subject.
  preview: string;
  heading: string;
  children: React.ReactNode;
};

export const Layout = ({
  preview,
  heading,
  children,
}: LayoutProps): React.JSX.Element => (
  <Html lang="cs">
    <Head />
    <Preview>{preview}</Preview>
    <Body
      style={{
        backgroundColor: COLOR.background,
        color: COLOR.foreground,
        fontFamily: FONT_BODY,
        margin: 0,
        padding: '32px 16px',
      }}
    >
      <Container style={{ maxWidth: 560, margin: '0 auto' }}>
        <Text
          style={{
            color: COLOR.primary,
            fontFamily: FONT_HEADING,
            fontSize: 20,
            fontWeight: 700,
            margin: '0 0 24px',
          }}
        >
          HobbyHub
        </Text>
        <Heading
          as="h1"
          style={{
            color: COLOR.foreground,
            fontFamily: FONT_HEADING,
            fontSize: 28,
            lineHeight: '34px',
            fontWeight: 700,
            margin: 0,
          }}
        >
          {heading}
        </Heading>
        {children}
      </Container>
    </Body>
  </Html>
);

export const PrimaryButton = ({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}): React.JSX.Element => (
  <Section style={{ margin: '32px 0' }}>
    <Button
      href={href}
      style={{
        backgroundColor: COLOR.primary,
        color: COLOR.primaryForeground,
        fontFamily: FONT_BODY,
        fontSize: 16,
        fontWeight: 600,
        borderRadius: 8,
        padding: '12px 24px',
        textDecoration: 'none',
        display: 'inline-block',
      }}
    >
      {children}
    </Button>
  </Section>
);

// For mail clients that break the button: the address itself.
export const LinkFallback = ({ url }: { url: string }): React.JSX.Element => (
  <>
    <Text style={smallMuted}>
      Tlačítko nefunguje? Zkopíruj tento odkaz do prohlížeče:
    </Text>
    <Text
      style={{
        color: COLOR.accentForeground,
        fontSize: 14,
        lineHeight: '20px',
        wordBreak: 'break-all',
        margin: '4px 0 16px',
      }}
    >
      {url}
    </Text>
  </>
);
