import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'react-email';
import * as React from 'react';

export const RESET_PASSWORD_SUBJECT = 'Nastav si nové heslo v HobbyHubu';

// F-03.5. Mail clients know nothing of CSS variables, so these are the values
// of the light theme in apps/frontend/src/styles/global.css, copied here.
// Change them together with the tokens.
const COLOR = {
  background: '#fbfafc',
  foreground: '#1f1a29',
  mutedForeground: '#6a6277',
  primary: '#6d28d9',
  primaryForeground: '#ffffff',
  accent: '#ede7fb',
  accentForeground: '#4c1d95',
  border: '#e3deea',
};

const FONT_HEADING = "Outfit, Inter, 'Helvetica Neue', Arial, sans-serif";
const FONT_BODY = "Inter, 'Helvetica Neue', Arial, sans-serif";

export interface ResetPasswordProps {
  url: string;
}

export const ResetPassword = ({
  url,
}: ResetPasswordProps): React.JSX.Element => (
  <Html lang="cs">
    <Head />
    <Preview>Nastav si nové heslo do HobbyHubu.</Preview>
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
          Nastav si nové heslo
        </Heading>
        <Text style={{ fontSize: 16, lineHeight: '24px', margin: '16px 0 0' }}>
          Dostali jsme žádost o nastavení nového hesla k tvému účtu. Klikni na
          tlačítko a heslo si nastav.
        </Text>
        <Section style={{ margin: '32px 0' }}>
          <Button
            href={url}
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
            Nastavit heslo
          </Button>
        </Section>
        <Text
          style={{
            backgroundColor: COLOR.accent,
            color: COLOR.accentForeground,
            borderRadius: 8,
            fontSize: 14,
            lineHeight: '20px',
            padding: '12px 16px',
            margin: 0,
          }}
        >
          Odkaz platí 1 hodinu a jde použít jen jednou.
        </Text>
        <Hr style={{ borderColor: COLOR.border, margin: '32px 0 16px' }} />
        <Text
          style={{
            color: COLOR.mutedForeground,
            fontSize: 14,
            lineHeight: '20px',
            margin: 0,
          }}
        >
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
        <Text
          style={{
            color: COLOR.mutedForeground,
            fontSize: 12,
            lineHeight: '18px',
            margin: 0,
          }}
        >
          Pokud sis o nové heslo neříkal(a), tento e-mail ignoruj, tvé heslo
          zůstane stejné.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default ResetPassword;
